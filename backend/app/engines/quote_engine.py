from __future__ import annotations

from typing import Any

SERVICE_BASE = {
    "ocr": 8.0,
    "data_cleanup": 12.0,
    "layout_preserve": 10.0,
    "translation": 18.0,
    "manual_review": 8.0,
}
FORMAT_MULTIPLIER = {
    "PowerPoint": 1.35,
    "PDF": 1.20,
    "Word": 1.10,
    "Excel": 1.15,
    "Image": 1.10,
    "ZIP": 1.30,
}
COMPLEXITY_MULTIPLIER = {"low": 1.0, "medium": 1.35, "high": 1.8}


def suggest_quote(analysis: dict[str, Any], services: list[str]) -> dict[str, Any]:
    files = analysis.get("files") or []
    base = 10.0 + sum(SERVICE_BASE.get(item, 3.0) for item in services)
    unit_count = 0
    format_factor = 1.0
    for item in files:
        details = item.get("details") or {}
        raw_units = details.get("pages") or details.get("slides") or details.get("sheet_count") or 1
        if isinstance(raw_units, (list, tuple, set, dict)):
            raw_units = len(raw_units)
        try:
            unit_count += int(raw_units)
        except (TypeError, ValueError):
            unit_count += 1
        format_factor = max(format_factor, FORMAT_MULTIPLIER.get(item.get("format"), 1.0))
    workload = min(120.0, max(0, unit_count - len(files)) * 0.65)
    complexity = str(analysis.get("complexity") or "low").lower()
    amount = round((base + workload) * format_factor * COMPLEXITY_MULTIPLIER.get(complexity, 1.0), 2)
    return {
        "currency": "USD",
        "amount": max(15.0, amount),
        "basis": {
            "file_count": len(files),
            "work_units": unit_count,
            "services": services,
            "complexity": complexity,
        },
        "note": "Rule-based estimate. Administrator confirmation is required before sending the quote.",
    }
