# V31.3.0 Enterprise Quality Repair

- Existing valid translations are preserved and are not retranslated.
- Review placeholders such as `Cần xác nhận bản dịch`, `待确认翻译`, and `Translation pending` are treated as unresolved content.
- Translation QA repairs only unresolved cells in up to three bounded rounds.
- Real-time progress reports show detected items and repair counts for every round.
- Deterministic automation terminology fallback remains the final repair layer.
- Delivery is allowed only after the pending-marker count reaches zero.
