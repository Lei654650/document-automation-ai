from app.knowledge_center import KnowledgeCenterManager

def test_knowledge_center_loads_seed_libraries():
    center = KnowledgeCenterManager()
    snapshot = center.reload()
    assert len(snapshot.industries) >= 10
    assert len(snapshot.countries) >= 10
    assert snapshot.summary()["standard"] == "Enterprise Delivery Standard"

def test_translation_context_resolves_industry_country():
    center = KnowledgeCenterManager()
    context = center.translation_context("automation", "vietnam", "default")
    assert context["industry"]["id"] == "automation"
    assert context["country"]["id"] == "vietnam"
    assert context["enterprise"]["id"] == "default"
