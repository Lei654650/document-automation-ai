from __future__ import annotations

import json
import logging
import os
import re
import time
import tempfile
import urllib.error
import urllib.request
import sqlite3
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
from dataclasses import asdict, dataclass
from pathlib import Path
from threading import Lock, BoundedSemaphore
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[2]

LOGGER = logging.getLogger("document_automation.translation")
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
_data_root = os.getenv("APP_DATA_DIR", "").strip()
if IS_VERCEL:
    PERSISTENT_ROOT = (Path(tempfile.gettempdir()) / "document-automation-ai").resolve()
elif _data_root:
    PERSISTENT_ROOT = Path(_data_root).expanduser().resolve()
elif os.name == "nt" and os.getenv("LOCALAPPDATA"):
    PERSISTENT_ROOT = (Path(os.environ["LOCALAPPDATA"]) / "DocumentAutomationAI").resolve()
else:
    PERSISTENT_ROOT = BASE_DIR
SETTINGS_PATH = PERSISTENT_ROOT / "data" / "ai_settings.json"
_SETTINGS_LOCK = Lock()
_CACHE_LOCK = Lock()
_PROVIDER_LIMIT = BoundedSemaphore(max(1, min(8, int(os.getenv("TRANSLATION_GLOBAL_CONCURRENCY", "6")))))
TRANSLATION_MEMORY_PATH = PERSISTENT_ROOT / "data" / "translation_memory.db"
# Cache namespace is intentionally versioned. V36.0 could persist source-echoed or
# mixed-language output; changing this value makes those rows unreachable without
# deleting customer data or blocking startup on a migration.
TRANSLATION_CACHE_NAMESPACE = "v44.0.3-pptx-english-repair-r1"
# Backward-compatible watchdog setting retained for diagnostics/tests.
# Sequential V40.5 hotfix uses TRANSLATION_FILE_AI_BUDGET_SECONDS as the actual
# per-file limit and does not queue futures behind this watchdog.
TRANSLATION_BATCH_WATCHDOG_SECONDS = max(20, min(180, int(os.getenv("TRANSLATION_BATCH_WATCHDOG_SECONDS", "80"))))

# V36 process-wide hot translation memory. Batch jobs often contain the same
# PLC/HMI labels across many workbooks. Keeping validated translations in RAM
# avoids reopening SQLite and revalidating the same rows for every file.
_HOT_MEMORY_LOCK = Lock()
_HOT_MEMORY: dict[tuple[str, str, str], str] = {}
_HOT_MEMORY_MAX = max(1000, min(200000, int(os.getenv("TRANSLATION_HOT_CACHE_SIZE", "50000"))))

def _hot_memory_get_many(source: str, target: str, texts: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    with _HOT_MEMORY_LOCK:
        for text in texts:
            value = _HOT_MEMORY.get((source, target, text))
            if value is not None:
                result[text] = value
    return result

def _hot_memory_put_many(source: str, target: str, rows: dict[str, str]) -> None:
    if not rows:
        return
    with _HOT_MEMORY_LOCK:
        if len(_HOT_MEMORY) + len(rows) > _HOT_MEMORY_MAX:
            # Deterministic low-overhead eviction; insertion order is preserved
            # by dict on supported Python versions. Remove the oldest 20%.
            remove_count = max(1, len(_HOT_MEMORY) // 5)
            for key in list(_HOT_MEMORY)[:remove_count]:
                _HOT_MEMORY.pop(key, None)
        for text, value in rows.items():
            _HOT_MEMORY[(source, target, text)] = value

def _hot_memory_delete_many(source: str, target: str, texts: list[str]) -> None:
    if not texts:
        return
    with _HOT_MEMORY_LOCK:
        for text in texts:
            _HOT_MEMORY.pop((source, target, text), None)


@dataclass(frozen=True)
class TranslationCapability:
    provider: str
    configured: bool
    mode: str
    model: str
    base_url: str
    message: str


DEFAULTS: dict[str, Any] = {
    "provider": "none",
    "profiles": {},
    "timeout_seconds": 90,
    "max_retries": 2,
}

PROVIDER_DEFAULTS = {
    "openai": {
        "label": "OpenAI",
        "model": "gpt-4.1-mini",
        "models": ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
        "base_url": "https://api.openai.com/v1",
        "protocol": "openai",
        "input_cost_per_million": 0.40,
        "output_cost_per_million": 1.60,
    },
    "deepseek": {
        "label": "DeepSeek",
        "model": "deepseek-chat",
        "models": ["deepseek-chat", "deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro"],
        "base_url": "https://api.deepseek.com/v1",
        "protocol": "openai",
        "input_cost_per_million": 0.27,
        "output_cost_per_million": 1.10,
    },
    "gemini": {
        "label": "Google Gemini",
        "model": "gemini-2.5-flash",
        "models": ["gemini-2.5-flash", "gemini-2.5-pro"],
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "protocol": "gemini",
        "input_cost_per_million": 0.30,
        "output_cost_per_million": 2.50,
    },
    "claude": {
        "label": "Anthropic Claude",
        "model": "claude-3-5-haiku-latest",
        "models": ["claude-3-5-haiku-latest", "claude-sonnet-4-20250514"],
        "base_url": "https://api.anthropic.com/v1",
        "protocol": "claude",
        "input_cost_per_million": 0.80,
        "output_cost_per_million": 4.00,
    },
    "azure": {
        "label": "Azure OpenAI",
        "model": "gpt-4o-mini",
        "models": ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1"],
        "base_url": "https://YOUR-RESOURCE.openai.azure.com",
        "protocol": "azure",
        "input_cost_per_million": 0.40,
        "output_cost_per_million": 1.60,
    },
    "openrouter": {
        "label": "OpenRouter",
        "model": "openai/gpt-4.1-mini",
        "models": ["openai/gpt-4.1-mini", "deepseek/deepseek-chat-v3-0324", "google/gemini-2.5-flash", "anthropic/claude-3.5-haiku"],
        "base_url": "https://openrouter.ai/api/v1",
        "protocol": "openai",
        "input_cost_per_million": 0.40,
        "output_cost_per_million": 1.60,
    },
}


_DEEPSEEK_OFFICIAL_MODELS = {"deepseek-chat", "deepseek-reasoner"}
_DEEPSEEK_V4_MODELS = {"deepseek-v4-flash", "deepseek-v4-pro"}

def _normalize_provider_model(provider: str, model: str, base_url: str) -> str:
    """Keep official DeepSeek models, but migrate legacy names for V4-compatible gateways."""
    provider = str(provider or "").strip().lower()
    model = str(model or "").strip()
    base_url = str(base_url or "").strip().lower()
    if provider != "deepseek":
        return model
    if "api.deepseek.com" in base_url:
        return model or "deepseek-chat"
    if not model or model in _DEEPSEEK_OFFICIAL_MODELS:
        return "deepseek-v4-flash"
    return model

def _extract_supported_models(detail: str) -> list[str]:
    """Extract model names advertised by an OpenAI-compatible gateway error."""
    candidates = re.findall(r"deepseek-[A-Za-z0-9._-]+", str(detail or ""), flags=re.I)
    result: list[str] = []
    for item in candidates:
        value = item.lower().rstrip(".,;:)]}\"'")
        if value not in result:
            result.append(value)
    return result

LANGUAGE_NAMES = {
    "auto": "automatically detected source language",
    "zh": "Simplified Chinese",
    "zh_tw": "Traditional Chinese",
    "vi": "Vietnamese",
    "en": "English",
    "ja": "Japanese",
    "ko": "Korean",
    "th": "Thai",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "pt": "Portuguese",
    "ru": "Russian",
    "ar": "Arabic",
    "zh-en": "Chinese-English bilingual. Output a Chinese translation followed by an English translation for each source segment.",
    "zh-vi": "Chinese-Vietnamese bilingual. Output a Chinese translation followed by a Vietnamese translation for each source segment.",
}


def _empty_profiles() -> dict[str, dict[str, str]]:
    return {
        provider_id: {"api_key": "", "model": values["model"], "base_url": values["base_url"]}
        for provider_id, values in PROVIDER_DEFAULTS.items()
    }


def _env_settings() -> dict[str, Any]:
    """Build platform-wide provider settings from deployment secrets.

    A production customer must never supply an API key. The platform operator
    configures one provider in Railway or through the administrator center. If
    TRANSLATION_PROVIDER is omitted, select the first provider that has a key so
    a valid platform secret cannot be silently ignored.
    """
    prefix_by_provider = {
        "openai": "OPENAI", "deepseek": "DEEPSEEK", "gemini": "GEMINI",
        "claude": "CLAUDE", "azure": "AZURE_OPENAI", "openrouter": "OPENROUTER",
    }
    profiles = _empty_profiles()
    for provider_id, env_prefix in prefix_by_provider.items():
        api_key = os.getenv(f"{env_prefix}_API_KEY", "").strip()
        profiles[provider_id] = {
            "api_key": api_key,
            "model": os.getenv(f"{env_prefix}_MODEL", PROVIDER_DEFAULTS[provider_id]["model"]).strip(),
            "base_url": os.getenv(f"{env_prefix}_BASE_URL", PROVIDER_DEFAULTS[provider_id]["base_url"]).strip(),
        }

    # Platform-wide aliases let Railway/Vercel expose one shared AI service to
    # every customer account.  Customers never need to provide their own key.
    requested = os.getenv("TRANSLATION_PROVIDER", os.getenv("PLATFORM_AI_PROVIDER", os.getenv("AI_PROVIDER", "none"))).strip().lower()
    shared_key = os.getenv("PLATFORM_AI_API_KEY", os.getenv("AI_API_KEY", "")).strip()
    if shared_key and requested in PROVIDER_DEFAULTS and not profiles[requested].get("api_key"):
        profiles[requested]["api_key"] = shared_key
        profiles[requested]["model"] = os.getenv("PLATFORM_AI_MODEL", os.getenv("AI_MODEL", profiles[requested]["model"])).strip()
        profiles[requested]["base_url"] = os.getenv("PLATFORM_AI_BASE_URL", os.getenv("AI_BASE_URL", profiles[requested]["base_url"])).strip()
    if requested not in PROVIDER_DEFAULTS or not profiles.get(requested, {}).get("api_key"):
        requested = next((pid for pid in PROVIDER_DEFAULTS if profiles[pid].get("api_key")), "none")

    return {
        "provider": requested,
        "profiles": profiles,
        "timeout_seconds": int(os.getenv("TRANSLATION_TIMEOUT_SECONDS", "35")),
        "max_retries": int(os.getenv("TRANSLATION_MAX_RETRIES", "0")),
    }


def load_settings(include_secret: bool = True) -> dict[str, Any]:
    settings = _env_settings()
    if SETTINGS_PATH.exists():
        try:
            stored = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                env_provider = str(settings.get("provider", "none"))
                env_profiles = settings.get("profiles") or {}
                settings.update({k: v for k, v in stored.items() if k in DEFAULTS and k != "profiles"})
                stored_profiles = stored.get("profiles") if isinstance(stored.get("profiles"), dict) else {}
                merged_profiles = _empty_profiles()
                for pid in merged_profiles:
                    merged_profiles[pid].update(env_profiles.get(pid) or {})
                    profile = stored_profiles.get(pid)
                    if isinstance(profile, dict):
                        for field in ("model", "base_url"):
                            if str(profile.get(field) or "").strip():
                                merged_profiles[pid][field] = str(profile[field]).strip()
                        # A saved platform key overrides the environment; an empty
                        # saved field must not erase a Railway secret.
                        if str(profile.get("api_key") or "").strip():
                            merged_profiles[pid]["api_key"] = str(profile["api_key"]).strip()
                settings["profiles"] = merged_profiles
                selected = str(settings.get("provider", "none")).strip().lower()
                if selected not in PROVIDER_DEFAULTS or not merged_profiles.get(selected, {}).get("api_key"):
                    settings["provider"] = env_provider if env_profiles.get(env_provider, {}).get("api_key") else next(
                        (pid for pid in PROVIDER_DEFAULTS if merged_profiles[pid].get("api_key")), "none"
                    )
                # migrate the older single-provider settings format
                legacy_provider = str(stored.get("provider", "none")).lower()
                if "profiles" not in stored and legacy_provider in PROVIDER_DEFAULTS:
                    settings["profiles"][legacy_provider] = {
                        "api_key": str(stored.get("api_key") or ""),
                        "model": str(stored.get("model") or PROVIDER_DEFAULTS[legacy_provider]["model"]),
                        "base_url": str(stored.get("base_url") or PROVIDER_DEFAULTS[legacy_provider]["base_url"]),
                    }
        except (OSError, json.JSONDecodeError):
            pass
    provider = str(settings.get("provider", "none")).strip().lower()
    settings["provider"] = provider
    profiles = _empty_profiles()
    for pid, profile in (settings.get("profiles") or {}).items():
        if pid in profiles and isinstance(profile, dict):
            profiles[pid].update({k: str(v or "") for k, v in profile.items() if k in {"api_key", "model", "base_url"}})
            profiles[pid]["model"] = profiles[pid]["model"] or PROVIDER_DEFAULTS[pid]["model"]
            profiles[pid]["base_url"] = (profiles[pid]["base_url"] or PROVIDER_DEFAULTS[pid]["base_url"]).rstrip("/")
            profiles[pid]["model"] = _normalize_provider_model(pid, profiles[pid]["model"], profiles[pid]["base_url"])
    settings["profiles"] = profiles
    settings["timeout_seconds"] = max(10, min(120, int(settings.get("timeout_seconds") or 35)))
    settings["max_retries"] = max(0, min(1, int(settings.get("max_retries") or 0)))
    active = profiles.get(provider, {"api_key": "", "model": "", "base_url": ""})
    settings.update(active)
    if not include_secret:
        public_profiles = {}
        for pid, profile in profiles.items():
            key = profile.get("api_key", "")
            public_profiles[pid] = {
                "model": profile.get("model", ""),
                "base_url": profile.get("base_url", ""),
                "configured": bool(key),
                "api_key_masked": f"{key[:4]}...{key[-4:]}" if len(key) >= 10 else ("configured" if key else ""),
            }
        settings["profiles"] = public_profiles
        settings["api_key_masked"] = public_profiles.get(provider, {}).get("api_key_masked", "")
        settings.pop("api_key", None)
    return settings


def save_settings(payload: dict[str, Any]) -> dict[str, Any]:
    provider = str(payload.get("provider", "none")).strip().lower()
    if provider not in {"none", *PROVIDER_DEFAULTS.keys()}:
        raise ValueError("Unsupported translation provider.")
    current = load_settings(include_secret=True)
    profiles = current.get("profiles") or _empty_profiles()
    if provider in PROVIDER_DEFAULTS:
        profile = profiles[provider]
        for field in ("model", "base_url"):
            if field in payload:
                profile[field] = str(payload.get(field) or "").strip()
        if str(payload.get("api_key") or "").strip():
            profile["api_key"] = str(payload["api_key"]).strip()
        if payload.get("clear_api_key"):
            profile["api_key"] = ""
        profile["model"] = profile.get("model") or PROVIDER_DEFAULTS[provider]["model"]
        profile["base_url"] = (profile.get("base_url") or PROVIDER_DEFAULTS[provider]["base_url"]).rstrip("/")
        profile["model"] = _normalize_provider_model(provider, profile["model"], profile["base_url"])
    data = {
        "provider": provider,
        "profiles": profiles,
        "timeout_seconds": int(payload.get("timeout_seconds", current.get("timeout_seconds", 90))),
        "max_retries": int(payload.get("max_retries", current.get("max_retries", 2))),
    }
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _SETTINGS_LOCK:
        SETTINGS_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return load_settings(include_secret=False)

def capability() -> TranslationCapability:
    settings = load_settings(include_secret=True)
    provider = settings["provider"]
    configured = provider in PROVIDER_DEFAULTS and bool(settings["api_key"] and settings["base_url"] and settings["model"])
    if configured:
        message = f"{provider.title()} AI translation is ready."
    elif provider in PROVIDER_DEFAULTS:
        message = f"{provider.title()} API key is missing. Configure it in AI translation settings."
    else:
        message = "Choose and configure an AI translation provider."
    return TranslationCapability(
        provider=provider,
        configured=configured,
        mode="api" if provider in PROVIDER_DEFAULTS else "disabled",
        model=settings["model"],
        base_url=settings["base_url"],
        message=message,
    )


def public_settings() -> dict[str, Any]:
    result = load_settings(include_secret=False)
    result["capability"] = asdict(capability())
    result["providers"] = [
        {
            "id": provider_id,
            "label": values["label"],
            "model": values["model"],
            "models": values.get("models", [values["model"]]),
            "base_url": values["base_url"],
            "configured": result.get("profiles", {}).get(provider_id, {}).get("configured", False),
        }
        for provider_id, values in PROVIDER_DEFAULTS.items()
    ]
    return result


_TECHNICAL_UNIT_TOKEN_RE = re.compile(
    r"^(?:"
    r"V|VAC|VDC|A|mA|kA|W|kW|MW|Hz|kHz|MHz|GHz|"
    r"Pa|kPa|MPa|bar|psi|N|kN|Nm|N·m|"
    r"mm|cm|m|km|mm2|mm²|cm2|cm²|m2|m²|"
    r"ms|s|min|h|rpm|r/min|%|°C|°F|K|"
    r"Ω|kΩ|MΩ|µΩ|μΩ|ohm|ohms|dB|lx|lm|cd|"
    r"L|min|L/min|mL|kg|g|mg|µm|μm"
    r")$",
    re.I,
)


def _is_nontranslatable_technical_literal(text: str) -> bool:
    """Return True for values that carry no natural-language content.

    PPT engineering drawings contain many measurements, formulas and identifiers
    such as ``10^6–10^9 Ω``, ``24 VDC``, ``±0.02 mm`` and ``M8×20``. Sending
    these values to an AI provider is wasteful and an unchanged response is not a
    source echo. This detector is deliberately conservative: any CJK prose or
    ordinary word sequence still goes through the normal translation path.
    """
    value = _canonicalize_technical_placeholders(str(text or "")).strip()
    if not value or re.search(r"[\u3400-\u9fff]", value):
        return False

    # URLs, email addresses and spreadsheet error literals are data, not prose.
    if value.startswith(("http://", "https://", "mailto:")):
        return True
    if value.upper() in {"#N/A", "#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NULL!", "#NUM!"}:
        return True

    # A compact model/code that contains at least one digit is not translated.
    compact = re.sub(r"\s+", "", value)
    if re.fullmatch(r"[A-Za-z]{0,12}[0-9][A-Za-z0-9_.:/+\-×*()\[\]]*", compact):
        return True
    if re.fullmatch(r"[A-Z]{1,12}[_-][A-Z0-9_.:/+\-×*()\[\]]+", compact):
        return True

    # Pure formulas / numeric ranges / dimensions. Permit common scientific and
    # engineering symbols, including Unicode minus, multiplication and ohm signs.
    if re.fullmatch(
        r"[0-9\s.,:;/%+\-−–—_=()\[\]{}<>#@|\\^×*·±°′″µμΩω∞~≈≤≥]+",
        value,
    ):
        return True

    # Numeric expression followed by one or more recognised unit tokens.
    tokens = value.replace("·", " ").split()
    if tokens and any(ch.isdigit() for ch in value):
        non_units = []
        for token in tokens:
            stripped = token.strip(".,:;()[]{}<>+-−–—_=^×*±~≈≤≥")
            if not stripped:
                continue
            if re.fullmatch(r"[0-9.,]+", stripped):
                continue
            if _TECHNICAL_UNIT_TOKEN_RE.fullmatch(stripped):
                continue
            non_units.append(stripped)
        if not non_units:
            return True

    return False


def _should_translate(text: str) -> bool:
    value = text.strip()
    if not value or len(value) == 1 and not value.isalpha():
        return False
    if _is_nontranslatable_technical_literal(value):
        return False
    if re.fullmatch(r"[\d\s.,:;/%+\-_=()\[\]{}<>#@|\\]+", value):
        return False
    if re.fullmatch(r"(?:[A-Za-z]{0,5}\d+[A-Za-z0-9_.:/\-]*|[A-Z]{1,8}[_-][A-Z0-9_.:/\-]+)", value):
        return False
    return any(ch.isalpha() or "\u3400" <= ch <= "\u9fff" for ch in value)




# V31: protected technical tokens and high-confidence automation glossary.
# Tokens are masked before AI calls and restored byte-for-byte afterwards.
_PROTECTED_TOKEN_RE = re.compile(
    r"%(?:\([A-Za-z_][A-Za-z0-9_]*\))?[#0 +\-]?(?:\d+|\*)?(?:\.\d+)?[diuoxXfFeEgGcs]"
    r"|\{\{[^{}]+\}\}|\{[^{}]+\}|\$\{[^{}]+\}"
    r"|\b(?:AX|X|Y|M|D|R|SD|SM|B|W|L|F|V|Z|T|C)\d+(?:\.\d+)?\b",
    re.I,
)

_AUTOMATION_GLOSSARY_ZH_VI = {
    # Stable equipment/category labels used by PLC/HMI engineering sheets.
    "轴名称": "Tên trục",
    "气缸名称": "Tên xi lanh",
    "真空名称": "Tên cụm chân không",
    "感应器名称": "Tên cảm biến",
    "相机名称": "Tên camera",
    "皮带线名称": "Tên băng tải",
    "AOI名称": "Tên AOI",
    "安全门名称": "Tên cửa an toàn",
    "风扇名称": "Tên quạt",
    "扫码器名称": "Tên máy quét mã",
    "压力传感器名称": "Tên cảm biến áp suất",
    "位移传感器名称": "Tên cảm biến dịch chuyển",
    "电批名称": "Tên súng siết vít điện",
    "气缸IO输入_原点": "I/O đầu vào xi lanh - vị trí gốc",
    "备用": "Dự phòng",
    "单步": "Chạy từng bước",
    "载具左进料阻挡无料延时": "Thời gian trễ không có vật liệu tại cơ cấu chặn cấp liệu bên trái của đồ gá",
    "载具左出料阻挡无料延时": "Thời gian trễ không có vật liệu tại cơ cấu chặn xả liệu bên trái của đồ gá",
    "载具右进料阻挡无料延时": "Thời gian trễ không có vật liệu tại cơ cấu chặn cấp liệu bên phải của đồ gá",
    "载具右出料阻挡无料延时": "Thời gian trễ không có vật liệu tại cơ cấu chặn xả liệu bên phải của đồ gá",
    "侧拆螺丝工位未运行，不在安全位。": "Trạm tháo vít bên hông chưa chạy và chưa ở vị trí an toàn.",
    "前机-急停报警": "Máy phía trước - Báo động dừng khẩn cấp",
    "前机-安全门打开": "Máy phía trước - Cửa an toàn đang mở",
    "后机-急停报警": "Máy phía sau - Báo động dừng khẩn cấp",
}

# V37 deterministic PLC/HMI phrase engine.  High-confidence automation labels
# are translated before any provider request so the same term is rendered the
# same way in every workbook and every run.
_PLC_PREFIX_RE = re.compile(r"^(?P<prefix>[A-Z]{1,8}\d+(?:\.\d+)?)\s*(?P<body>.+)$", re.I)

_AUTOMATION_TERM_ZH_VI = {
    "载具": "đồ gá", "料盘": "khay", "夹爪": "kẹp", "气缸": "xi lanh",
    "真空": "chân không", "感应": "cảm biến", "传感器": "cảm biến",
    "皮带": "băng tải", "扫码器": "máy quét mã", "安全门": "cửa an toàn",
    "压力": "áp suất", "位移": "dịch chuyển", "相机": "camera",
}

_EXACT_PLC_PHRASES_ZH_VI = {
    "载具进料阻挡": "Xi lanh chặn cấp liệu đồ gá",
    "载具出料阻挡": "Xi lanh chặn xả liệu đồ gá",
    "载具顶升": "Xi lanh nâng đồ gá",
    "检测X轴": "Trục X kiểm tra",
    "检测Y轴": "Trục Y kiểm tra",
    "检测Z轴": "Trục Z kiểm tra",
    "料盘搬运真空": "Cụm chân không gắp khay",
    "工位0扫码器": "Máy quét mã trạm 0",
    "工位1扫码器": "Máy quét mã trạm 1",
    "工位2扫码器": "Máy quét mã trạm 2",
    "锁螺丝压力": "Cảm biến áp suất siết vít",
    "左锁附一位移": "Cảm biến dịch chuyển vị trí 1 bên trái",
    "左锁附二位移": "Cảm biến dịch chuyển vị trí 2 bên trái",
    "右锁附一位移": "Cảm biến dịch chuyển vị trí 1 bên phải",
    "右锁附二位移": "Cảm biến dịch chuyển vị trí 2 bên phải",
    "载具进料阻挡降位": "Cơ cấu chặn cấp liệu đồ gá ở vị trí hạ",
    "载具进料阻挡升位": "Cơ cấu chặn cấp liệu đồ gá ở vị trí nâng",
    "载具出料阻挡降位": "Cơ cấu chặn xả liệu đồ gá ở vị trí hạ",
    "载具出料阻挡升位": "Cơ cấu chặn xả liệu đồ gá ở vị trí nâng",
    "载具顶升降位": "Cơ cấu nâng đồ gá ở vị trí hạ",
    "载具顶升升位": "Cơ cấu nâng đồ gá ở vị trí nâng",
    "检测夹爪松位": "Kẹp kiểm tra ở vị trí mở",
    "检测夹爪夹位": "Kẹp kiểm tra ở vị trí kẹp",
    "料盘搬运真空信号": "Tín hiệu chân không gắp khay",
    "载具进料流入": "Cảm biến đồ gá đi vào",
    "载具进料到位": "Cảm biến đồ gá cấp liệu tại vị trí",
    "载具出料流出": "Cảm biến đồ gá đi ra",
    "上层皮带": "Băng tải tầng trên",
    "下层皮带": "Băng tải tầng dưới",
    "上料皮带": "Băng tải cấp liệu",
}


def _compose_plc_object_translation_zh_vi(body: str) -> str | None:
    """Translate common PLC object/action labels without an AI round-trip.

    This layer deliberately covers only high-confidence automation structures.
    It reduces provider calls for large signal tables while keeping unknown prose
    on the normal AI path.
    """
    value = str(body or "").strip()
    if not value:
        return None

    exact = _EXACT_PLC_PHRASES_ZH_VI.get(value)
    if exact:
        return exact

    # Common station scanner/camera/AOI labels.
    m = re.fullmatch(r"工位(\d+)(扫码器|相机|AOI)", value)
    if m:
        station, kind = m.groups()
        noun = {"扫码器": "Máy quét mã", "相机": "Camera", "AOI": "Trạm AOI"}[kind]
        return f"{noun} trạm {station}"

    # Axis names and detection axes.
    m = re.fullmatch(r"(?:检测)?([XYZR])轴", value, re.I)
    if m:
        return f"Trục {m.group(1).upper()} kiểm tra" if value.startswith("检测") else f"Trục {m.group(1).upper()}"

    # Position-state suffixes used throughout PLC I/O sheets.
    suffix_map = {
        "升位": "ở vị trí nâng", "降位": "ở vị trí hạ", "原位": "ở vị trí gốc",
        "到位": "đã đến vị trí", "夹位": "ở vị trí kẹp", "松位": "ở vị trí mở",
        "关闭": "đã đóng", "打开": "đang mở", "流入": "đi vào", "流出": "đi ra",
        "启动": "khởi động", "停止": "dừng", "报警": "báo lỗi",
    }
    for suffix, rendered in suffix_map.items():
        if value.endswith(suffix) and len(value) > len(suffix):
            core = value[:-len(suffix)].strip()
            core_translated = _EXACT_PLC_PHRASES_ZH_VI.get(core)
            if core_translated:
                if suffix == "报警":
                    return f"Báo lỗi {core_translated[0].lower() + core_translated[1:]}"
                return f"{core_translated} {rendered}"

    # Stable equipment-object compositions.
    replacements = [
        ("载具", "đồ gá"), ("料盘", "khay"), ("进料", "cấp liệu"), ("出料", "xả liệu"),
        ("阻挡", "cơ cấu chặn"), ("顶升", "cơ cấu nâng"), ("夹爪", "kẹp"),
        ("真空", "chân không"), ("皮带", "băng tải"), ("扫码器", "máy quét mã"),
        ("安全门", "cửa an toàn"), ("压力传感器", "cảm biến áp suất"),
        ("位移传感器", "cảm biến dịch chuyển"), ("感应器", "cảm biến"),
    ]
    if len(value) <= 18 and any(token in value for token, _ in replacements):
        # Only accept a generic composition when every remaining Chinese token is
        # consumed. This prevents a fast but semantically unsafe partial result.
        remaining = value
        parts: list[str] = []
        for token, translated in sorted(replacements, key=lambda item: len(item[0]), reverse=True):
            if token in remaining:
                remaining = remaining.replace(token, " ")
                parts.append(translated)
        remaining = re.sub(r"[\s_\-]+", "", remaining)
        if not re.search(r"[\u3400-\u9fff]", remaining) and parts:
            return " ".join(dict.fromkeys(parts)).strip().capitalize()
    return None


def _deterministic_plc_translation_zh_vi(text: str) -> str | None:
    value = str(text or "").strip()
    if not value:
        return None
    prefix = ""
    body = value
    match = _PLC_PREFIX_RE.match(value)
    if match:
        prefix = match.group("prefix")
        body = match.group("body").strip()
    translated = _AUTOMATION_GLOSSARY_ZH_VI.get(body) or _compose_plc_object_translation_zh_vi(body)
    if translated is None:
        if body == "备用":
            translated = "Dự phòng"
        else:
            door = re.fullmatch(r"(.+安全门)(关闭|打开)", body)
            if door:
                location = door.group(1).removesuffix("安全门")
                location_map = {
                    "前下左": "phía trước dưới bên trái", "前下中": "phía trước dưới ở giữa",
                    "前下右": "phía trước dưới bên phải", "左侧前1": "phía trước bên trái 1",
                    "左侧前2": "phía trước bên trái 2", "左侧后1": "phía sau bên trái 1",
                    "左侧后2": "phía sau bên trái 2", "NG": "khu vực NG",
                    "前上左": "phía trước trên bên trái", "前上中": "phía trước trên ở giữa",
                    "前上右": "phía trước trên bên phải",
                }
                loc = location_map.get(location)
                if loc:
                    translated = f"Cửa an toàn {loc} {'đã đóng' if door.group(2) == '关闭' else 'đang mở'}"
            if translated is None:
                alarm = re.fullmatch(r"(.+)报警", body)
                if alarm:
                    core = _EXACT_PLC_PHRASES_ZH_VI.get(alarm.group(1))
                    if core:
                        translated = f"Báo lỗi {core[0].lower() + core[1:]}"
    if translated is None:
        return None
    return f"{prefix} {translated}".strip()

def _mask_protected_tokens(text: str) -> tuple[str, dict[str, str]]:
    mapping: dict[str, str] = {}
    def repl(match: re.Match[str]) -> str:
        key = f"__DA_TOKEN_{len(mapping):03d}__"
        mapping[key] = match.group(0)
        return key
    return _PROTECTED_TOKEN_RE.sub(repl, text), mapping

def _restore_protected_tokens(text: str, mapping: dict[str, str]) -> str:
    """Restore every protected-token occurrence, including provider-spaced variants.

    Each occurrence is masked with a unique key (``__DA_TOKEN_000__``,
    ``__DA_TOKEN_001__`` ...), even when the original placeholders are
    identical.  Some providers insert spaces around underscores or digits.
    The tolerant regular expression below restores those harmless variants
    without falling back to a one-time replacement.
    """
    restored = str(text or "")
    for key, value in mapping.items():
        restored = restored.replace(key, value)
        number_match = re.search(r"(\d+)", key)
        if number_match:
            number = number_match.group(1)
            tolerant = re.compile(
                rf"__?\s*DA\s*_?\s*TOKEN\s*_?\s*{re.escape(number)}\s*__?",
                re.I,
            )
            restored = tolerant.sub(lambda _match, replacement=value: replacement, restored)
    return _canonicalize_technical_placeholders(restored)


# Historical customer files may already contain placeholders damaged by an
# earlier translation, for example ``%(WATCH1) - d``.  Canonicalise these
# fragments before translation so the source itself is repaired and the token
# can then be masked/restored byte-for-byte.
_BROKEN_NAMED_PRINTF_RE = re.compile(
    r"%\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)\s*(?:[-–—]\s*)?([diuoxXfFeEgGcs])"
)
_BROKEN_SIMPLE_PRINTF_RE = re.compile(
    r"%\s*(?:[-–—]\s*)?([diuoxXfFeEgGcs])"
)


def _canonicalize_technical_placeholders(text: str) -> str:
    """Repair spacing/hyphen corruption in printf-style placeholders.

    The function is intentionally conservative: it only rewrites fragments
    that already start with ``%`` and end in a valid printf conversion type.
    Normal prose, PLC addresses and arithmetic expressions are untouched.
    """
    value = str(text or "")
    value = _BROKEN_NAMED_PRINTF_RE.sub(lambda m: f"%({m.group(1)}){m.group(2)}", value)
    value = _BROKEN_SIMPLE_PRINTF_RE.sub(lambda m: f"%{m.group(1)}", value)
    return value


def _technical_placeholders(text: str) -> list[str]:
    return _PROTECTED_TOKEN_RE.findall(_canonicalize_technical_placeholders(text))


def _source_already_matches_target(source: str, target_code: str) -> bool:
    """Return True when an unchanged provider response is already valid target text.

    Customer PPT files commonly contain a mixture of Chinese annotations and
    existing English titles, model names and engineering labels.  Rejecting every
    unchanged response made the first English-only paragraph abort the whole file.
    For English output, unchanged ASCII/Latin engineering text is valid and should
    pass through unchanged; Chinese/Vietnamese prose still requires translation.
    """
    value = str(source or "").strip()
    code = str(target_code or "").strip().lower()
    if not value:
        return False
    if code == "en":
        if re.search(r"[\u3400-\u9fff]", value):
            return False
        # Vietnamese-specific letters/diacritics indicate non-English prose.
        if re.search(r"[ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠƯẠ-ỹ]", value, re.I):
            return False
        return bool(re.search(r"[A-Za-z]", value))
    return False


def _clean_provider_translation(source: str, translated: str, target_code: str = "") -> str:
    """Normalize provider output without weakening final target-language rules.

    Providers occasionally wrap a valid translation with labels, quote the source,
    or return a bilingual line such as ``定位机构 Positioning mechanism``.  For an
    English-only delivery we remove those wrappers and CJK echo fragments only
    when a meaningful Latin translation remains.  A Chinese-only echo is left
    unchanged so the retry path can still detect and reject it.
    """
    source_text = str(source or "").strip()
    value = str(translated or "").strip()
    if not value:
        return ""
    value = re.sub(r"^```(?:text|markdown)?\s*|\s*```$", "", value, flags=re.I | re.S).strip()
    value = re.sub(
        r"^\s*(?:translation|translated\s+text|english\s+translation|result)\s*[:：-]\s*",
        "", value, flags=re.I,
    ).strip().strip('"“”')
    if source_text and value.startswith(source_text):
        tail = value[len(source_text):].lstrip("\r\n :-：—–")
        if tail:
            value = tail
    if str(target_code or "").lower() == "en" and re.search(r"[\u3400-\u9fff]", value):
        # Prefer clean English-only lines when the model returned source + target.
        lines = [line.strip() for line in value.splitlines() if line.strip()]
        latin_lines = [
            line for line in lines
            if not re.search(r"[\u3400-\u9fff]", line) and re.search(r"[A-Za-z]", line)
        ]
        if latin_lines:
            value = "\n".join(latin_lines)
        else:
            # Same-line bilingual output: remove CJK runs only if substantial
            # target-language content remains afterwards.
            stripped = re.sub(r"[\u3400-\u9fff]+", "", value)
            stripped = re.sub(r"[ \t]{2,}", " ", stripped)
            stripped = re.sub(r"\s*([,.;:!?])\s*", r"\1 ", stripped).strip(" \t\r\n-—–:：,，;；")
            if len(re.findall(r"[A-Za-z]", stripped)) >= 2:
                value = stripped
    return value.strip()


def _translation_quality_ok(source: str, translated: str, target_code: str = "") -> bool:
    """Reject source echoes, mixed-language pollution and known bad legacy output."""
    source_text = str(source or "").strip()
    value = str(translated or "").strip()
    if not value:
        return False
    if value == source_text and not (
        _source_already_matches_target(source_text, target_code)
        or _is_nontranslatable_technical_literal(source_text)
    ):
        return False
    lowered = value.casefold()
    bad_fragments = (
        "cần xác nhận", "待确认", "translation pending",
        "để qua một bên", "một bên", "sao lưu",
    )
    if any(fragment in lowered for fragment in bad_fragments):
        return False
    # A Vietnamese target must not carry Chinese prose. PLC identifiers, digits
    # and punctuation remain valid because they are not CJK characters.
    if target_code in {"vi", "vn"} and re.search(r"[\u3400-\u9fff]", value):
        return False
    # English-only delivery must not retain Chinese prose.  Existing English
    # labels are allowed unchanged by _source_already_matches_target above.
    if target_code == "en" and re.search(r"[\u3400-\u9fff]", value):
        return False
    # Reject duplicated leading PLC/HMI identifiers (e.g. X1040 ... X1040).
    prefix = re.match(r"^\s*([A-Z]{1,8}\d+[A-Za-z0-9_.:/-]*)\b", source_text, re.I)
    if prefix and len(re.findall(rf"(?<![A-Za-z0-9_]){re.escape(prefix.group(1))}(?![A-Za-z0-9_])", value, re.I)) > 1:
        return False
    return True


def _repair_and_validate_cached_translation(source: str, translated: str, target_code: str = "") -> str | None:
    """Return a safe cached translation or ``None`` when it must be retried."""
    repaired = _canonicalize_technical_placeholders(str(translated or "").strip())
    if not repaired or not _placeholder_sequence_satisfied(source, repaired):
        return None
    if not _translation_quality_ok(source, repaired, target_code):
        return None
    return repaired






def _placeholder_sequence_satisfied(source: str, translated: str) -> bool:
    """Validate source-owned placeholders without false failures from prose.

    The source document is authoritative. Every protected token that occurs in
    the source must occur in the translated value in the same order and at least
    the same number of times. Extra code-like text introduced by translated prose
    is ignored here; final OOXML validation still rejects malformed printf tokens.
    """
    expected = _technical_placeholders(source)
    if not expected:
        return True
    actual = _technical_placeholders(translated)
    cursor = 0
    for token in expected:
        try:
            cursor = actual.index(token, cursor) + 1
        except ValueError:
            return False
    return True


def _force_source_placeholder_sequence(source: str, translated: str) -> str:
    """Deterministically restore source placeholders into translated prose.

    This last-resort repair never asks the model to reproduce technical tokens.
    Existing protected-token fragments are stripped from the translated value,
    then the exact source sequence is reinserted at the source segment boundaries.
    For difficult provider output the caller should prefer
    ``_translate_by_protected_segments``; this helper guarantees a safe canonical
    result for validation and cache storage.
    """
    source = _canonicalize_technical_placeholders(source)
    translated = _canonicalize_technical_placeholders(translated)
    expected = _technical_placeholders(source)
    if not expected:
        return translated
    # When the translated value already contains the complete source sequence,
    # only canonicalisation is needed.
    if _placeholder_sequence_satisfied(source, translated):
        return translated
    # A deterministic source-segment translation is the only safe reconstruction
    # because it preserves every duplicate occurrence and its original position.
    return ""

def _placeholder_mismatch_details(source: str, translated: str) -> str:
    expected = _technical_placeholders(source)
    actual = _technical_placeholders(translated)
    return f"expected={expected!r}; actual={actual!r}; source={source[:180]!r}; translated={translated[:180]!r}"

def _glossary_translation(source: str, source_code: str, target_code: str) -> str | None:
    if source_code in {"auto", "zh", "zh_cn"} and target_code in {"vi", "zh-vi"}:
        deterministic = _deterministic_plc_translation_zh_vi(source)
        if deterministic:
            return deterministic
    return None


def _memory_key(source: str, target: str, text: str) -> str:
    return hashlib.sha256(f"{TRANSLATION_CACHE_NAMESPACE}\0{source}\0{target}\0{text}".encode("utf-8")).hexdigest()


def _memory_connect() -> sqlite3.Connection:
    TRANSLATION_MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(TRANSLATION_MEMORY_PATH, timeout=30)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("""CREATE TABLE IF NOT EXISTS translation_memory (
        cache_key TEXT PRIMARY KEY, source_language TEXT NOT NULL, target_language TEXT NOT NULL,
        source_text TEXT NOT NULL, translated_text TEXT NOT NULL, provider TEXT, model TEXT,
        hit_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )""")
    return db


def _memory_get_many(source: str, target: str, texts: list[str]) -> dict[str, str]:
    if not texts:
        return {}
    result = _hot_memory_get_many(source, target, texts)
    remaining = [text for text in texts if text not in result]
    keys = {_memory_key(source, target, text): text for text in remaining}
    if not keys:
        return result
    # Reads are concurrent under SQLite WAL. Do not hold the process-wide cache
    # lock and do not synchronously update hit counters for every lookup: on a
    # 20-file PLC batch that created tens of thousands of UPDATE statements and
    # serialized all translation workers.
    with _memory_connect() as db:
        db.execute("PRAGMA query_only=ON")
        key_list=list(keys)
        for start in range(0, len(key_list), 800):
            chunk=key_list[start:start+800]
            marks=','.join('?' for _ in chunk)
            rows=db.execute(f"SELECT cache_key, translated_text FROM translation_memory WHERE cache_key IN ({marks})", chunk).fetchall()
            for key,value in rows:
                result[keys[key]]=value
    _hot_memory_put_many(source, target, result)
    return result




def _memory_delete_many(source: str, target: str, texts: list[str]) -> None:
    """Delete poisoned or invalid persistent translations for the given texts."""
    if not texts:
        return
    unique = list(dict.fromkeys(texts))
    _hot_memory_delete_many(source, target, unique)
    keys=[_memory_key(source,target,text) for text in unique]
    with _CACHE_LOCK, _memory_connect() as db:
        for start in range(0,len(keys),500):
            chunk=keys[start:start+500]
            marks=",".join("?" for _ in chunk)
            db.execute(f"DELETE FROM translation_memory WHERE cache_key IN ({marks})", chunk)

def _memory_put_many(source: str, target: str, rows: dict[str, str], provider: str, model: str) -> None:
    if not rows:
        return
    _hot_memory_put_many(source, target, rows)
    with _CACHE_LOCK, _memory_connect() as db:
        db.executemany("""INSERT INTO translation_memory
            (cache_key, source_language, target_language, source_text, translated_text, provider, model, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(cache_key) DO UPDATE SET translated_text=excluded.translated_text, provider=excluded.provider,
            model=excluded.model, updated_at=CURRENT_TIMESTAMP""", [
                (_memory_key(source,target,text), source,target,text,value,provider,model) for text,value in rows.items()
            ])


class TranslationClient:
    def __init__(self, source_language: str = "auto", target_language: str = "en", custom_source: str = "", custom_target: str = "") -> None:
        self.settings = load_settings(include_secret=True)
        self.source_language_code = str(source_language or "auto").strip().lower()
        self.target_language_code = str(target_language or "en").strip().lower()
        self.source_language = custom_source.strip() or LANGUAGE_NAMES.get(self.source_language_code, source_language)
        self.target_language = custom_target.strip() or LANGUAGE_NAMES.get(self.target_language_code, target_language)
        self.cache: dict[str, str] = {}
        self.cache_hits = 0
        self.persistent_cache_hits = 0
        self._stats_lock = Lock()
        self.request_count = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.elapsed_ms = 0
        cap = capability()
        if not cap.configured:
            raise RuntimeError(cap.message)

    def translate(self, text: str) -> str:
        text = _canonicalize_technical_placeholders(text)
        if not _should_translate(text):
            return text
        if text in self.cache:
            cached = _repair_and_validate_cached_translation(text, self.cache[text], self.target_language_code)
            if cached is not None:
                self.cache[text] = cached
                self.cache_hits += 1
                return cached
            self.cache.pop(text, None)
            _memory_delete_many(self.source_language_code, self.target_language_code, [text])
        persisted = _memory_get_many(self.source_language_code, self.target_language_code, [text])
        if text in persisted:
            cached = _repair_and_validate_cached_translation(text, persisted[text], self.target_language_code)
            if cached is not None:
                self.cache[text] = cached
                self.persistent_cache_hits += 1
                if cached != persisted[text]:
                    _memory_put_many(
                        self.source_language_code, self.target_language_code,
                        {text: cached}, "self-heal", "v32.2.0"
                    )
                return cached
            _memory_delete_many(self.source_language_code, self.target_language_code, [text])
        glossary = _glossary_translation(text, self.source_language_code, self.target_language_code)
        if glossary is not None:
            translated = glossary
        elif _source_already_matches_target(text, self.target_language_code):
            # Do not call the provider for English titles/model names that are
            # already suitable for an English-only customer deliverable.
            translated = text
        else:
            masked, token_map = _mask_protected_tokens(text)
            translated = _clean_provider_translation(text, _restore_protected_tokens(self._request(masked), token_map), self.target_language_code)
            if not _translation_quality_ok(text, translated, self.target_language_code):
                # The previous repair path passed a second translation instruction
                # as user content. Providers then translated that instruction as
                # well as the source, which produced the exact mixed-language
                # output this guard was intended to prevent. Use a strict system
                # instruction while keeping the user content source-only.
                repaired = _clean_provider_translation(
                    text,
                    _restore_protected_tokens(self._request(masked, strict=True), token_map),
                    self.target_language_code,
                )
                if _translation_quality_ok(text, repaired, self.target_language_code):
                    translated = repaired
                elif self.target_language_code == "en":
                    # PPT shapes frequently mix an English model/station prefix
                    # with Chinese prose (for example ``R件定位机构``). Translate
                    # only the CJK runs and preserve the existing English/code
                    # fragments in their original order.
                    segmented = self._translate_cjk_segments_to_english(text)
                    if _translation_quality_ok(text, segmented, self.target_language_code):
                        translated = segmented
        self._validate_translation(translated, source=text)
        self.cache[text] = translated
        _memory_put_many(self.source_language_code, self.target_language_code, {text: translated}, self.settings["provider"], self.settings["model"])
        return translated

    def _translate_cjk_segments_to_english(self, source: str) -> str:
        """Translate Chinese runs inside mixed engineering labels to English.

        Existing Latin text, dimensions, model codes and punctuation are copied
        unchanged. Each Chinese run is sent as source-only content under the
        strict English system instruction, avoiding instruction translation and
        limiting a bad provider response to one small segment instead of failing
        the entire PowerPoint file.
        """
        value = _canonicalize_technical_placeholders(str(source or ""))
        pieces = re.split(r"([\u3400-\u9fff]+)", value)
        output: list[str] = []
        for piece in pieces:
            if not piece:
                continue
            if not re.search(r"[\u3400-\u9fff]", piece):
                output.append(piece)
                continue
            masked, token_map = _mask_protected_tokens(piece)
            candidate = _clean_provider_translation(
                piece,
                _restore_protected_tokens(self._request(masked, strict=True), token_map),
                self.target_language_code,
            ).strip()
            if not candidate or re.search(r"[\u3400-\u9fff]", candidate):
                # One final bounded attempt for the small Chinese phrase.
                candidate = _clean_provider_translation(
                    piece,
                    _restore_protected_tokens(self._request(masked, strict=True), token_map),
                    self.target_language_code,
                ).strip()
            output.append(candidate or piece)
        return "".join(output).strip()

    def translate_resilient(self, text: str) -> str:
        """Translate one document paragraph without allowing one bad shape to abort a PPT.

        The normal fast path is used first.  If provider pollution is detected,
        the paragraph is decomposed by line and punctuation boundaries.  Chinese
        runs are translated independently while existing English/model codes are
        retained.  The final value still passes the same strict placeholder and
        English-only validation before it is returned.
        """
        source = _canonicalize_technical_placeholders(str(text or ""))
        try:
            return self.translate(source)
        except RuntimeError as exc:
            if "source-echoed or polluted mixed-language" not in str(exc):
                raise
        if self.target_language_code != "en":
            raise RuntimeError("Translation provider returned source-echoed or polluted mixed-language output.")

        # Split large PPT paragraphs into bounded units.  Keep separators so the
        # reconstructed text preserves the original visual structure.
        parts = re.split(r"(\r?\n|[。；;！？!?]+)", source)
        rebuilt: list[str] = []
        for part in parts:
            if not part:
                continue
            if re.fullmatch(r"\r?\n|[。；;！？!?]+", part):
                rebuilt.append(part)
                continue
            if not re.search(r"[\u3400-\u9fff]", part):
                rebuilt.append(part)
                continue
            candidate = self._translate_cjk_segments_to_english(part)
            candidate = _clean_provider_translation(part, candidate, self.target_language_code)
            if not _translation_quality_ok(part, candidate, self.target_language_code):
                # Last bounded strict attempt on this small unit.
                masked, token_map = _mask_protected_tokens(part)
                candidate = _clean_provider_translation(
                    part,
                    _restore_protected_tokens(self._request(masked, strict=True), token_map),
                    self.target_language_code,
                )
            self._validate_translation(candidate, source=part)
            rebuilt.append(candidate)
        result = "".join(rebuilt).strip()
        self._validate_translation(result, source=source)
        self.cache[source] = result
        _memory_put_many(
            self.source_language_code, self.target_language_code,
            {source: result}, self.settings["provider"], self.settings["model"],
        )
        return result

    def _validate_translation(self, translated: str, source: str = "") -> None:
        invalid = {"\ufffd", "\u25a1", "\u25a0"}
        if any(ch in translated for ch in invalid):
            raise RuntimeError("The AI provider returned invalid replacement glyphs. Translation was rejected.")
        if "Cần xác nhận bản dịch" in translated or "待确认翻译" in translated:
            raise RuntimeError("Translation provider returned a pending-review placeholder.")
        if source and not _translation_quality_ok(source, translated, self.target_language_code):
            raise RuntimeError("Translation provider returned source-echoed or polluted mixed-language output.")
        if source and not _placeholder_sequence_satisfied(source, translated):
            raise RuntimeError(
                "Protected PLC/HMI placeholder mismatch after translation: "
                + _placeholder_mismatch_details(source, translated)
            )


    def invalidate(self, texts: list[str]) -> None:
        """Remove cached translations so retries must contact the provider again.

        This is used when an earlier run cached the untranslated Chinese source
        under a target-only language key. Without invalidation every retry would
        keep returning the same poisoned cache entry.
        """
        unique=list(dict.fromkeys(str(text) for text in texts if str(text).strip()))
        for text in unique:
            self.cache.pop(text, None)
        _memory_delete_many(self.source_language_code, self.target_language_code, unique)

    def _translate_by_protected_segments(self, source: str) -> str:
        """Translate only prose segments and reinsert every source token exactly.

        This is the deterministic fallback for providers that delete, merge or
        mutate protected markers.  The original source is split around every
        PLC/HMI token, the prose pieces are translated independently, and the
        exact source tokens are interleaved again in their original count and
        order.  Therefore repeated placeholders such as two ``%(WATCH1)d``
        occurrences cannot be lost or swapped.
        """
        source = _canonicalize_technical_placeholders(source)
        matches = list(_PROTECTED_TOKEN_RE.finditer(source))
        if not matches:
            return _canonicalize_technical_placeholders(self._request(source))

        prose_parts: list[str] = []
        tokens: list[str] = []
        cursor = 0
        for match in matches:
            prose_parts.append(source[cursor:match.start()])
            tokens.append(match.group(0))
            cursor = match.end()
        prose_parts.append(source[cursor:])

        # Preserve source-side boundary whitespace around protected tokens.
        # Providers often trim a leading space, which could concatenate AX0
        # with the translated prose and make the PLC code unrecognisable.
        segment_jobs: list[tuple[int, str, str, str]] = []
        translatable: list[str] = []
        for index, part in enumerate(prose_parts):
            if not _should_translate(part):
                continue
            leading = part[: len(part) - len(part.lstrip())]
            trailing = part[len(part.rstrip()):]
            core = part.strip()
            if core:
                segment_jobs.append((index, leading, trailing, core))
                translatable.append(core)
        translated_parts = self._request_batch_resilient(translatable) if translatable else []
        translated_by_index = {
            index: f"{leading}{translated}{trailing}"
            for (index, leading, trailing, _core), translated in zip(segment_jobs, translated_parts)
        }
        rebuilt_parts: list[str] = []
        for index, part in enumerate(prose_parts):
            rebuilt_parts.append(translated_by_index.get(index, part))
            if index < len(tokens):
                rebuilt_parts.append(tokens[index])
        rebuilt = _canonicalize_technical_placeholders("".join(rebuilt_parts))
        if not _placeholder_sequence_satisfied(source, rebuilt):
            raise RuntimeError(
                "Protected PLC/HMI placeholder mismatch after deterministic segment restoration: "
                + _placeholder_mismatch_details(source, rebuilt)
            )
        return rebuilt

    def translate_many(self, texts: list[str]) -> list[str]:
        """Translate unique text with persistent memory and a hard per-file AI budget.

        The previous implementation submitted every provider batch to a thread pool at
        once. Because all requests also passed through a global provider semaphore, a
        slow socket could leave queued futures alive after the caller timed out. This
        implementation deliberately processes provider batches one at a time, logs each
        transition, and stops scheduling new network work when the file budget expires.
        """
        started_total = time.perf_counter()
        canonical_texts = [_canonicalize_technical_placeholders(text) for text in texts]
        results = list(canonical_texts)
        unique = list(dict.fromkeys(text for text in canonical_texts if _should_translate(text)))
        persisted = _memory_get_many(self.source_language_code, self.target_language_code, unique)
        if persisted:
            safe_persisted: dict[str, str] = {}
            repaired_rows: dict[str, str] = {}
            invalid_sources: list[str] = []
            for source, value in persisted.items():
                repaired = _repair_and_validate_cached_translation(source, value, self.target_language_code)
                if repaired is None:
                    invalid_sources.append(source)
                    continue
                safe_persisted[source] = repaired
                if repaired != value:
                    repaired_rows[source] = repaired
            if invalid_sources:
                _memory_delete_many(self.source_language_code, self.target_language_code, invalid_sources)
                for source in invalid_sources:
                    self.cache.pop(source, None)
            if repaired_rows:
                _memory_put_many(
                    self.source_language_code, self.target_language_code,
                    repaired_rows, "self-heal", "v32.2.0"
                )
            self.cache.update(safe_persisted)
            self.persistent_cache_hits += len(safe_persisted)

        glossary_rows = {
            text: value
            for text in unique if text not in self.cache
            for value in [_glossary_translation(text, self.source_language_code, self.target_language_code)]
            if value is not None
        }
        if glossary_rows:
            self.cache.update(glossary_rows)
            _memory_put_many(
                self.source_language_code, self.target_language_code,
                glossary_rows, "glossary", "v31"
            )

        missing = [text for text in unique if text not in self.cache]
        failed_batches = 0
        timed_out_batches = 0
        skipped_batches = 0
        completed_batches = 0
        translated_rows: dict[str, str] = {}

        if missing:
            average_chars = sum(len(text) for text in missing) / max(1, len(missing))
            default_items = 160 if average_chars <= 28 else 100
            default_chars = 18000 if average_chars <= 28 else 14000
            max_items = max(30, min(300, int(os.getenv("TRANSLATION_BATCH_ITEMS", str(default_items)))))
            max_chars = max(4000, min(32000, int(os.getenv("TRANSLATION_BATCH_CHARS", str(default_chars)))))
            batches: list[list[str]] = []
            current: list[str] = []
            chars = 0
            for text in missing:
                if current and (len(current) >= max_items or chars + len(text) > max_chars):
                    batches.append(current)
                    current = []
                    chars = 0
                current.append(text)
                chars += len(text)
            if current:
                batches.append(current)

            budget_seconds = max(20, min(180, int(os.getenv("TRANSLATION_FILE_AI_BUDGET_SECONDS", "55"))))
            deadline = time.monotonic() + budget_seconds

            def run(batch: list[str]) -> dict[str, str]:
                masked_batch: list[str] = []
                maps: list[dict[str, str]] = []
                for source in batch:
                    masked, token_map = _mask_protected_tokens(source)
                    masked_batch.append(masked)
                    maps.append(token_map)
                # No recursive provider fan-out: one provider request per batch.
                values = self._request_batch(masked_batch)
                rows: dict[str, str] = {}
                for source, value, token_map in zip(batch, values, maps):
                    restored = _restore_protected_tokens(str(value or "").strip(), token_map)
                    repaired = _repair_and_validate_cached_translation(source, restored, self.target_language_code)
                    if repaired is None:
                        repaired = self._translate_by_protected_segments(source)
                    if not _placeholder_sequence_satisfied(source, repaired):
                        repaired = self._translate_by_protected_segments(source)
                    if not _placeholder_sequence_satisfied(source, repaired):
                        raise RuntimeError(
                            "Protected PLC/HMI placeholder mismatch after source-driven restoration: "
                            + _placeholder_mismatch_details(source, repaired)
                        )
                    rows[source] = repaired
                return rows

            total_batches = len(batches)
            for batch_index, batch in enumerate(batches, start=1):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    skipped_batches += total_batches - batch_index + 1
                    LOGGER.warning(
                        "AI_BUDGET state=EXHAUSTED batch=%s/%s skipped=%s budget=%ss",
                        batch_index, total_batches, total_batches - batch_index + 1, budget_seconds,
                    )
                    break
                started_batch = time.monotonic()
                LOGGER.info(
                    "AI_BATCH state=ENTER batch=%s/%s items=%s remaining=%.2fs",
                    batch_index, total_batches, len(batch), remaining,
                )
                try:
                    # urllib already has a socket timeout. Clamp it to the remaining
                    # file budget so one batch cannot consume time reserved for later
                    # files. Restore the configured timeout immediately afterwards.
                    original_timeout = self.settings.get("timeout_seconds", 35)
                    self.settings["timeout_seconds"] = max(5, min(int(original_timeout), int(max(5, remaining))))
                    original_retries = self.settings.get("max_retries", 0)
                    self.settings["max_retries"] = 0
                    try:
                        rows = run(batch)
                    finally:
                        self.settings["timeout_seconds"] = original_timeout
                        self.settings["max_retries"] = original_retries
                    translated_rows.update(rows)
                    completed_batches += 1
                    LOGGER.info(
                        "AI_BATCH state=RETURN batch=%s/%s items=%s translated=%s elapsed=%.3fs",
                        batch_index, total_batches, len(batch), len(rows), time.monotonic() - started_batch,
                    )
                except TimeoutError as exc:
                    timed_out_batches += 1
                    LOGGER.warning(
                        "AI_BATCH state=TIMEOUT batch=%s/%s items=%s elapsed=%.3fs error=%s",
                        batch_index, total_batches, len(batch), time.monotonic() - started_batch, exc,
                    )
                except Exception as exc:
                    failed_batches += 1
                    LOGGER.warning(
                        "AI_BATCH state=ERROR batch=%s/%s items=%s elapsed=%.3fs error=%s",
                        batch_index, total_batches, len(batch), time.monotonic() - started_batch, exc,
                    )

            for source, value in translated_rows.items():
                self._validate_translation(value, source=source)
            if translated_rows:
                self.cache.update(translated_rows)
                _memory_put_many(
                    self.source_language_code, self.target_language_code,
                    translated_rows, self.settings["provider"], self.settings["model"]
                )

        for index, text in enumerate(canonical_texts):
            if _should_translate(text):
                results[index] = self.cache.get(text, text)
        elapsed = time.perf_counter() - started_total
        self.last_batch_stats = {
            "input_items": len(texts),
            "unique_items": len(unique),
            "memory_hits": len(persisted),
            "rule_hits": len(glossary_rows),
            "ai_items": len(missing),
            "elapsed_seconds": round(elapsed, 3),
            "request_count_total": self.request_count,
            "completed_batches": completed_batches,
            "failed_batches": failed_batches,
            "timed_out_batches": timed_out_batches,
            "skipped_batches": skipped_batches,
        }
        return results


    def _request_batch_resilient(self, texts: list[str], depth: int = 0) -> list[str]:
        """Translate a batch with a strictly bounded recovery tree.

        V39 recursively split malformed responses all the way down to one-item
        requests. One bad 160-item response could therefore create hundreds of
        network calls and stall an order for hours. V40 permits at most two split
        levels and never falls back to per-cell network requests. Failed leaves
        return the source text so the caller can apply deterministic repair or
        surface a review warning without blocking delivery.
        """
        if not texts:
            return []
        try:
            values = self._request_batch(texts)
            if len(values) != len(texts):
                raise RuntimeError(
                    f"Batch translation count mismatch: expected {len(texts)}, got {len(values)}"
                )
            return values
        except Exception:
            max_depth = max(0, min(3, int(os.getenv("TRANSLATION_MAX_SPLIT_DEPTH", "2"))))
            min_leaf = max(4, min(40, int(os.getenv("TRANSLATION_MIN_SPLIT_ITEMS", "12"))))
            if depth >= max_depth or len(texts) <= min_leaf:
                return list(texts)
            middle = len(texts) // 2
            return (
                self._request_batch_resilient(texts[:middle], depth + 1)
                + self._request_batch_resilient(texts[middle:], depth + 1)
            )

    def _request_batch(self, texts: list[str]) -> list[str]:
        payload_text = json.dumps(texts, ensure_ascii=False)
        instruction = (
            "Translate every string in the JSON array below independently from "
            f"{self.source_language} into {self.target_language}. Return ONLY a valid JSON array "
            "of strings with exactly the same number and order. Preserve codes, numbers, placeholders "
            "and line breaks inside each item. Tokens shaped like __DA_TOKEN_000__ are immutable: copy them exactly, "
            "in the same count and order. Never output pending-review phrases such as Cần xác nhận bản dịch. "
            "Use professional industrial automation terminology. Do not add markdown or explanations.\n" + payload_text
        )
        raw = self._request(instruction, batch_mode=True)
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.I)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        start, end = cleaned.find("["), cleaned.rfind("]")
        if start < 0 or end < start:
            raise RuntimeError("AI provider did not return a JSON translation array.")
        values = json.loads(cleaned[start:end + 1])
        if not isinstance(values, list) or not all(isinstance(item, str) for item in values):
            raise RuntimeError("AI provider returned an invalid translation array.")
        return values

    def _request(self, text: str, batch_mode: bool = False, strict: bool = False) -> str:
        # File workers and per-file batch workers previously multiplied into up
        # to 15 simultaneous API calls. Providers throttled those requests,
        # causing recursive retries and very long 70% stalls. Keep one global
        # bounded provider lane while preserving parallel parsing and workbook I/O.
        with _PROVIDER_LIMIT:
            return self._request_unlocked(text, batch_mode=batch_mode, strict=strict)

    def _request_unlocked(self, text: str, batch_mode: bool = False, strict: bool = False) -> str:
        provider = self.settings["provider"]
        provider_meta = PROVIDER_DEFAULTS[provider]
        protocol = provider_meta["protocol"]
        if strict:
            system = (
                "You are a professional industrial-automation translator. The user message contains SOURCE TEXT ONLY. "
                f"Translate it completely from {self.source_language} into {self.target_language}. "
                "Return ONLY the final target-language text. Never repeat, quote, label or explain the source. "
                "For English output, no Chinese characters may remain. Preserve existing English model names, station "
                "codes, numbers, dimensions, placeholders, punctuation and line breaks exactly where practical. "
                "Use concise professional equipment-engineering terminology and normal Unicode characters only."
            )
        else:
            system = (
                "You are a professional document translator. Translate accurately from "
                f"{self.source_language} into {self.target_language}. Preserve numbers, product names, codes, "
                "line breaks, punctuation and placeholders. Use normal Unicode characters only. Never replace readable "
                "characters with square boxes, question marks, replacement glyphs, or invented placeholders. "
                + ("Follow the user's JSON-array output contract exactly." if batch_mode else "Return only the translated text, with no explanation.")
            )
        if protocol == "openai":
            endpoint = f"{self.settings['base_url']}/chat/completions"
            payload = {
                "model": self.settings["model"],
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": text}],
                "temperature": 0.1,
            }
            headers = {"Authorization": f"Bearer {self.settings['api_key']}"}
        elif protocol == "azure":
            endpoint = f"{self.settings['base_url']}/openai/deployments/{self.settings['model']}/chat/completions?api-version=2024-10-21"
            payload = {
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": text}],
                "temperature": 0.1,
            }
            headers = {"api-key": self.settings["api_key"]}
        elif protocol == "gemini":
            endpoint = f"{self.settings['base_url']}/models/{self.settings['model']}:generateContent?key={self.settings['api_key']}"
            payload = {
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": text}]}],
                "generationConfig": {"temperature": 0.1},
            }
            headers = {}
        else:
            endpoint = f"{self.settings['base_url']}/messages"
            payload = {
                "model": self.settings["model"], "max_tokens": 4096, "temperature": 0.1,
                "system": system, "messages": [{"role": "user", "content": text}],
            }
            headers = {"x-api-key": self.settings["api_key"], "anthropic-version": "2023-06-01"}
        headers.update({"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "DocumentAutomationAI/40.0.0"})
        selected_model = _normalize_provider_model(provider, self.settings.get("model", ""), self.settings.get("base_url", ""))
        self.settings["model"] = selected_model
        model_fallback_used = False
        last_error: Exception | None = None
        for attempt in range(self.settings["max_retries"] + 1):
            if protocol in {"openai", "gemini", "claude"}:
                payload["model"] = selected_model
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            started = time.perf_counter()
            try:
                request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
                with urllib.request.urlopen(request, timeout=self.settings["timeout_seconds"]) as response:
                    result = json.loads(response.read().decode("utf-8"))
                if protocol in {"openai", "azure"}:
                    content = result["choices"][0]["message"]["content"]
                    usage = result.get("usage") or {}
                    input_tokens = int(usage.get("prompt_tokens") or 0)
                    output_tokens = int(usage.get("completion_tokens") or 0)
                elif protocol == "gemini":
                    content = "".join(part.get("text", "") for part in result["candidates"][0]["content"]["parts"])
                    usage = result.get("usageMetadata") or {}
                    input_tokens = int(usage.get("promptTokenCount") or 0)
                    output_tokens = int(usage.get("candidatesTokenCount") or 0)
                else:
                    content = "".join(item.get("text", "") for item in result.get("content", []) if item.get("type") == "text")
                    usage = result.get("usage") or {}
                    input_tokens = int(usage.get("input_tokens") or 0)
                    output_tokens = int(usage.get("output_tokens") or 0)
                translated = str(content).strip()
                if not translated:
                    raise RuntimeError("The AI provider returned an empty translation.")
                with self._stats_lock:
                    self.request_count += 1
                    self.input_tokens += input_tokens
                    self.output_tokens += output_tokens
                    self.elapsed_ms += round((time.perf_counter() - started) * 1000)
                return translated
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:1200]
                last_error = RuntimeError(f"{provider} API error {exc.code}: {detail}")
                if provider == "deepseek" and exc.code == 400 and not model_fallback_used:
                    supported = _extract_supported_models(detail)
                    preferred = next((name for name in supported if name.endswith("-flash")), None)
                    fallback = preferred or next((name for name in supported if name in _DEEPSEEK_V4_MODELS), None)
                    if fallback and fallback != selected_model:
                        selected_model = fallback
                        self.settings["model"] = fallback
                        model_fallback_used = True
                        continue
                if exc.code not in {408, 409, 429, 500, 502, 503, 504}:
                    break
            except (urllib.error.URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError) as exc:
                last_error = RuntimeError(f"{provider} translation request failed: {exc}")
            if attempt < self.settings["max_retries"]:
                time.sleep(min(1.0, 0.5 * (attempt + 1)))
        raise last_error or RuntimeError("AI translation request failed.")

    def usage_summary(self) -> dict[str, Any]:
        provider = self.settings["provider"]
        meta = PROVIDER_DEFAULTS[provider]
        estimated_cost = (
            self.input_tokens / 1_000_000 * meta["input_cost_per_million"]
            + self.output_tokens / 1_000_000 * meta["output_cost_per_million"]
        )
        return {
            "provider": provider,
            "model": self.settings["model"],
            "request_count": self.request_count,
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total_tokens": self.input_tokens + self.output_tokens,
            "memory_cache_hits": self.persistent_cache_hits,
            "unique_texts": len(self.cache),
            "cache_hit_rate": round((self.persistent_cache_hits + self.cache_hits) / max(1, len(self.cache) + self.persistent_cache_hits + self.cache_hits), 4),
            "session_cache_hits": self.cache_hits,
            "elapsed_ms": self.elapsed_ms,
            "estimated_cost_usd": round(estimated_cost, 6),
        }


def test_connection(text: str = "测试自动翻译", target_language: str = "en") -> dict[str, Any]:
    started = time.perf_counter()
    client = TranslationClient(source_language="auto", target_language=target_language)
    translated = client.translate(text)
    return {
        "success": True,
        "provider": client.settings["provider"],
        "model": client.settings["model"],
        "source_text": text,
        "translated_text": translated,
        "elapsed_ms": round((time.perf_counter() - started) * 1000),
        "usage": client.usage_summary(),
    }
