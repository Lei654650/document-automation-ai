# V34.4.0 Quality Delivery Policy

- Remaining untranslated or review-required PLC/HMI terms no longer make an otherwise valid Excel file fail.
- Such items are preserved in the generated workbook and surfaced as quality-review warnings.
- Files that can be generated and opened continue to delivery.
- Structural failures such as corrupted output, export errors, or unreadable files still fail and remain isolated.
- Added regression tests to prevent the old all-or-nothing quality gate from returning.
