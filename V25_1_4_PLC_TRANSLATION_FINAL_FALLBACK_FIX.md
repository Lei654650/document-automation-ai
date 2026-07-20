# V25.1.4 PLC Translation Final Fallback Fix

- Adds a deterministic Vietnamese engineering fallback for short PLC/HMI labels after AI retries fail.
- Covers safety, pneumatic, material handling, cylinder positions, sensors, axes, alarms and operator prompts.
- Normalizes the legacy typo `载右具` to `载具右`.
- Keeps strict quality inspection: unresolved effective Chinese still blocks delivery.
- Prevents a small number of provider source-text echoes from causing complete order failure.
