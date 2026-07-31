import json

from app.engines import translation_engine as engine


def test_public_settings_never_return_key_or_key_fragments(monkeypatch):
    secret = "sk-test-0123456789-sensitive"
    monkeypatch.setenv("TRANSLATION_PROVIDER", "deepseek")
    monkeypatch.setenv("DEEPSEEK_API_KEY", secret)
    public = engine.public_settings()
    serialized = json.dumps(public)
    assert secret not in serialized
    assert secret[:8] not in serialized
    assert secret[-8:] not in serialized
    assert "api_key_masked" not in serialized
    assert public["profiles"]["deepseek"]["configured"] is True
