from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import pytest

from app.engines.job_engine import _validate_xlsx_delivery_guard


def _xlsx(path: Path, shared: str = "ok") -> Path:
    with ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("xl/workbook.xml", "<workbook/>")
        z.writestr("xl/sharedStrings.xml", f"<sst><si><t>{shared}</t></si></sst>")
    return path


def test_quality_guard_accepts_clean_package(tmp_path):
    result = _validate_xlsx_delivery_guard(_xlsx(tmp_path / "ok.xlsx", "Báo động dừng khẩn cấp"))
    assert result["forbidden_markers"] == 0


@pytest.mark.parametrize("marker", ["Cần xác nhận bản dịch", "待确认翻译", "Translation pending"])
def test_quality_guard_rejects_pending_markers(tmp_path, marker):
    with pytest.raises(RuntimeError, match="待确认/占位标记"):
        _validate_xlsx_delivery_guard(_xlsx(tmp_path / "bad.xlsx", marker))
