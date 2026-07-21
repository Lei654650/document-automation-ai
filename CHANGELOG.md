# V30.2.0

- 完成 PayPal 网站收款链路与服务端校验。
- 增加支付中心状态和 PayPal 连接测试。
- 增加主/备用 AI Provider、自动故障切换与分阶段路由。
- 增加 Provider 调用统计和团队权限基础接口。

# V30.1.2

- Fixed blank screen when opening the document processing order page.
- Passed the authenticated `currentUser` into `OrderCenter`.
- Added a page-level React error boundary so runtime rendering errors no longer produce a full blank page.
- Added safe unauthenticated fallback behavior for account-bound order fields.

# V29.0.0

- Header navigation rebuilt and account menu unified.
- Customer navigation no longer exposes enterprise acceptance.
- Plan comparison status icons and Enterprise value presentation redesigned.
- Chinese-English/Chinese-Vietnamese document overview templates now follow the selected bilingual language.

# V16.0.0

- Connected selected output formats to the backend conversion engine.
- Added multi-output delivery for PPTX/PDF/DOCX and other supported conversions.
- Added download completion dialog with filename, browser Downloads guidance, retry and output-folder actions.
- Added conversion records to processing manifests and V16 integration acceptance coverage.

# V14.0.1

- Rebuilt the Windows OCR installer as an ASCII CRLF batch wrapper plus a PowerShell setup script.
- The installer now checks Python, installs pytesseract/Pillow, installs or locates Tesseract, writes TESSERACT_CMD, runs a self-test, and always keeps the window open.
- Prevents the corrupted BAT parsing issue that produced commands such as `R` and `ept-package-agreements`.

## 14.0.0

- Fixed image/JPG/PNG OCR jobs generating empty DOCX files.
- Added Tesseract OCR extraction with multilingual fallbacks and image preprocessing.
- Added scanned PDF OCR using PyMuPDF page rendering.
- OCR deliveries now preserve the source image and include recognized/translated text.
- Empty OCR results are blocked by quality validation instead of being delivered as successful files.
- Added V14 regression tests for invoice images and equipment nameplates.

# V13.0.0

- Added bounded parallel processing for multi-file orders (`BATCH_MAX_WORKERS`, default 3).
- Added aggregate token and estimated cost reporting for batch translation.
- Added V13 enterprise acceptance library covering PDF, scanned invoices, Excel formulas, PowerPoint, images, contracts, industrial files and mixed ZIP batches.
- Kept single-file processing and DOCX fidelity checks compatible with V12.0.8.

## 12.0.7

- Upgraded the Delivery Center for direct downloads, ZIP delivery packages, metadata and local folder access.
- Improved DOCX translation coverage for text inside hyperlinks, tables, content controls and text boxes.
- Preserved surrounding Word XML structures while replacing translated text.
- Added translation coverage and source/output text-block validation before delivery.
- Expanded complex DOCX regression tests.

## 12.0.6

- Fixed local administrator settings returning `401 Unauthorized` after project replacement.
- Kept cloud administrator password protection while allowing localhost desktop administration.
- Strengthened DOCX CJK font handling for Word and WPS by removing theme font overrides.
- Rejected translations containing replacement glyphs such as `□` or `�`.
- Verified delivery downloads, ZIP packages, and Windows folder opening routes.

## 12.0.5

- Added Delivery Center file cards with file type, size and generation time.
- Added direct per-file download and download-all ZIP delivery package.
- Added local Windows “Open folder” action with localhost-only protection.
- Fixed CJK DOCX output fonts to prevent square glyphs in Word/WPS.
- Added post-generation DOCX validation for replacement or square characters.

## 12.0.4

- Persist AI provider settings, orders and outputs in the Windows LocalAppData folder so upgrades no longer erase API keys.
- Migrate legacy translation settings automatically on first start.
- Fix waiting-for-configuration jobs incorrectly showing every task step as completed.
- Keep untranslated delivery jobs pending until an AI provider is configured.

# Changelog

## 12.0.1
- Fixed version display across frontend and backend.
- Fixed target-language payload used by the real translation engine.
- Added administrator UI for configuring and testing DeepSeek, OpenAI, Gemini, or Claude translation.
- Extended DOCX translation to tables, nested tables, headers, and footers.
- Completed core Document Analyzer internationalization for Chinese, English, and Vietnamese.

# Changelog

## 12.0.0
- Added persistent Task Engine steps and per-stage statuses.
- Added user-facing task workflow timeline.
- Added quality validation stage before export.
- Updated live progress events and release version.

## 11.2.0
- Added visible Document Analyzer results to live order status.
- Added per-file metadata, scan warnings, detected language and recommended workflow.
- Added responsive analyzer UI and risk display.


## 11.0.1
- Added Chinese, English and Vietnamese interface switching with browser persistence.
- Replaced simulated billing, team and API data with clear “coming soon” states.
- Enterprise workspace now displays only real backend orders.
- Added docs, scripts, samples, release, tests and structured frontend directories.
- Added clean Windows delivery packaging and environment bootstrap rules.
- Removed local virtual environments, node_modules, logs, test database, Git metadata and secret environment files from delivery.


## V11.0.1
- Rebuilt the three-language interface selector and removed hard-coded mixed-language labels.

## 12.0.3
- Added independent AI provider profiles for DeepSeek, OpenAI, Google Gemini, Anthropic Claude, and OpenRouter.
- Added provider-specific model lists and automatic model switching.
- Preserved each provider API key independently when switching providers.
- Added masked configured-state indicators and provider-specific connection testing.

## 12.0.3
- Strengthened real DOCX AI translation delivery.
- Output filenames now include the target language code.
- DOCX paragraphs, tables, nested tables, headers, and footers remain in the original package.
- Added generated DOCX reopen validation before delivery.
- Added translation and validation metadata to processing results.

## 13.0.0

- Fixed false DOCX fidelity failures caused by unstable XML element object-id de-duplication.
- DOCX paragraph identity now uses OOXML part name plus absolute XPath.
- Prevented blank AI responses from deleting visible source text.
- Added regression tests for linked headers, repeated text and blank provider responses.
- Added 12 enterprise acceptance DOCX fixtures and a formatted acceptance checklist workbook.

## 14.0.2
- Fixed Windows OCR installer failure caused by backslash regex replacement.
- Added literal `.env` update logic without regular expressions.
- Stores `TESSERACT_CMD` with forward slashes for Windows/Python compatibility.
- Added backend OCR capability self-test after installation.
- Keeps installer window open and reports precise failures.

## 15.1.0

- Rebuilt image OCR Word export as an editable single-flow document.
- Added invoice-aware reconstruction with a real editable line-item table.
- Removed the empty `OCR Document` cover and the forced three-page output.
- Moved original scans to an evidence appendix after editable content.
- Added OCR language reporting and output-template metadata.
- Added V15 OCR regression tests and acceptance samples.

## 15.2.0
- Added Smart Engine 2.0 file-type recommendations in the processing center.
- Automatically enables OCR for images, PDFs and ZIP projects while retaining original output formats unless conversion is selected.
- Added safe enterprise ZIP extraction with nested ZIP support, path traversal protection, file count limits and directory preservation.
- Added a 54-file enterprise acceptance suite covering Word, PDF, Excel, PPT, images, scanned PDFs, CSV and ZIP projects.
- Updated version and packaged frontend assets.

## 16.0.1 Acceptance Fix
- Fixed PPT multi-format output so selected PPTX/PDF/DOCX files are all generated.
- Added Microsoft PowerPoint/LibreOffice/PyMuPDF conversion fallback chain.
- Conversion failures now fail the job explicitly instead of silently returning only the original file.
- Fixed total processing duration display using wall-clock fallback.
- Uploading files no longer automatically selects document translation.
- Delivery ZIP uses the browser File System Access save dialog when supported, allowing the user to choose the save path.

## V16.3.0 Stable
- Fixed batch jobs remaining at 30% during Office conversion.
- Added explicit format-conversion stage and synchronized progress/events.
- Added bounded Office conversion timeout and serialized Office automation.
- Added portable DOCX/XLSX to PDF fallbacks.
- Added DOCX to XLSX and DOCX to PPTX conversions.
- Fixed total-duration calculation to use real wall-clock processing time.
- Updated frontend/backend version display to 16.3.0.

## V16.3.0 Acceptance Optimization
- Added paginated/searchable delivery results with success/failure tabs.
- Collapsed large analysis lists and preserved uploaded-file count on status pages.
- Corrected browser save-location messaging.
- Auto-enables OCR only for images and clearly identified scanned PDFs.
- Corrected PDF keep-original behavior and bilingual translation instructions.

## V16.3.1 Dashboard Order List Optimization
- Dashboard shows only the latest five real orders by default.
- Added View All / Collapse, search, order count, and pagination.
- Standardized Chinese status labels and capability badges.
- Added filename truncation with full-name tooltip.
- Completed orders no longer show redundant 100% text.

## V17.0.0 Enterprise Test Suite
- Added a real `Enterprise_Test_Suite` with 47 complex fixtures covering Word, Excel, PPT, PDF, scanned PDF, OCR images, CSV, nested ZIP and damaged files.
- Added 49/100/300 regression manifests and runtime long-path generation to avoid Windows extraction failures.
- Standard processing can create an order without manually selecting an AI capability.
- Added sticky processing settings and a bounded, independently scrollable upload queue for large batches.
- Updated frontend/backend version metadata to 17.0.0.

## 17.1.0 - Stability
- Enabled SQLite WAL mode, 30-second busy timeout, and bounded write retries.
- Added startup retry for transient SQLite locks.
- Moved large-file saving and document analysis outside database write transactions.
- Added a three-minute frontend upload timeout with a recoverable error message.
- Kept standard processing available when no optional capability is selected.

## V30.3.0
- Fixed PayPal return routing and automatic server-side Capture.
- PayPal return now resolves the local order from the PayPal order token even when a custom return URL omits payment metadata.
- Added explicit payment-success confirmation with plan, credits, and payment number.
- Preserved idempotent crediting and license issuance on repeated callbacks.
