from pathlib import Path


def test_processing_worker_uses_non_blocking_progress_dispatcher():
    source = Path('app/main.py').read_text(encoding='utf-8')
    assert 'class _ProgressEventDispatcher' in source
    assert 'progress_callback=progress_dispatcher.emit' in source
    assert 'progress_callback=lambda progress, step, message: _job_event' not in source
    assert 'Never block the document engine merely to persist UI telemetry' in source


def test_dispatcher_keeps_job_control_synchronous():
    source = Path('app/main.py').read_text(encoding='utf-8')
    dispatcher = source[source.index('class _ProgressEventDispatcher'):source.index('def _job_event')]
    assert '_wait_for_job_control(self.job_id)' in dispatcher
    assert 'queue.Queue(maxsize=256)' in dispatcher
