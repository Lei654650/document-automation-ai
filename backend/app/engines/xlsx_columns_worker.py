from __future__ import annotations

import json
import os
import sys
import time
import traceback
from pathlib import Path


def main() -> int:
    request_path = Path(sys.argv[1])
    request = json.loads(request_path.read_text(encoding="utf-8"))
    result_path = Path(request["result_path"])
    started = time.perf_counter()
    try:
        # Script execution does not automatically put the backend root on sys.path.
        backend_root = Path(__file__).resolve().parents[2]
        if str(backend_root) not in sys.path:
            sys.path.insert(0, str(backend_root))
        from app.engines.job_engine import _apply_excel_side_by_side_layout_impl

        print(f"ENTER pid={os.getpid()} workbook={request['workbook_path']} items={len(request['target_mapping'])}", flush=True)
        changed = _apply_excel_side_by_side_layout_impl(
            Path(request["workbook_path"]),
            dict(request["target_mapping"]),
            dict(request.get("options") or {}),
        )
        result_path.write_text(
            json.dumps({"ok": True, "changed": changed, "elapsed": time.perf_counter() - started}, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"FINISHED changed={changed} elapsed={time.perf_counter()-started:.3f}s", flush=True)
        return 0
    except Exception as exc:
        result_path.write_text(
            json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}", "traceback": traceback.format_exc()}, ensure_ascii=False),
            encoding="utf-8",
        )
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
