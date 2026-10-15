# OTP auth, profile editing and Google account linking

Date: 2026-10-14. Status: approved in chat (sections 1 and 2), implementation in progress.

## Goal

Users activate their account, reset their password and change their email by typing a 6-digit code sent by email (Resend), never by clicking a link. Users can edit their name, avatar, email and password from Settings. Password fields have a show/hide toggle. Google login is enabled and lands in the same account as an email account with the same verified address.

There are no real users yet, so link-based activation and reset are removed outright (no transition period).

## Decisions

| Topic | Decision |
|---|---|
| Email content | Code only, no link |
| Code storage | Redis, hashed (sha256 with JWT_SECRET as pepper), TTL 10 minutes, max 5 wrong attempts, single use |
| Resend limit | 60 s cooldown and 5 sends per hour per purpose and subject |
| IP rate limit | `ThrottlerRealIpGuard` on login, register, forgot, forgot-return, activate, resend-activation |
| Google + email account, same address | Same account. Linking only when the provider reports the email as verified and the local account is activated |
| Link storage | Local user's `providerId` = `GOOGLE:<google id>` (column is unused for local users). No schema change |
| Profile | Name, avatar, email change (password + OTP to old and new address), change password; "create password" for accounts without one |

## Backend

### OtpService (`libraries/nestjs-libraries/src/services/otp.service.ts`)

- `send(purpose, subject, to, payload?)`: enforces cooldown and hourly limit, stores `{hash, attempts, payload}` under `otp:<purpose>:<subject>` with TTL, sends the email through `EmailService.sendEmailSync`.
- `verify(purpose, subject, code)`: returns the stored payload on success and deletes the key; on a wrong code increments `attempts` and deletes the key after 5; returns `false` when missing or wrong.
- Purposes: `activate`, `reset`, `email-old`, `email-new`. Subject is the lowercased email for `activate` and `reset`, the user id for the email change pair.
- Errors are thrown as `Error` with stable messages (`otp_cooldown`, `otp_limit`) that the controllers translate to 429.

### Auth (`apps/backend/src/services/auth/auth.service.ts`, `auth.controller.ts`)

- Register (LOCAL, email provider on): creates the user as before, sends an `activate` code, responds with header `activate: true`.
- `POST /auth/activate {email, code}`: verifies, activates, sets the auth cookie, header `onboarding`. Wrong code → `{can:false}`.
- `POST /auth/resend-activation {email}`: sends a new code (silent success when the user does not exist or is already active, to avoid account enumeration).
- `POST /auth/forgot {email}`: sends a `reset` code to LOCAL users; always `{forgot:true}`.
- `POST /auth/forgot-return {email, code, password, repeatPassword}`: verifies, updates the password. `{reset:boolean}`.
- Removed: JWT-in-link activation and reset (closes "any login JWT resets a password" and "activation link is a permanent login token").
- Google login (`checkExists`, `loginOrRegisterProvider`): GOOGLE user by provider id → LOCAL user linked by `providerId` → activated LOCAL user with the same email when the provider says the email is verified (link it) → create a new user.
- `AuthProviderAbstract.getUser` may return `emailVerified`; Google returns `verified_email`.

### User (`apps/backend/src/api/routes/users.controller.ts` → `UsersService` → `UsersRepository`)

- `GET /user/personal` additionally returns `email` and `hasPassword`.
- `POST /user/password {currentPassword?, password, repeatPassword}`: requires the current password when one exists. A GOOGLE user without a local twin becomes LOCAL with `providerId = GOOGLE:<id>`, so password login works and Google login still lands in the same account.
- `POST /user/email/start {email, password?}`: checks the password (when the account has one), rejects an address used by any account, sends `email-old` to the current address and `email-new` (payload: new email) to the new address.
- `POST /user/email/confirm {oldCode, newCode}`: verifies both, re-checks availability, updates the email, notifies both addresses.
- `POST /user/email/resend`: resends both codes of the pending change.
- Writes on `User` use `select: { id: true }`.

## Frontend

- `libraries/react-shared-libraries/src/form/input.tsx`: `type="password"` renders an eye toggle button (aria-label translated).
- `OtpInput` (6 boxes, paste, auto-advance) in `apps/frontend/src/components/auth/otp.input.tsx`.
- `/auth/activate?email=`: email + code form, resend with countdown. `/auth/activate/[code]` removed.
- `/auth/forgot`: step 1 email, step 2 code + new password + repeat. `/auth/forgot/[token]` removed.
- Login: "not activated" links to `/auth/activate?email=`. Google button restored on login and register.
- Settings: new first tab "Profil" with name + avatar, email change (modal with two code inputs), password change.
- All new strings in `locales/id` and `locales/en`.

## Error handling

- Wrong or expired code: inline error under the code input, input cleared.
- Too many attempts: "Kode sudah tidak berlaku, minta kode baru".
- Cooldown / hourly limit: HTTP 429 with seconds left; the resend button shows the countdown.
- Email already used: inline error on the new-email field.

## Testing

- Manual end-to-end on the local tunnel (`postiz.creativism.id`) with Resend: register → code → login; forgot → code → login with new password; profile: name, avatar, password, email change with both codes; Google login with an activated email account of the same address lands in that account.
- Negative: wrong code 5 times, resend within 60 s, email already used, wrong current password.
