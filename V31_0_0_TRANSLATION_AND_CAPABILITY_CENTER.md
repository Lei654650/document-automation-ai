# V31.0.0

## Customer-critical translation fixes
- Protect PLC/HMI placeholders such as `%(WATCH1)d`, `%d`, `{0}`, `${value}` and PLC addresses before AI translation.
- Restore protected tokens byte-for-byte and reject any result whose token count/order changes.
- Reject `Cần xác nhận bản dịch` / pending-review placeholders from translation results.
- Add high-confidence Chinese-to-Vietnamese automation terminology for the customer-reported alarms and carrier feed/discharge delays.
- Strengthen the batch prompt for industrial automation terminology and immutable tokens.

## Processing workspace redesign
- Replace the five-card capability list with a six-domain AI Capability Center.
- Domains: Document Processing, AI Content, Data Intelligence, Industry Intelligence, Enterprise Automation and AI Knowledge Center.
- Existing production capabilities remain selectable; planned capabilities are clearly marked and disabled rather than pretending to work.
- Add an AI-recommended-plan summary and responsive two-column layout.

## Verification
- Python compilation passed.
- Translation placeholder/glossary safeguards passed.
- Existing Excel translation/QC regression suite: 5 passed, 2 skipped.
- JSX source was updated, but Linux frontend build could not be rerun because the supplied node_modules contains Windows native bindings and package installation is unavailable in this environment. The Windows first-run setup will install the correct dependencies.
