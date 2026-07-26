from app.engines.job_engine import _detect_excel_translation_mode


def test_detects_pretranslated_workbook_as_repair():
    values = [
        '急停报警 - Cảnh báo dừng khẩn cấp',
        '安全门打开 - Cửa an toàn đang mở',
        '载具到位 - Đồ gá đã vào vị trí',
        '单步 - Cần xác nhận bản dịch',
        'Y065 侧拆螺丝前横移伸出',
    ]
    mode, stats = _detect_excel_translation_mode(values)
    assert mode == 'repair'
    assert stats['confirmed'] == 3
    assert stats['pending'] == 1


def test_detects_source_workbook_as_full_translation():
    values = ['急停报警', '安全门打开', '载具到位', '单步']
    mode, stats = _detect_excel_translation_mode(values)
    assert mode == 'full'
    assert stats['source_only'] == 4
