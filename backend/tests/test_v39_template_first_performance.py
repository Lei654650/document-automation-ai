import re
from app.engines.job_engine import _automation_vi_fallback

_CJK = re.compile(r'[\u3400-\u9fff]')


def test_hmi_prefix_and_exact_labels_are_local():
    samples = {
        '文本-生产总数': 'Tổng sản lượng',
        '页面-下一页': 'Trang sau',
        '轴12位置名称': 'Tên vị trí trục 12',
        'Y1003 三色灯红': 'Y1003 Đèn ba màu đỏ',
        '真空IO输出-吸': 'Đầu ra I/O chân không - hút',
    }
    for source, expected in samples.items():
        value = _automation_vi_fallback(source)
        assert value == expected
        assert not _CJK.search(value)


def test_axis_condition_alarm_is_composed_locally():
    value = _automation_vi_fallback('AX4 搬运Z轴操作条件不满足')
    assert value.startswith('AX4 Không đáp ứng điều kiện vận hành')
    assert 'trục Z' in value
    assert not _CJK.search(value)


def test_position_label_is_composed_locally():
    value = _automation_vi_fallback('P2-取料左位P2')
    assert value.startswith('P2-')
    assert not _CJK.search(value)
