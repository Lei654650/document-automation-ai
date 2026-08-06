from __future__ import annotations

import atexit
import io
import json
import os
import shutil
import tempfile
import time
import types
import sys
import zipfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader, PdfWriter


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
        "PAYMENT_TEST_MODE": "false",
        "STRIPE_CARD_ENABLED": "true",
        "STRIPE_ALIPAY_ENABLED": "true",
        "STRIPE_WECHAT_PAY_ENABLED": "true",
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
    assert health.json()["version"] == "46.0.0"

    capabilities = client.get("/api/capabilities")
    assert capabilities.status_code == 200
    assert capabilities.json()["translation"]["configured"] is False

    public = client.get("/api/public-config").json()
    assert public["authentication"]["google_configured"] is False
    assert public["authentication"]["local_verification_code_enabled"] is True
    assert public["ai_providers"] == {"openai_configured": False, "deepseek_configured": False}
    assert public["payments"]["provider"] == "demo"
    assert public["payments"]["processor"] == "demo"
    assert {item["id"] for item in public["payments"]["methods"]} == {"card", "alipay", "wechat_pay"}

    auth_config = client.get("/api/auth/config").json()
    assert auth_config["google_enabled"] is False
    assert auth_config["google_configuration"] == "missing_client_id"
    google = client.post("/api/auth/google", json={"credential": "not-used", "device_fingerprint": "test"})
    assert google.status_code == 503

    vite_config = (Path(__file__).resolve().parents[2] / "frontend" / "vite.config.js").read_text(encoding="utf-8")
    assert "'/api': devApiProxy" in vite_config
    assert "VITE_DEV_API_PROXY" in vite_config


def test_public_frontend_cors_allows_login_from_official_domains(client: TestClient):
    for origin in ("https://docai365.com", "https://www.docai365.com"):
        response = client.options(
            "/api/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert response.status_code == 200, response.text
        assert response.headers.get("access-control-allow-origin") == origin
        assert "POST" in response.headers.get("access-control-allow-methods", "")


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


def test_login_reports_unverified_and_disabled_account_states(client: TestClient):
    pending_email = "pending-login@example.test"
    registration = client.post(
        "/api/auth/register",
        json={"name": "Pending User", "email": pending_email, "password": "LocalTest9!", "device_fingerprint": "pending-device"},
    )
    assert registration.status_code == 200, registration.text
    pending_login = client.post("/api/auth/login", json={"email": pending_email, "password": "LocalTest9!"})
    assert pending_login.status_code == 403
    assert pending_login.json()["detail"]["code"] == "EMAIL_NOT_VERIFIED"
    assert pending_login.json()["detail"]["email"] == pending_email
    assert pending_login.json()["detail"]["can_resend"] is True

    disabled_email = "disabled-login@example.test"
    _register_and_verify(client, disabled_email)
    with main_module.get_db() as db:
        db.execute("UPDATE users SET status='disabled' WHERE email=?", (disabled_email,))
        db.commit()
    disabled_login = client.post("/api/auth/login", json={"email": disabled_email, "password": "LocalTest9!"})
    assert disabled_login.status_code == 403
    assert disabled_login.json()["detail"]["code"] == "ACCOUNT_DISABLED"


def test_stripe_card_alipay_wechat_checkout_webhook_wallet_and_credits(client: TestClient, monkeypatch):
    email = "stripe-flow@example.test"
    token = _register_and_verify(client, email)
    headers = {"Authorization": f"Bearer {token}"}
    calls = []

    monkeypatch.setattr(main_module, "STRIPE_SECRET_KEY", "sk_test_placeholder")
    monkeypatch.setattr(main_module, "STRIPE_WEBHOOK_SECRET", "whsec_test_placeholder")
    monkeypatch.setattr(main_module, "STRIPE_CARD_ENABLED", True)
    monkeypatch.setattr(main_module, "STRIPE_ALIPAY_ENABLED", True)
    monkeypatch.setattr(main_module, "STRIPE_WECHAT_PAY_ENABLED", True)
    monkeypatch.setattr(main_module, "PAYMENT_TEST_MODE", False)

    class FakeSession:
        def __init__(self, session_id, url):
            self.id = session_id
            self.url = url

    def fake_session_create(**kwargs):
        calls.append(kwargs)
        index = len(calls)
        return FakeSession(f"cs_test_{index}", f"https://checkout.stripe.test/session/{index}")

    fake_webhook = types.SimpleNamespace(construct_event=lambda payload, signature, secret: {})
    fake_stripe = types.SimpleNamespace(
        api_key="",
        checkout=types.SimpleNamespace(Session=types.SimpleNamespace(create=fake_session_create)),
        Webhook=fake_webhook,
    )
    monkeypatch.setitem(sys.modules, "stripe", fake_stripe)

    config = client.get("/api/payments/config").json()
    assert config["provider"] == "stripe"
    assert config["processor"] == "stripe"
    assert config["production_ready"] is True
    assert [item["id"] for item in config["payment_methods"] if item["available"]] == ["card", "alipay", "wechat_pay"]

    checkouts = {}
    for method in ("card", "alipay", "wechat_pay"):
        response = client.post(
            "/api/payments/checkout",
            headers=headers,
            json={
                "plan_id": "starter_monthly",
                "customer_name": "Ignored",
                "customer_email": "attacker@example.test",
                "locale": "zh",
                "payment_method": method,
            },
        )
        assert response.status_code == 200, response.text
        checkouts[method] = response.json()
        assert response.json()["provider"] == "stripe"
        assert response.json()["payment_method"] == method
        assert response.json()["checkout_url"].startswith("https://checkout.stripe.test/")

    assert calls[0]["mode"] == "subscription"
    assert calls[0]["payment_method_types"] == ["card"]
    assert "recurring" in calls[0]["line_items"][0]["price_data"]
    assert checkouts["card"]["billing_model"] == "recurring"

    assert calls[1]["mode"] == "payment"
    assert calls[1]["payment_method_types"] == ["alipay"]
    assert "recurring" not in calls[1]["line_items"][0]["price_data"]
    assert checkouts["alipay"]["billing_model"] == "prepaid"

    assert calls[2]["mode"] == "payment"
    assert calls[2]["payment_method_types"] == ["wechat_pay"]
    assert calls[2]["payment_method_options"] == {"wechat_pay": {"client": "web"}}
    assert checkouts["wechat_pay"]["billing_model"] == "prepaid"

    alipay_number = checkouts["alipay"]["payment_number"]
    event = {
        "id": "evt_alipay_paid",
        "type": "checkout.session.async_payment_succeeded",
        "data": {
            "object": {
                "id": "cs_test_2",
                "payment_status": "paid",
                "payment_intent": "pi_test_alipay",
                "metadata": {"payment_number": alipay_number},
            }
        },
    }
    fake_webhook.construct_event = lambda payload, signature, secret: event
    webhook = client.post(
        "/api/payments/stripe/webhook",
        content=b"{}",
        headers={"stripe-signature": "test-signature", "content-type": "application/json"},
    )
    assert webhook.status_code == 200, webhook.text
    webhook_again = client.post(
        "/api/payments/stripe/webhook",
        content=b"{}",
        headers={"stripe-signature": "test-signature", "content-type": "application/json"},
    )
    assert webhook_again.status_code == 200, webhook_again.text

    status = client.get("/api/payments/status", params={"payment_number": alipay_number}, headers=headers)
    assert status.status_code == 200
    assert status.json()["status"] == "paid"
    assert status.json()["payment_method"] == "alipay"
    assert status.json()["billing_model"] == "prepaid"

    wallet = client.get("/api/wallet", headers=headers).json()
    assert wallet["subscription_credits"] == main_module.PAYMENT_PLANS["starter_monthly"]["credits"]
    assert sum(1 for item in wallet["ledger"] if item["reference"] == alipay_number) == 1

    card_number = checkouts["card"]["payment_number"]
    card_checkout_event = {
        "id": "evt_card_checkout_paid",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "payment_status": "paid",
                "subscription": "sub_test_card",
                "metadata": {"payment_number": card_number},
            }
        },
    }
    fake_webhook.construct_event = lambda payload, signature, secret: card_checkout_event
    assert client.post(
        "/api/payments/stripe/webhook",
        content=b"{}",
        headers={"stripe-signature": "test-signature", "content-type": "application/json"},
    ).status_code == 200

    with main_module.get_db() as db:
        db.execute(
            "UPDATE customer_wallets SET subscription_credits=123 WHERE customer_email=?",
            (email,),
        )
        db.commit()

    renewal_period_end = int(time.time()) + 31 * 86400
    renewal_event = {
        "id": "evt_card_cycle_renewal",
        "type": "invoice.paid",
        "data": {
            "object": {
                "id": "in_test_cycle",
                "billing_reason": "subscription_cycle",
                "subscription": "sub_test_card",
                "parent": {
                    "subscription_details": {
                        "metadata": {"payment_number": card_number}
                    }
                },
                "lines": {"data": [{"period": {"end": renewal_period_end}}]},
            }
        },
    }
    fake_webhook.construct_event = lambda payload, signature, secret: renewal_event
    for _ in range(2):
        response = client.post(
            "/api/payments/stripe/webhook",
            content=b"{}",
            headers={"stripe-signature": "test-signature", "content-type": "application/json"},
        )
        assert response.status_code == 200, response.text

    renewed_wallet = client.get("/api/wallet", headers=headers).json()
    assert renewed_wallet["subscription_credits"] == main_module.PAYMENT_PLANS["starter_monthly"]["credits"]
    assert sum(1 for item in renewed_wallet["ledger"] if item["reference"] == "in_test_cycle") == 1
    with main_module.get_db() as db:
        order = db.execute(
            "SELECT provider_payment_id,status FROM payment_orders WHERE payment_number=?",
            (card_number,),
        ).fetchone()
        renewal_count = db.execute(
            "SELECT COUNT(*) FROM payment_events WHERE provider_event_id='evt_card_cycle_renewal'",
        ).fetchone()[0]
    assert order["provider_payment_id"] == "sub_test_card"
    assert order["status"] == "paid"
    assert renewal_count == 1

    other_token = _register_and_verify(client, "other-stripe-user@example.test")
    forbidden = client.get(
        "/api/payments/status",
        params={"payment_number": alipay_number},
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert forbidden.status_code == 404

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


def test_real_background_task_queue_and_download_flow(client: TestClient, monkeypatch):
    """Exercise the real executor instead of mocking task creation."""
    monkeypatch.setattr(main_module, "REGISTRATION_IP_MAX_ACCOUNTS", 1000)
    email = f"background-{time.time_ns()}@example.test"
    token = _register_and_verify(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    started = time.monotonic()
    response = client.post(
        "/api/orders",
        headers=headers,
        files={"files": ("background-source.txt", b"Background processing must survive page navigation.", "text/plain")},
        data={
            "name": "Background Acceptance",
            "email": email,
            "services": json.dumps(["conversion", "markdown", "json", "xml"]),
            "translation_json": "{}",
            "conversion_json": json.dumps({"formats": ["docx", "md", "json", "xml"]}),
        },
    )
    assert response.status_code == 200, response.text
    created = response.json()
    assert time.monotonic() - started < 3.0
    assert created["processing_job"]["state"] == "queued"

    current = None
    for _ in range(100):
        queue_response = client.get("/api/processing-center/jobs", params={"view": "all"}, headers=headers)
        assert queue_response.status_code == 200, queue_response.text
        current = next(item for item in queue_response.json()["jobs"] if item["id"] == created["order_id"])
        if current["job"]["state"] in {"completed", "partial_completed", "failed"}:
            break
        time.sleep(0.05)

    assert current is not None
    assert current["job"]["state"] == "completed", current
    assert current["job"]["progress"] == 100
    assert {Path(item["original_name"]).suffix for item in current["output_files"]} >= {".docx", ".md", ".json", ".xml"}

    output = current["output_files"][0]
    download = client.get(output["download_url"], headers=headers)
    assert download.status_code == 200, download.text
    assert download.content

    dashboard = client.get("/api/dashboard/recent-orders", headers=headers)
    assert dashboard.status_code == 200
    assert any(item["id"] == created["order_id"] for item in dashboard.json()["orders"])


def test_real_pdf_split_order_individual_downloads_and_delivery_zip(client: TestClient, monkeypatch):
    """Verify the complete customer flow from uploaded PDF to split ZIP delivery."""
    monkeypatch.setattr(main_module, "REGISTRATION_IP_MAX_ACCOUNTS", 1000)
    email = f"pdf-split-{time.time_ns()}@example.test"
    token = _register_and_verify(client, email)
    headers = {"Authorization": f"Bearer {token}"}

    pdf_bytes = io.BytesIO()
    writer = PdfWriter()
    for _ in range(5):
        writer.add_blank_page(width=210, height=297)
    writer.write(pdf_bytes)
    writer.close()
    split_settings = {
        "enabled": True,
        "mode": "ranges",
        "ranges": "1-2,3,4-5",
        "keep_original": False,
    }

    response = client.post(
        "/api/orders",
        headers=headers,
        files={"files": ("customer-contract.pdf", pdf_bytes.getvalue(), "application/pdf")},
        data={
            "name": "PDF Split Acceptance",
            "email": email,
            "services": json.dumps(["conversion"]),
            "translation_json": json.dumps({"enabled": False, "language_mode": "none"}),
            "conversion_json": json.dumps({
                "formats": ["original"],
                "output_strategy": "preserve",
                "primary_format": "original",
                "pdf_split": split_settings,
                "options": {"pdf_split": split_settings},
            }),
        },
    )
    assert response.status_code == 200, response.text
    created = response.json()

    current = None
    for _ in range(160):
        queue_response = client.get("/api/processing-center/jobs", params={"view": "all"}, headers=headers)
        assert queue_response.status_code == 200, queue_response.text
        current = next(item for item in queue_response.json()["jobs"] if item["id"] == created["order_id"])
        if current["job"]["state"] in {"completed", "partial_completed", "failed"}:
            break
        time.sleep(0.05)

    assert current is not None
    assert current["job"]["state"] == "completed", current
    assert any(step["step_key"] == "split" for step in current["job"]["steps"])
    outputs = current["output_files"]
    assert [item["original_name"] for item in outputs] == [
        "customer-contract_pages_001-002.pdf",
        "customer-contract_page_003.pdf",
        "customer-contract_pages_004-005.pdf",
    ]

    expected_pages = [2, 1, 2]
    for output, page_count in zip(outputs, expected_pages):
        download = client.get(output["download_url"], headers=headers)
        assert download.status_code == 200, download.text
        assert len(PdfReader(io.BytesIO(download.content)).pages) == page_count

    delivery = client.get(
        "/api/track/delivery/download-all",
        params={"order_number": created["order_number"], "email": email},
    )
    assert delivery.status_code == 200, delivery.text
    assert delivery.headers["content-type"].startswith("application/zip")
    with zipfile.ZipFile(io.BytesIO(delivery.content)) as archive:
        assert archive.namelist() == [item["original_name"] for item in outputs]
        assert all(archive.getinfo(name).file_size > 0 for name in archive.namelist())
