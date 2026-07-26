# V32.0.0 Auto Self-Healing & Capability Manager

## Completed

1. Excel processing now automatically detects original files versus previously translated bilingual files.
2. Previously confirmed translations are preserved; only pending or untranslated cells enter the repair pipeline.
3. The processing log explicitly reports the automatically selected mode. No customer mode switch is required.
4. The main Capability Center now shows only production-ready functions.
5. Planned functions are removed from the main operation area and replaced with a compact roadmap note.
6. Capability rendering uses the actual enabled service registry, so every visible action is usable.

## Verification

- Python compile: passed.
- V32 automatic mode tests: passed.
- V31.3 translation QA regression: passed.
- V31.2 quality guard regression: passed.
- Excel enterprise translation regression: passed.
- App.jsx Babel JSX parse: passed.
- Full Vite build could not run in Linux because the uploaded Windows dependency bundle does not contain `@rolldown/binding-linux-x64-gnu`.
