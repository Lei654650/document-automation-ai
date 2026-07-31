from app.engines.translation_engine import (
    _deterministic_plc_translation_zh_vi,
    _glossary_translation,
    TRANSLATION_CACHE_NAMESPACE,
)


def test_v37_cache_namespace_invalidates_previous_ai_wording():
    assert TRANSLATION_CACHE_NAMESPACE.startswith("v40.0-")


def test_equipment_category_labels_are_stable():
    expected = {
        "轴名称": "Tên trục",
        "气缸名称": "Tên xi lanh",
        "真空名称": "Tên cụm chân không",
        "压力传感器名称": "Tên cảm biến áp suất",
        "电批名称": "Tên súng siết vít điện",
    }
    for source, target in expected.items():
        assert _deterministic_plc_translation_zh_vi(source) == target


def test_plc_address_is_preserved_once():
    assert _deterministic_plc_translation_zh_vi("X075 备用") == "X075 Dự phòng"
    assert _deterministic_plc_translation_zh_vi("X030 载具进料阻挡降位") == (
        "X030 Cơ cấu chặn cấp liệu đồ gá ở vị trí hạ"
    )


def test_fixture_and_motion_phrases_are_consistent():
    expected = {
        "X031 载具进料阻挡升位": "X031 Cơ cấu chặn cấp liệu đồ gá ở vị trí nâng",
        "X032 载具出料阻挡降位": "X032 Cơ cấu chặn xả liệu đồ gá ở vị trí hạ",
        "X034 载具顶升降位": "X034 Cơ cấu nâng đồ gá ở vị trí hạ",
        "X036 检测夹爪松位": "X036 Kẹp kiểm tra ở vị trí mở",
        "X037 检测夹爪夹位": "X037 Kẹp kiểm tra ở vị trí kẹp",
    }
    for source, target in expected.items():
        assert _glossary_translation(source, "zh", "vi") == target


def test_safety_door_templates_are_deterministic():
    assert _deterministic_plc_translation_zh_vi("X013 前下左安全门关闭") == (
        "X013 Cửa an toàn phía trước dưới bên trái đã đóng"
    )
    assert _deterministic_plc_translation_zh_vi("X022 NG安全门关闭") == (
        "X022 Cửa an toàn khu vực NG đã đóng"
    )


def test_unknown_text_falls_back_to_ai():
    assert _deterministic_plc_translation_zh_vi("这是一段普通说明文字") is None
