from __future__ import annotations

import io
import zipfile
from pathlib import Path

import pytest
from pypdf import PdfReader, PdfWriter

from app.engines.job_engine import _parse_pdf_page_groups, run_local_job


def _write_pdf(path: Path, pages: int) -> None:
    writer = PdfWriter()
    for index in range(pages):
        page = writer.add_blank_page(width=210 + index, height=297 + index)
        page.compress_content_streams()
    with path.open("wb") as handle:
        writer.write(handle)
    writer.close()


def test_pdf_page_range_parser_rejects_invalid_or_duplicate_pages() -> None:
    assert _parse_pdf_page_groups("1-2,3,4-5", 5) == [[0, 1], [2], [3, 4]]
    assert _parse_pdf_page_groups("1，2-3", 3) == [[0], [1, 2]]

    with pytest.raises(ValueError, match="超出文件总页数"):
        _parse_pdf_page_groups("1-6", 5)
    with pytest.raises(ValueError, match="不能重复"):
        _parse_pdf_page_groups("1-3,3-4", 5)
    with pytest.raises(ValueError, match="从小到大"):
        _parse_pdf_page_groups("4-2", 5)


def test_pdf_split_pipeline_generates_ordered_files_and_zip(tmp_path: Path) -> None:
    source = tmp_path / "客户合同.pdf"
    _write_pdf(source, 5)
    output_dir = tmp_path / "delivery"
    split_settings = {
        "enabled": True,
        "mode": "ranges",
        "ranges": "1-2,3,4-5",
        "keep_original": False,
    }

    result = run_local_job(
        {
            "order_number": "PDF-SPLIT-ACCEPTANCE",
            "services": ["conversion"],
            "translation": {"enabled": False, "language_mode": "none"},
            "conversion": {
                "formats": ["original"],
                "output_strategy": "preserve",
                "primary_format": "original",
                "additional_formats": [],
                "pdf_split": split_settings,
                "options": {"pdf_split": split_settings},
            },
            "ai_analysis": {
                "files": [{"name": source.name, "format": "PDF", "details": {"pages": 5}}],
                "total_pages": 5,
            },
        },
        [(source.name, str(source))],
        output_dir,
    )

    assert result["state"] == "completed"
    assert result["failure_count"] == 0
    assert result["successful_output_count"] == 3
    assert [Path(item["path"]).name for item in result["outputs"]] == [
        "客户合同_pages_001-002.pdf",
        "客户合同_page_003.pdf",
        "客户合同_pages_004-005.pdf",
    ]
    assert [item["split"]["sequence"] for item in result["outputs"]] == [1, 2, 3]
    assert [item["split"]["page_count"] for item in result["outputs"]] == [2, 1, 2]
    assert [len(PdfReader(item["path"]).pages) for item in result["outputs"]] == [2, 1, 2]
    assert not (output_dir / source.name).exists()

    package = io.BytesIO()
    with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for item in result["outputs"]:
            path = Path(item["path"])
            archive.write(path, arcname=path.name)
    package.seek(0)
    with zipfile.ZipFile(package) as archive:
        assert archive.namelist() == [Path(item["path"]).name for item in result["outputs"]]
        assert all(archive.getinfo(name).file_size > 0 for name in archive.namelist())


def test_pdf_split_can_keep_customer_named_full_pdf(tmp_path: Path) -> None:
    source = tmp_path / "产品手册.pdf"
    _write_pdf(source, 2)
    output_dir = tmp_path / "delivery"
    split_settings = {
        "enabled": True,
        "mode": "each_page",
        "ranges": "",
        "keep_original": True,
    }

    result = run_local_job(
        {
            "order_number": "PDF-SPLIT-KEEP-FULL",
            "services": ["conversion"],
            "translation": {"enabled": False, "language_mode": "none"},
            "conversion": {
                "formats": ["original"],
                "output_strategy": "preserve",
                "primary_format": "original",
                "pdf_split": split_settings,
                "options": {"pdf_split": split_settings},
            },
        },
        [(source.name, str(source))],
        output_dir,
    )

    assert result["state"] == "completed"
    assert [Path(item["path"]).name for item in result["outputs"]] == [
        "产品手册_full.pdf",
        "产品手册_page_001.pdf",
        "产品手册_page_002.pdf",
    ]
    assert [len(PdfReader(item["path"]).pages) for item in result["outputs"]] == [2, 1, 1]


def test_pdf_split_frontend_has_real_entry_and_payload_fields() -> None:
    project_root = Path(__file__).resolve().parents[2]
    panel = (project_root / "frontend/src/components/processing/ProcessingPlanPanel.jsx").read_text(encoding="utf-8")
    app = (project_root / "frontend/src/App.jsx").read_text(encoding="utf-8")

    assert "PDF 文件拆分" in panel
    assert "按单页拆分" in panel
    assert "按指定页码范围拆分" in panel
    assert "pdf_split" in panel
    assert "pdf_split: pdfSplit" in app
