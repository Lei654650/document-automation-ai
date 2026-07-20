from __future__ import annotations

import hashlib
import base64
import urllib.error
import urllib.parse
import urllib.request
import io
import json
import mimetypes
import os
import secrets
import shutil
import subprocess
import zipfile
import sqlite3
import threading
import time
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.services.document_analyzer import analyze_order_files
from app.services.runtime_service import storage_diagnostics
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
APP_VERSION = "25.1.4"
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or Path('/var/task').exists())
CLOUD_MODE = IS_VERCEL or os.getenv("CLOUD_MODE", "false").lower() in {"1", "true", "yes", "on"}
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123456")
_data_root = os.getenv("APP_DATA_DIR", "").strip()
if IS_VERCEL:
    # Vercel's deployed bundle (/var/task) is read-only. Only /tmp is writable.
    # Files stored here are temporary and may disappear after a serverless instance is recycled.
    PERSISTENT_ROOT = (Path(tempfile.gettempdir()) / "document-automation-ai").resolve()
elif _data_root:
    PERSISTENT_ROOT = Path(_data_root).expanduser().resolve()
elif os.name == "nt" and os.getenv("LOCALAPPDATA"):
    # Keep customer settings, orders and outputs outside the replaceable project folder.
    PERSISTENT_ROOT = (Path(os.environ["LOCALAPPDATA"]) / "DocumentAutomationAI").resolve()
else:
    PERSISTENT_ROOT = BASE_DIR
DATA_DIR = PERSISTENT_ROOT / "data"
UPLOAD_DIR = PERSISTENT_ROOT / "uploads"
OUTPUT_DIR = PERSISTENT_ROOT / "outputs"
DB_PATH = DATA_DIR / "orders.db"
MAX_FILE_SIZE_MB = max(1, int(os.getenv("MAX_FILE_SIZE_MB", "100")))
MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
FRONTEND_DIST = BASE_DIR / "static"
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "").strip()
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID", "").strip()
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET", "").strip()
PAYPAL_WEBHOOK_ID = os.getenv("PAYPAL_WEBHOOK_ID", "").strip()
PAYPAL_MODE = os.getenv("PAYPAL_MODE", "sandbox").strip().lower()
PAYMENT_SUCCESS_URL = os.getenv("PAYMENT_SUCCESS_URL", "").strip()
PAYMENT_CANCEL_URL = os.getenv("PAYMENT_CANCEL_URL", "").strip()
PAYMENT_TEST_MODE = os.getenv("PAYMENT_TEST_MODE", "false").lower() in {"1", "true", "yes", "on"}
ENFORCE_CREDITS = os.getenv("ENFORCE_CREDITS", "false").lower() in {"1", "true", "yes", "on"}
JOB_STALE_SECONDS = max(120, int(os.getenv("JOB_STALE_SECONDS", "300")))

DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_SUFFIXES = {
    ".pdf", ".xlsx", ".xls", ".docx", ".doc", ".csv",
    ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".zip"
}
VALID_STATUSES = {
    "waiting_quote", "quoted", "confirmed", "processing",
    "quality_review", "partial_completed", "completed", "failed", "cancelled"
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


class CheckoutCreate(BaseModel):
    plan_id: str
    customer_name: str = ""
    customer_email: str
    locale: str = "zh"


class DemoPaymentConfirm(BaseModel):
    payment_number: str
    customer_email: str


class FreePlanActivate(BaseModel):
    customer_name: str = ""
    customer_email: str
    locale: str = "zh"


class SalesLeadCreate(BaseModel):
    customer_name: str
    customer_email: str
    company: str = ""
    phone: str = ""
    requirements: str = ""
    locale: str = "zh"


class CreditEstimateRequest(BaseModel):
    pages: int = Field(default=1, ge=1, le=100000)
    file_size_mb: float = Field(default=1, ge=0)
    services: list[str] = []
    file_count: int = Field(default=1, ge=1, le=10000)


class WalletAdjustment(BaseModel):
    customer_email: str
    credits: int
    note: str = "Administrator adjustment"


class UploadInitRequest(BaseModel):
    filename: str
    size_bytes: int = Field(ge=1)
    content_type: str = "application/octet-stream"


class ChunkedOrderCreate(BaseModel):
    upload_ids: list[str]
    name: str
    email: str
    services: list[str] = []
    company: str = ""
    whatsapp: str = ""
    country: str = ""
    deadline: str = ""
    requirements: str = ""
    translation: dict = {}
    conversion: dict = {}


PAYMENT_PLANS = {
    "free": {"name": "Free", "kind": "subscription", "billing": "monthly", "amount_cents": 0, "currency": "usd", "credits": 500, "team_members": 1, "file_limit_mb": 10, "features": ["basic_conversion", "standard_queue"]},
    "starter_monthly": {"name": "Starter", "kind": "subscription", "billing": "monthly", "amount_cents": 1900, "currency": "usd", "credits": 2000, "team_members": 1, "file_limit_mb": 50, "features": ["ocr", "translation", "batch_10"]},
    "starter_yearly": {"name": "Starter", "kind": "subscription", "billing": "yearly", "amount_cents": 19000, "currency": "usd", "credits": 24000, "team_members": 1, "file_limit_mb": 50, "features": ["ocr", "translation", "batch_10"]},
    "professional_monthly": {"name": "Professional", "kind": "subscription", "billing": "monthly", "amount_cents": 5900, "currency": "usd", "credits": 8000, "team_members": 3, "file_limit_mb": 200, "features": ["advanced_ocr", "layout_preservation", "batch_100", "basic_api", "priority_queue"]},
    "professional_yearly": {"name": "Professional", "kind": "subscription", "billing": "yearly", "amount_cents": 59000, "currency": "usd", "credits": 96000, "team_members": 3, "file_limit_mb": 200, "features": ["advanced_ocr", "layout_preservation", "batch_100", "basic_api", "priority_queue"]},
    "business_monthly": {"name": "Business", "kind": "subscription", "billing": "monthly", "amount_cents": 14900, "currency": "usd", "credits": 30000, "team_members": 10, "file_limit_mb": 500, "features": ["team", "advanced_api", "priority_queue", "analytics", "invoice"]},
    "business_yearly": {"name": "Business", "kind": "subscription", "billing": "yearly", "amount_cents": 149000, "currency": "usd", "credits": 360000, "team_members": 10, "file_limit_mb": 500, "features": ["team", "advanced_api", "priority_queue", "analytics", "invoice"]},
    "enterprise": {"name": "Enterprise", "kind": "contact", "billing": "custom", "amount_cents": 0, "currency": "usd", "credits": 0, "team_members": 0, "file_limit_mb": 0, "features": ["private_deployment", "sso", "sla", "custom_integration"]},
    "credits_1000": {"name": "1,000 DA Credits", "kind": "credit_pack", "billing": "one_time", "amount_cents": 1500, "currency": "usd", "credits": 1000, "valid_days": 365, "features": []},
    "credits_5000": {"name": "5,000 DA Credits", "kind": "credit_pack", "billing": "one_time", "amount_cents": 5900, "currency": "usd", "credits": 5000, "valid_days": 365, "features": []},
    "credits_20000": {"name": "20,000 DA Credits", "kind": "credit_pack", "billing": "one_time", "amount_cents": 19900, "currency": "usd", "credits": 20000, "valid_days": 730, "features": []},
}


def payment_provider() -> str:
    if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET:
        return "paypal"
    if STRIPE_SECRET_KEY:
        return "stripe"
    return "demo"


def paypal_api_base() -> str:
    return "https://api-m.paypal.com" if PAYPAL_MODE == "live" else "https://api-m.sandbox.paypal.com"


def paypal_request(path: str, method: str = "GET", payload: dict | None = None, access_token: str = "") -> dict:
    url = paypal_api_base() + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json", "Accept": "application/json", "Prefer": "return=representation"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    request = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"PayPal API error {exc.code}: {detail[:800]}") from exc


def paypal_access_token() -> str:
    credentials = base64.b64encode(f"{PAYPAL_CLIENT_ID}:{PAYPAL_CLIENT_SECRET}".encode()).decode()
    request = urllib.request.Request(
        paypal_api_base() + "/v1/oauth2/token",
        data=b"grant_type=client_credentials",
        method="POST",
        headers={"Authorization": f"Basic {credentials}", "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body["access_token"]
    except Exception as exc:
        raise RuntimeError(f"Unable to authenticate with PayPal: {exc}") from exc


def mark_payment_paid(payment_number: str, provider_session_id: str = "", provider_payment_id: str = "") -> bool:
    def operation(db):
        row = db.execute("SELECT * FROM payment_orders WHERE payment_number=?", (payment_number,)).fetchone()
        if row is None:
            return False
        if row["status"] == "paid":
            return True
        now = utc_now()
        plan = PAYMENT_PLANS.get(row["plan_id"], {})
        email = row["customer_email"].strip().lower()
        db.execute("UPDATE payment_orders SET status='paid', provider_session_id=COALESCE(NULLIF(?,''),provider_session_id), provider_payment_id=COALESCE(NULLIF(?,''),provider_payment_id), paid_at=?, updated_at=? WHERE id=?", (provider_session_id, provider_payment_id, now, now, row["id"]))
        wallet = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        if wallet is None:
            db.execute("INSERT INTO customer_wallets (customer_email,updated_at) VALUES (?,?)", (email, now))
            wallet = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        bucket = "purchased" if plan.get("kind") == "credit_pack" else "subscription"
        column = "purchased_credits" if bucket == "purchased" else "subscription_credits"
        if plan.get("kind") == "subscription":
            db.execute(f"UPDATE customer_wallets SET {column}=?, plan_id=?, plan_status='active', updated_at=? WHERE customer_email=?", (row["credits"], row["plan_id"], now, email))
        else:
            db.execute(f"UPDATE customer_wallets SET {column}={column}+?, updated_at=? WHERE customer_email=?", (row["credits"], now, email))
        balance = db.execute("SELECT subscription_credits+purchased_credits+bonus_credits AS total FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()["total"]
        db.execute("INSERT INTO credit_ledger (customer_email,transaction_type,bucket,credits,balance_after,reference,note,created_at) VALUES (?,?,?,?,?,?,?,?)", (email,"credit",bucket,row["credits"],balance,payment_number,"Payment credited",now))
        db.execute("INSERT INTO payment_events (payment_order_id,event_type,payload_json,created_at) VALUES (?,?,?,?)", (row["id"], "payment.paid", json.dumps({"provider_session_id": provider_session_id, "provider_payment_id": provider_payment_id, "wallet_balance": balance}), now))
        return True
    return bool(run_db_write(operation))


class AITranslationSettingsUpdate(BaseModel):
    provider: str = "none"
    api_key: str = ""
    model: str = ""
    base_url: str = ""
    timeout_seconds: int = Field(default=90, ge=10, le=300)
    max_retries: int = Field(default=2, ge=0, le=5)
    clear_api_key: bool = False



def require_admin(
    request: Request,
    x_admin_key: Annotated[str | None, Header()] = None,
) -> None:
    """Protect administrator endpoints.

    The packaged Windows application is a localhost-only desktop deployment, so
    administrators should not be locked out after replacing the project folder.
    Cloud deployments still require the configured ADMIN_PASSWORD header.
    """
    client_host = request.client.host if request.client else ""
    is_local_client = client_host in {"127.0.0.1", "::1", "localhost", "testclient"}
    if not CLOUD_MODE and is_local_client:
        return
    if not x_admin_key or not secrets.compare_digest(x_admin_key, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Administrator authentication failed. Check the administrator password.")


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
            "translation": data["translation"], "conversion": data["conversion"],
            "files": data["files"], "output_files": data["output_files"],
            "processing_job": data["processing_job"],
        }

def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db() -> sqlite3.Connection:
    # SQLite is reliable for this local product when connections wait briefly for
    # concurrent writers instead of failing immediately. WAL also keeps reads
    # responsive while an upload or processing event is being committed.
    connection = sqlite3.connect(DB_PATH, timeout=30.0, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")
    return connection


def run_db_write(operation, attempts: int = 6):
    """Run a short SQLite write transaction with bounded lock retries."""
    delay = 0.2
    for attempt in range(attempts):
        try:
            with get_db() as db:
                db.execute("BEGIN IMMEDIATE")
                result = operation(db)
                db.commit()
                return result
        except sqlite3.OperationalError as exc:
            if "locked" not in str(exc).lower() or attempt == attempts - 1:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 2.0)


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
        ensure_column(db, "orders", "conversion_json", "TEXT NOT NULL DEFAULT '{}'")
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
            CREATE TABLE IF NOT EXISTS processing_steps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                step_key TEXT NOT NULL,
                label TEXT NOT NULL,
                position INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                progress INTEGER NOT NULL DEFAULT 0,
                started_at TEXT NOT NULL DEFAULT '',
                finished_at TEXT NOT NULL DEFAULT '',
                duration_ms INTEGER NOT NULL DEFAULT 0,
                message TEXT NOT NULL DEFAULT '',
                error TEXT NOT NULL DEFAULT '',
                FOREIGN KEY(job_id) REFERENCES processing_jobs(id) ON DELETE CASCADE,
                UNIQUE(job_id, step_key)
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
            CREATE TABLE IF NOT EXISTS payment_orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_number TEXT UNIQUE NOT NULL,
                plan_id TEXT NOT NULL,
                plan_name TEXT NOT NULL,
                customer_name TEXT NOT NULL DEFAULT '',
                customer_email TEXT NOT NULL,
                amount_cents INTEGER NOT NULL,
                currency TEXT NOT NULL,
                credits INTEGER NOT NULL,
                provider TEXT NOT NULL,
                provider_session_id TEXT NOT NULL DEFAULT '',
                provider_payment_id TEXT NOT NULL DEFAULT '',
                checkout_url TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                paid_at TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS payment_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payment_order_id INTEGER,
                event_type TEXT NOT NULL,
                payload_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                FOREIGN KEY(payment_order_id) REFERENCES payment_orders(id) ON DELETE SET NULL
            );
            """
        )
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS customer_wallets (
                customer_email TEXT PRIMARY KEY,
                subscription_credits INTEGER NOT NULL DEFAULT 0,
                purchased_credits INTEGER NOT NULL DEFAULT 0,
                bonus_credits INTEGER NOT NULL DEFAULT 0,
                plan_id TEXT NOT NULL DEFAULT 'free',
                plan_status TEXT NOT NULL DEFAULT 'active',
                current_period_end TEXT NOT NULL DEFAULT '',
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS credit_ledger (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_email TEXT NOT NULL,
                transaction_type TEXT NOT NULL,
                bucket TEXT NOT NULL,
                credits INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                reference TEXT NOT NULL DEFAULT '',
                note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_credit_ledger_email ON credit_ledger(customer_email, id DESC);
            CREATE TABLE IF NOT EXISTS sales_leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                company TEXT NOT NULL DEFAULT '',
                phone TEXT NOT NULL DEFAULT '',
                requirements TEXT NOT NULL DEFAULT '',
                locale TEXT NOT NULL DEFAULT 'zh',
                status TEXT NOT NULL DEFAULT 'new',
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sales_leads_email ON sales_leads(customer_email, id DESC);
            CREATE TABLE IF NOT EXISTS credit_reservations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL UNIQUE,
                customer_email TEXT NOT NULL,
                credits INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'reserved',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
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
    delay = 0.25
    for attempt in range(6):
        try:
            initialize_db()
            break
        except sqlite3.OperationalError as exc:
            if "locked" not in str(exc).lower() or attempt == 5:
                raise
            time.sleep(delay)
            delay = min(delay * 2, 2.0)
    # In-process workers cannot survive a container restart. Mark interrupted jobs clearly.
    with get_db() as db:
        interrupted = db.execute("SELECT id FROM processing_jobs WHERE state IN ('queued','processing')").fetchall()
        for row in interrupted:
            timestamp = utc_now()
            db.execute(
                "UPDATE processing_jobs SET state='failed', progress=100, current_step='interrupted', blockers_json=?, updated_at=? WHERE id=?",
                (json.dumps(["Processing was interrupted by a runtime restart. Retry the job; completed source files remain available."], ensure_ascii=False), timestamp, row["id"]),
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
        "chunk_upload": True,
        "recommended_chunk_size_bytes": 2 * 1024 * 1024,
    }


@app.get("/api/health")
def health() -> dict:
    storage = storage_diagnostics(PERSISTENT_ROOT, DB_PATH, UPLOAD_DIR, OUTPUT_DIR)
    translation = translation_capability().__dict__
    readiness = "ready"
    warnings = []
    if not storage["writable"]:
        readiness = "blocked"
        warnings.append("Runtime storage is not writable.")
    if storage["temporary_storage"]:
        readiness = "degraded" if readiness == "ready" else readiness
        warnings.append("Serverless temporary storage is active; configure durable database and object storage for production retention.")
    if not translation.get("configured"):
        warnings.append("AI translation provider is not configured.")
    return {
        "status": "ok" if readiness != "blocked" else "error",
        "readiness": readiness,
        "version": APP_VERSION,
        "cloud_mode": CLOUD_MODE,
        "storage": storage,
        "ocr": ocr_capability().__dict__,
        "translation": translation,
        "payments": {"configured": payment_provider() in {"stripe", "paypal"}, "provider": payment_provider()},
        "credits_enforced": ENFORCE_CREDITS,
        "warnings": warnings,
    }


@app.get("/api/readiness")
def readiness() -> dict:
    data = health()
    return {
        "ready": data["readiness"] == "ready",
        "readiness": data["readiness"],
        "version": APP_VERSION,
        "checks": {
            "runtime_storage": data["storage"]["writable"],
            "durable_storage": data["storage"]["durable_storage_configured"],
            "translation": data["translation"].get("configured", False),
            "payments": data["payments"]["configured"],
        },
        "warnings": data["warnings"],
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
        step_rows = db.execute(
            "SELECT step_key, label, position, status, progress, started_at, finished_at, duration_ms, message, error FROM processing_steps WHERE job_id = ? ORDER BY position",
            (job_row["id"],),
        ).fetchall()
        latest_job = {
            "id": job_row["id"], "state": job_row["state"], "progress": job_row["progress"],
            "current_step": job_row["current_step"] if "current_step" in job_row.keys() else job_row["state"],
            "plan": json.loads(job_row["plan_json"] or "[]"),
            "steps": [dict(item) for item in step_rows],
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
        "conversion": json.loads(row["conversion_json"] or "{}"),
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


ZIP_MAX_FILES = max(10, int(os.getenv("ZIP_MAX_FILES", "250")))
ZIP_MAX_DEPTH = max(1, min(int(os.getenv("ZIP_MAX_DEPTH", "3")), 5))


def _safe_extract_zip(zip_path: Path, destination: Path, depth: int = 0) -> list[tuple[str, str, int]]:
    """Safely expand enterprise ZIP uploads and return supported leaf files.

    Directory traversal, encrypted entries, excessive file counts and unsupported
    files are rejected or skipped. Nested ZIP files are supported up to a bounded
    depth so one customer project can preserve its directory structure.
    """
    if depth >= ZIP_MAX_DEPTH:
        return []
    destination.mkdir(parents=True, exist_ok=True)
    extracted: list[tuple[str, str, int]] = []
    with zipfile.ZipFile(zip_path) as archive:
        members = [m for m in archive.infolist() if not m.is_dir()]
        if len(members) > ZIP_MAX_FILES:
            raise HTTPException(status_code=400, detail=f"ZIP contains too many files (max {ZIP_MAX_FILES}).")
        for member in members:
            if member.flag_bits & 0x1:
                raise HTTPException(status_code=400, detail="Encrypted ZIP files are not supported.")
            relative = Path(member.filename.replace('\\', '/'))
            if relative.is_absolute() or '..' in relative.parts:
                raise HTTPException(status_code=400, detail="Unsafe path found inside ZIP.")
            target = (destination / relative).resolve()
            if destination.resolve() not in target.parents:
                raise HTTPException(status_code=400, detail="Unsafe ZIP entry path.")
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as src, target.open('wb') as dst:
                shutil.copyfileobj(src, dst)
            suffix = target.suffix.lower()
            if suffix == '.zip':
                nested_dir = target.parent / f"{target.stem}_expanded"
                extracted.extend(_safe_extract_zip(target, nested_dir, depth + 1))
                continue
            if suffix not in ALLOWED_SUFFIXES or suffix == '.zip':
                continue
            size = target.stat().st_size
            if size > MAX_FILE_SIZE:
                raise HTTPException(status_code=413, detail=f"{relative.name} exceeds {MAX_FILE_SIZE_MB} MB.")
            display_name = str(relative).replace('\\', '/')
            extracted.append((display_name, str(target), size))
    return extracted


def _estimate_order_credits(analysis: dict, services: list[str], file_count: int, total_size_bytes: int) -> int:
    rates = {"conversion": 1, "ocr": 2, "translation": 3, "data_cleanup": 2, "enterprise_analysis": 4, "layout_preserve": 2, "layout_preservation": 2, "image_enhancement": 1}
    pages = int(analysis.get("total_pages") or analysis.get("pages") or file_count or 1)
    per_page = 1 + sum(rates.get(str(service), 0) for service in services)
    size_surcharge = max(0, int((total_size_bytes / 1024 / 1024) // 25))
    return max(1, pages * per_page + size_surcharge)


def _wallet_total(db: sqlite3.Connection, email: str) -> int:
    row = db.execute("SELECT subscription_credits+purchased_credits+bonus_credits AS total FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
    return int(row["total"] if row else 0)


def _reserve_credits(db: sqlite3.Connection, order_id: int, email: str, credits: int) -> None:
    now = utc_now()
    db.execute("INSERT OR IGNORE INTO customer_wallets (customer_email,subscription_credits,plan_id,updated_at) VALUES (?,500,'free',?)", (email, now))
    available = _wallet_total(db, email)
    if available < credits:
        raise HTTPException(status_code=402, detail=f"Insufficient DA Credits. Required {credits}, available {available}.")
    remaining = credits
    for column, bucket in (("bonus_credits", "bonus"), ("subscription_credits", "subscription"), ("purchased_credits", "purchased")):
        row = db.execute(f"SELECT {column} AS value FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        take = min(remaining, int(row["value"] or 0))
        if take:
            db.execute(f"UPDATE customer_wallets SET {column}={column}-?,updated_at=? WHERE customer_email=?", (take, now, email))
            remaining -= take
        if remaining <= 0:
            break
    balance = _wallet_total(db, email)
    db.execute("INSERT INTO credit_ledger (customer_email,transaction_type,bucket,credits,balance_after,reference,note,created_at) VALUES (?,?,?,?,?,?,?,?)", (email,"reservation","mixed",-credits,balance,str(order_id),"Reserved for document processing",now))
    db.execute("INSERT INTO credit_reservations (order_id,customer_email,credits,status,created_at,updated_at) VALUES (?,?,?,'reserved',?,?)", (order_id,email,credits,now,now))


def _settle_or_refund_credits(db: sqlite3.Connection, order_id: int, final_state: str) -> None:
    row = db.execute("SELECT * FROM credit_reservations WHERE order_id=?", (order_id,)).fetchone()
    if row is None or row["status"] != "reserved":
        return
    now = utc_now()
    if final_state in {"completed", "partial_completed", "quality_review"}:
        db.execute("UPDATE credit_reservations SET status='settled',updated_at=? WHERE order_id=?", (now,order_id))
        return
    credits, email = int(row["credits"]), row["customer_email"]
    db.execute("UPDATE customer_wallets SET purchased_credits=purchased_credits+?,updated_at=? WHERE customer_email=?", (credits,now,email))
    balance = _wallet_total(db,email)
    db.execute("INSERT INTO credit_ledger (customer_email,transaction_type,bucket,credits,balance_after,reference,note,created_at) VALUES (?,?,?,?,?,?,?,?)", (email,"refund","purchased",credits,balance,str(order_id),"Automatic refund after unsuccessful processing",now))
    db.execute("UPDATE credit_reservations SET status='refunded',updated_at=? WHERE order_id=?", (now,order_id))


UPLOAD_SESSION_DIR = UPLOAD_DIR / "_sessions"
UPLOAD_SESSION_DIR.mkdir(parents=True, exist_ok=True)
CHUNK_SIZE_LIMIT = 3 * 1024 * 1024


def _session_meta_path(upload_id: str) -> Path:
    return UPLOAD_SESSION_DIR / upload_id / "meta.json"


def _read_upload_meta(upload_id: str) -> dict:
    if not upload_id or any(ch not in "0123456789abcdef" for ch in upload_id.lower()):
        raise HTTPException(status_code=400, detail="Invalid upload session.")
    path = _session_meta_path(upload_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Upload session expired or was not found. Please upload the file again.")
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/uploads/init")
def init_chunk_upload(payload: UploadInitRequest) -> dict:
    filename = Path(payload.filename).name
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix or 'unknown'}")
    if payload.size_bytes > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail=f"{filename} exceeds {MAX_FILE_SIZE_MB} MB.")
    upload_id = uuid.uuid4().hex
    folder = UPLOAD_SESSION_DIR / upload_id
    folder.mkdir(parents=True, exist_ok=False)
    meta = {"upload_id": upload_id, "filename": filename, "size_bytes": payload.size_bytes, "content_type": payload.content_type, "received_bytes": 0, "next_index": 0, "created_at": utc_now(), "complete": False}
    _session_meta_path(upload_id).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return {"upload_id": upload_id, "chunk_size": 2 * 1024 * 1024}


@app.put("/api/uploads/{upload_id}/chunks/{chunk_index}")
async def upload_chunk(upload_id: str, chunk_index: int, request: Request) -> dict:
    meta = _read_upload_meta(upload_id)
    if meta.get("complete"):
        return {"success": True, "received_bytes": meta["received_bytes"], "complete": True}
    if chunk_index != int(meta.get("next_index", 0)):
        raise HTTPException(status_code=409, detail=f"Expected chunk {meta.get('next_index', 0)}, received {chunk_index}.")
    body = await request.body()
    if not body or len(body) > CHUNK_SIZE_LIMIT:
        raise HTTPException(status_code=413, detail="Chunk must be between 1 byte and 3 MB.")
    new_total = int(meta.get("received_bytes", 0)) + len(body)
    if new_total > int(meta["size_bytes"]) or new_total > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Uploaded data exceeds the declared file size.")
    folder = UPLOAD_SESSION_DIR / upload_id
    with (folder / "payload.bin").open("ab") as out:
        out.write(body)
    meta["received_bytes"] = new_total
    meta["next_index"] = chunk_index + 1
    _session_meta_path(upload_id).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return {"success": True, "received_bytes": new_total, "size_bytes": meta["size_bytes"]}


@app.post("/api/uploads/{upload_id}/complete")
def complete_chunk_upload(upload_id: str) -> dict:
    meta = _read_upload_meta(upload_id)
    if int(meta.get("received_bytes", 0)) != int(meta["size_bytes"]):
        raise HTTPException(status_code=409, detail=f"Upload incomplete: {meta.get('received_bytes', 0)} of {meta['size_bytes']} bytes received.")
    payload = UPLOAD_SESSION_DIR / upload_id / "payload.bin"
    if not payload.exists() or payload.stat().st_size != int(meta["size_bytes"]):
        raise HTTPException(status_code=409, detail="Uploaded file could not be verified.")
    meta["complete"] = True
    meta["completed_at"] = utc_now()
    _session_meta_path(upload_id).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return {"success": True, "upload_id": upload_id, "filename": meta["filename"], "size_bytes": meta["size_bytes"]}


def _create_order_from_paths(payload: ChunkedOrderCreate) -> dict:
    if not payload.name.strip() or not payload.email.strip():
        raise HTTPException(status_code=400, detail="Name and email are required.")
    if not payload.upload_ids:
        raise HTTPException(status_code=400, detail="At least one uploaded file is required.")
    selected_services = payload.services or ["standard"]
    order_number = f"DA-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    created_at = utc_now()
    order_folder = UPLOAD_DIR / order_number
    order_folder.mkdir(parents=True, exist_ok=True)
    prepared_rows = []
    analysis_paths = []
    consumed_sessions = []
    try:
        for upload_id in payload.upload_ids:
            meta = _read_upload_meta(upload_id)
            if not meta.get("complete"):
                raise HTTPException(status_code=409, detail=f"{meta.get('filename','File')} upload is incomplete.")
            source = UPLOAD_SESSION_DIR / upload_id / "payload.bin"
            suffix = Path(meta["filename"]).suffix.lower()
            stored_path = order_folder / f"{uuid.uuid4().hex}{suffix}"
            shutil.move(str(source), stored_path)
            upload_rows = [(meta["filename"], str(stored_path), int(meta["size_bytes"]), meta.get("content_type", ""))]
            if suffix == ".zip":
                expanded = _safe_extract_zip(stored_path, order_folder / f"{Path(meta['filename']).stem}_expanded")
                if not expanded:
                    raise HTTPException(status_code=400, detail=f"{meta['filename']} contains no supported documents.")
                upload_rows = [(n, p, z, mimetypes.guess_type(n)[0] or "") for n,p,z in expanded]
            prepared_rows.extend(upload_rows)
            analysis_paths.extend((n,p) for n,p,_,_ in upload_rows)
            consumed_sessions.append(upload_id)
        ai_analysis = analyze_order_files(analysis_paths, selected_services, payload.requirements.strip(), payload.translation)
        suggested_quote = suggest_quote(ai_analysis, selected_services)
        estimated_credits = _estimate_order_credits(ai_analysis, selected_services, len(prepared_rows), sum(r[2] for r in prepared_rows))
        def insert_order(db):
            cur=db.execute("""INSERT INTO orders (order_number,name,company,email,whatsapp,country,deadline,requirements,services_json,translation_json,conversion_json,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'waiting_quote',?,?)""",(order_number,payload.name.strip(),payload.company.strip(),payload.email.strip(),payload.whatsapp.strip(),payload.country.strip(),payload.deadline.strip(),payload.requirements.strip(),json.dumps(selected_services,ensure_ascii=False),json.dumps(payload.translation,ensure_ascii=False),json.dumps(payload.conversion,ensure_ascii=False),created_at,created_at))
            order_id=cur.lastrowid; saved=[]
            for n,p,z,ct in prepared_rows:
                fc=db.execute("INSERT INTO order_files (order_id,original_name,stored_name,stored_path,content_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)",(order_id,n,Path(p).name,p,ct,z,created_at));saved.append({"id":fc.lastrowid,"original_name":n,"size_bytes":z})
            db.execute("UPDATE orders SET ai_analysis_json=?,suggested_quote_json=? WHERE id=?",(json.dumps({**ai_analysis,"estimated_credits":estimated_credits},ensure_ascii=False),json.dumps(suggested_quote,ensure_ascii=False),order_id))
            if ENFORCE_CREDITS:_reserve_credits(db,order_id,payload.email.strip().lower(),estimated_credits)
            return order_id,saved
        order_id,saved_files=run_db_write(insert_order)
        for upload_id in consumed_sessions: shutil.rmtree(UPLOAD_SESSION_DIR/upload_id,ignore_errors=True)
        processing=start_processing(order_id)
        return {"success":True,"order_id":order_id,"order_number":order_number,"status":"processing","files":saved_files,"ai_analysis":ai_analysis,"suggested_quote":suggested_quote,"estimated_credits":estimated_credits,"credits_enforced":ENFORCE_CREDITS,"services":selected_services,"translation":payload.translation,"conversion":payload.conversion,"processing_job":processing}
    except Exception:
        shutil.rmtree(order_folder,ignore_errors=True)
        raise


@app.post("/api/orders/from-uploads")
def create_order_from_uploads(payload: ChunkedOrderCreate) -> dict:
    return _create_order_from_paths(payload)


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
    conversion_json: Annotated[str, Form()] = "{}",
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
        selected_services = ["standard"]
    try:
        translation_data = json.loads(translation_json or "{}")
        conversion_data = json.loads(conversion_json or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid processing settings.") from exc
    if not isinstance(translation_data, dict) or not isinstance(conversion_data, dict):
        raise HTTPException(status_code=400, detail="Invalid processing settings.")

    order_number = f"DA-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    created_at = utc_now()
    order_folder = UPLOAD_DIR / order_number
    prepared_rows: list[tuple[str, str, int, str]] = []
    analysis_paths: list[tuple[str, str]] = []

    # Save and inspect potentially large files before opening any database write
    # transaction. This prevents a 47 MB workbook upload from locking SQLite.
    try:
        for upload in files:
            original_name, stored_path, total_size = await save_upload(upload, order_folder)
            suffix = Path(original_name).suffix.lower()
            upload_rows = [(original_name, stored_path, total_size, upload.content_type or "")]
            if suffix == ".zip":
                expanded_dir = order_folder / f"{Path(original_name).stem}_expanded"
                expanded = _safe_extract_zip(Path(stored_path), expanded_dir)
                if not expanded:
                    raise HTTPException(status_code=400, detail=f"{original_name} contains no supported documents.")
                upload_rows = [(n, p, z, mimetypes.guess_type(n)[0] or "") for n, p, z in expanded]
            prepared_rows.extend(upload_rows)
            analysis_paths.extend((n, p) for n, p, _, _ in upload_rows)

        ai_analysis = analyze_order_files(analysis_paths, selected_services, requirements.strip(), translation_data)
        suggested_quote = suggest_quote(ai_analysis, selected_services)
        estimated_credits = _estimate_order_credits(ai_analysis, selected_services, len(prepared_rows), sum(row[2] for row in prepared_rows))

        def insert_order(db: sqlite3.Connection):
            cursor = db.execute(
                """
                INSERT INTO orders (
                    order_number, name, company, email, whatsapp, country,
                    deadline, requirements, services_json, translation_json, conversion_json, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting_quote', ?, ?)
                """,
                (order_number, name.strip(), company.strip(), email.strip(), whatsapp.strip(),
                 country.strip(), deadline.strip(), requirements.strip(),
                 json.dumps(selected_services, ensure_ascii=False),
                 json.dumps(translation_data, ensure_ascii=False),
                 json.dumps(conversion_data, ensure_ascii=False), created_at, created_at),
            )
            order_id = cursor.lastrowid
            saved_files = []
            for row_name, row_path, row_size, row_content_type in prepared_rows:
                file_cursor = db.execute(
                    """INSERT INTO order_files (order_id, original_name, stored_name, stored_path,
                    content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (order_id, row_name, Path(row_path).name, row_path, row_content_type, row_size, created_at),
                )
                saved_files.append({"id": file_cursor.lastrowid, "original_name": row_name, "size_bytes": row_size})
            db.execute("UPDATE orders SET ai_analysis_json=?, suggested_quote_json=? WHERE id=?",
                       (json.dumps({**ai_analysis, "estimated_credits": estimated_credits}, ensure_ascii=False), json.dumps(suggested_quote, ensure_ascii=False), order_id))
            if ENFORCE_CREDITS:
                _reserve_credits(db, order_id, email.strip().lower(), estimated_credits)
            return order_id, saved_files

        order_id, saved_files = run_db_write(insert_order)
    except Exception:
        shutil.rmtree(order_folder, ignore_errors=True)
        raise

    processing = start_processing(order_id)
    return {
        "success": True, "order_id": order_id, "order_number": order_number,
        "status": "processing", "files": saved_files, "ai_analysis": ai_analysis,
        "suggested_quote": suggested_quote, "estimated_credits": estimated_credits, "credits_enforced": ENFORCE_CREDITS, "services": selected_services,
        "translation": translation_data, "conversion": conversion_data,
        "processing_job": processing,
    }


@app.get("/api/dashboard/recent-orders")
def dashboard_recent_orders() -> dict:
    status_labels = {
        "waiting_quote": "等待处理", "quoted": "已报价", "processing": "处理中",
        "completed": "已完成", "cancelled": "已取消", "failed": "失败",
    }
    with get_db() as db:
        rows = db.execute("SELECT * FROM orders ORDER BY id DESC LIMIT 20").fetchall()
        items = []
        for row in rows:
            order = row_to_order(db, row)
            progress = 100 if order["status"] == "completed" else (order.get("processing_job") or {}).get("progress", 0)
            items.append({
                "order_number": order["order_number"],
                "file_name": (order["files"][0]["original_name"] if order["files"] else order["order_number"]),
                "services": order["services"],
                "status": order["status"],
                "status_label": status_labels.get(order["status"], order["status"]),
                "progress": progress,
                "created_at": order["created_at"],
            })
        return {"orders": items, "total": len(items)}


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
        target = db.execute("SELECT position FROM processing_steps WHERE job_id=? AND step_key=?", (job_id, step)).fetchone()
        target_position = int(target["position"]) if target is not None else 10_000
        current = db.execute("SELECT step_key, started_at, position FROM processing_steps WHERE job_id = ? AND status = 'running' ORDER BY position LIMIT 1", (job_id,)).fetchone()
        # Batch orders process one complete file at a time, so events may return to
        # an earlier stage for the next file. Never mark a later stage completed
        # merely because an earlier-stage event arrives. Reset later stages to
        # pending so the UI always reflects the real current pipeline position.
        if current is not None and current["step_key"] != step and int(current["position"]) < target_position:
            started = current["started_at"] or timestamp
            try:
                duration_ms = max(1, int((datetime.fromisoformat(timestamp) - datetime.fromisoformat(started)).total_seconds() * 1000))
            except ValueError:
                duration_ms = 0
            db.execute("UPDATE processing_steps SET status='completed', progress=100, finished_at=?, duration_ms=? WHERE job_id=? AND step_key=?", (timestamp, duration_ms, job_id, current["step_key"]))
        if target is not None:
            db.execute("UPDATE processing_steps SET status='pending', progress=0, started_at='', finished_at='', duration_ms=0, message='', error='' WHERE job_id=? AND position>? AND status!='failed'", (job_id, target_position))
        row = db.execute("SELECT status, started_at FROM processing_steps WHERE job_id=? AND step_key=?", (job_id, step)).fetchone()
        if row is not None:
            if level == 'error' or step == 'failed':
                db.execute("UPDATE processing_steps SET status='failed', progress=100, finished_at=?, message=?, error=? WHERE job_id=? AND step_key=?", (timestamp, message, message, job_id, step))
            else:
                started_at = row["started_at"] or timestamp
                db.execute("UPDATE processing_steps SET status='running', progress=?, started_at=?, message=? WHERE job_id=? AND step_key=?", (max(1, min(99, progress)), started_at, message, job_id, step))
        db.execute("UPDATE processing_jobs SET progress = ?, current_step = ?, state = CASE WHEN state='queued' THEN 'processing' ELSE state END, updated_at = ? WHERE id = ?", (max(0, min(100, progress)), step, timestamp, job_id))
        db.execute("INSERT INTO processing_events (job_id, level, step, message, created_at) VALUES (?, ?, ?, ?, ?)", (job_id, level, step, message, timestamp))
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
        if result["state"] == "completed":
            mapped_status = "completed"
        elif result["state"] == "partial_completed":
            mapped_status = "partial_completed"
        elif result["state"] == "quality_review":
            mapped_status = "quality_review"
        elif result["state"] == "failed":
            mapped_status = "failed"
        elif result["state"] == "waiting_configuration":
            mapped_status = "waiting_configuration"
        else:
            mapped_status = "processing"
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
            if result["state"] in {"completed", "quality_review"}:
                db.execute("UPDATE processing_steps SET status='completed', progress=100, finished_at=CASE WHEN finished_at='' THEN ? ELSE finished_at END WHERE job_id=? AND status IN ('pending','running')", (finished_at, job_id))
            elif result["state"] == "partial_completed":
                db.execute("UPDATE processing_steps SET status='completed', progress=100, finished_at=CASE WHEN finished_at='' THEN ? ELSE finished_at END WHERE job_id=? AND status IN ('pending','running') AND step_key NOT IN ('quality','export')", (finished_at, job_id))
                db.execute("UPDATE processing_steps SET status='failed', progress=100, finished_at=?, message=?, error=? WHERE job_id=? AND step_key='quality'", (finished_at, result.get('completion_message','部分文件未通过质量检查'), result.get('completion_message','部分文件未通过质量检查'), job_id))
                db.execute("UPDATE processing_steps SET status='completed', progress=100, finished_at=?, message=? WHERE job_id=? AND step_key='export'", (finished_at, f"已准备 {result.get('successful_output_count',0)} 个成功文件", job_id))
            elif result["state"] == "failed":
                db.execute("UPDATE processing_steps SET status='failed', progress=100, finished_at=?, message=?, error=? WHERE job_id=? AND step_key IN ('quality','export')", (finished_at, result.get('completion_message','处理失败'), result.get('completion_message','处理失败'), job_id))
                db.execute("UPDATE processing_steps SET status='pending', progress=0 WHERE job_id=? AND status='running'", (job_id,))
            elif result["state"] == "waiting_configuration":
                # Preserve completed validation/analysis steps and leave remaining work pending.
                db.execute("UPDATE processing_steps SET status='pending', progress=0, started_at='', message='' WHERE job_id=? AND status='running'", (job_id,))
            db.execute(
                "UPDATE processing_jobs SET state = ?, progress = ?, current_step = ?, blockers_json = ?, result_json = ?, updated_at = ? WHERE id = ?",
                (
                    result["state"], result["progress"], result.get("current_step", result["state"]),
                    json.dumps(result.get("blockers", []), ensure_ascii=False),
                    json.dumps(result, ensure_ascii=False), finished_at, job_id,
                ),
            )
            db.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (mapped_status, finished_at, order_id))
            if ENFORCE_CREDITS:
                _settle_or_refund_credits(db, order_id, result["state"])
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
            if ENFORCE_CREDITS:
                _settle_or_refund_credits(db, order_id, "failed")
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
        for position, item in enumerate(plan):
            db.execute(
                "INSERT INTO processing_steps (job_id, step_key, label, position, status, progress, started_at, finished_at, duration_ms, message, error) VALUES (?, ?, ?, ?, 'pending', 0, '', '', 0, '', '')",
                (job_id, item["id"], item["label"], position),
            )
        db.execute(
            "INSERT INTO processing_events (job_id, level, step, message, created_at) VALUES (?, 'info', 'queued', '处理任务已创建，正在检查运行条件', ?)",
            (job_id, created_at),
        )
        db.execute("UPDATE orders SET status = 'processing', updated_at = ? WHERE id = ?", (created_at, order_id))
        db.commit()

    # Serverless runtimes freeze or terminate background threads as soon as the
    # HTTP response is returned. That was the cause of cloud jobs stopping at
    # 32% after the validation/analyse stages. Run the worker inside the active
    # request on Vercel so it cannot be abandoned halfway through. Local and
    # long-running container deployments keep the responsive background thread.
    inline_processing = IS_VERCEL or CLOUD_MODE or os.getenv('PROCESSING_MODE', '').strip().lower() == 'inline'
    if inline_processing:
        _run_processing_worker(job_id, order_id, order, source_paths)
        with get_db() as db:
            finished = db.execute(
                "SELECT state, progress, current_step FROM processing_jobs WHERE id = ?",
                (job_id,),
            ).fetchone()
        return {
            "success": True,
            "job_id": job_id,
            "state": finished["state"] if finished else "failed",
            "progress": int(finished["progress"] if finished else 100),
            "current_step": finished["current_step"] if finished else "failed",
            "serverless_inline": True,
        }

    thread = threading.Thread(
        target=_run_processing_worker,
        args=(job_id, order_id, order, source_paths),
        name=f"document-job-{job_id}",
        daemon=True,
    )
    thread.start()
    return {"success": True, "job_id": job_id, "state": "queued", "progress": 0}


@app.post("/api/orders/{order_id}/recover")
def recover_stalled_order(order_id: int) -> dict:
    with get_db() as db:
        row=db.execute("SELECT id,state,progress,updated_at FROM processing_jobs WHERE order_id=? ORDER BY id DESC LIMIT 1",(order_id,)).fetchone()
        if row is None: raise HTTPException(status_code=404,detail="Processing job not found.")
        if row["state"] not in {"queued","processing"}: return {"success":True,"state":row["state"],"already_terminal":True}
        try: age=(datetime.now(timezone.utc)-datetime.fromisoformat(row["updated_at"])).total_seconds()
        except Exception: age=JOB_STALE_SECONDS+1
        if age < JOB_STALE_SECONDS: return {"success":True,"state":row["state"],"progress":row["progress"],"stale":False}
        now=utc_now();msg="Processing stopped responding and was safely closed. Retry the order; source files are preserved."
        db.execute("UPDATE processing_jobs SET state='failed',progress=100,current_step='stalled',blockers_json=?,updated_at=? WHERE id=?",(json.dumps([msg]),now,row["id"]))
        db.execute("UPDATE orders SET status='failed',updated_at=? WHERE id=?",(now,order_id))
        db.execute("INSERT INTO processing_events (job_id,level,step,message,created_at) VALUES (?,'error','stalled',?,?)",(row["id"],msg,now));db.commit()
    return {"success":True,"state":"failed","stale":True,"message":msg}


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



def _verified_output_rows(order_number: str, email: str) -> tuple[dict, list[sqlite3.Row]]:
    data = public_order(order_number, email)
    output_ids = [item["id"] for item in data["output_files"]]
    if not output_ids:
        raise HTTPException(status_code=404, detail="No delivery files are available for this order.")
    placeholders = ",".join("?" for _ in output_ids)
    with get_db() as db:
        rows = db.execute(
            f"SELECT id, original_name, stored_path, content_type, size_bytes, created_at FROM output_files WHERE id IN ({placeholders}) ORDER BY id",
            output_ids,
        ).fetchall()
    return data, rows


@app.get("/api/track/delivery/download-all")
def public_delivery_zip(order_number: str = Query(...), email: str = Query(...)) -> StreamingResponse:
    """Stream a delivery ZIP without creating a persistent copy on C: or in outputs.

    The browser receives the archive and writes it only to the path explicitly
    selected by the user through the system Save As dialog.
    """
    data, rows = _verified_output_rows(order_number, email)
    package = io.BytesIO()
    valid_count = 0
    with zipfile.ZipFile(package, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        used_names: set[str] = set()
        for row in rows:
            source = Path(row["stored_path"])
            if not source.exists() or not source.is_file():
                continue
            name = Path(row["original_name"]).name
            if name in used_names:
                name = f"{source.stem}_{row['id']}{source.suffix}"
            used_names.add(name)
            archive.write(source, arcname=name)
            valid_count += 1
    if not valid_count:
        raise HTTPException(status_code=404, detail="No valid delivery files were found.")
    package.seek(0)
    filename = f"{data['order_number']}_delivery.zip"
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "Cache-Control": "no-store",
        "X-Delivery-Storage": "browser-selected-location-only",
    }
    return StreamingResponse(package, media_type="application/zip", headers=headers)


@app.post("/api/track/delivery/open-folder")
def open_delivery_folder(
    request: Request,
    order_number: str = Query(...),
    email: str = Query(...),
    target: str = Query("project", pattern="^(project|package|file)$"),
    file_id: int | None = Query(None),
) -> dict:
    """Open the exact Windows folder the user expects.

    project: opens the order root, not the internal job_xx implementation folder.
    package: selects the generated delivery ZIP inside delivery_packages.
    file: selects one requested output file.
    """
    if CLOUD_MODE or os.name != "nt":
        raise HTTPException(status_code=400, detail="Opening a local folder is only available in the Windows desktop deployment.")
    client_host = request.client.host if request.client else ""
    if client_host not in {"127.0.0.1", "::1", "localhost"}:
        raise HTTPException(status_code=403, detail="This action is only allowed from the local computer.")
    data, rows = _verified_output_rows(order_number, email)
    order_root = OUTPUT_DIR / data["order_number"]

    selected: Path | None = None
    folder = order_root
    if target == "package":
        raise HTTPException(status_code=400, detail="交付包只保存在你通过另存为选择的位置，软件不会在 C 盘保留副本。")
    elif target == "file" and file_id is not None:
        row = next((row for row in rows if int(row["id"]) == int(file_id)), None)
        if row:
            candidate = Path(row["stored_path"])
            if candidate.exists():
                selected = candidate
                folder = candidate.parent
    else:
        folder.mkdir(parents=True, exist_ok=True)

    if selected is not None:
        subprocess.Popen(["explorer", "/select,", str(selected)])
    else:
        subprocess.Popen(["explorer", str(folder)])
    return {"success": True, "folder": str(folder), "selected": str(selected) if selected else None, "target": target}

@app.get("/api/payments/config")
def payment_config() -> dict:
    provider = payment_provider()
    return {
        "provider": provider,
        "configured": provider in {"stripe", "paypal"},
        "provider_label": "PayPal" if provider == "paypal" else ("Stripe" if provider == "stripe" else "Demo"),
        "paypal_mode": PAYPAL_MODE if provider == "paypal" else "",
        "test_mode": PAYMENT_TEST_MODE,
        "currency": "USD",
        "version": APP_VERSION,
        "plans": [{"id": key, **value} for key, value in PAYMENT_PLANS.items()],
    }


@app.post("/api/credits/estimate")
def estimate_credits(payload: CreditEstimateRequest) -> dict:
    rates = {"conversion": 1, "ocr": 2, "translation": 3, "data_cleanup": 2, "enterprise_analysis": 4, "layout_preservation": 2, "image_enhancement": 1}
    per_page = 1 + sum(rates.get(service, 0) for service in payload.services)
    size_surcharge = max(0, int(payload.file_size_mb // 25))
    total = max(1, payload.pages * per_page * payload.file_count + size_surcharge)
    return {"estimated_credits": total, "breakdown": {"pages": payload.pages, "files": payload.file_count, "per_page": per_page, "size_surcharge": size_surcharge}, "currency": "DA Credits"}


@app.get("/api/wallet")
def wallet(customer_email: str = Query(...)) -> dict:
    email = customer_email.strip().lower()
    with get_db() as db:
        row = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        if row is None:
            now = utc_now()
            db.execute("INSERT OR IGNORE INTO customer_wallets (customer_email,subscription_credits,plan_id,updated_at) VALUES (?,500,'free',?)", (email, now))
            db.commit()
            row = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        ledger = [dict(x) for x in db.execute("SELECT * FROM credit_ledger WHERE customer_email=? ORDER BY id DESC LIMIT 50", (email,)).fetchall()]
    data = dict(row)
    data["total_credits"] = data["subscription_credits"] + data["purchased_credits"] + data["bonus_credits"]
    data["ledger"] = ledger
    return data


@app.post("/api/plans/free-activate")
def activate_free_plan(payload: FreePlanActivate) -> dict:
    email = payload.customer_email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid customer email is required.")
    now = utc_now()
    def operation(db):
        row = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        if row is None:
            db.execute("INSERT INTO customer_wallets (customer_email,subscription_credits,plan_id,plan_status,updated_at) VALUES (?,500,'free','active',?)", (email, now))
            db.execute("INSERT INTO credit_ledger (customer_email,transaction_type,bucket,credits,balance_after,reference,note,created_at) VALUES (?,?,?,?,?,?,?,?)", (email,'credit','subscription',500,500,'free-plan','Free plan activated',now))
        else:
            db.execute("UPDATE customer_wallets SET plan_id='free', plan_status='active', updated_at=? WHERE customer_email=?", (now,email))
        wallet = db.execute("SELECT * FROM customer_wallets WHERE customer_email=?", (email,)).fetchone()
        return dict(wallet)
    wallet = run_db_write(operation)
    wallet["total_credits"] = wallet["subscription_credits"] + wallet["purchased_credits"] + wallet["bonus_credits"]
    return {"success": True, "message": "Free plan activated.", "wallet": wallet}


@app.post("/api/sales/contact")
def create_sales_lead(payload: SalesLeadCreate) -> dict:
    email = payload.customer_email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="A valid customer email is required.")
    if not payload.customer_name.strip():
        raise HTTPException(status_code=400, detail="Customer name is required.")
    now = utc_now()
    with get_db() as db:
        cursor = db.execute("INSERT INTO sales_leads (customer_name,customer_email,company,phone,requirements,locale,status,created_at) VALUES (?,?,?,?,?,?, 'new',?)", (payload.customer_name.strip(),email,payload.company.strip(),payload.phone.strip(),payload.requirements.strip(),payload.locale.strip() or 'zh',now))
        db.commit()
        lead_id = cursor.lastrowid
    return {"success": True, "lead_id": lead_id, "message": "Sales request received."}


@app.post("/api/payments/checkout")
def create_checkout(payload: CheckoutCreate, request: Request) -> dict:
    plan = PAYMENT_PLANS.get(payload.plan_id)
    if plan is None:
        raise HTTPException(status_code=400, detail="Invalid payment plan.")
    if "@" not in payload.customer_email:
        raise HTTPException(status_code=400, detail="A valid customer email is required.")
    payment_number = "PAY-" + datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + secrets.token_hex(4).upper()
    base_url = PUBLIC_BASE_URL or str(request.base_url).rstrip("/")
    provider = payment_provider()
    if plan.get("kind") == "contact":
        raise HTTPException(status_code=400, detail="Enterprise plans require a sales consultation.")
    if plan.get("amount_cents", 0) <= 0:
        raise HTTPException(status_code=400, detail="The Free plan does not require checkout.")
    if provider not in {"stripe", "paypal"} and not PAYMENT_TEST_MODE:
        raise HTTPException(status_code=503, detail="Real payment is not configured yet. Add PayPal or Stripe credentials in the server environment.")
    session_id = ""
    if provider == "paypal":
        try:
            token = paypal_access_token()
            return_url = PAYMENT_SUCCESS_URL or f"{base_url}/?payment=paypal-return&payment_number={urllib.parse.quote(payment_number)}&email={urllib.parse.quote(payload.customer_email.strip().lower())}"
            cancel_url = PAYMENT_CANCEL_URL or f"{base_url}/?payment=cancelled"
            paypal_order = paypal_request(
                "/v2/checkout/orders",
                "POST",
                {
                    "intent": "CAPTURE",
                    "purchase_units": [{
                        "reference_id": payment_number,
                        "custom_id": payment_number,
                        "description": f"Document Automation AI {plan['name']} · {plan['credits']:,} DA Credits",
                        "amount": {"currency_code": plan["currency"].upper(), "value": f"{plan['amount_cents'] / 100:.2f}"},
                    }],
                    "payment_source": {"paypal": {"experience_context": {"brand_name": "Document Automation AI", "user_action": "PAY_NOW", "return_url": return_url, "cancel_url": cancel_url}}},
                },
                token,
            )
            session_id = paypal_order.get("id", "")
            checkout_url = next((link.get("href", "") for link in paypal_order.get("links", []) if link.get("rel") == "payer-action"), "")
            if not session_id or not checkout_url:
                raise RuntimeError("PayPal did not return an approval URL.")
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"PayPal checkout creation failed: {exc}")
    elif provider == "stripe":
        try:
            import stripe
            stripe.api_key = STRIPE_SECRET_KEY
            success_url = PAYMENT_SUCCESS_URL or f"{base_url}/?payment=success&session_id={{CHECKOUT_SESSION_ID}}"
            cancel_url = PAYMENT_CANCEL_URL or f"{base_url}/?payment=cancelled"
            price_data = {"currency": plan["currency"], "unit_amount": plan["amount_cents"], "product_data": {"name": f"Document Automation AI {plan['name']}", "description": f"{plan['credits']:,} DA Credits"}}
            mode = "payment"
            if plan.get("kind") == "subscription":
                mode = "subscription"
                price_data["recurring"] = {"interval": "year" if plan.get("billing") == "yearly" else "month"}
            session = stripe.checkout.Session.create(
                mode=mode, customer_email=payload.customer_email.strip().lower(), client_reference_id=payment_number,
                metadata={"payment_number": payment_number, "plan_id": payload.plan_id, "credits": str(plan["credits"])},
                subscription_data={"metadata": {"payment_number": payment_number, "plan_id": payload.plan_id}} if mode == "subscription" else None,
                line_items=[{"price_data": price_data, "quantity": 1}], success_url=success_url, cancel_url=cancel_url,
            )
            session_id = session.id
            checkout_url = session.url
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe checkout creation failed: {exc}")
    else:
        checkout_url = f"{base_url}/?payment=demo&payment_number={payment_number}&email={payload.customer_email.strip().lower()}"
    now = utc_now()
    with get_db() as db:
        db.execute("INSERT INTO payment_orders (payment_number,plan_id,plan_name,customer_name,customer_email,amount_cents,currency,credits,provider,provider_session_id,checkout_url,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (payment_number,payload.plan_id,plan["name"],payload.customer_name.strip(),payload.customer_email.strip().lower(),plan["amount_cents"],plan["currency"].upper(),plan["credits"],provider,session_id,checkout_url,"pending",now,now))
        db.commit()
    return {"payment_number": payment_number, "checkout_url": checkout_url, "provider": provider, "test_mode": PAYMENT_TEST_MODE}


@app.post("/api/payments/demo-confirm")
def confirm_demo_payment(payload: DemoPaymentConfirm) -> dict:
    if payment_provider() != "demo" or not PAYMENT_TEST_MODE:
        raise HTTPException(status_code=403, detail="Demo payment confirmation is disabled.")
    with get_db() as db:
        row = db.execute("SELECT customer_email FROM payment_orders WHERE payment_number=?", (payload.payment_number,)).fetchone()
    if row is None or row["customer_email"].lower() != payload.customer_email.strip().lower():
        raise HTTPException(status_code=404, detail="Payment order was not found.")
    mark_payment_paid(payload.payment_number, provider_payment_id="demo_" + secrets.token_hex(6))
    return {"success": True, "payment_number": payload.payment_number, "status": "paid"}


@app.get("/api/payments/status")
def payment_status(payment_number: str = Query(...), email: str = Query(...)) -> dict:
    with get_db() as db:
        row = db.execute("SELECT payment_number,plan_id,plan_name,customer_email,amount_cents,currency,credits,provider,status,created_at,paid_at FROM payment_orders WHERE payment_number=? AND LOWER(customer_email)=LOWER(?)", (payment_number.strip(),email.strip())).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment order was not found.")
    return dict(row)


@app.post("/api/payments/paypal/capture")
def capture_paypal_payment(payment_number: str = Query(...), order_id: str = Query(...), email: str = Query(...)) -> dict:
    if payment_provider() != "paypal":
        raise HTTPException(status_code=503, detail="PayPal is not configured.")
    with get_db() as db:
        row = db.execute("SELECT * FROM payment_orders WHERE payment_number=? AND LOWER(customer_email)=LOWER(?)", (payment_number.strip(), email.strip())).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Payment order was not found.")
    if row["status"] == "paid":
        return {"success": True, "status": "paid", "payment_number": payment_number}
    if row["provider"] != "paypal" or row["provider_session_id"] != order_id:
        raise HTTPException(status_code=400, detail="PayPal order does not match this payment.")
    try:
        token = paypal_access_token()
        result = paypal_request(f"/v2/checkout/orders/{urllib.parse.quote(order_id)}/capture", "POST", {}, token)
        status = result.get("status", "")
        capture = (((result.get("purchase_units") or [{}])[0].get("payments") or {}).get("captures") or [{}])[0]
        capture_id = capture.get("id", "")
        capture_status = capture.get("status", "")
        if status != "COMPLETED" and capture_status != "COMPLETED":
            raise RuntimeError(f"PayPal capture is not complete: {status or capture_status}")
        mark_payment_paid(payment_number, order_id, capture_id)
        return {"success": True, "status": "paid", "payment_number": payment_number, "provider_payment_id": capture_id}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"PayPal capture failed: {exc}")


@app.post("/api/payments/paypal/webhook")
async def paypal_webhook(request: Request):
    if payment_provider() != "paypal" or not PAYPAL_WEBHOOK_ID:
        raise HTTPException(status_code=503, detail="PayPal webhook is not configured.")
    event = await request.json()
    try:
        token = paypal_access_token()
        verification = paypal_request("/v1/notifications/verify-webhook-signature", "POST", {
            "auth_algo": request.headers.get("paypal-auth-algo", ""),
            "cert_url": request.headers.get("paypal-cert-url", ""),
            "transmission_id": request.headers.get("paypal-transmission-id", ""),
            "transmission_sig": request.headers.get("paypal-transmission-sig", ""),
            "transmission_time": request.headers.get("paypal-transmission-time", ""),
            "webhook_id": PAYPAL_WEBHOOK_ID,
            "webhook_event": event,
        }, token)
        if verification.get("verification_status") != "SUCCESS":
            raise HTTPException(status_code=400, detail="Invalid PayPal webhook signature.")
        if event.get("event_type") == "PAYMENT.CAPTURE.COMPLETED":
            resource = event.get("resource") or {}
            order_id = ((resource.get("supplementary_data") or {}).get("related_ids") or {}).get("order_id", "")
            with get_db() as db:
                row = db.execute("SELECT payment_number FROM payment_orders WHERE provider='paypal' AND provider_session_id=?", (order_id,)).fetchone()
            if row:
                mark_payment_paid(row["payment_number"], order_id, resource.get("id", ""))
        return {"received": True}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"PayPal webhook processing failed: {exc}")


@app.post("/api/payments/stripe/webhook")
async def stripe_webhook(request: Request):
    if not STRIPE_SECRET_KEY or not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is not configured.")
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    try:
        import stripe
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}")
    event_type = event.get("type", "")
    obj = event.get("data", {}).get("object", {})
    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"} and obj.get("payment_status") == "paid":
        payment_number = (obj.get("metadata") or {}).get("payment_number") or obj.get("client_reference_id")
        if payment_number:
            mark_payment_paid(payment_number, obj.get("id", ""), obj.get("payment_intent", "") or "")
    return {"received": True}


@app.post("/api/admin/wallet-adjustment", dependencies=[Depends(require_admin)])
def admin_wallet_adjustment(payload: WalletAdjustment) -> dict:
    email = payload.customer_email.strip().lower()
    def operation(db):
        now = utc_now()
        db.execute("INSERT OR IGNORE INTO customer_wallets (customer_email,updated_at) VALUES (?,?)", (email, now))
        db.execute("UPDATE customer_wallets SET bonus_credits=MAX(0,bonus_credits+?),updated_at=? WHERE customer_email=?", (payload.credits,now,email))
        row=db.execute("SELECT subscription_credits+purchased_credits+bonus_credits AS total FROM customer_wallets WHERE customer_email=?",(email,)).fetchone()
        db.execute("INSERT INTO credit_ledger (customer_email,transaction_type,bucket,credits,balance_after,reference,note,created_at) VALUES (?,?,?,?,?,?,?,?)",(email,"adjustment","bonus",payload.credits,row["total"],"ADMIN",payload.note,now))
        return row["total"]
    return {"success":True,"customer_email":email,"total_credits":run_db_write(operation)}


@app.get("/api/admin/commercial-summary", dependencies=[Depends(require_admin)])
def commercial_summary() -> dict:
    with get_db() as db:
        paid=db.execute("SELECT COUNT(*) count,COALESCE(SUM(amount_cents),0) revenue FROM payment_orders WHERE status='paid'").fetchone()
        pending=db.execute("SELECT COUNT(*) count FROM payment_orders WHERE status='pending'").fetchone()
        wallets=db.execute("SELECT COUNT(*) count,COALESCE(SUM(subscription_credits+purchased_credits+bonus_credits),0) credits FROM customer_wallets").fetchone()
        plans=[dict(x) for x in db.execute("SELECT plan_id,COUNT(*) customers FROM customer_wallets GROUP BY plan_id ORDER BY customers DESC").fetchall()]
    return {"paid_orders":paid["count"],"revenue_cents":paid["revenue"],"pending_orders":pending["count"],"wallets":wallets["count"],"outstanding_credits":wallets["credits"],"plan_distribution":plans}


@app.get("/api/admin/payments", dependencies=[Depends(require_admin)])
def admin_payments(limit: int = Query(default=100, ge=1, le=500)) -> dict:
    with get_db() as db:
        rows = [dict(row) for row in db.execute("SELECT * FROM payment_orders ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
    return {"payments": rows, "provider": payment_provider(), "test_mode": PAYMENT_TEST_MODE}


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
        "billing": {"plan": workspace["plan"], "status": "active", "payment_provider": payment_provider(), "test_mode": PAYMENT_TEST_MODE, "next_invoice": None},
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
