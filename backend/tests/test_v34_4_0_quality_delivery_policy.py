from pathlib import Path


def test_unresolved_translation_is_review_warning_not_runtime_failure():
    source = Path(__file__).parents[1] / "app" / "engines" / "job_engine.py"
    text = source.read_text(encoding="utf-8")
    assert "文件可交付，建议复核" in text
    assert "Quality review recommended" in text
    assert "企业质量守护仍有 {len(unresolved)} 条未完成翻译" not in text


def test_real_processing_failures_still_fail_job():
    source = Path(__file__).parents[1] / "app" / "engines" / "job_engine.py"
    text = source.read_text(encoding="utf-8")
    assert 'return "failed", f"处理失败：0 个文件可交付' in text
    assert 'report_file_progress(index, original_name, 100, failure_step, f"文件失败，已隔离：{exc}")' in text
