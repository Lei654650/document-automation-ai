from app.main import _build_workspace_recommendation


def test_scan_recommendation_enables_ocr_and_limits_outputs():
    recommendation = _build_workspace_recommendation(
        {
            "input_formats": ["PDF"],
            "detected_languages": ["中文"],
            "document_category": "技术手册",
            "complexity": "中",
            "files": [{"format": "PDF", "details": {"likely_scanned": True}}],
            "warnings": ["未发现明显风险。"],
        }
    )

    assert recommendation["profile"] == "scan"
    assert recommendation["recommended_services"] == ["ocr", "translation", "conversion"]
    assert recommendation["recommended_target_language"] == "en"
    assert recommendation["compatible_outputs"] == ["original", "pdf", "docx"]
    assert recommendation["ocr_required"] is True
    assert recommendation["estimated_seconds"] > 0
    assert recommendation["estimated_credits"] > 0
    assert recommendation["quality_score"] >= 86


def test_spreadsheet_recommendation_is_provider_neutral():
    recommendation = _build_workspace_recommendation(
        {
            "input_formats": ["Excel"],
            "detected_languages": ["英文"],
            "document_category": "自动化工程文档",
            "complexity": "低",
            "files": [{"format": "Excel", "details": {"formula_count_sample": 12}}],
            "warnings": [],
        }
    )

    assert recommendation["profile"] == "spreadsheet"
    assert "xlsx" in recommendation["compatible_outputs"]
    assert recommendation["provider_strategy"] == "provider-neutral"
    assert recommendation["recommended_target_language"] == "zh"
    assert recommendation["output_groups"] == [
        {"category": "源文件", "formats": ["original"]},
        {"category": "Office", "formats": ["xlsx"]},
        {"category": "结构化数据", "formats": ["csv"]},
        {"category": "PDF", "formats": ["pdf"]},
    ]


def test_layout_names_map_to_real_engine_modes():
    from app.engines.job_engine import _resolve_bilingual_layout

    assert _resolve_bilingual_layout("publishing", "xlsx") == "vertical"
    assert _resolve_bilingual_layout("industrial", "xlsx") == "columns"
    assert _resolve_bilingual_layout("single-language", "xlsx") == "target-only"
