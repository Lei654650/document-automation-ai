from pathlib import Path

from app.engines.job_engine import _normalize_bilingual_value, _resolve_bilingual_layout


def test_excel_auto_layout_is_inline():
    assert _resolve_bilingual_layout("auto", "xlsx") == "inline"
    assert _normalize_bilingual_value("X000 启动", "Khởi động", "inline") == "X000 启动 - Khởi động"


def test_vertical_and_target_only_remain_available():
    assert _normalize_bilingual_value("X000 启动", "Khởi động", "vertical") == "X000\n启动\nKhởi động"
    assert _normalize_bilingual_value("X000 启动", "Khởi động", "target-only") == "X000 Khởi động"


def test_plc_identifier_is_never_removed():
    value = _normalize_bilingual_value("Y040 搬运夹爪松开", "Mở kẹp gắp chuyển liệu", "inline")
    assert value.startswith("Y040 ")
    assert "搬运夹爪松开" in value
    assert "Mở kẹp gắp chuyển liệu" in value
