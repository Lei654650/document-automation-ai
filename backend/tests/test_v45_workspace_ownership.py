from contextlib import contextmanager
import sqlite3
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app import main


def _database():
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.executescript(
        """
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY,
            email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'processing',
            updated_at TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE processing_jobs (
            id INTEGER PRIMARY KEY,
            order_id INTEGER NOT NULL,
            state TEXT NOT NULL,
            progress INTEGER NOT NULL DEFAULT 0,
            current_step TEXT NOT NULL DEFAULT '',
            updated_at TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE processing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            level TEXT NOT NULL,
            step TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        INSERT INTO orders(id,email,status) VALUES
            (1,'owner@example.test','processing'),
            (2,'other@example.test','processing');
        INSERT INTO processing_jobs(id,order_id,state,progress) VALUES
            (11,1,'processing',20),
            (22,2,'processing',35);
        """
    )
    return db


def _fake_database(db):
    @contextmanager
    def fake_get_db():
        try:
            yield db
        finally:
            pass

    return fake_get_db


class WorkspaceOwnershipTests(unittest.TestCase):
    def test_processing_controls_reject_foreign_job(self):
        for operation in (
            main.pause_processing_job,
            main.resume_processing_job,
            main.stop_processing_job,
        ):
            db = _database()
            with patch.object(main, "get_db", _fake_database(db)):
                with self.assertRaises(HTTPException) as error:
                    operation(22, {"email": "owner@example.test"})
                self.assertEqual(error.exception.status_code, 404)

    def test_owner_can_pause_resume_and_stop_job(self):
        db = _database()
        with patch.object(main, "get_db", _fake_database(db)):
            paused = main.pause_processing_job(11, {"email": "owner@example.test"})
            self.assertEqual(paused["state"], "paused")
            self.assertEqual(db.execute("SELECT state FROM processing_jobs WHERE id=11").fetchone()["state"], "paused")

            resumed = main.resume_processing_job(11, {"email": "owner@example.test"})
            self.assertEqual(resumed["state"], "processing")
            self.assertEqual(db.execute("SELECT state FROM processing_jobs WHERE id=11").fetchone()["state"], "processing")

            stopped = main.stop_processing_job(11, {"email": "owner@example.test"})
            self.assertEqual(stopped["state"], "cancelling")
            self.assertEqual(db.execute("SELECT state FROM processing_jobs WHERE id=11").fetchone()["state"], "cancelling")


if __name__ == "__main__":
    unittest.main()
