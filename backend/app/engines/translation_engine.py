from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path
from threading import Lock
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[2]
_data_root = os.getenv("APP_DATA_DIR", "").strip()
PERSISTENT_ROOT = Path(_data_root).expanduser().resolve() if _data_root else BASE_DIR
SETTINGS_PATH = PERSISTENT_ROOT / "data" / "ai_settings.json"
_SETTINGS_LOCK = Lock()


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
    "api_key": "",
    "model": "",
    "base_url": "",
    "timeout_seconds": 90,
    "max_retries": 2,
}

PROVIDER_DEFAULTS = {
    "openai": {
        "label": "OpenAI",
        "model": "gpt-4.1-mini",
        "base_url": "https://api.openai.com/v1",
        "protocol": "openai",
        "input_cost_per_million": 0.40,
        "output_cost_per_million": 1.60,
    },
    "deepseek": {
        "label": "DeepSeek",
        "model": "deepseek-chat",
        "base_url": "https://api.deepseek.com/v1",
        "protocol": "openai",
        "input_cost_per_million": 0.27,
        "output_cost_per_million": 1.10,
    },
    "gemini": {
        "label": "Google Gemini",
        "model": "gemini-2.5-flash",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "protocol": "gemini",
        "input_cost_per_million": 0.30,
        "output_cost_per_million": 2.50,
    },
    "claude": {
        "label": "Anthropic Claude",
        "model": "claude-3-5-haiku-latest",
        "base_url": "https://api.anthropic.com/v1",
        "protocol": "claude",
        "input_cost_per_million": 0.80,
        "output_cost_per_million": 4.00,
    },
}

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
}


def _env_settings() -> dict[str, Any]:
    provider = os.getenv("TRANSLATION_PROVIDER", "none").strip().lower()
    env_prefix = {
        "openai": "OPENAI",
        "deepseek": "DEEPSEEK",
        "gemini": "GEMINI",
        "claude": "CLAUDE",
    }.get(provider)
    if env_prefix and provider in PROVIDER_DEFAULTS:
        return {
            "provider": provider,
            "api_key": os.getenv(f"{env_prefix}_API_KEY", ""),
            "model": os.getenv(f"{env_prefix}_MODEL", PROVIDER_DEFAULTS[provider]["model"]),
            "base_url": os.getenv(f"{env_prefix}_BASE_URL", PROVIDER_DEFAULTS[provider]["base_url"]),
            "timeout_seconds": int(os.getenv("TRANSLATION_TIMEOUT_SECONDS", "90")),
            "max_retries": int(os.getenv("TRANSLATION_MAX_RETRIES", "2")),
        }
    return DEFAULTS.copy()


def load_settings(include_secret: bool = True) -> dict[str, Any]:
    settings = _env_settings()
    if SETTINGS_PATH.exists():
        try:
            stored = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                settings.update({k: v for k, v in stored.items() if k in DEFAULTS})
        except (OSError, json.JSONDecodeError):
            pass
    provider = str(settings.get("provider", "none")).strip().lower()
    settings["provider"] = provider
    defaults = PROVIDER_DEFAULTS.get(provider, {})
    settings["model"] = str(settings.get("model") or defaults.get("model", ""))
    settings["base_url"] = str(settings.get("base_url") or defaults.get("base_url", "")).rstrip("/")
    settings["api_key"] = str(settings.get("api_key") or "")
    settings["timeout_seconds"] = max(10, min(300, int(settings.get("timeout_seconds") or 90)))
    settings["max_retries"] = max(0, min(5, int(settings.get("max_retries") or 2)))
    if not include_secret:
        key = settings["api_key"]
        settings["api_key_masked"] = (f"{key[:4]}...{key[-4:]}" if len(key) >= 10 else ("已配置" if key else ""))
        settings.pop("api_key", None)
    return settings


def save_settings(payload: dict[str, Any]) -> dict[str, Any]:
    provider = str(payload.get("provider", "none")).strip().lower()
    if provider not in {"none", *PROVIDER_DEFAULTS.keys()}:
        raise ValueError("Unsupported translation provider.")
    current = load_settings(include_secret=True)
    data = DEFAULTS.copy()
    data.update(current)
    data["provider"] = provider
    for field in ("model", "base_url"):
        if field in payload:
            data[field] = str(payload.get(field) or "").strip()
    if "api_key" in payload and str(payload.get("api_key") or "").strip():
        data["api_key"] = str(payload["api_key"]).strip()
    if payload.get("clear_api_key"):
        data["api_key"] = ""
    if "timeout_seconds" in payload:
        data["timeout_seconds"] = int(payload["timeout_seconds"])
    if "max_retries" in payload:
        data["max_retries"] = int(payload["max_retries"])
    defaults = PROVIDER_DEFAULTS.get(provider, {})
    data["model"] = data.get("model") or defaults.get("model", "")
    data["base_url"] = (data.get("base_url") or defaults.get("base_url", "")).rstrip("/")
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
            "base_url": values["base_url"],
        }
        for provider_id, values in PROVIDER_DEFAULTS.items()
    ]
    return result


def _should_translate(text: str) -> bool:
    value = text.strip()
    if not value or len(value) == 1 and not value.isalpha():
        return False
    if value.startswith(("http://", "https://", "mailto:")):
        return False
    if re.fullmatch(r"[\d\s.,:;/%+\-_=()\[\]{}<>#@|\\]+", value):
        return False
    return any(ch.isalpha() or "\u3400" <= ch <= "\u9fff" for ch in value)


class TranslationClient:
    def __init__(self, source_language: str = "auto", target_language: str = "en", custom_source: str = "", custom_target: str = "") -> None:
        self.settings = load_settings(include_secret=True)
        self.source_language = custom_source.strip() or LANGUAGE_NAMES.get(source_language, source_language)
        self.target_language = custom_target.strip() or LANGUAGE_NAMES.get(target_language, target_language)
        self.cache: dict[str, str] = {}
        self.request_count = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.elapsed_ms = 0
        cap = capability()
        if not cap.configured:
            raise RuntimeError(cap.message)

    def translate(self, text: str) -> str:
        if not _should_translate(text):
            return text
        if text in self.cache:
            return self.cache[text]
        translated = self._request(text)
        self.cache[text] = translated
        return translated

    def _request(self, text: str) -> str:
        provider = self.settings["provider"]
        provider_meta = PROVIDER_DEFAULTS[provider]
        protocol = provider_meta["protocol"]
        system = (
            "You are a professional document translator. Translate the user's text accurately from "
            f"{self.source_language} into {self.target_language}. Preserve numbers, product names, codes, "
            "line breaks, punctuation and placeholders. Return only the translated text, with no explanation."
        )
        if protocol == "openai":
            endpoint = f"{self.settings['base_url']}/chat/completions"
            payload = {
                "model": self.settings["model"],
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": text}],
                "temperature": 0.1,
            }
            headers = {"Authorization": f"Bearer {self.settings['api_key']}"}
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
        headers.update({"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "DocumentAutomationAI/9.2"})
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        last_error: Exception | None = None
        for attempt in range(self.settings["max_retries"] + 1):
            started = time.perf_counter()
            try:
                request = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
                with urllib.request.urlopen(request, timeout=self.settings["timeout_seconds"]) as response:
                    result = json.loads(response.read().decode("utf-8"))
                if protocol == "openai":
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
                self.request_count += 1
                self.input_tokens += input_tokens
                self.output_tokens += output_tokens
                self.elapsed_ms += round((time.perf_counter() - started) * 1000)
                return translated
            except urllib.error.HTTPError as exc:
                detail = exc.read().decode("utf-8", errors="replace")[:800]
                last_error = RuntimeError(f"{provider} API error {exc.code}: {detail}")
                if exc.code not in {408, 409, 429, 500, 502, 503, 504}:
                    break
            except (urllib.error.URLError, TimeoutError, KeyError, ValueError, json.JSONDecodeError) as exc:
                last_error = RuntimeError(f"{provider} translation request failed: {exc}")
            if attempt < self.settings["max_retries"]:
                time.sleep(1.5 * (attempt + 1))
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
