from app.engines.job_engine import _resolve_job_outcome


def test_all_success_is_completed():
    state, message = _resolve_job_outcome(2, 0)
    assert state == "completed"
    assert "2" in message


def test_partial_success_is_explicit():
    state, message = _resolve_job_outcome(1, 2)
    assert state == "partial_completed"
    assert "1" in message and "2" in message


def test_all_failed_never_reports_completed():
    state, message = _resolve_job_outcome(0, 2)
    assert state == "failed"
    assert "0" in message and "2" in message


def test_zero_outputs_without_failure_is_failed():
    state, _ = _resolve_job_outcome(0, 0)
    assert state == "failed"
