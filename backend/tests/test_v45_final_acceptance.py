from __future__ import annotations

from pathlib import Path

from app.engines import job_engine
from app.engines.conversion_engine import convert_outputs
from app.main import normalize_processing_request


def test_product_capabilities_expand_to_executable_services_and_formats() -> None:
    services, conversion = normalize_processing_request(
        [
            "image_recognition",
            "pdf_rebuild",
            "proofreading",
            "table_recovery",
            "scan_enhancement",
            "layout_recovery",
            "document_organization",
            "markdown",
            "html",
            "json",
            "csv",
            "xml",
            "office",
        ],
        {"formats": ["docx", "xlsx", "pptx", "pdf", "txt", "xml"]},
    )

    assert set(services) == {"ocr", "layout_preserve", "conversion", "data_cleanup"}
    assert set(conversion["formats"]) == {
        "docx", "xlsx", "pptx", "pdf", "md", "html", "txt", "csv", "json", "xml"
    }


def test_pdf_split_request_is_normalized_and_forces_real_conversion() -> None:
    services, conversion = normalize_processing_request(
        [],
        {
            "formats": ["docx"],
            "output_strategy": "convert",
            "primary_format": "docx",
            "pdf_split": {
                "enabled": True,
                "mode": "ranges",
                "ranges": "1-2,3,4-5",
                "keep_original": False,
            },
        },
    )

    assert "conversion" in services
    assert "pdf" in conversion["formats"]
    assert conversion["pdf_split"] == {
        "enabled": True,
        "mode": "ranges",
        "ranges": "1-2,3,4-5",
        "keep_original": False,
    }
    assert conversion["options"]["pdf_split"] == conversion["pdf_split"]


def test_all_advertised_output_formats_are_real(tmp_path: Path) -> None:
    source = tmp_path / "sample.txt"
    source.write_text("Document title\nFirst row\nSecond row", encoding="utf-8")
    output_dir = tmp_path / "outputs"
    output_dir.mkdir()

    outputs, records = convert_outputs(
        source,
        ["docx", "xlsx", "pptx", "pdf", "md", "html", "txt", "csv", "json", "xml"],
        output_dir,
    )

    assert not [record for record in records if record["status"] != "completed"]
    assert {path.suffix.lower() for path in outputs} == {
        ".docx", ".xlsx", ".pptx", ".pdf", ".md", ".html", ".txt", ".csv", ".json", ".xml"
    }
    assert all(path.exists() and path.stat().st_size > 0 for path in outputs)


def test_multi_language_selection_processes_every_target(monkeypatch, tmp_path: Path) -> None:
    observed: list[str] = []

    def fake_single(order, source_paths, output_dir, progress_callback=None):
        target = order["translation"]["target_language"]
        observed.append(target)
        output_dir.mkdir(parents=True, exist_ok=True)
        target_file = output_dir / f"translated-{target}.txt"
        target_file.write_text(target, encoding="utf-8")
        if progress_callback:
            progress_callback(100, "completed", f"{target} complete")
        return {
            "state": "completed",
            "outputs": [{"path": str(target_file), "format": "txt"}],
            "failures": [],
            "translation_usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5, "estimated_cost_usd": 0.01},
        }

    monkeypatch.setattr(job_engine, "_run_local_job_single_target", fake_single)
    result = job_engine.run_local_job(
        {
            "order_number": "MULTI-LANGUAGE-ACCEPTANCE",
            "services": ["translation", "conversion"],
            "translation": {"targets": ["en", "vi", "ja"]},
            "conversion": {"formats": ["txt"]},
        },
        [("source.txt", str(tmp_path / "source.txt"))],
        tmp_path / "delivery",
    )

    assert set(observed) == {"en", "vi", "ja"}
    assert {item["target_language"] for item in result["outputs"]} == {"en", "vi", "ja"}
    assert result["translation_usage"]["languages"] == 3
    assert result["translation_usage"]["total_tokens"] == 15
    assert result["state"] == "completed"
