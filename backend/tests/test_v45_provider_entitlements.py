import sqlite3

import pytest
from fastapi import HTTPException

from app.main import _provider_entitlement


def _db(plan_id="free", status="active"):
    db = sqlite3.connect(":memory:")
    db.row_factory = sqlite3.Row
    db.execute("CREATE TABLE customer_wallets(customer_email TEXT, plan_id TEXT, plan_status TEXT)")
    db.execute("INSERT INTO customer_wallets VALUES ('user@example.com', ?, ?)", (plan_id, status))
    return db


@pytest.mark.parametrize("plan", ["free", "starter_monthly", "professional_monthly"])
def test_lower_plans_cannot_request_enterprise(plan):
    with _db(plan) as db, pytest.raises(HTTPException) as error:
        _provider_entitlement(db, "user@example.com", {"quality_mode": "enterprise"})
    assert error.value.status_code == 403


@pytest.mark.parametrize("plan", ["business_monthly", "business_yearly", "enterprise"])
def test_active_business_plans_can_request_enterprise(plan):
    with _db(plan) as db:
        result = _provider_entitlement(db, "user@example.com", {"quality_mode": "enterprise", "provider": "deepseek"})
    assert result["openai_allowed"] is True
    assert result["approved_quality_mode"] == "enterprise"


def test_inactive_plan_and_credit_only_wallet_do_not_grant_openai():
    with _db("business_monthly", "cancelled") as db, pytest.raises(HTTPException):
        _provider_entitlement(db, "user@example.com", {"quality_mode": "enterprise"})

