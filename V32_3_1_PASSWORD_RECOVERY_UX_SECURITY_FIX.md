# V32.3.1 Password Recovery UX & Security Fix

- Production domains never display or auto-fill reset codes.
- Local development code is shown only when Vite DEV mode is active on localhost/127.0.0.1.
- Added 60-second resend countdown and resend action.
- Added password visibility controls for both new-password fields.
- Added strong-password requirements and live strength feedback.
- Disabled reset submission until email, code, password strength and confirmation are valid.
- Added loading state, success confirmation and automatic return to sign-in after 3 seconds.
- Unified the account security heading with the active interface language.
