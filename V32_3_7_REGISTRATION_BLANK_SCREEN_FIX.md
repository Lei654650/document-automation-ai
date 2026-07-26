# V32.3.7 Registration Blank Screen Fix

- Fixed the registration and login page runtime crash caused by a missing React `useRef` import.
- Google authentication remains optional; when it is not configured, email registration continues to render normally.
- No startup scripts, runtime paths, or unrelated modules were changed.
