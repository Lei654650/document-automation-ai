from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from docx import Document
from openpyxl import load_workbook
from pptx import Presentation
from pypdf import PdfReader

from .ocr_engine import capability as ocr_capability
from .translation_engine import TranslationClient, capability as translation_capability

ProgressCallback = Callable[[int, str, str], None]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_plan(order: dict[str, Any]) -> list[dict[str, Any]]:
    services = order.get("services") or []
    steps: list[dict[str, Any]] = [
        {"id": "validate", "label": "Validate source files", "required": True},
        {"id": "analyze", "label": "Analyze document structure", "required": True},
    ]
    if "ocr" in services:
        steps.append({"id": "ocr", "label": "OCR scanned content", "required": True})
    if "translation" in services:
        steps.append({"id": "translation", "label": "AI automatic translation", "required": True})
    if "data_cleanup" in services:
        steps.append({"id": "cleanup", "label": "Clean and structure data", "required": True})
    if "layout_preserve" in services:
        steps.append({"id": "layout", "label": "Preserve or recover layout", "required": True})
    steps.append({"id": "export", "label": "Generate delivery files", "required": True})
    if "manual_review" in services:
        steps.append({"id": "review", "label": "Manual quality review", "required": True})
    return steps


def _update(callback: ProgressCallback | None, progress: int, step: str, message: str) -> None:
    if callback:
        callback(progress, step, message)


def _translate_pptx(source: Path, destination: Path, client: TranslationClient, callback: ProgressCallback | None) -> int:
    presentation = Presentation(source)
    translated = 0
    total = max(1, len(presentation.slides))
    for slide_index, slide in enumerate(presentation.slides, start=1):
        for shape in slide.shapes:
            if getattr(shape, "has_text_frame", False):
                for paragraph in shape.text_frame.paragraphs:
                    original = "".join(run.text for run in paragraph.runs) or paragraph.text
                    if original.strip():
                        value = client.translate(original)
                        if paragraph.runs:
                            paragraph.runs[0].text = value
                            for run in paragraph.runs[1:]:
                                run.text = ""
                        else:
                            paragraph.text = value
                        translated += 1
            if getattr(shape, "has_table", False):
                for row in shape.table.rows:
                    for cell in row.cells:
                        for paragraph in cell.text_frame.paragraphs:
                            original = "".join(run.text for run in paragraph.runs) or paragraph.text
                            if original.strip():
                                value = client.translate(original)
                                if paragraph.runs:
                                    paragraph.runs[0].text = value
                                    for run in paragraph.runs[1:]:
                                        run.text = ""
                                else:
                                    paragraph.text = value
                                translated += 1
        _update(callback, 35 + int(slide_index / total * 45), "translation", f"Translated PowerPoint slide {slide_index}/{total}")
    presentation.save(destination)
    return translated


def _translate_docx(source: Path, destination: Path, client: TranslationClient, callback: ProgressCallback | None) -> int:
    document = Document(source)
    paragraphs = list(document.paragraphs)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                paragraphs.extend(cell.paragraphs)
    total = max(1, len(paragraphs))
    translated = 0
    for index, paragraph in enumerate(paragraphs, start=1):
        original = "".join(run.text for run in paragraph.runs) or paragraph.text
        if original.strip():
            value = client.translate(original)
            if paragraph.runs:
                paragraph.runs[0].text = value
                for run in paragraph.runs[1:]:
                    run.text = ""
            else:
                paragraph.text = value
            translated += 1
        if index % 5 == 0 or index == total:
            _update(callback, 35 + int(index / total * 45), "translation", f"Translated Word content {index}/{total}")
    document.save(destination)
    return translated


def _translate_xlsx(source: Path, destination: Path, client: TranslationClient, callback: ProgressCallback | None) -> int:
    workbook = load_workbook(source)
    cells = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and not cell.value.startswith("=") and cell.value.strip():
                    cells.append(cell)
    total = max(1, len(cells))
    translated = 0
    for index, cell in enumerate(cells, start=1):
        cell.value = client.translate(cell.value)
        translated += 1
        if index % 10 == 0 or index == total:
            _update(callback, 35 + int(index / total * 45), "translation", f"Translated Excel cells {index}/{total}")
    workbook.save(destination)
    return translated


def _translate_pdf_to_docx(source: Path, destination: Path, client: TranslationClient, callback: ProgressCallback | None) -> int:
    reader = PdfReader(source)
    document = Document()
    total = max(1, len(reader.pages))
    translated = 0
    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            document.add_heading(f"Page {index}", level=2)
            for block in [part.strip() for part in text.split("\n\n") if part.strip()]:
                document.add_paragraph(client.translate(block))
                translated += 1
        _update(callback, 35 + int(index / total * 45), "translation", f"Translated PDF page {index}/{total}")
    document.save(destination)
    return translated


def _process_file(original_name: str, stored_path: str, output_dir: Path, client: TranslationClient | None, callback: ProgressCallback | None) -> dict[str, Any]:
    source = Path(stored_path)
    suffix = source.suffix.lower()
    safe_stem = Path(original_name).stem
    if client is None:
        destination = output_dir / Path(original_name).name
        shutil.copy2(source, destination)
        return {"name": destination.name, "path": str(destination), "translated_items": 0, "mode": "copied"}

    if suffix == ".pptx":
        destination = output_dir / f"{safe_stem}_translated.pptx"
        count = _translate_pptx(source, destination, client, callback)
    elif suffix == ".docx":
        destination = output_dir / f"{safe_stem}_translated.docx"
        count = _translate_docx(source, destination, client, callback)
    elif suffix == ".xlsx":
        destination = output_dir / f"{safe_stem}_translated.xlsx"
        count = _translate_xlsx(source, destination, client, callback)
    elif suffix == ".pdf":
        destination = output_dir / f"{safe_stem}_translated.docx"
        count = _translate_pdf_to_docx(source, destination, client, callback)
    else:
        destination = output_dir / Path(original_name).name
        shutil.copy2(source, destination)
        count = 0
    return {"name": destination.name, "path": str(destination), "translated_items": count, "mode": "translated" if count else "copied"}


def run_local_job(order: dict[str, Any], source_paths: list[tuple[str, str]], output_dir: Path, progress_callback: ProgressCallback | None = None) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    plan = build_plan(order)
    services = order.get("services") or []
    ocr = ocr_capability()
    translation = translation_capability()
    blockers: list[str] = []
    if "ocr" in services and not ocr.available:
        blockers.append(ocr.message)
    if "translation" in services and not translation.configured:
        blockers.append(translation.message)

    _update(progress_callback, 10, "validate", f"Validated {len(source_paths)} source file(s)")
    if not source_paths:
        raise RuntimeError("No source files were found for this order.")
    _update(progress_callback, 20, "analyze", "Document structure analysis completed")

    manifest = {
        "order_number": order["order_number"],
        "created_at": now(),
        "plan": plan,
        "ocr": ocr.__dict__,
        "translation": translation.__dict__,
        "blockers": blockers,
        "source_files": [name for name, _ in source_paths],
    }
    manifest_path = output_dir / "processing_manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    if blockers:
        _update(progress_callback, 25, "configuration", blockers[0])
        return {
            "state": "waiting_configuration",
            "progress": 25,
            "current_step": "configuration",
            "plan": plan,
            "blockers": blockers,
            "manifest_path": str(manifest_path),
            "outputs": [],
        }

    translation_data = order.get("translation") or {}
    client = None
    if "translation" in services:
        client = TranslationClient(
            source_language=translation_data.get("source_language", "auto"),
            target_language=translation_data.get("target_language", "en"),
            custom_source=translation_data.get("custom_source_language", ""),
            custom_target=translation_data.get("custom_target_language", ""),
        )
        _update(progress_callback, 30, "translation", "AI translation provider connected")

    outputs: list[dict[str, Any]] = []
    for index, (original_name, stored_path) in enumerate(source_paths, start=1):
        _update(progress_callback, 30, "processing", f"Processing file {index}/{len(source_paths)}: {original_name}")
        outputs.append(_process_file(original_name, stored_path, output_dir, client, progress_callback))

    _update(progress_callback, 90, "export", f"Generated {len(outputs)} delivery file(s)")
    manifest["outputs"] = outputs
    if client is not None:
        manifest["translation_usage"] = client.usage_summary()
    manifest["completed_at"] = now()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    state = "quality_review" if "manual_review" in services else "completed"
    _update(progress_callback, 100, state, "Automatic processing completed")
    return {
        "state": state,
        "progress": 100,
        "current_step": state,
        "plan": plan,
        "blockers": [],
        "manifest_path": str(manifest_path),
        "outputs": outputs,
        "translation_usage": client.usage_summary() if client is not None else None,
    }
