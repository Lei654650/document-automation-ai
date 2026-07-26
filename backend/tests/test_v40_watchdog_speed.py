import os
import time

from app.engines.translation_engine import TranslationClient


def _client():
    client = object.__new__(TranslationClient)
    return client


def test_bounded_recovery_does_not_fall_back_to_single_items(monkeypatch):
    client = _client()
    calls = []

    def fail(texts):
        calls.append(len(texts))
        raise RuntimeError("bad payload")

    client._request_batch = fail
    monkeypatch.setenv("TRANSLATION_MAX_SPLIT_DEPTH", "2")
    monkeypatch.setenv("TRANSLATION_MIN_SPLIT_ITEMS", "12")
    source = [f"文本{i}" for i in range(160)]
    result = client._request_batch_resilient(source)
    assert result == source
    assert len(calls) <= 7
    assert min(calls) >= 40


def test_retry_attempt_count_is_bounded():
    source = open("backend/app/engines/translation_engine.py", encoding="utf-8").read()
    assert 'range(self.settings["max_retries"] + 1)' in source
    assert 'range(self.settings["max_retries"] + 2)' not in source


def test_v40_defaults_prioritize_completion_speed():
    source = open("backend/app/engines/translation_engine.py", encoding="utf-8").read()
    assert 'TRANSLATION_TIMEOUT_SECONDS", "35"' in source
    assert 'TRANSLATION_MAX_RETRIES", "0"' in source
    assert 'TRANSLATION_BATCH_WATCHDOG_SECONDS", "80"' in source
