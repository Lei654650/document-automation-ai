from __future__ import annotations

import zipfile
from pathlib import Path, PurePosixPath

from fastapi import HTTPException

from .config import CONFIG


SUPPORTED_UPLOAD_SUFFIXES = {
    ".pdf", ".xlsx", ".xls", ".docx", ".doc", ".csv",
    ".pptx", ".ppt", ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff",
    ".zip", ".rar", ".7z", ".tar", ".gz", ".tgz",
}

_ZIP_DOCUMENT_SUFFIXES = {".docx", ".xlsx", ".pptx", ".zip"}
_IMAGE_MAGIC = {
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".bmp": (b"BM",),
    ".tif": (b"II*\x00", b"MM\x00*"),
    ".tiff": (b"II*\x00", b"MM\x00*"),
}
_DANGEROUS_ARCHIVE_SUFFIXES = {
    ".exe", ".dll", ".com", ".scr", ".msi", ".bat", ".cmd", ".ps1", ".vbs",
    ".js", ".jse", ".wsf", ".hta", ".jar", ".php", ".phtml", ".sh", ".elf",
    ".lnk", ".url", ".reg", ".sys", ".cpl", ".chm",
}
_MACRO_PARTS = ("vbaproject.bin", "vbadata.xml", "macrosheets/")


def _reject(path: Path, message: str) -> None:
    path.unlink(missing_ok=True)
    raise HTTPException(status_code=400, detail=message)


def _inspect_zip(path: Path, original_name: str, *, office_suffix: str) -> list[str]:
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > CONFIG.archive_max_members:
                _reject(path, f"{original_name} contains too many archive members.")

            total_uncompressed = 0
            total_compressed = 0
            names: list[str] = []
            for info in infos:
                normalized = info.filename.replace("\\", "/")
                member = PurePosixPath(normalized)
                names.append(normalized)
                if member.is_absolute() or ".." in member.parts or normalized.startswith(("/", "\\")):
                    _reject(path, f"{original_name} contains an unsafe archive path.")
                if info.flag_bits & 0x1:
                    _reject(path, f"{original_name} contains encrypted archive content and was rejected.")
                suffix = Path(member.name).suffix.lower()
                if suffix in _DANGEROUS_ARCHIVE_SUFFIXES:
                    _reject(path, f"{original_name} contains a prohibited executable or script file.")
                lowered = normalized.lower()
                if office_suffix != ".zip" and any(part in lowered for part in _MACRO_PARTS):
                    _reject(path, f"{original_name} contains macro-enabled Office content and was rejected.")

                total_uncompressed += max(0, info.file_size)
                total_compressed += max(0, info.compress_size)
                if info.file_size > 10 * 1024 * 1024 and info.compress_size > 0:
                    ratio = info.file_size / info.compress_size
                    if ratio > CONFIG.archive_max_ratio:
                        _reject(path, f"{original_name} has a suspicious compression ratio.")

            if total_uncompressed > CONFIG.archive_max_uncompressed_mb * 1024 * 1024:
                _reject(path, f"{original_name} expands beyond the permitted archive size.")
            if total_uncompressed > 10 * 1024 * 1024 and total_compressed > 0:
                if total_uncompressed / total_compressed > CONFIG.archive_max_ratio:
                    _reject(path, f"{original_name} appears to be a compressed archive bomb.")
            return names
    except HTTPException:
        raise
    except (OSError, zipfile.BadZipFile):
        _reject(path, f"{original_name} could not be verified.")
    return []


def validate_uploaded_file(path: Path, original_name: str) -> None:
    """Verify stored content and remove files that fail validation."""
    suffix = Path(original_name).suffix.lower()
    if suffix not in SUPPORTED_UPLOAD_SUFFIXES:
        _reject(path, f"当前版本暂不支持处理此文件类型：{suffix or 'unknown'}。")
    try:
        with path.open("rb") as handle:
            head = handle.read(16)
    except OSError as exc:
        raise HTTPException(status_code=400, detail=f"Unable to verify {original_name}: {exc}")

    if not head:
        _reject(path, f"{original_name} is empty.")
    if head.startswith((b"MZ", b"\x7fELF", b"#!")):
        _reject(path, f"{original_name} contains executable content and was rejected.")
    if suffix == ".pdf" and not head.startswith(b"%PDF-"):
        _reject(path, f"{original_name} is not a valid PDF file.")
    expected = _IMAGE_MAGIC.get(suffix)
    if expected and not head.startswith(expected):
        _reject(path, f"{original_name} does not match its image extension.")
    if suffix in _ZIP_DOCUMENT_SUFFIXES:
        if not zipfile.is_zipfile(path):
            _reject(path, f"{original_name} is not a valid ZIP-based document.")
        names = _inspect_zip(path, original_name, office_suffix=suffix)
        if suffix != ".zip":
            required_prefix = {".docx": "word/", ".xlsx": "xl/", ".pptx": "ppt/"}[suffix]
            if "[Content_Types].xml" not in names or not any(name.startswith(required_prefix) for name in names):
                _reject(path, f"{original_name} does not contain a valid {suffix[1:].upper()} structure.")
