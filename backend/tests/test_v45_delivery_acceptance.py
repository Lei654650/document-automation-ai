from __future__ import annotations

import atexit
import json
import os
import shutil
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


_RUNTIME = Path(tempfile.mkdtemp(prefix="dai_v45_delivery_acceptance_"))
atexit.register(lambda: shutil.rmtree(_RUNTIME, ignore_errors=True))
os.environ.update(
    {
        "APP_ENV": "development",
        "CLOUD_MODE": "false",
        "APP_DATA_DIR": str(_RUNTIME),
        "AUTH_SECRET": "local-acceptance-secret-not-for-deployment",
        "OWNER_EMAIL": "acceptance-owner@example.test",
        "EMAIL_VERIFICATION_DEV_CODE_ENABLED": "true",
        "PASSWORD_RESET_DEV_CODE_ENABLED": "true",
        "PAYPAL_MODE": "sandbox",
        "PAYPAL_LIVE_ENABLED": "false",
        "PAYMENT_TEST_MODE": "false",
        "TRANSLATION_PROVIDER": "none",
        "PYTHONDONTWRITEBYTECODE": "1",
    }
)

from app import main as main_module  # noqa: E402
from app.engines import translation_engine  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(main_module.app) as test_client:
        yield test_client


def _register_and_verify(client: TestClient, email: str, password: str = "LocalTest9!") -> str:
    response = client.post(
        "/api/auth/register",
        json={"name": "Acceptance User", "email": email, "password": password, "device_fingerprint": email},
    )
    assert response.status_code == 200, response.text
    registration = response.json()
    assert registration["delivery"] == "local"
    assert len(registration["development_code"]) == 6
    verified = client.post(
        "/api/auth/email-verification/confirm",
        json={"email": email, "code": registration["development_code"], "device_fingerprint": email},
    )
    assert verified.status_code == 200, verified.text
    return verified.json()["token"]


def test_health_capabilities_proxy_and_unconfigured_states(client: TestClient):
    health = client.get("/api/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["version"] == "45.0.0"

    capabilities = client.get("/api/capabilities")
    assert capabilities.status_code == 200
    assert capabilities.json()["translation"]["configured"] is False

    public = client.get("/api/public-config").json()
    assert public["authentication"]["google_configured"] is False
    assert public["authentication"]["local_verification_code_enabled"] is True
    assert public["ai_providers"] == {"openai_configured": False, "deepseek_configured": False}
    assert public["payments"]["paypal_mode"] == "sandbox"
    assert public["payments"]["paypal_live_enabled"] is False

    auth_config = client.get("/api/auth/config").json()
    assert auth_config["google_enabled"] is False
    assert auth_config["google_configuration"] == "missing_client_id"
    google = client.post("/api/auth/google", json={"credential": "not-used", "device_fingerprint": "test"})
    assert google.status_code == 503

    vite_config = (Path(__file__).resolve().parents[2] / "frontend" / "vite.config.js").read_text(encoding="utf-8")
    assert "'/api': 'http://127.0.0.1:8000'" in vite_config


def test_registration_login_logout_and_password_reset_local_code(client: TestClient):
    email = "auth-flow@example.test"
    original_password = "LocalTest9!"
    token = _register_and_verify(client, email, original_password)

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == email

    logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout.status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401

    login = client.post("/api/auth/login", json={"email": email, "password": original_password})
    assert login.status_code == 200

    reset = client.post("/api/auth/password-reset/request", json={"email": email})
    assert reset.status_code == 200, reset.text
    assert reset.json()["delivery"] == "local"
    new_password = "ChangedTest9!"
    confirm = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": email, "code": reset.json()["development_code"], "new_password": new_password},
    )
    assert confirm.status_code == 200, confirm.text
    assert client.post("/api/auth/login", json={"email": email, "password": original_password}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": new_password}).status_code == 200


def test_smtp_delivery_logic_uses_declared_configuration(monkeypatch):
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=0, context=None):
            calls.append(("connect", host, port, timeout, bool(context)))

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def ehlo(self):
            calls.append(("ehlo",))

        def starttls(self, context=None):
            calls.append(("starttls", bool(context)))

        def login(self, username, password):
            calls.append(("login", username, bool(password)))

        def send_message(self, message):
            calls.append(("send", message["To"], message["Subject"]))
            return {}

    monkeypatch.setattr(main_module, "SMTP_HOST", "smtp.example.test")
    monkeypatch.setattr(main_module, "SMTP_PORT", 587)
    monkeypatch.setattr(main_module, "SMTP_USERNAME", "sender@example.test")
    monkeypatch.setattr(main_module, "SMTP_PASSWORD", "test-only-password")
    monkeypatch.setattr(main_module, "SMTP_FROM_EMAIL", "sender@example.test")
    monkeypatch.setattr(main_module, "SMTP_USE_TLS", True)
    monkeypatch.setattr(main_module, "SMTP_USE_SSL", False)
    monkeypatch.setattr(main_module.smtplib, "SMTP", FakeSMTP)

    delivered = main_module._send_verification_email("recipient@example.test", "123456")
    assert delivered == {"delivery": "email"}
    assert any(item[0] == "starttls" for item in calls)
    assert any(item[0] == "login" for item in calls)
    assert any(item[0] == "send" for item in calls)


def test_openai_and_deepseek_profiles_are_independent_and_never_mask_keys(monkeypatch):
    monkeypatch.setenv("TRANSLATION_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-placeholder")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-deepseek-placeholder")
    settings = translation_engine._env_settings()
    assert settings["profiles"]["openai"]["api_key"] == "test-openai-placeholder"
    assert settings["profiles"]["deepseek"]["api_key"] == "test-deepseek-placeholder"
    public = translation_engine.load_settings(include_secret=False)
    encoded = json.dumps(public)
    assert "test-openai-placeholder" not in encoded
    assert "test-deepseek-placeholder" not in encoded
    assert "api_key_masked" not in encoded


def test_paypal_sandbox_checkout_capture_webhook_wallet_and_credits(client: TestClient, monkeypatch):
    email = "paypal-flow@example.test"
    token = _register_and_verify(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    monkeypatch.setattr(main_module, "PAYPAL_CLIENT_ID", "sandbox-client-id-placeholder-123456")
    monkeypatch.setattr(main_module, "PAYPAL_CLIENT_SECRET", "sandbox-client-secret-placeholder-123456")
    monkeypatch.setattr(main_module, "PAYPAL_WEBHOOK_ID", "sandbox-webhook-placeholder")
    monkeypatch.setattr(main_module, "PAYPAL_MODE", "sandbox")
    monkeypatch.setattr(main_module, "PAYPAL_LIVE_ENABLED", False)
    monkeypatch.setattr(main_module, "PADDLE_API_KEY", "")
    monkeypatch.setattr(main_module, "PADDLE_PRICE_MAP", {})
    monkeypatch.setattr(main_module, "STRIPE_SECRET_KEY", "")
    monkeypatch.setattr(main_module, "paypal_access_token", lambda: "sandbox-access-token-placeholder")

    def fake_paypal_request(path, method="GET", payload=None, access_token=""):
        if path == "/v2/checkout/orders":
            return {
                "id": "SANDBOX-ORDER-001",
                "links": [{"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=SANDBOX-ORDER-001"}],
            }
        if path.endswith("/capture"):
            return {
                "status": "COMPLETED",
                "purchase_units": [{"payments": {"captures": [{"id": "SANDBOX-CAPTURE-001", "status": "COMPLETED"}]}}],
            }
        if path == "/v1/notifications/verify-webhook-signature":
            return {"verification_status": "SUCCESS"}
        raise AssertionError(f"Unexpected PayPal path: {path}")

    monkeypatch.setattr(main_module, "paypal_request", fake_paypal_request)

    config = client.get("/api/payments/config").json()
    assert config["provider"] == "paypal"
    assert config["paypal_mode"] == "sandbox"
    assert config["live_checkout"] is False

    checkout = client.post(
        "/api/payments/checkout",
        headers=headers,
        json={"plan_id": "starter_monthly", "customer_name": "Ignored", "customer_email": email, "locale": "en"},
    )
    assert checkout.status_code == 200, checkout.text
    order = checkout.json()
    assert order["provider"] == "paypal"
    assert "sandbox.paypal.com" in order["checkout_url"]

    capture = client.post(
        "/api/payments/paypal/capture",
        params={"order_id": "SANDBOX-ORDER-001", "payment_number": order["payment_number"], "email": email},
    )
    assert capture.status_code == 200, capture.text
    assert capture.json()["status"] == "paid"

    status = client.get("/api/payments/status", params={"payment_number": order["payment_number"], "email": email})
    assert status.status_code == 200
    assert status.json()["status"] == "paid"
    wallet_before = client.get("/api/wallet", headers=headers).json()
    assert wallet_before["subscription_credits"] == main_module.PAYMENT_PLANS["starter_monthly"]["credits"]

    webhook = client.post(
        "/api/payments/paypal/webhook",
        headers={
            "paypal-auth-algo": "SHA256withRSA",
            "paypal-cert-url": "https://api-m.sandbox.paypal.com/cert.pem",
            "paypal-transmission-id": "test-transmission",
            "paypal-transmission-sig": "test-signature",
            "paypal-transmission-time": "2026-07-31T00:00:00Z",
        },
        json={
            "event_type": "PAYMENT.CAPTURE.COMPLETED",
            "resource": {
                "id": "SANDBOX-CAPTURE-001",
                "supplementary_data": {"related_ids": {"order_id": "SANDBOX-ORDER-001"}},
            },
        },
    )
    assert webhook.status_code == 200, webhook.text
    wallet_after = client.get("/api/wallet", headers=headers).json()
    assert wallet_after["total_credits"] == wallet_before["total_credits"]


def test_file_upload_task_status_and_authenticated_download(client: TestClient, monkeypatch):
    email = "document-flow@example.test"
    token = _register_and_verify(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    monkeypatch.setattr(
        main_module,
        "start_processing",
        lambda order_id: {"job_id": 0, "order_id": order_id, "state": "queued", "progress": 0},
    )

    response = client.post(
        "/api/orders",
        headers=headers,
        files={"files": ("source.txt", b"Document automation acceptance", "text/plain")},
        data={
            "name": "Acceptance User",
            "email": email,
            "services": json.dumps(["conversion"]),
            "translation_json": "{}",
            "conversion_json": "{}",
        },
    )
    assert response.status_code == 200, response.text
    order = response.json()
    assert order["order_id"] > 0
    assert order["files"][0]["original_name"] == "source.txt"

    output_dir = main_module.OUTPUT_DIR / order["order_number"]
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "accepted-output.txt"
    output_path.write_text("accepted output", encoding="utf-8")
    with main_module.get_db() as db:
        cursor = db.execute(
            "INSERT INTO output_files (order_id,original_name,stored_name,stored_path,content_type,size_bytes,created_at) VALUES (?,?,?,?,?,?,?)",
            (order["order_id"], output_path.name, output_path.name, str(output_path), "text/plain", output_path.stat().st_size, main_module.utc_now()),
        )
        output_id = cursor.lastrowid
        db.execute("UPDATE orders SET status='completed',updated_at=? WHERE id=?", (main_module.utc_now(), order["order_id"]))
        db.commit()

    project = client.get(f"/api/projects/{order['order_id']}", headers=headers)
    assert project.status_code == 200, project.text
    assert project.json()["project"]["status"] == "completed"

    download = client.get(f"/api/processing-center/outputs/{output_id}/download", headers=headers)
    assert download.status_code == 200, download.text
    assert download.content == b"accepted output"
