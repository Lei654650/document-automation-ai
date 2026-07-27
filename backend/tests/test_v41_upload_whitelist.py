from pathlib import Path

import pytest
from fastapi import HTTPException

from app.security.upload_guard import SUPPORTED_UPLOAD_SUFFIXES, validate_uploaded_file


def test_supported_suffixes_include_customer_document_formats():
    assert {'.pdf', '.docx', '.xlsx', '.pptx', '.csv', '.zip'} <= SUPPORTED_UPLOAD_SUFFIXES


def test_executable_extension_is_rejected_and_removed(tmp_path: Path):
    target = tmp_path / 'payload.bin'
    target.write_bytes(b'harmless test payload')
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(target, 'security_test.exe')
    assert exc.value.status_code == 400
    assert not target.exists()


def test_disguised_executable_content_is_rejected(tmp_path: Path):
    target = tmp_path / 'payload.bin'
    target.write_bytes(b'MZ' + b'0' * 32)
    with pytest.raises(HTTPException) as exc:
        validate_uploaded_file(target, 'fake.pdf')
    assert exc.value.status_code == 400
    assert not target.exists()
