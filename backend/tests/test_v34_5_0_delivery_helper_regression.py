from pathlib import Path

from app.engines.job_engine import _unlink_with_retry


def test_delivery_temp_cleanup_helper_is_defined_and_removes_file(tmp_path: Path) -> None:
    temporary = tmp_path / "output.xlsx.writing.tmp"
    temporary.write_bytes(b"stale")

    _unlink_with_retry(temporary)

    assert not temporary.exists()


def test_job_engine_has_no_misspelled_unlink_helper() -> None:
    engine = Path(__file__).parents[1] / "app" / "engines" / "job_engine.py"
    source = engine.read_text(encoding="utf-8")

    assert "temp__unlink_with_retry" not in source
    assert "temp_unlink_with_retry" not in source
