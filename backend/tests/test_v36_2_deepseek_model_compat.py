from app.engines.translation_engine import _extract_supported_models, _normalize_provider_model


def test_official_deepseek_keeps_official_model():
    assert _normalize_provider_model('deepseek', 'deepseek-chat', 'https://api.deepseek.com/v1') == 'deepseek-chat'


def test_compatible_gateway_migrates_legacy_model():
    assert _normalize_provider_model('deepseek', 'deepseek-chat', 'https://gateway.example/v1') == 'deepseek-v4-flash'


def test_gateway_error_models_are_detected():
    detail = 'The supported API model names are deepseek-v4-pro or deepseek-v4-flash, but you passed deepseek-chat'
    assert _extract_supported_models(detail)[:2] == ['deepseek-v4-pro', 'deepseek-v4-flash']
