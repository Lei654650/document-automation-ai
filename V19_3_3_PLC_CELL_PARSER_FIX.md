# V19.3.3 PLC Cell Parser Fix

- PLC/HMI address, Chinese description and translation are written on separate lines.
- Internal `|` delimiters are removed from customer output.
- Plain labels remain `中文 —— 越语`.
- Multiline cells receive wrap-text styles and readable row heights directly in OOXML.
- Existing glued bilingual output is repaired instead of translated again.
