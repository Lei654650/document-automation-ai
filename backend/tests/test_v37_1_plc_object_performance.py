from app.engines.translation_engine import _deterministic_plc_translation_zh_vi


def test_v371_object_prefix_rules_cover_customer_examples():
    expected = {
        'CY1 载具出料阻挡': 'CY1 Xi lanh chặn xả liệu đồ gá',
        'CY2 载具顶升': 'CY2 Xi lanh nâng đồ gá',
        'SE1 载具进料到位': 'SE1 Cảm biến đồ gá cấp liệu tại vị trí',
        'SE2 载具出料流出': 'SE2 Cảm biến đồ gá đi ra',
        'BL1 下层皮带': 'BL1 Băng tải tầng dưới',
        'SC1 工位1扫码器': 'SC1 Máy quét mã trạm 1',
        'DS1 左锁附二位移': 'DS1 Cảm biến dịch chuyển vị trí 2 bên trái',
        'DS2 右锁附一位移': 'DS2 Cảm biến dịch chuyển vị trí 1 bên phải',
    }
    for source, target in expected.items():
        assert _deterministic_plc_translation_zh_vi(source) == target


def test_v371_common_position_labels_are_deterministic():
    assert _deterministic_plc_translation_zh_vi('X033 载具出料阻挡升位') == 'X033 Cơ cấu chặn xả liệu đồ gá ở vị trí nâng'
    assert _deterministic_plc_translation_zh_vi('X075 备用') == 'X075 Dự phòng'
