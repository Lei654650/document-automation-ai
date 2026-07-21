from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from .loader import load_json_directory

BASE_DIR = Path(__file__).resolve().parent

@dataclass(frozen=True)
class KnowledgeSnapshot:
    industries: list[dict[str, Any]]
    countries: list[dict[str, Any]]
    enterprise_profiles: list[dict[str, Any]]
    learning_rules: list[dict[str, Any]]
    templates: list[dict[str, Any]]
    output_rules: list[dict[str, Any]]

    def summary(self) -> dict[str, Any]:
        return {
            "industries": len(self.industries),
            "countries": len(self.countries),
            "enterprise_profiles": len(self.enterprise_profiles),
            "learning_rules": len(self.learning_rules),
            "templates": len(self.templates),
            "output_rules": len(self.output_rules),
            "term_count": sum(len(x.get("terms", [])) for x in self.industries),
            "phrase_count": sum(len(x.get("phrases", [])) for x in self.industries),
            "standard": "Enterprise Delivery Standard",
            "engine": "Translation Engine 2.0 Foundation",
        }

class KnowledgeCenterManager:
    def __init__(self, base_dir: Path = BASE_DIR) -> None:
        self.base_dir = base_dir
        self._snapshot: KnowledgeSnapshot | None = None

    def reload(self) -> KnowledgeSnapshot:
        self._snapshot = KnowledgeSnapshot(
            industries=load_json_directory(self.base_dir / "industry"),
            countries=load_json_directory(self.base_dir / "country"),
            enterprise_profiles=load_json_directory(self.base_dir / "enterprise"),
            learning_rules=load_json_directory(self.base_dir / "learning"),
            templates=load_json_directory(self.base_dir / "templates"),
            output_rules=load_json_directory(self.base_dir / "output_rules"),
        )
        return self._snapshot

    @property
    def snapshot(self) -> KnowledgeSnapshot:
        return self._snapshot or self.reload()

    def overview(self) -> dict[str, Any]:
        snapshot = self.snapshot
        return {"summary": snapshot.summary(), "modules": {
            "industry": snapshot.industries, "country": snapshot.countries,
            "enterprise": snapshot.enterprise_profiles, "learning": snapshot.learning_rules,
            "templates": snapshot.templates, "output_rules": snapshot.output_rules,
        }}

    def translation_context(self, industry: str = "automation", country: str = "vietnam", enterprise: str = "default") -> dict[str, Any]:
        snap = self.snapshot
        pick=lambda rows,key: next((x for x in rows if str(x.get("id","")).lower()==key.lower()), None)
        return {"industry": pick(snap.industries,industry), "country": pick(snap.countries,country), "enterprise": pick(snap.enterprise_profiles,enterprise), "delivery_standard": "Enterprise Delivery Standard"}

@lru_cache(maxsize=1)
def get_knowledge_center() -> KnowledgeCenterManager:
    return KnowledgeCenterManager()
