from __future__ import annotations

import hashlib
import json
import mimetypes
import os
import secrets
import shutil
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.services.document_analyzer import analyze_order_files
from app.engines.quote_engine import suggest_quote
from app.engines.job_engine import build_plan, run_local_job
from app.engines.ocr_engine import capability as ocr_capability
from app.engines.translation_engine import (
    capability as translation_capability,
    public_settings as translation_public_settings,
    save_settings as save_translation_settings,
    test_connection as test_translation_connection,
)

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")
APP_VERSION = "10.5.0"
CLOUD_MODE = os.getenv("CLOUD_MODE", "false").lower() in {"1", "true", "yes", "on"}
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123456")
_data_root = os.getenv("APP_DATA_DIR", "").strip()
PERSISTENT_ROOT = Path(_data_root).expanduser().resolve() if _data_root else BASE_DIR
DATA_DIR = PERSISTENT_ROOT / "data"
UPLOAD_DIR = PERSISTENT_ROOT / "uploads"
OUTPUT_DIR = PERSISTENT_ROOT / "outputs"
DB_PATH = DATA_DIR / "orders.db"
MAX_FILE_SIZE_MB = max(1, int(os.getenv("MAX_FILE_SIZE_MB", "100")))
MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
FRONTEND_DIST = BASE_DIR / "static"
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SUFFIXES = {
    ".pdf", ".xlsx", ".xls", ".docx", ".doc", ".csv",
    ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".zip"
}
VALID_STATUSES = {
    "waiting_quote", "quoted", "confirmed", "processing",
    "quality_review", "completed", "cancelled"
}

app = FastAPI(title="Document Automation AI API", version=APP_VERSION)
_cors_env = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_env or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrderUpdate(BaseModel):
    status: str | None = None
    quote_amount: float | None = Field(default=None, ge=0)
    quote_currency: str | None = None
    quote_note: str | None = None
    admin_note: str | None = None


class WorkspaceUpdate(BaseModel):
    name: str = "Document Automation AI"
    plan: str = "Enterprise"
    monthly_credit_limit: int = Field(default=10000, ge=0)


class TeamMemberCreate(BaseModel):
    name: str
    email: str
    role: str = "member"


class AITranslationSettingsUpdate(BaseModel):
    provider: str = "none"
    api_key: str = ""
    model: str = ""
    base_url: str = ""
    timeout_seconds: int = Field(default=90, ge=10, le=300)
    max_retries: int = Field(default=2, ge=0, le=5)
    clear_api_key: bool = False



def require_admin(x_admin_key: Annotated[str | None, Header()] = None) -> None:
    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Administrator password is incorrect.")


def public_order(order_number: str, email: str) -> dict:
    with get_db() as db:
        row = db.execute(
            "SELECT * FROM orders WHERE UPPER(order_number) = UPPER(?) AND LOWER(email) = LOWER(?)",
            (order_number.strip(), email.strip()),
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Order number or email is incorrect.")
        data = row_to_order(db, row)
        return {
            "order_number": data["order_number"], "status": data["status"],
            "quote_amount": data["quote_amount"], "quote_currency": data["quote_currency"],
            "quote_note": data["quote_note"], "created_at": data["created_at"],
            "updated_at": data["updated_at"], "services": data["services"],
            "output_files": data["output_files"],
        }

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def ensure_column(db: sqlite3.Connection, table: str, column: str, definition: str) -> None:
    columns = {row["name"] for row in db.execute(f"PRAGMA table_info({table})").fetchall()}
    if column not in columns:
        db.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def initialize_db() -> None:
    with get_db() as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                company TEXT NOT NULL DEFAULT '',
                email TEXT NOT NULL,
                whatsapp TEXT NOT NULL DEFAULT '',
                country TEXT NOT NULL DEFAULT '',
                deadline TEXT NOT NULL DEFAULT '',
                requirements TEXT NOT NULL DEFAULT '',
                services_json TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'waiting_quote',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS order_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                content_type TEXT NOT NULL DEFAULT '',
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS output_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                original_name TEXT NOT NULL,
                stored_name TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                content_type TEXT NOT NULL DEFAULT '',
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
            );
            """
        )
        ensure_column(db, "orders", "quote_amount", "REAL")
        ensure_column(db, "orders", "quote_currency", "TEXT NOT NULL DEFAULT 'USD'")
        ensure_column(db, "orders", "quote_note", "TEXT NOT NULL DEFAULT ''")
        ensure_column(db, "orders", "admin_note", "TEXT NOT NULL DEFAULT ''")
        ensure_column(db, "orders", "updated_at", "TEXT NOT NULL DEFAULT ''")
        ensure_column(db, "orders", "translation_json", "TEXT NOT NULL DEFAULT '{}'")
        ensure_column(db, "orders", "ai_analysis_json", "TEXT NOT NULL DEFAULT '{}'")
        ensure_column(db, "orders", "suggested_quote_json", "TEXT NOT NULL DEFAULT '{}'")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS processing_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                state TEXT NOT NULL DEFAULT 'queued',
                progress INTEGER NOT NULL DEFAULT 0,
                plan_json TEXT NOT NULL DEFAULT '[]',
                blockers_json TEXT NOT NULL DEFAULT '[]',
                result_json TEXT NOT NULL DEFAULT '{}',
                current_step TEXT NOT NULL DEFAULT 'queued',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
            );
            """
        )
        ensure_column(db, "processing_jobs", "current_step", "TEXT NOT NULL DEFAULT 'queued'")
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS processing_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                level TEXT NOT NULL DEFAULT 'info',
                step TEXT NOT NULL DEFAULT '',
                message TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY(job_id) REFERENCES processing_jobs(id) ON DELETE CASCADE
            );
            """
        )
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS workspace_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                name TEXT NOT NULL DEFAULT 'Document Automation AI',
                plan TEXT NOT NULL DEFAULT 'Enterprise',
                monthly_credit_limit INTEGER NOT NULL DEFAULT 10000,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS team_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL DEFAULT 'member',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key_prefix TEXT NOT NULL,
                key_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL,
                last_used_at TEXT NOT NULL DEFAULT ''
            );
            """
        )
        db.execute(
            "INSERT OR IGNORE INTO workspace_settings (id, name, plan, monthly_credit_limit, updated_at) VALUES (1, 'Document Automation AI', 'Enterprise', 10000, ?)",
            (utc_now(),),
        )
        db.commit()


@app.on_event("startup")
def startup() -> None:
    initialize_db()
    # In-process workers cannot survive a container restart. Mark interrupted jobs clearly.
    with get_db() as db:
        interrupted = db.execute("SELECT id FROM processing_jobs WHERE state IN ('queued','processing')").fetchall()
        for row in interrupted:
            timestamp = utc_now()
            db.execute(
                "UPDATE processing_jobs SET state='failed', progress=100, current_step='interrupted', blockers_json=?, updated_at=? WHERE id=?",
                (json.dumps(["Processing was interrupted by a server restart. Start the job again."], ensure_ascii=False), timestamp, row["id"]),
            )
            db.execute(
                "INSERT INTO processing_events (job_id, level, step, message, created_at) VALUES (?, 'error', 'interrupted', ?, ?)",
                (row["id"], "Processing was interrupted by a server restart.", timestamp),
            )
        db.commit()


@app.get("/api/public-config")
def public_config() -> dict:
    return {
        "version": APP_VERSION,
        "cloud_mode": CLOUD_MODE,
        "public_base_url": PUBLIC_BASE_URL,
        "max_file_size_mb": MAX_FILE_SIZE_MB,
    }


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": APP_VERSION,
        "ocr": ocr_capability().__dict__,
        "translation": translation_capability().__dict__,
    }


def file_rows(db: sqlite3.Connection, table: str, order_id: int) -> list[dict]:
    rows = db.execute(
        f"SELECT id, original_name, content_type, size_bytes, created_at "
        f"FROM {table} WHERE order_id = ? ORDER BY id",
        (order_id,),
    ).fetchall()
    return [dict(item) for item in rows]


def row_to_order(db: sqlite3.Connection, row: sqlite3.Row) -> dict:
    customer_files = file_rows(db, "order_files", row["id"])
    outputs = file_rows(db, "output_files", row["id"])
    job_row = db.execute(
        "SELECT * FROM processing_jobs WHERE order_id = ? ORDER BY id DESC LIMIT 1",
        (row["id"],),
    ).fetchone()
    latest_job = None
    if job_row is not None:
        event_rows = db.execute(
            "SELECT level, step, message, created_at FROM processing_events WHERE job_id = ? ORDER BY id DESC LIMIT 100",
            (job_row["id"],),
        ).fetchall()
        latest_job = {
            "id": job_row["id"], "state": job_row["state"], "progress": job_row["progress"],
            "current_step": job_row["current_step"] if "current_step" in job_row.keys() else job_row["state"],
            "plan": json.loads(job_row["plan_json"] or "[]"),
            "blockers": json.loads(job_row["blockers_json"] or "[]"),
            "result": json.loads(job_row["result_json"] or "{}"),
            "events": [dict(item) for item in reversed(event_rows)],
            "created_at": job_row["created_at"], "updated_at": job_row["updated_at"],
        }
    return {
        "id": row["id"],
        "order_number": row["order_number"],
        "name": row["name"],
        "company": row["company"],
        "email": row["email"],
        "whatsapp": row["whatsapp"],
        "country": row["country"],
        "deadline": row["deadline"],
        "requirements": row["requirements"],
        "services": json.loads(row["services_json"]),
        "translation": json.loads(row["translation_json"] or "{}"),
        "ai_analysis": json.loads(row["ai_analysis_json"] or "{}"),
        "suggested_quote": json.loads(row["suggested_quote_json"] or "{}"),
        "status": row["status"],
        "quote_amount": row["quote_amount"],
        "quote_currency": row["quote_currency"] or "USD",
        "quote_note": row["quote_note"] or "",
        "admin_note": row["admin_note"] or "",
        "created_at": row["created_at"],
        "updated_at": row["updated_at"] or row["created_at"],
        "file_count": len(customer_files),
        "output_count": len(outputs),
        "files": customer_files,
        "output_files": outputs,
        "processing_job": latest_job,
    }


async def save_upload(upload: UploadFile, folder: Path) -> tuple[str, str, int]:
    original_name = Path(upload.filename or "unnamed_file").name
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix or 'unknown'}")

    folder.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    stored_path = folder / stored_name
    total_size = 0

    with stored_path.open("wb") as output:
        while chunk := await upload.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_FILE_SIZE:
                output.close()
                stored_path.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"{original_name} exceeds {MAX_FILE_SIZE_MB} MB.")
            output.write(chunk)

    return original_name, str(stored_path), total_size


@app.post("/api/orders")
async def create_order(
    files: Annotated[list[UploadFile], File(...)],
    name: Annotated[str, Form(...)],
    email: Annotated[str, Form(...)],
    services: Annotated[str, Form(...)],
    company: Annotated[str, Form()] = "",
    whatsapp: Annotated[str, Form()] = "",
    country: Annotated[str, Form()] = "",
    deadline: Annotated[str, Form()] = "",
    requirements: Annotated[str, Form()] = "",
    translation_json: Annotated[str, Form()] = "{}",
) -> dict:
    if not name.strip() or not email.strip():
        raise HTTPException(status_code=400, detail="Name and email are required.")
    if not files:
        raise HTTPException(status_code=400, detail="At least one file is required.")

    try:
        selected_services = json.loads(services)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid service selection.") from exc
    if not isinstance(selected_services, list) or not selected_services:
        raise HTTPException(status_code=400, detail="At least one service is required.")
    try:
        translation_data = json.loads(translation_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid translation settings.") from exc
    if not isinstance(translation_data, dict):
        raise HTTPException(status_code=400, detail="Invalid translation settings.")

    order_number = f"DA-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    created_at = utc_now()
    order_folder = UPLOAD_DIR / order_number
    saved_files: list[dict] = []
    analysis_paths: list[tuple[str, str]] = []

    try:
        with get_db() as db:
            cursor = db.execute(
                """
                INSERT INTO orders (
                    order_number, name, company, email, whatsapp, country,
                    deadline, requirements, services_json, translation_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_quote', ?, ?)
                """,
                (
                    order_number, name.strip(), company.strip(), email.strip(),
                    whatsapp.strip(), country.strip(), deadline.strip(),
                    requirements.strip(), json.dumps(selected_services, ensure_ascii=False),
                    json.dumps(translation_data, ensure_ascii=False), created_at, created_at,
                ),
            )
            order_id = cursor.lastrowid

            for upload in files:
                original_name, stored_path, total_size = await save_upload(upload, order_folder)
                suffix = Path(original_name).suffix.lower()
                file_cursor = db.execute(
                    """
                    INSERT INTO order_files (
                        order_id, original_name, stored_name, stored_path,
                        content_type, size_bytes, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        order_id, original_name, Path(stored_path).name, stored_path,
                        upload.content_type or "", total_size, created_at,
                    ),
                )
                saved_files.append({
                    "id": file_cursor.lastrowid,
                    "original_name": original_name,
                    "size_bytes": total_size,
                })
                analysis_paths.append((original_name, stored_path))

            ai_analysis = analyze_order_files(
                analysis_paths, selected_services, requirements.strip(), translation_data
            )
            suggested_quote = suggest_quote(ai_analysis, selected_services)
            db.execute(
                "UPDATE orders SET ai_analysis_json = ?, suggested_quote_json = ? WHERE id = ?",
                (
                    json.dumps(ai_analysis, ensure_ascii=False),
                    json.dumps(suggested_quote, ensure_ascii=False),
                    order_id,
                ),
            )
            db.commit()
    except Exception:
        shutil.rmtree(order_folder, ignore_errors=True)
        raise

    return {
        "success": True,
        "order_number": order_number,
        "status": "waiting_quote",
        "files": saved_files,
        "ai_analysis": ai_analysis,
        "suggested_quote": suggested_quote,
    }


@app.get("/api/orders", dependencies=[Depends(require_admin)])
def list_orders() -> dict:
    with get_db() as db:
        rows = db.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
        orders = [row_to_order(db, row) for row in rows]
        counts = {status: 0 for status in VALID_STATUSES}
        for item in orders:
            counts[item["status"]] = counts.get(item["status"], 0) + 1
        return {"orders": orders, "counts": counts, "total": len(orders)}


@app.get("/api/orders/{order_id}", dependencies=[Depends(require_admin)])
def read_order(order_id: int) -> dict:
    with get_db() as db:
        row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        return row_to_order(db, row)


@app.patch("/api/orders/{order_id}", dependencies=[Depends(require_admin)])
def update_order(order_id: int, update: OrderUpdate) -> dict:
    values = update.model_dump(exclude_unset=True)
    if "status" in values and values["status"] not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status.")
    if "quote_currency" in values:
        values["quote_currency"] = (values["quote_currency"] or "USD").upper()[:8]

    allowed = {"status", "quote_amount", "quote_currency", "quote_note", "admin_note"}
    values = {key: value for key, value in values.items() if key in allowed}
    values["updated_at"] = utc_now()

    with get_db() as db:
        exists = db.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
        if exists is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        assignments = ", ".join(f"{key} = ?" for key in values)
        db.execute(
            f"UPDATE orders SET {assignments} WHERE id = ?",
            (*values.values(), order_id),
        )
        db.commit()
        row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return row_to_order(db, row)


@app.post("/api/orders/{order_id}/outputs", dependencies=[Depends(require_admin)])
async def upload_output_files(
    order_id: int,
    files: Annotated[list[UploadFile], File(...)],
) -> dict:
    if not files:
        raise HTTPException(status_code=400, detail="At least one output file is required.")

    with get_db() as db:
        order = db.execute("SELECT order_number FROM orders WHERE id = ?", (order_id,)).fetchone()
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found.")

    folder = OUTPUT_DIR / order["order_number"]
    created_at = utc_now()
    saved: list[dict] = []

    with get_db() as db:
        for upload in files:
            original_name, stored_path, total_size = await save_upload(upload, folder)
            cursor = db.execute(
                """
                INSERT INTO output_files (
                    order_id, original_name, stored_name, stored_path,
                    content_type, size_bytes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    order_id, original_name, Path(stored_path).name, stored_path,
                    upload.content_type or "", total_size, created_at,
                ),
            )
            saved.append({
                "id": cursor.lastrowid,
                "original_name": original_name,
                "size_bytes": total_size,
            })
        db.execute(
            "UPDATE orders SET status = 'completed', updated_at = ? WHERE id = ?",
            (created_at, order_id),
        )
        db.commit()

    return {"success": True, "files": saved, "status": "completed"}


@app.get("/api/capabilities")
def capabilities() -> dict:
    return {
        "version": APP_VERSION,
        "ocr": ocr_capability().__dict__,
        "translation": translation_capability().__dict__,
        "features": {
            "recognition": True,
            "rule_based_quote": True,
            "job_queue": True,
            "delivery_package": True,
            "ai_translation": translation_capability().configured,
            "ocr_processing": ocr_capability().available,
        },
    }


@app.get("/api/admin/translation-settings", dependencies=[Depends(require_admin)])
def get_translation_settings() -> dict:
    return translation_public_settings()


@app.put("/api/admin/translation-settings", dependencies=[Depends(require_admin)])
def update_translation_settings(payload: AITranslationSettingsUpdate) -> dict:
    try:
        save_translation_settings(payload.model_dump())
        return {"success": True, "settings": translation_public_settings()}
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/admin/translation-settings/test", dependencies=[Depends(require_admin)])
def test_ai_translation() -> dict:
    try:
        return test_translation_connection()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _job_event(job_id: int, progress: int, step: str, message: str, level: str = "info") -> None:
    timestamp = utc_now()
    with get_db() as db:
        db.execute(
            "UPDATE processing_jobs SET progress = ?, current_step = ?, updated_at = ? WHERE id = ?",
            (max(0, min(100, progress)), step, timestamp, job_id),
        )
        db.execute(
            "INSERT INTO processing_events (job_id, level, step, message, created_at) VALUES (?, ?, ?, ?, ?)",
            (job_id, level, step, message, timestamp),
        )
        db.commit()


def _run_processing_worker(job_id: int, order_id: int, order: dict, source_paths: list[tuple[str, str]]) -> None:
    output_dir = OUTPUT_DIR / order["order_number"] / f"job_{job_id}"
    try:
        result = run_local_job(
            order,
            source_paths,
            output_dir,
            progress_callback=lambda progress, step, message: _job_event(job_id, progress, step, message),
        )
        finished_at = utc_now()
        mapped_status = "completed" if result["state"] == "completed" else ("quality_review" if result["state"] == "quality_review" else "processing")
        with get_db() as db:
            for output in result.get("outputs", []):
                path = Path(output["path"])
                if not path.exists():
                    continue
                content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                existing = db.execute(
                    "SELECT id FROM output_files WHERE order_id = ? AND stored_path = ?",
                    (order_id, str(path)),
                ).fetchone()
                if existing is None:
                    db.execute(
                        "INSERT INTO output_files (order_id, original_name, stored_name, stored_path, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (order_id, path.name, path.name, str(path), content_type, path.stat().st_size, finished_at),
                    )
            db.execute(
                "UPDATE processing_jobs SET state = ?, progress = ?, current_step = ?, blockers_json = ?, result_json = ?, updated_at = ? WHERE id = ?",
                (
                    result["state"], result["progress"], result.get("current_step", result["state"]),
                    json.dumps(result.get("blockers", []), ensure_ascii=False),
                    json.dumps(result, ensure_ascii=False), finished_at, job_id,
                ),
            )
            db.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (mapped_status, finished_at, order_id))
            db.commit()
    except Exception as exc:
        finished_at = utc_now()
        _job_event(job_id, 100, "failed", str(exc), "error")
        with get_db() as db:
            db.execute(
                "UPDATE processing_jobs SET state = 'failed', progress = 100, current_step = 'failed', blockers_json = ?, result_json = ?, updated_at = ? WHERE id = ?",
                (json.dumps([str(exc)], ensure_ascii=False), json.dumps({"error": str(exc)}, ensure_ascii=False), finished_at, job_id),
            )
            db.execute("UPDATE orders SET status = 'confirmed', updated_at = ? WHERE id = ?", (finished_at, order_id))
            db.commit()


@app.post("/api/orders/{order_id}/process", dependencies=[Depends(require_admin)])
def start_processing(order_id: int) -> dict:
    created_at = utc_now()
    with get_db() as db:
        row = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        active = db.execute(
            "SELECT id, state FROM processing_jobs WHERE order_id = ? AND state IN ('queued','processing') ORDER BY id DESC LIMIT 1",
            (order_id,),
        ).fetchone()
        if active is not None:
            return {"success": True, "job_id": active["id"], "state": active["state"], "already_running": True}
        order = row_to_order(db, row)
        source_rows = db.execute(
            "SELECT original_name, stored_path FROM order_files WHERE order_id = ? ORDER BY id",
            (order_id,),
        ).fetchall()
        source_paths = [(item["original_name"], item["stored_path"]) for item in source_rows]
        plan = build_plan(order)
        cursor = db.execute(
            "INSERT INTO processing_jobs (order_id, state, progress, plan_json, blockers_json, result_json, current_step, created_at, updated_at) VALUES (?, 'queued', 0, ?, '[]', '{}', 'queued', ?, ?)",
            (order_id, json.dumps(plan, ensure_ascii=False), created_at, created_at),
        )
        job_id = cursor.lastrowid
        db.execute(
            "INSERT INTO processing_events (job_id, level, step, message, created_at) VALUES (?, 'info', 'queued', 'Processing job queued', ?)",
            (job_id, created_at),
        )
        db.execute("UPDATE orders SET status = 'processing', updated_at = ? WHERE id = ?", (created_at, order_id))
        db.commit()

    thread = threading.Thread(
        target=_run_processing_worker,
        args=(job_id, order_id, order, source_paths),
        name=f"document-job-{job_id}",
        daemon=True,
    )
    thread.start()
    return {"success": True, "job_id": job_id, "state": "queued", "progress": 0}


@app.get("/api/orders/{order_id}/jobs", dependencies=[Depends(require_admin)])
def list_processing_jobs(order_id: int) -> dict:
    with get_db() as db:
        rows = db.execute("SELECT * FROM processing_jobs WHERE order_id = ? ORDER BY id DESC", (order_id,)).fetchall()
    jobs = []
    with get_db() as db:
        for row in rows:
            events = db.execute(
                "SELECT level, step, message, created_at FROM processing_events WHERE job_id = ? ORDER BY id",
                (row["id"],),
            ).fetchall()
            jobs.append({
                "id": row["id"], "state": row["state"], "progress": row["progress"],
                "current_step": row["current_step"] if "current_step" in row.keys() else row["state"],
                "plan": json.loads(row["plan_json"] or "[]"),
                "blockers": json.loads(row["blockers_json"] or "[]"),
                "result": json.loads(row["result_json"] or "{}"),
                "events": [dict(item) for item in events],
                "created_at": row["created_at"], "updated_at": row["updated_at"],
            })
    return {"jobs": jobs}


@app.delete("/api/orders/{order_id}", dependencies=[Depends(require_admin)])
def delete_order(order_id: int) -> dict:
    with get_db() as db:
        row = db.execute("SELECT order_number FROM orders WHERE id = ?", (order_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Order not found.")
        db.execute("DELETE FROM orders WHERE id = ?", (order_id,))
        db.commit()

    shutil.rmtree(UPLOAD_DIR / row["order_number"], ignore_errors=True)
    shutil.rmtree(OUTPUT_DIR / row["order_number"], ignore_errors=True)
    return {"success": True}


@app.get("/api/files/{file_id}/download", dependencies=[Depends(require_admin)])
def download_customer_file(file_id: int) -> FileResponse:
    return _download_from_table("order_files", file_id)


@app.get("/api/output-files/{file_id}/download", dependencies=[Depends(require_admin)])
def download_output_file(file_id: int) -> FileResponse:
    return _download_from_table("output_files", file_id)


@app.get("/api/track")
def track_order(order_number: str = Query(...), email: str = Query(...)) -> dict:
    return public_order(order_number, email)


@app.get("/api/track/output-files/{file_id}/download")
def public_output_download(file_id: int, order_number: str = Query(...), email: str = Query(...)) -> FileResponse:
    data = public_order(order_number, email)
    if not any(item["id"] == file_id for item in data["output_files"]):
        raise HTTPException(status_code=404, detail="Delivery file not found for this order.")
    return _download_from_table("output_files", file_id)


def _download_from_table(table: Literal["order_files", "output_files"], file_id: int) -> FileResponse:
    with get_db() as db:
        row = db.execute(
            f"SELECT original_name, stored_path, content_type FROM {table} WHERE id = ?",
            (file_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="File not found.")
    path = Path(row["stored_path"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Stored file is missing.")

    return FileResponse(
        path=path,
        filename=row["original_name"],
        media_type=row["content_type"] or "application/octet-stream",
    )

@app.get("/api/admin/enterprise-overview", dependencies=[Depends(require_admin)])
def enterprise_overview() -> dict:
    with get_db() as db:
        workspace = db.execute("SELECT * FROM workspace_settings WHERE id = 1").fetchone()
        team = [dict(row) for row in db.execute("SELECT id, name, email, role, status, created_at FROM team_members ORDER BY id").fetchall()]
        keys = [dict(row) for row in db.execute("SELECT id, key_prefix, name, status, created_at, last_used_at FROM api_keys ORDER BY id DESC").fetchall()]
        totals = db.execute("SELECT COUNT(*) total, COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) completed FROM orders").fetchone()
        file_bytes = db.execute("SELECT COALESCE(SUM(size_bytes),0) value FROM order_files").fetchone()["value"]
        output_bytes = db.execute("SELECT COALESCE(SUM(size_bytes),0) value FROM output_files").fetchone()["value"]
        jobs = db.execute("SELECT COUNT(*) total FROM processing_jobs").fetchone()["total"]
    limit = int(workspace["monthly_credit_limit"] or 0)
    used = int(jobs * 25 + totals["total"] * 5)
    return {
        "workspace": dict(workspace), "team": team, "api_keys": keys,
        "usage": {"credits_used": used, "credits_limit": limit, "orders": totals["total"], "completed": totals["completed"], "storage_bytes": file_bytes + output_bytes, "processing_jobs": jobs},
        "billing": {"plan": workspace["plan"], "status": "active", "payment_provider": "not_connected", "next_invoice": None},
    }


@app.put("/api/admin/workspace", dependencies=[Depends(require_admin)])
def update_workspace(payload: WorkspaceUpdate) -> dict:
    with get_db() as db:
        db.execute("UPDATE workspace_settings SET name=?, plan=?, monthly_credit_limit=?, updated_at=? WHERE id=1", (payload.name.strip() or 'Document Automation AI', payload.plan.strip() or 'Enterprise', payload.monthly_credit_limit, utc_now()))
        db.commit()
    return enterprise_overview()


@app.post("/api/admin/team", dependencies=[Depends(require_admin)])
def add_team_member(payload: TeamMemberCreate) -> dict:
    if '@' not in payload.email:
        raise HTTPException(status_code=400, detail='A valid email is required.')
    try:
        with get_db() as db:
            db.execute("INSERT INTO team_members (name,email,role,status,created_at) VALUES (?,?,?,?,?)", (payload.name.strip(), payload.email.strip().lower(), payload.role.strip() or 'member', 'active', utc_now()))
            db.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail='This team member already exists.')
    return enterprise_overview()


@app.delete("/api/admin/team/{member_id}", dependencies=[Depends(require_admin)])
def remove_team_member(member_id: int) -> dict:
    with get_db() as db:
        db.execute("DELETE FROM team_members WHERE id=?", (member_id,))
        db.commit()
    return enterprise_overview()


@app.post("/api/admin/api-keys", dependencies=[Depends(require_admin)])
def create_api_key(name: str = Form('Production API')) -> dict:
    raw = 'dai_' + secrets.token_urlsafe(30)
    prefix = raw[:12]
    digest = hashlib.sha256(raw.encode()).hexdigest()
    with get_db() as db:
        cursor = db.execute("INSERT INTO api_keys (key_prefix,key_hash,name,status,created_at) VALUES (?,?,?,?,?)", (prefix, digest, name.strip() or 'Production API', 'active', utc_now()))
        db.commit()
    return {"id": cursor.lastrowid, "api_key": raw, "key_prefix": prefix, "name": name.strip() or 'Production API'}


@app.delete("/api/admin/api-keys/{key_id}", dependencies=[Depends(require_admin)])
def revoke_api_key(key_id: int) -> dict:
    with get_db() as db:
        db.execute("UPDATE api_keys SET status='revoked' WHERE id=?", (key_id,))
        db.commit()
    return enterprise_overview()


@app.get("/api/admin/cloud-status", dependencies=[Depends(require_admin)])
def cloud_status() -> dict:
    disk = shutil.disk_usage(PERSISTENT_ROOT)
    return {
        "version": APP_VERSION,
        "cloud_mode": CLOUD_MODE,
        "persistent_root": str(PERSISTENT_ROOT),
        "database_path": str(DB_PATH),
        "database_exists": DB_PATH.exists(),
        "uploads_path": str(UPLOAD_DIR),
        "outputs_path": str(OUTPUT_DIR),
        "disk_free_bytes": disk.free,
        "admin_password_is_default": ADMIN_PASSWORD == "admin123456",
        "frontend_bundled": (FRONTEND_DIST / "index.html").exists(),
    }


# Serve the production React build from the same origin in cloud deployments.
if (FRONTEND_DIST / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
