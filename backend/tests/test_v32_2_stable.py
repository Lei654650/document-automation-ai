from pathlib import Path

from app.engines.translation_engine import (
    _canonicalize_technical_placeholders,
    _placeholder_sequence_satisfied,
    _technical_placeholders,
)


def test_repeated_printf_sequence_is_canonical_and_complete():
    source = "AX0 翻转X轴不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    damaged = "AX0 không ở vị trí %(WATCH1)d, hãy thao tác đến vị trí %(WATCH1) - d."
    repaired = _canonicalize_technical_placeholders(damaged)
    assert repaired.count("%(WATCH1)d") == 2
    assert _placeholder_sequence_satisfied(source, repaired)


def test_missing_duplicate_placeholder_is_rejected():
    source = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    incomplete = "AX0 không ở vị trí %(WATCH1)d."
    assert not _placeholder_sequence_satisfied(source, incomplete)


def test_extra_code_like_text_does_not_break_source_owned_sequence():
    source = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    translated = "AX0 không ở vị trí %(WATCH1)d, D0 hãy thao tác đến %(WATCH1)d."
    assert _placeholder_sequence_satisfied(source, translated)
    assert _technical_placeholders(source) == ["AX0", "%(WATCH1)d", "%(WATCH1)d"]


def test_enterprise_workspace_is_bounded_and_scrollable():
    root = Path(__file__).resolve().parents[2]
    css = (root / "frontend" / "src" / "App.css").read_text(encoding="utf-8")
    jsx = (root / "frontend" / "src" / "App.jsx").read_text(encoding="utf-8")
    assert "height:calc(100vh - 116px)" in css
    assert ".workspace-file-scroll" in css
    assert "overflow:auto" in css
    assert 'className="workspace-file-scroll"' in jsx
    assert "列表内滚动查看全部" in jsx
