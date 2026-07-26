from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.engines import translation_engine as te


def test_hot_memory_avoids_repeated_sqlite_reads(monkeypatch):
    te._HOT_MEMORY.clear()
    calls = {"connect": 0}

    class DummyDB:
        def __enter__(self): return self
        def __exit__(self, *args): return False
        def execute(self, *args, **kwargs):
            if str(args[0]).startswith("PRAGMA"):
                return self
            return self
        def fetchall(self): return []

    def connect():
        calls["connect"] += 1
        return DummyDB()

    monkeypatch.setattr(te, "_memory_connect", connect)
    te._hot_memory_put_many("zh", "vi", {"启动": "Khởi động"})
    assert te._memory_get_many("zh", "vi", ["启动"]) == {"启动": "Khởi động"}
    assert calls["connect"] == 0


def test_hot_memory_delete_invalidates_ram_entry():
    te._HOT_MEMORY.clear()
    te._hot_memory_put_many("zh", "vi", {"停止": "Dừng"})
    te._hot_memory_delete_many("zh", "vi", ["停止"])
    assert te._hot_memory_get_many("zh", "vi", ["停止"]) == {}
