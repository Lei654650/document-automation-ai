from pathlib import Path

import pytest

from app.engines.job_engine import _process_file


class FakeClient:
    target_language_code = "zh"

    def translate(self, text):
        return {"Hello world": "你好，世界", "Second paragraph": "第二段"}.get(text, text)


def test_txt_translation_preserves_blank_lines_and_unicode(tmp_path):
    source = tmp_path / "sample.txt"
    source.write_bytes(b"\xef\xbb\xbfHello world\r\n\r\nSecond paragraph\r\nUnicode: \xe2\x9c\x93")
    result = _process_file("sample.txt", str(source), tmp_path / "out", FakeClient(), None)
    output_bytes = Path(result["path"]).read_bytes()
    output = output_bytes.decode("utf-8")
    assert "你好，世界\r\n\r\n第二段" in output
    assert b"\r\n\r\n" in output_bytes
    assert "✓" in output
    assert result["translated_items"] == 2
    assert result["mode"] == "txt_translation"


def test_unsupported_translation_format_fails(tmp_path):
    source = tmp_path / "sample.bin"
    source.write_bytes(b"data")
    with pytest.raises(RuntimeError, match="Unsupported translation format"):
        _process_file("sample.bin", str(source), tmp_path / "out", FakeClient(), None)
