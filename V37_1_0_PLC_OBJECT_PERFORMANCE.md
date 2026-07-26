# V37.1.0 PLC Object & Performance Sprint

- Added deterministic PLC object recognition for CY/SE/BL/SC/DS/AX style labels.
- Added high-confidence Vietnamese templates for fixture blockers, lifters, scanners, displacement sensors and position states.
- Reduced unnecessary AI requests by resolving common PLC/HMI labels before provider calls.
- Increased adaptive batch size for short automation labels while retaining conservative limits for long prose.
- Added per-batch runtime statistics: memory hits, rule hits, AI items, elapsed time and request totals.
- Bumped translation cache namespace so earlier inconsistent AI wording is not reused.
