# Document Automation AI V22.0.1 Windows Startup Fix

## Fixed
- Detects the Windows Vite launcher (`frontend\node_modules\.bin\vite.cmd`) instead of only the cross-platform JavaScript file.
- Automatically runs dependency repair when a ZIP contains Linux-generated `node_modules`.
- Removes incompatible bundled frontend dependencies before `npm ci`, ensuring Windows launchers and native packages are installed correctly.
- Updates startup window titles to V22 Enterprise.

## Expected first launch
The first launch may take several minutes while npm and pip dependencies are installed. Later launches start normally.
