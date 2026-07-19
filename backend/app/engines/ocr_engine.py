from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageEnhance, ImageOps

try:
    import pytesseract
except Exception:  # pragma: no cover - optional runtime dependency
    pytesseract = None


@dataclass(frozen=True)
class OcrCapability:
    available: bool
    engine: str
    message: str


def _find_tesseract() -> str | None:
    executable = shutil.which("tesseract")
    if executable:
        return executable
    candidates = [
        os.getenv("TESSERACT_CMD", ""),
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        str(Path.home() / "AppData" / "Local" / "Programs" / "Tesseract-OCR" / "tesseract.exe"),
    ]
    return next((value for value in candidates if value and Path(value).exists()), None)


def capability() -> OcrCapability:
    executable = _find_tesseract()
    if executable and pytesseract is not None:
        pytesseract.pytesseract.tesseract_cmd = executable
        return OcrCapability(True, "tesseract", executable)
    if not executable:
        return OcrCapability(False, "none", "Tesseract OCR is not installed or is not available in PATH.")
    return OcrCapability(False, "none", "The pytesseract Python package is not installed.")


def _prepare_image(image: Image.Image) -> Image.Image:
    """Return an OCR-friendly image without destroying the original source."""
    working = ImageOps.exif_transpose(image).convert("RGB")
    # Upscale small scans so characters are large enough for OCR.
    if max(working.size) < 1800:
        scale = min(3.0, 1800 / max(working.size))
        working = working.resize((int(working.width * scale), int(working.height * scale)))
    gray = ImageOps.grayscale(working)
    gray = ImageEnhance.Contrast(gray).enhance(1.6)
    return gray


def _language_candidates(preferred: str = "auto") -> Iterable[str]:
    value = (preferred or "auto").lower()
    mapping = {
        "zh": "chi_sim+eng",
        "zh_cn": "chi_sim+eng",
        "zh_tw": "chi_tra+eng",
        "vi": "vie+eng",
        "en": "eng",
        "ja": "jpn+eng",
        "ko": "kor+eng",
    }
    chosen = mapping.get(value)
    if chosen:
        yield chosen
    # Broad multilingual fallback, then English-only fallback.
    yield "eng+vie+chi_sim"
    yield "eng"


def extract_text_from_image(path: str | Path, preferred_language: str = "auto") -> str:
    cap = capability()
    if not cap.available:
        raise RuntimeError(cap.message)
    source = Path(path)
    with Image.open(source) as image:
        prepared = _prepare_image(image)
        last_error: Exception | None = None
        for lang in _language_candidates(preferred_language):
            try:
                text = pytesseract.image_to_string(prepared, lang=lang, config="--oem 3 --psm 6")
                if text.strip():
                    return _normalize_text(text)
            except Exception as exc:  # language packs can differ by installation
                last_error = exc
        if last_error:
            raise RuntimeError(f"OCR failed for {source.name}: {last_error}") from last_error
    return ""


def _normalize_text(text: str) -> str:
    lines = [" ".join(line.split()) for line in text.replace("\x0c", "").splitlines()]
    # Keep paragraph separation while removing long runs of empty OCR lines.
    result: list[str] = []
    blank = False
    for line in lines:
        if line:
            result.append(line)
            blank = False
        elif result and not blank:
            result.append("")
            blank = True
    return "\n".join(result).strip()
