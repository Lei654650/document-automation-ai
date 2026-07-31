from app.services.document_analyzer import analyze_order_files


def test_text_content_drives_category_and_industry(tmp_path):
    source = tmp_path / "document.txt"
    source.write_text(
        "This contract defines the legal terms, service obligations and liability.",
        encoding="utf-8",
    )

    result = analyze_order_files(
        [(source.name, str(source))],
        services=[],
        requirements="",
        translation={},
    )

    assert result["document_category"] == "合同"
    assert result["industry"] == "法律"
    assert result["detected_languages"] == ["英语"]


def test_automation_content_detects_industry(tmp_path):
    source = tmp_path / "io-list.txt"
    source.write_text(
        "PLC HMI SCADA servo motor input output and register address list.",
        encoding="utf-8",
    )

    result = analyze_order_files(
        [(source.name, str(source))],
        services=[],
        requirements="",
        translation={},
    )

    assert result["industry"] == "工业自动化"


def test_global_industry_detection_is_not_automation_biased(tmp_path):
    source = tmp_path / "vehicle-specification.txt"
    source.write_text(
        "Automotive ECU CAN bus vehicle engine diagnostic specification.",
        encoding="utf-8",
    )

    result = analyze_order_files(
        [(source.name, str(source))],
        services=[],
        requirements="",
        translation={},
    )

    assert result["industry"] == "汽车"
    assert result["file_count"] == 1
    assert result["analysis_duration_ms"] > 0
    assert result["total_size_bytes"] == source.stat().st_size
