# V35.3.0 XLSX Package Stability Fix

## Scope

This release only fixes the confirmed Excel post-processing failure and the resulting task that appeared stuck in processing.

## Root cause

The previous pipeline wrote the final XLSX directly while later performing a second full-package placeholder rewrite. On Windows, Explorer preview/antivirus locks could hold the output file for several minutes. The second rewrite could then leave the package without `xl/sharedStrings.xml`, after which the worker failed while the UI continued to show the earlier processing state until the batch finished.

## Fixes

- Added a single-pass XLSX package publisher.
- Every source OOXML part is copied and validated in a unique staging package before publication.
- `sharedStrings.xml` and all source package parts are verified before the result becomes visible.
- Placeholder normalization now happens during the same primary package write.
- Removed the second full XLSX placeholder-repair rewrite from the normal translation path.
- Prevented source and destination from ever being the same file.
- Locked output files fail quickly with a clear customer message instead of waiting for minutes.
- Existing terminal worker failure propagation remains intact; once workers return, the job is marked failed/partial/completed rather than remaining processing.

## Verification

- Backend Python compilation passed.
- 14 focused regression tests passed.
- The 8 ORCHID customer Excel samples were processed with a deterministic test translator.
- Total local package-processing time was approximately 4.2 seconds for 8 files.
- Every generated XLSX retained all source package entries.
- `sharedStrings.xml` remained present in all 8 outputs.
- `ZipFile.testzip()` returned no damaged entries.
