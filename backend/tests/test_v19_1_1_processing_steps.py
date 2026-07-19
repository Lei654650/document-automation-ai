from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import main


def test_first_job_event_does_not_write_null_timestamps(tmp_path, monkeypatch):
    db_path = tmp_path / "orders.db"
    monkeypatch.setattr(main, "DB_PATH", db_path)
    monkeypatch.setattr(main, "DATA_DIR", tmp_path)
    main.initialize_db()

    now = main.utc_now()
    with main.get_db() as db:
        order_id = db.execute(
            """
            INSERT INTO orders (
                order_number, name, company, email, whatsapp, country, deadline,
                requirements, services_json, status, created_at, updated_at
            ) VALUES (?, ?, '', ?, '', '', '', '', ?, 'processing', ?, ?)
            """,
            ("DA-TEST-STEP", "Tester", "tester@example.com", "[]", now, now),
        ).lastrowid
        job_id = db.execute(
            """
            INSERT INTO processing_jobs (
                order_id, state, progress, plan_json, blockers_json, result_json,
                current_step, created_at, updated_at
            ) VALUES (?, 'queued', 0, '[]', '[]', '{}', 'queued', ?, ?)
            """,
            (order_id, now, now),
        ).lastrowid
        for position, (step_key, label) in enumerate(
            [("validation", "检查"), ("analysis", "理解"), ("translation", "文档翻译")]
        ):
            db.execute(
                """
                INSERT INTO processing_steps (
                    job_id, step_key, label, position, status, progress,
                    started_at, finished_at, duration_ms, message, error
                ) VALUES (?, ?, ?, ?, 'pending', 0, '', '', 0, '', '')
                """,
                (job_id, step_key, label, position),
            )
        db.commit()

    main._job_event(job_id, 5, "validation", "开始检查")
    main._job_event(job_id, 20, "analysis", "开始理解")

    with main.get_db() as db:
        rows = db.execute(
            "SELECT step_key, status, started_at, finished_at FROM processing_steps WHERE job_id=? ORDER BY position",
            (job_id,),
        ).fetchall()

    assert rows[0]["status"] == "completed"
    assert rows[0]["started_at"]
    assert rows[1]["status"] == "running"
    assert rows[1]["started_at"]
    assert rows[2]["status"] == "pending"
    assert rows[2]["started_at"] == ""
    assert rows[2]["finished_at"] == ""
