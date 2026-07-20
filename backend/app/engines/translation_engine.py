from __future__ import annotations

import json
import os
import re
import time
import tempfile
import urllib.error
import urllib.request
import sqlite3
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from pathlib import Path
from threading import Lock
from typing import Any

BASE_DIR = Path(__file__).resolve().parents[2]
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
TRANSLATION_MEMORY_PATH = PERSISTENT_ROOT / "data" / "translation_memory.db"


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
        "models": ["deepseek-chat", "deepseek-reasoner"],
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
    provider = os.getenv("TRANSLATION_PROVIDER", "none").strip().lower()
    profiles = _empty_profiles()
    env_prefix = {
        "openai": "OPENAI", "deepseek": "DEEPSEEK", "gemini": "GEMINI",
        "claude": "CLAUDE", "openrouter": "OPENROUTER",
    }.get(provider)
    if env_prefix and provider in PROVIDER_DEFAULTS:
        profiles[provider] = {
            "api_key": os.getenv(f"{env_prefix}_API_KEY", ""),
            "model": os.getenv(f"{env_prefix}_MODEL", PROVIDER_DEFAULTS[provider]["model"]),
            "base_url": os.getenv(f"{env_prefix}_BASE_URL", PROVIDER_DEFAULTS[provider]["base_url"]),
        }
    return {
        "provider": provider,
        "profiles": profiles,
        "timeout_seconds": int(os.getenv("TRANSLATION_TIMEOUT_SECONDS", "90")),
        "max_retries": int(os.getenv("TRANSLATION_MAX_RETRIES", "2")),
    }


def load_settings(include_secret: bool = True) -> dict[str, Any]:
    settings = _env_settings()
    if SETTINGS_PATH.exists():
        try:
            stored = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                settings.update({k: v for k, v in stored.items() if k in DEFAULTS})
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
    settings["profiles"] = profiles
    settings["timeout_seconds"] = max(10, min(300, int(settings.get("timeout_seconds") or 90)))
    settings["max_retries"] = max(0, min(5, int(settings.get("max_retries") or 2)))
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


def _should_translate(text: str) -> bool:
    value = text.strip()
    if not value or len(value) == 1 and not value.isalpha():
        return False
    if value.startswith(("http://", "https://", "mailto:")):
        return False
    if value.upper() in {"#N/A", "#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NULL!", "#NUM!"}:
        return False
    if re.fullmatch(r"[\d\s.,:;/%+\-_=()\[\]{}<>#@|\\]+", value):
        return False
    if re.fullmatch(r"(?:[A-Za-z]{0,5}\d+[A-Za-z0-9_.:/\-]*|[A-Z]{1,8}[_-][A-Z0-9_.:/\-]+)", value):
        return False
    return any(ch.isalpha() or "\u3400" <= ch <= "\u9fff" for ch in value)


def _memory_key(source: str, target: str, text: str) -> str:
    return hashlib.sha256(f"{source}\0{target}\0{text}".encode("utf-8")).hexdigest()


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
    keys = {_memory_key(source, target, text): text for text in texts}
    if not keys:
        return {}
    result: dict[str, str] = {}
    with _CACHE_LOCK, _memory_connect() as db:
        key_list=list(keys)
        for start in range(0, len(key_list), 500):
            chunk=key_list[start:start+500]
            marks=','.join('?' for _ in chunk)
            rows=db.execute(f"SELECT cache_key, translated_text FROM translation_memory WHERE cache_key IN ({marks})", chunk).fetchall()
            for key,value in rows:
                result[keys[key]]=value
                db.execute("UPDATE translation_memory SET hit_count=hit_count+1 WHERE cache_key=?", (key,))
    return result


def _memory_put_many(source: str, target: str, rows: dict[str, str], provider: str, model: str) -> None:
    if not rows:
        return
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
        if not _should_translate(text):
            return text
        if text in self.cache:
            self.cache_hits += 1
            return self.cache[text]
        persisted = _memory_get_many(self.source_language_code, self.target_language_code, [text])
        if text in persisted:
            self.cache[text] = persisted[text]
            self.persistent_cache_hits += 1
            return persisted[text]
        translated = self._request(text)
        self._validate_translation(translated)
        self.cache[text] = translated
        _memory_put_many(self.source_language_code, self.target_language_code, {text: translated}, self.settings["provider"], self.settings["model"])
        return translated

    @staticmethod
    def _validate_translation(translated: str) -> None:
        invalid = {"\ufffd", "\u25a1", "\u25a0"}
        if any(ch in translated for ch in invalid):
            raise RuntimeError("The AI provider returned invalid replacement glyphs. Translation was rejected.")

    def translate_many(self, texts: list[str]) -> list[str]:
        """Translate unique text with persistent memory and bounded parallel API batches."""
        results = list(texts)
        unique = list(dict.fromkeys(text for text in texts if _should_translate(text)))
        persisted = _memory_get_many(self.source_language_code, self.target_language_code, unique)
        if persisted:
            self.cache.update(persisted)
            self.persistent_cache_hits += len(persisted)
        missing = [text for text in unique if text not in self.cache]
        if missing:
            max_items = max(20, min(200, int(os.getenv("TRANSLATION_BATCH_ITEMS", "120"))))
            max_chars = max(3000, min(30000, int(os.getenv("TRANSLATION_BATCH_CHARS", "14000"))))
            batches=[]; current=[]; chars=0
            for text in missing:
                if current and (len(current)>=max_items or chars+len(text)>max_chars):
                    batches.append(current); current=[]; chars=0
                current.append(text); chars += len(text)
            if current: batches.append(current)
            workers=max(1,min(int(os.getenv("TRANSLATION_CONCURRENCY","4")),len(batches),6))
            translated_rows: dict[str,str] = {}
            def run(batch):
                values=self._request_batch_resilient(batch)
                return {src:(str(val or '').strip() or src) for src,val in zip(batch,values)}
            if workers == 1:
                for batch in batches: translated_rows.update(run(batch))
            else:
                with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="translate") as pool:
                    futures=[pool.submit(run,b) for b in batches]
                    for future in as_completed(futures): translated_rows.update(future.result())
            for source,value in translated_rows.items():
                self._validate_translation(value)
            self.cache.update(translated_rows)
            _memory_put_many(self.source_language_code, self.target_language_code, translated_rows, self.settings["provider"], self.settings["model"])
        for index,text in enumerate(texts):
            if _should_translate(text): results[index]=self.cache.get(text,text)
        return results


    def _request_batch_resilient(self, texts: list[str]) -> list[str]:
        """Translate a batch without exploding into one request per cell.

        Some models occasionally return malformed JSON for a large batch. The old
        fallback retried every item separately, turning one bad response into dozens
        of slow network calls. This implementation recursively halves the batch and
        only falls back to a single-text request for a one-item batch.
        """
        try:
            values = self._request_batch(texts)
            if len(values) != len(texts):
                raise RuntimeError(
                    f"Batch translation count mismatch: expected {len(texts)}, got {len(values)}"
                )
            return values
        except Exception:
            if len(texts) == 1:
                return [self.translate(texts[0])]
            middle = len(texts) // 2
            return self._request_batch_resilient(texts[:middle]) + self._request_batch_resilient(texts[middle:])

    def _request_batch(self, texts: list[str]) -> list[str]:
        payload_text = json.dumps(texts, ensure_ascii=False)
        instruction = (
            "Translate every string in the JSON array below independently from "
            f"{self.source_language} into {self.target_language}. Return ONLY a valid JSON array "
            "of strings with exactly the same number and order. Preserve codes, numbers, placeholders "
            "and line breaks inside each item. Do not add markdown or explanations.\n" + payload_text
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

    def _request(self, text: str, batch_mode: bool = False) -> str:
        provider = self.settings["provider"]
        provider_meta = PROVIDER_DEFAULTS[provider]
        protocol = provider_meta["protocol"]
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
        headers.update({"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "DocumentAutomationAI/12.0.6"})
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
                with self._stats_lock:
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
            "memory_cache_hits": self.persistent_cache_hits,
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
