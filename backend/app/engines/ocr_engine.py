from __future__ import annotations

import shutil
from dataclasses import dataclass


@dataclass(frozen=True)
class OcrCapability:
    available: bool
    engine: str
    message: str


def capability() -> OcrCapability:
    executable = shutil.which("tesseract")
    if executable:
        return OcrCapability(True, "tesseract", executable)
    return OcrCapability(False, "none", "Tesseract OCR is not installed or is not available in PATH.")
