from pathlib import Path

from app.engines.translation_engine import TranslationClient
from app.engines.conversion_engine import convert_outputs


def test_batch_resilient_stops_before_single_item_request_storm(monkeypatch):
    client = object.__new__(TranslationClient)
    client.cache = {}
    calls = []

    def fake_batch(texts):
        calls.append(len(texts))
        if len(texts) > 2:
            raise RuntimeError("bad json")
        return [f"T:{x}" for x in texts]

    monkeypatch.setattr(client, "_request_batch", fake_batch)
    monkeypatch.setattr(client, "translate", lambda text: f"T:{text}")
    result = client._request_batch_resilient(["a", "b", "c", "d", "e", "f", "g", "h"])
    assert result == list("abcdefgh")
    assert calls == [8]


def test_same_format_conversion_is_immediate(tmp_path):
    source = tmp_path / "book.xlsx"
    source.write_bytes(b"placeholder")
    progress = []
    outputs, records = convert_outputs(source, ["xlsx", "original"], tmp_path, lambda p, m: progress.append((p, m)))
    assert outputs == [source]
    assert records[0]["status"] == "completed"
    assert progress[-1][0] == 100
    assert "无需格式转换" in progress[-1][1]
