from app.engines import translation_engine as engine


def test_both_provider_profiles_load_from_environment(monkeypatch):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "deepseek")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "deepseek-test-value")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-test-value")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.6-terra")
    settings = engine.load_settings()
    assert settings["profiles"]["deepseek"]["api_key"] == "deepseek-test-value"
    assert settings["profiles"]["openai"]["api_key"] == "openai-test-value"
    assert settings["profiles"]["openai"]["model"] == "gpt-5.6-terra"


def test_explicit_provider_is_selected(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-5.6-terra")
    client = engine.TranslationClient(provider="openai", entitlement={"admin_provider_test": True})
    assert client.settings["provider"] == "openai"
    assert client.settings["model"] == "gpt-5.6-terra"


def test_eligible_transient_failure_fails_over_once(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai")
    monkeypatch.setenv("DUAL_PROVIDER_ENABLED", "true")
    monkeypatch.setenv("OPENAI_FAILOVER_ENABLED", "true")
    client = engine.TranslationClient(
        provider="deepseek", entitlement={"openai_allowed": True}
    )
    calls = []

    def fake_unlocked(text, batch_mode=False):
        calls.append(client.settings["provider"])
        if client.settings["provider"] == "deepseek":
            raise RuntimeError("deepseek API error 503")
        return "translated"

    monkeypatch.setattr(client, "_request_unlocked", fake_unlocked)
    assert client._request("source") == "translated"
    assert calls == ["deepseek", "openai"]
    assert client.provider_attempts[0]["error_category"] == "provider_5xx"


def test_authentication_failure_never_fails_over(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai")
    monkeypatch.setenv("DUAL_PROVIDER_ENABLED", "true")
    monkeypatch.setenv("OPENAI_FAILOVER_ENABLED", "true")
    client = engine.TranslationClient(
        provider="deepseek", entitlement={"openai_allowed": True}
    )
    monkeypatch.setattr(
        client, "_request_unlocked",
        lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("deepseek API error 401")),
    )
    import pytest
    with pytest.raises(RuntimeError, match="401"):
        client._request("source")
    assert client.settings["provider"] == "deepseek"
