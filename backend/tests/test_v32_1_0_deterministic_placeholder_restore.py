from app.engines.translation_engine import (
    TranslationClient,
    _canonicalize_technical_placeholders,
    _technical_placeholders,
)


def _client_without_init():
    return object.__new__(TranslationClient)


def test_canonicalizes_customer_watch1_variant():
    value = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1) - d。"
    fixed = _canonicalize_technical_placeholders(value)
    assert fixed.count("%(WATCH1)d") == 2
    assert "%(WATCH1) - d" not in fixed


def test_segment_fallback_reinserts_repeated_tokens_exactly(monkeypatch):
    client = _client_without_init()

    def fake_batch(parts):
        return [f"VI:{part}" for part in parts]

    monkeypatch.setattr(client, "_request_batch_resilient", fake_batch)
    source = "AX0 翻转X轴不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    result = client._translate_by_protected_segments(source)
    assert _technical_placeholders(result) == _technical_placeholders(source)
    assert result.count("%(WATCH1)d") == 2
    assert result.count("AX0") == 1


def test_segment_fallback_handles_many_identical_placeholders(monkeypatch):
    client = _client_without_init()
    monkeypatch.setattr(client, "_request_batch_resilient", lambda parts: ["VI" for _ in parts])
    source = "%(WATCH1)d A %(WATCH1)d B %(WATCH1)d C %(WATCH1)d"
    result = client._translate_by_protected_segments(source)
    assert result.count("%(WATCH1)d") == 4
    assert _technical_placeholders(result) == _technical_placeholders(source)
