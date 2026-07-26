from pathlib import Path
import sqlite3

from app.engines import translation_engine as te
from app.engines.job_engine import _replace_with_retry


def test_translation_memory_bulk_read_does_not_write_hit_counters(tmp_path, monkeypatch):
    db_path = tmp_path / "translation_memory.db"
    monkeypatch.setattr(te, "TRANSLATION_MEMORY_PATH", db_path)
    te._memory_put_many("zh", "vi", {"启动": "Khởi động", "停止": "Dừng"}, "test", "test")
    result = te._memory_get_many("zh", "vi", ["启动", "停止"])
    assert result == {"启动": "Khởi động", "停止": "Dừng"}
    with sqlite3.connect(db_path) as db:
        assert db.execute("select sum(hit_count) from translation_memory").fetchone()[0] == 0


def test_atomic_publish_replaces_existing_output(tmp_path):
    destination = tmp_path / "output.xlsx"
    temporary = tmp_path / "output.xlsx.writing.tmp"
    destination.write_bytes(b"old")
    temporary.write_bytes(b"new")
    _replace_with_retry(temporary, destination)
    assert destination.read_bytes() == b"new"
    assert not temporary.exists()
