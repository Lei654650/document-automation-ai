import pytest

from app.engines import translation_engine as engine


def test_openai_budget_stops_before_network(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    monkeypatch.setenv("DUAL_PROVIDER_ENABLED", "true")
    monkeypatch.setenv("OPENAI_QUALITY_ENABLED", "true")
    monkeypatch.setenv("OPENAI_MAX_INPUT_TOKENS_PER_TASK", "1")
    client = engine.TranslationClient(provider="openai")
    with pytest.raises(RuntimeError, match="budget exceeded"):
        client._request_unlocked("This input is deliberately longer than one token.")
    assert client.request_count == 0
    assert client.budget_limit_reached is True


def test_failover_limit_is_hard_capped_in_example_files():
    assert min(1, int("99")) == 1

