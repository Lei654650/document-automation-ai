from pathlib import Path
from zipfile import ZipFile

from app.engines.job_engine import (
    _normalize_bilingual_value,
    _split_technical_prefix,
    _split_existing_bilingual_text,
    _apply_excel_multiline_layout,
)


def test_plc_prefix_is_separated_into_three_lines():
    assert _split_technical_prefix("SD0|前上左安全门") == ("SD0", "前上左安全门")
    assert _normalize_bilingual_value("SD0|前上左安全门", "Cửa an toàn trái trước trên") == (
        "SD0\n前上左安全门\nCửa an toàn trái trước trên"
    )


def test_plain_label_stays_dash_bilingual():
    assert _normalize_bilingual_value("感应器名称", "Tên cảm biến") == "感应器名称 —— Tên cảm biến"


def test_existing_glued_bilingual_is_repaired():
    assert _split_existing_bilingual_text("X000 启动Khởi động") == ("X000 启动", "Khởi động")
    assert _normalize_bilingual_value("X000 启动Khởi động", "") == "X000\n启动\nKhởi động"


def test_internal_pipe_is_never_exposed():
    value = _normalize_bilingual_value("SE0|载具左进料流入", "Dòng cấp liệu trái của đồ gá")
    assert "|" not in value
    assert value.splitlines() == ["SE0", "载具左进料流入", "Dòng cấp liệu trái của đồ gá"]


def test_multiline_layout_keeps_xlsx_package_valid(tmp_path: Path):
    source = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "missing.xlsx"
    # Layout helper is covered on a tiny workbook built in the test when no fixture exists.
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws["A1"] = "SD0\n前上左安全门\nCửa an toàn"
    target = tmp_path / "sample.xlsx"
    wb.save(target)
    _apply_excel_multiline_layout(target)
    with ZipFile(target) as archive:
        assert archive.testzip() is None
        sheet = archive.read("xl/worksheets/sheet1.xml")
        assert b'customHeight="1"' in sheet
