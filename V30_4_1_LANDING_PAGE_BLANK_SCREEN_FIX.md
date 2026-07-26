# V30.4.1 Landing Page Blank Screen Fix

## Root cause
The V30.4 workflow section rendered an `Upload` Lucide component that was not imported. This raised a browser-side `ReferenceError` during the initial Home component render and left the page blank.

## Fix
- Replaced the unresolved `Upload` component with the already imported `CloudUpload` component.
- Updated frontend and project version metadata to 30.4.1.
- Preserved the V30.4 enterprise landing-page layout and existing registration, payment and processing logic.
