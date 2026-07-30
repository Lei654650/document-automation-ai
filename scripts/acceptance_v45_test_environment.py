"""V45 long-term test environment acceptance.

Required environment variables:
  DAI_TEST_EMAIL
  DAI_TEST_PASSWORD

Optional:
  DAI_TEST_API_BASE (defaults to https://api-test.docai365.com)
"""

from __future__ import annotations

import io
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile


BASE = os.environ.get("DAI_TEST_API_BASE", "https://api-test.docai365.com").rstrip("/")
EMAIL = os.environ["DAI_TEST_EMAIL"]
PASSWORD = os.environ["DAI_TEST_PASSWORD"]
TIMEOUT_SECONDS = 600


def request(path, method="GET", body=None, token="", content_type="application/json"):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = body
    if isinstance(body, (dict, list)):
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = content_type
    elif body is not None:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return response.status, dict(response.headers), raw
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise AssertionError(f"{method} {path} failed: HTTP {error.code}: {detail[:800]}") from error


def json_request(path, method="GET", body=None, token=""):
    status, headers, raw = request(path, method, body, token)
    return status, headers, json.loads(raw.decode("utf-8") or "{}")


def upload_file(filename, payload, token):
    _, _, init = json_request(
        "/api/uploads/init",
        "POST",
        {
            "filename": filename,
            "size_bytes": len(payload),
            "content_type": "text/plain",
        },
        token,
    )
    upload_id = init["upload_id"]
    chunk_size = int(init.get("chunk_size") or 2 * 1024 * 1024)
    for index, offset in enumerate(range(0, len(payload), chunk_size)):
        request(
            f"/api/uploads/{upload_id}/chunks/{index}",
            "PUT",
            payload[offset : offset + chunk_size],
            token,
            "application/octet-stream",
        )
    _, _, completed = json_request(f"/api/uploads/{upload_id}/complete", "POST", token=token)
    assert completed["success"] is True
    return upload_id


def create_order(filename, payload, services, conversion, token):
    upload_id = upload_file(filename, payload, token)
    _, _, order = json_request(
        "/api/orders/from-uploads",
        "POST",
        {
            "upload_ids": [upload_id],
            "name": "V45 Automated Acceptance",
            "email": EMAIL,
            "services": services,
            "requirements": "V45 automated test environment acceptance",
            "translation": {},
            "conversion": conversion,
        },
        token,
    )
    assert order["order_id"] > 0
    assert order["order_number"]
    return order


def wait_for_order(order, expected_states):
    deadline = time.monotonic() + TIMEOUT_SECONDS
    history = []
    while time.monotonic() < deadline:
        query = urllib.parse.urlencode({"order_number": order["order_number"], "email": EMAIL})
        _, _, tracked = json_request(f"/api/track?{query}")
        job = tracked.get("processing_job") or {}
        state = str(job.get("state") or tracked.get("status") or "")
        progress = int(job.get("progress") or 0)
        marker = (state, progress, job.get("current_step"))
        if not history or history[-1] != marker:
            history.append(marker)
        if state in expected_states:
            return tracked, history
        if state in {"failed", "cancelled", "waiting_configuration"} and state not in expected_states:
            raise AssertionError(f"Order reached unexpected terminal state {state}: {job.get('error_message')}")
        time.sleep(2)
    raise AssertionError(f"Order did not finish within {TIMEOUT_SECONDS}s; history={history}")


def cleanup(order_ids, token):
    if not order_ids:
        return
    _, _, result = json_request(
        "/api/projects/batch-action",
        "POST",
        {"ids": order_ids, "operation": "purge"},
        token,
    )
    assert result["processed"] == len(order_ids), result


def main():
    created_order_ids = []
    result = {"base": BASE, "checks": {}}
    _, _, login = json_request(
        "/api/auth/login",
        "POST",
        {
            "email": EMAIL,
            "password": PASSWORD,
            "device_fingerprint": "v45-automated-acceptance",
        },
    )
    token = login["token"]
    result["checks"]["login"] = True
    try:
        success = create_order(
            "v45-success.txt",
            b"Document Automation AI V45 acceptance\n",
            ["standard"],
            {"formats": ["original"], "options": {}},
            token,
        )
        created_order_ids.append(success["order_id"])
        completed, success_history = wait_for_order(success, {"completed", "partial_completed"})
        outputs = completed.get("output_files") or []
        assert outputs, completed
        output = outputs[0]
        status, _, downloaded = request(
            f"/api/processing-center/outputs/{output['id']}/download",
            token=token,
        )
        assert status == 200 and downloaded
        query = urllib.parse.urlencode({"order_number": success["order_number"], "email": EMAIL})
        zip_status, _, package = request(f"/api/track/delivery/download-all?{query}")
        assert zip_status == 200 and zipfile.ZipFile(io.BytesIO(package)).testzip() is None
        result["checks"]["success_workflow"] = {
            "order": success["order_number"],
            "history": success_history,
            "download_bytes": len(downloaded),
            "zip_bytes": len(package),
        }

        failed = create_order(
            "v45-retry.txt",
            b"This task intentionally requests an unsupported test-only format.\n",
            ["conversion"],
            {"formats": ["unsupported-v45-test"], "options": {}},
            token,
        )
        created_order_ids.append(failed["order_id"])
        failed_state, failure_history = wait_for_order(failed, {"failed"})
        assert (failed_state.get("processing_job") or {}).get("state") == "failed"
        _, _, retried = json_request(
            f"/api/processing-center/orders/{failed['order_id']}/retry",
            "POST",
            token=token,
        )
        assert retried["success"] is True
        assert retried.get("job_id")
        _, retry_history = wait_for_order(failed, {"failed"})
        result["checks"]["failure_retry"] = {
            "order": failed["order_number"],
            "first_history": failure_history,
            "retry_job_id": retried["job_id"],
            "retry_history": retry_history,
        }
    finally:
        cleanup(created_order_ids, token)
        result["checks"]["cleanup"] = created_order_ids
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
