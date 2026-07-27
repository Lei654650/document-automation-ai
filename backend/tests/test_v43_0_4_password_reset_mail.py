import os
import sqlite3
from pathlib import Path


def test_platform_admin_can_be_bootstrapped_for_password_reset(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "admin@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "authorization-code")
    monkeypatch.setenv("SMTP_FROM_EMAIL", "admin@example.com")
    monkeypatch.setenv("SMTP_USE_TLS", "true")
    monkeypatch.setenv("SMTP_USE_SSL", "false")

    import importlib
    import app.main as main
    main = importlib.reload(main)

    delivered = {}

    def fake_send(email, code):
        delivered["email"] = email
        delivered["code"] = code
        return {"channel": "email", "detail": "smtp_delivered", "sent_at": main.utc_now()}

    monkeypatch.setattr(main, "_send_password_reset_email", fake_send)
    from fastapi.testclient import TestClient

    with TestClient(main.app) as client:
        response = client.post("/api/auth/password-reset/request", json={"email": "ADMIN@example.com"})
    assert response.status_code == 200, response.text
    assert response.json()["delivery"] == "email"
    assert delivered["email"] == "admin@example.com"

    with sqlite3.connect(main.DB_PATH) as db:
        user = db.execute("SELECT email,status,email_verified FROM users WHERE email=?", ("admin@example.com",)).fetchone()
        token = db.execute("SELECT email_sent,delivery_channel FROM password_reset_tokens").fetchone()
    assert user == ("admin@example.com", "active", 1)
    assert token == (1, "email")


def test_unknown_account_keeps_generic_response_without_sending(monkeypatch, tmp_path):
    monkeypatch.setenv("APP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    import importlib
    import app.main as main
    main = importlib.reload(main)

    def fail_send(*args, **kwargs):
        raise AssertionError("SMTP must not be called for an unknown account")

    monkeypatch.setattr(main, "_send_password_reset_email", fail_send)
    from fastapi.testclient import TestClient

    with TestClient(main.app) as client:
        response = client.post("/api/auth/password-reset/request", json={"email": "nobody@example.com"})
    assert response.status_code == 200
    assert response.json()["success"] is True
