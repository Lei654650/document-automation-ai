from __future__ import annotations

import shutil
import tempfile
import time
from pathlib import Path

import pytest

from app.engines.job_engine import (
    _apply_excel_multiline_layout,
    _repair_xlsx_placeholder_corruption,
)


def _fixture() -> Path:
    fixture = Path(__file__).resolve().parents[2] / "Enterprise_Test_Suite" / "02_Excel" / "01_Complex_BOM_MultiSheet.xlsx"
    if not fixture.exists():
        pytest.skip("Enterprise Excel fixture suite is not included in this source package.")
    return fixture


def test_normal_workbook_skips_placeholder_rebuild() -> None:
    with tempfile.TemporaryDirectory() as folder:
        target = Path(folder) / "normal.xlsx"
        shutil.copy2(_fixture(), target)
        before = target.read_bytes()
        started = time.perf_counter()
        repaired = _repair_xlsx_placeholder_corruption(target)
        elapsed = time.perf_counter() - started
        assert repaired == 0
        assert target.read_bytes() == before
        assert elapsed < 2.0


def test_multiline_layout_finishes_without_leaving_temp_file() -> None:
    with tempfile.TemporaryDirectory() as folder:
        target = Path(folder) / "layout.xlsx"
        shutil.copy2(_fixture(), target)
        _apply_excel_multiline_layout(target)
        assert target.exists()
        assert not target.with_suffix(target.suffix + ".layout.tmp").exists()
