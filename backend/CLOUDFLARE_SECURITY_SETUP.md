# V41.1 Cloudflare Security Setup

Code-side edge controls are included in `app/security/edge_guard.py`. Cloudflare dashboard controls must still be enabled on the production domain.

## Required production settings

1. Put the production DNS record behind the orange Cloudflare proxy.
2. SSL/TLS: use **Full (strict)** and enable **Always Use HTTPS**.
3. Security > WAF > Managed rules: enable the Cloudflare Managed Ruleset and OWASP Core Ruleset.
4. Security > Bots: enable Bot Fight Mode (or Super Bot Fight Mode if included in the plan).
5. Security > DDoS: keep managed HTTP and network-layer DDoS protection enabled.
6. Security > WAF > Custom rules:
   - Challenge repeated requests to `/api/auth/*`.
   - Challenge or block obvious scanner user agents.
   - Block IP addresses confirmed by audit logs.
   - Add country blocks only when business policy requires them.
7. Create rate-limit rules for `/api/auth/login`, `/api/orders`, upload endpoints, and payment endpoints. Backend rate limiting remains a second layer.
8. Prevent bypass through the default Vercel hostname where possible. Use only the custom production hostname publicly.
9. After confirming that all production traffic passes through Cloudflare, set `SECURITY_REQUIRE_CLOUDFLARE=true` in production. Do not enable it for local development.

## Important limitation

Application code cannot switch on Cloudflare WAF, Bot Fight Mode, or DDoS controls. Those are account-level dashboard settings. This package provides backend enforcement, Cloudflare header integration, IP/CIDR blocking, optional country policy, bot filtering, audit logging, and tests.
