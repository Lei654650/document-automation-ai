import os
from pathlib import Path

os.environ.setdefault("CLOUD_MODE", "false")
os.environ.setdefault("DATA_ROOT", str(Path(__file__).resolve().parent / ".tmp_v53_data"))
os.environ.setdefault("OWNER_EMAIL", "654650727@qq.com")

from fastapi.testclient import TestClient

from app.main import app, get_db, initialize_db, _password_hash, utc_now


def _reset():
    initialize_db()
    with get_db() as db:
        for table in ("credit_ledger", "customer_wallets", "user_sessions", "users"):
            db.execute(f"DELETE FROM {table}")
        password_hash, salt = _password_hash("Password123")
        now = utc_now()
        users = [
            ("Owner", "654650727@qq.com", "owner", 1),
            ("Verified User", "verified@example.com", "user", 1),
            ("Pending User", "pending@example.com", "user", 0),
        ]
        for name, email, role, verified in users:
            db.execute(
                "INSERT INTO users (name,email,password_hash,password_salt,status,role,email_verified,created_at,last_login_at) VALUES (?,?,?,?,?,?,?,?,?)",
                (name, email, password_hash, salt, "active", role, verified, now, now if verified else ""),
            )
        db.execute(
            "INSERT INTO customer_wallets (customer_email,subscription_credits,purchased_credits,bonus_credits,plan_id,updated_at) VALUES (?,?,?,?,?,?)",
            ("verified@example.com", 100, 20, 5, "free", now),
        )


def _login(client: TestClient, email: str) -> tuple[str, dict]:
    response = client.post("/api/auth/login", json={"email": email, "password": "Password123"})
    assert response.status_code == 200
    payload = response.json()
    return payload["token"], payload["user"]


def test_owner_role_and_admin_user_list_update():
    _reset()
    client = TestClient(app)
    token, user = _login(client, "654650727@qq.com")
    assert user["role"] == "owner"
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "owner"

    response = client.get("/api/admin/users", headers=headers)
    assert response.status_code == 200
    users = response.json()["users"]
    assert len(users) == 3
    pending = next(item for item in users if item["email"] == "pending@example.com")
    assert pending["status"] == "pending_verification"
    verified = next(item for item in users if item["email"] == "verified@example.com")
    assert verified["credits"] == 125

    response = client.patch(
        f"/api/admin/users/{verified['id']}",
        headers=headers,
        json={"plan": "professional", "credits": 8000, "status": "disabled"},
    )
    assert response.status_code == 200
    updated = response.json()["user"]
    assert updated["plan"] == "professional"
    assert updated["credits"] == 8000
    assert updated["status"] == "disabled"


def test_normal_user_cannot_access_admin_api():
    _reset()
    client = TestClient(app)
    token, user = _login(client, "verified@example.com")
    assert user["role"] == "user"
    response = client.get("/api/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_admin_monitoring_and_filters():
    _reset()
    client = TestClient(app)
    token, _ = _login(client, "654650727@qq.com")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/admin/users", params={"status": "pending_verification"}, headers=headers)
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["users"][0]["email"] == "pending@example.com"

    response = client.get("/api/admin/monitoring", headers=headers)
    assert response.status_code == 200
    payload = response.json()
    assert payload["api_status"] == "healthy"
    assert payload["database_status"] == "healthy"
    assert payload["users_total"] == 3
