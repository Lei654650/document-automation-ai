import ast
from pathlib import Path


def test_progress_emit_only_waits_at_file_boundaries():
    source = Path(__file__).resolve().parents[1] / "app" / "main.py"
    tree = ast.parse(source.read_text(encoding="utf-8"))
    dispatcher = next(
        node for node in tree.body
        if isinstance(node, ast.ClassDef) and node.name == "_ProgressEventDispatcher"
    )
    emit = next(
        node for node in dispatcher.body
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "emit"
    )
    waits = [
        node for node in ast.walk(emit)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "_wait_for_job_control"
    ]
    assert len(waits) == 1, "progress telemetry must not synchronously wait on every event"
    text = ast.get_source_segment(source.read_text(encoding="utf-8"), emit) or ""
    assert "开始处理文件" in text
    assert "正在准备处理" in text
