from app.main import _build_workspace_recommendation


def test_scan_recommendation_enables_ocr_and_exposes_all_outputs():
    recommendation = _build_workspace_recommendation(
        {
            "input_formats": ["PDF"],
            "detected_languages": ["Chinese"],
            "document_category": "Technical manual",
            "complexity": "medium",
            "files": [{"format": "PDF", "details": {"likely_scanned": True}}],
            "warnings": [],
        }
    )

    assert recommendation["profile"] == "scan"
    assert recommendation["recommended_services"] == ["ocr", "translation", "conversion"]
    assert recommendation["recommended_target_language"] == "en"
    assert recommendation["compatible_outputs"][:3] == ["original", "pdf", "docx"]
    assert {"xlsx", "pptx", "md", "html", "txt", "csv", "json", "xml"} <= set(recommendation["compatible_outputs"])
    assert recommendation["ocr_required"] is True
    assert recommendation["estimated_seconds"] > 0
    assert recommendation["estimated_credits"] > 0
    assert recommendation["quality_score"] >= 86


def test_spreadsheet_recommendation_is_provider_neutral():
    recommendation = _build_workspace_recommendation(
        {
            "input_formats": ["Excel"],
            "detected_languages": ["English"],
            "document_category": "Automation engineering",
            "complexity": "low",
            "files": [{"format": "Excel", "details": {"formula_count_sample": 12}}],
            "warnings": [],
        }
    )

    assert recommendation["profile"] == "spreadsheet"
    assert "xlsx" in recommendation["compatible_outputs"]
    assert recommendation["provider_strategy"] == "provider-neutral"
    assert recommendation["recommended_target_language"] == "zh"
    grouped_formats = {value for group in recommendation["output_groups"] for value in group["formats"]}
    assert grouped_formats == set(recommendation["compatible_outputs"])


def test_layout_names_map_to_real_engine_modes():
    from app.engines.job_engine import _resolve_bilingual_layout

    assert _resolve_bilingual_layout("publishing", "xlsx") == "vertical"
    assert _resolve_bilingual_layout("industrial", "xlsx") == "columns"
    assert _resolve_bilingual_layout("single-language", "xlsx") == "target-only"
