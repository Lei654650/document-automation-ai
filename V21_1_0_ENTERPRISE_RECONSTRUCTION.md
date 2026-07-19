# V21.1.0 AI Enterprise Document Reconstruction

- Detects PLC/HMI configuration matrices before translation.
- Rebuilds the matrix into six readable business sheets: overview, PLC inputs, equipment list, cylinder IO, station structure, and operation tips.
- Removes meaningless reserve slots and spreadsheet error placeholders from the customer-facing workbook.
- Keeps codes and addresses as structured columns so bilingual translation only targets natural-language fields.
- Falls back to the existing safe layout engine for unsupported workbook types.
