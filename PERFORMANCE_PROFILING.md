## Enabling Profiling
1. Open **Configure Settings → Module Settings → Blades in the Dark Alternate Sheets**.
2. Enable **“Enable performance profiling logs”** (client-side; defaults to off).
3. Open the browser console and filter for `bitd-alt-profiler`.

## What Gets Logged
Logs are emitted as `"[bitd-alt-profiler]" <label> <json>` with a timestamp.

- `clockIncrement` / `clockDecrement` — clock image clicks (uuid, parentId, targetValue, duration).
- `abilityToggle` — ability “tooth bar” toggles (actorId, abilityId/name, targetProgress, duration).
- `crewUpgradeToggle` — crew upgrade checkboxes (actorId, source/owned ids, targetValue, duration).

## Notes
- Profiling adds minimal overhead when enabled; it is a no-op when disabled.
- Document updates and renders still occur; logging is informational only.
