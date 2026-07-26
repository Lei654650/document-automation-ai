from app.engines.translation_engine import _repair_and_validate_cached_translation, _memory_key
from app.engines.job_engine import _valid_existing_target, _split_existing_bilingual_text


def test_vietnamese_cache_rejects_mixed_chinese_and_source_echo():
    assert _repair_and_validate_cached_translation("备用", "备用", "vi") is None
    assert _repair_and_validate_cached_translation("备用", "备用dự phòng", "vi") is None


def test_vietnamese_cache_rejects_known_poisoned_legacy_phrase():
    assert _repair_and_validate_cached_translation("备用", "Để qua một bên", "vi") is None
    assert not _valid_existing_target("Để qua một bên")


def test_clean_existing_vietnamese_is_preserved():
    pair = _split_existing_bilingual_text("X240 备用dự phòng")
    assert pair == ("X240 备用", "dự phòng")
    assert _valid_existing_target(pair[1])


def test_cache_key_is_namespaced_to_invalidate_v36_0_rows():
    assert _memory_key("zh", "vi", "备用") != _memory_key("zh", "vi", "复位")
    assert len(_memory_key("zh", "vi", "备用")) == 64
