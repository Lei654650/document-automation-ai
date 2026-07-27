from __future__ import annotations

import ipaddress
import re
from dataclasses import dataclass
from typing import Iterable

from fastapi import Request

from .config import CONFIG

_BOT_RE = re.compile(
    r"(?:sqlmap|nikto|nmap|masscan|acunetix|nessus|wpscan|dirbuster|gobuster|"
    r"zgrab|zmap|python-requests|python-urllib|libwww-perl|curl/|wget/|scrapy|"
    r"httpclient|headlesschrome|phantomjs)",
    re.IGNORECASE,
)


def _parse_networks(values: Iterable[str]) -> tuple[ipaddress._BaseNetwork, ...]:
    result = []
    for raw in values:
        value = raw.strip()
        if not value:
            continue
        try:
            if "/" not in value:
                addr = ipaddress.ip_address(value)
                value = f"{value}/{32 if addr.version == 4 else 128}"
            result.append(ipaddress.ip_network(value, strict=False))
        except ValueError:
            continue
    return tuple(result)


@dataclass(frozen=True)
class EdgeDecision:
    allowed: bool
    reason: str = ""
    country: str = ""


class EdgeGuard:
    def __init__(self, config=CONFIG) -> None:
        self.config = config
        self.blocked_networks = _parse_networks(config.blocked_ip_cidrs)
        self.allowed_networks = _parse_networks(config.allowed_ip_cidrs)

    @staticmethod
    def _ip_in(ip: str, networks: tuple[ipaddress._BaseNetwork, ...]) -> bool:
        try:
            address = ipaddress.ip_address(ip)
        except ValueError:
            return False
        return any(address in network for network in networks)

    def evaluate(self, request: Request, client_ip: str) -> EdgeDecision:
        path = request.url.path
        if path in {"/api/health", "/favicon.ico"}:
            return EdgeDecision(True)

        if self.allowed_networks and not self._ip_in(client_ip, self.allowed_networks):
            return EdgeDecision(False, "ip_not_allowlisted")
        if self._ip_in(client_ip, self.blocked_networks):
            return EdgeDecision(False, "ip_blocklisted")

        cf_ray = request.headers.get("cf-ray", "").strip()
        if self.config.require_cloudflare and not cf_ray:
            return EdgeDecision(False, "cloudflare_required")

        country = request.headers.get("cf-ipcountry", "").strip().upper()
        if country and country not in {"XX", "T1"}:
            if self.config.blocked_countries and country in self.config.blocked_countries:
                return EdgeDecision(False, "country_blocked", country)
            if self.config.allowed_countries and country not in self.config.allowed_countries:
                return EdgeDecision(False, "country_not_allowed", country)

        if self.config.bot_block_enabled:
            user_agent = request.headers.get("user-agent", "").strip()
            if not user_agent and request.method not in {"OPTIONS"}:
                return EdgeDecision(False, "missing_user_agent", country)
            if user_agent and _BOT_RE.search(user_agent):
                return EdgeDecision(False, "known_bad_bot", country)

        return EdgeDecision(True, country=country)


edge_guard = EdgeGuard()
