from app.engines import translation_engine as engine


def test_cache_key_is_provider_and_model_isolated():
    base = ("auto", "zh", "same text")
    deepseek = engine._memory_key("deepseek", "deepseek-v4-flash", *base)
    openai = engine._memory_key("openai", "gpt-5.6-terra", *base)
    other_model = engine._memory_key("openai", "another-model", *base)
    assert len({deepseek, openai, other_model}) == 3


def test_usage_contains_provider_model_and_attempts(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test")
    client = engine.TranslationClient(provider="deepseek")
    summary = client.usage_summary()
    assert summary["provider"] == "deepseek"
    assert summary["model"]
    assert summary["provider_attempts"] == []

