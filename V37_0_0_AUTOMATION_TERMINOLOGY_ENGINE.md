# V37.0.0 Automation Terminology Engine

- Added a deterministic Chinese-to-Vietnamese PLC/HMI terminology layer before AI translation.
- Standardized fixture, gripper, cylinder, vacuum, sensor, conveyor, scanner, safety-door, pressure and displacement terminology.
- Added stable templates for fixture feeding/discharge stops, lift positions, inspection gripper positions and safety-door states.
- Preserved PLC addresses exactly once while translating the human-readable label.
- Bumped the translation-memory namespace so inconsistent V36 AI wording is not reused.
- Unknown prose still falls back to the configured AI provider.
