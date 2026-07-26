from app.engines.translation_engine import (
    _mask_protected_tokens,
    _repair_and_validate_cached_translation,
    _restore_protected_tokens,
    _technical_placeholders,
)


def test_repeated_identical_placeholders_receive_unique_tokens_and_restore_all():
    source = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    masked, mapping = _mask_protected_tokens(source)

    assert len(mapping) == 3  # AX0 plus two independent WATCH1 occurrences
    assert "__DA_TOKEN_001__" in masked
    assert "__DA_TOKEN_002__" in masked

    translated = masked.replace("__DA_TOKEN_001__", "__ DA_TOKEN_001 __")
    restored = _restore_protected_tokens(translated, mapping)

    assert restored.count("%(WATCH1)d") == 2
    assert _technical_placeholders(restored) == _technical_placeholders(source)


def test_cached_broken_printf_spacing_is_self_healed():
    source = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    poisoned = "AX0 không ở vị trí %(WATCH1)d, hãy di chuyển đến vị trí %(WATCH1) - d."

    repaired = _repair_and_validate_cached_translation(source, poisoned)

    assert repaired is not None
    assert repaired.count("%(WATCH1)d") == 2
    assert "%(WATCH1) - d" not in repaired


def test_cached_translation_missing_repeated_placeholder_is_rejected():
    source = "AX0 不在位置%(WATCH1)d，请操作到位置%(WATCH1)d。"
    poisoned = "AX0 không ở vị trí %(WATCH1)d, hãy di chuyển đến vị trí."

    assert _repair_and_validate_cached_translation(source, poisoned) is None
