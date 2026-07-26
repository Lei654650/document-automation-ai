# V35.0.0 WriteBack Engine Rebuild

## Scope
Only the Excel write-back/post-processing performance bottleneck was changed.
No UI, pricing, navigation, account, translation policy, or quality grading layout was modified.

## Root cause confirmed from customer run logs
The actual XML scan, translation-memory/AI stage, and OOXML serialization each completed in under one second. The 196–270 second delay occurred after serialization and before placeholder/layout logging. The old path published every new output through a temporary file followed by `os.replace`, which could block for minutes under Windows antivirus/preview hooks.

## Fixes
- New order outputs are written directly to their unique final path.
- Removed the primary `.writing.tmp -> os.replace` publication step.
- Multiline layout rebuilding now runs only when generated translations contain actual line breaks.
- Inline, columns, and target-only output no longer trigger a whole-workbook layout rewrite.
- Placeholder repair remains incremental and only rebuilds a package when a real corrupted placeholder exists.
- Added regression tests that fail if primary XLSX publication uses the replace helper or inline output invokes multiline layout rebuilding.

## Validation
- Python compile passed.
- 10 related state-machine, quality, delivery-helper, and performance tests passed.
- Real ORCHID customer sample: 8 XLSX files processed with a deterministic test translator in approximately 4.4 seconds total in this environment.
