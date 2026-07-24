# Auth: registration — spec

## Goal

Let a new user create an account in the app instead of by hand. `POST /v1/auth/register` returns
an access token and sets the refresh cookie, so a successful registration signs the user straight
in — no separate login step.

This is the sibling of the login slice and follows its shape exactly. Reuse the established
patterns; do not invent new ones.

## Boundary

**Everything this slice needs is inside this repository.** Do not read, search, or navigate to any
other repository, do not start any service, and do not perform real network I/O. The auth contract
is `doc/auth-openapi.json`. Live verification is the human's; your gate is build, lint, and the
test suite against stubbed clients.

## In scope

### `src/composables/useAuth.ts` — add `register`

- `register(email: string, password: string): Promise<boolean>` — `POST /v1/auth/register`. On
  success (`201`) call `setAccessToken(data.accessToken)` and return `true`; on failure set a
  user-facing error and return `false`.
- Reuses the existing `submitting` / `submitError` state and the established
  HTTP-failure + thrown-failure handling. Do not add parallel state.
- **Error copy — distinct per status**, because here the user can act on the difference:
    - `409` → the email is already registered. Say so plainly, and point at signing in instead.
    - `400` → the submitted values were rejected. A general message is fine; do not attempt to map
      `ProblemDetail` to individual fields.
    - Thrown → the network message established in the login slice ("couldn't reach the server"),
      never conflated with a credentials or validation message.

**Note the deliberate asymmetry with login.** Login says only "email or password is incorrect" —
it must not reveal whether an account exists. Registration cannot avoid revealing it: refusing a
taken email *is* the answer. Different screens, different obligations; this is not an
inconsistency to "fix".

### `src/views/RegisterView.vue`

- Route `/register`, public. Follows `LoginView`'s structure and the current design language —
  italic Bodoni title, mono eyebrow labels, the standard input treatment, a bordered submit.
- Fields:
    - **Email** — required, `type="email"`.
    - **Password** — required, `type="password"`, 8–64 characters. No composition rules (no forced
      symbols or uppercase) — the service imposes none and neither may the UI.
    - **Confirm password** — required, `type="password"`, must match. **Client-side only; never
      sent.** It exists because there is no password recovery: a typo here would lock the user out
      of a brand-new account permanently.
- Validation follows `CardForm`'s pattern: all messages cleared at the top of each submit,
  per-field messages under their fields, form-level `submitError` above the submit action, submit
  disabled while `submitting`, no request while invalid.
- On success, navigate to `/session`.
- A link to `/login` ("Already have an account?").

### `src/views/LoginView.vue`

- Add the reciprocal link to `/register`. The route now exists, so the link the login slice
  deliberately omitted can land.
- No other change.

### Routing

- Add `/register` → `RegisterView` (public), before the catch-all.
- The guard treats it exactly like `/login`: an **authenticated** user visiting `/register` is
  redirected to `/session`.

### Docs

- `PROJECT.md`: registration is no longer deferred — move it out of the deferred list and into
  what exists.
- `ARCHITECTURE.md`: add `/register` to the routes.
- `AGENTS.md`: no change.

## Out of scope

- No email verification, no password reset, no "resend confirmation".
- No password-strength meter, no composition rules, no show/hide toggle.
- No terms-of-service checkbox, no marketing consent.
- No CAPTCHA, no rate-limit UI.
- No social or OAuth sign-up.
- No profile fields at registration — nickname comes later, on the profile screen.
- No changes to the session module, `refresh.ts`, the API clients, or the retry middleware.
- No token persistence; the rules from the login slice stand unchanged.
- No new dependencies.
- **No shared form-field component.** The label + input + message trio now appears in `CardForm`,
  `LoginView`, and `RegisterView`, which is arguably the moment to extract one — but doing it here
  would drag `CardForm` into a registration slice. Note it; do not act on it now.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. Existing tests pass with their intent intact.
3. Registering with a fresh email lands the user in the app **already signed in** — no separate
   login step — and the session, cards, creation, editing, and deletion all work. (Manual check.)
4. Registering with an email that already exists shows a message saying so, and the user stays on
   the form with their input intact.
5. A mismatched confirmation blocks submission and sends **no** request.
6. A password shorter than 8 or longer than 64 characters blocks submission and sends no request.
7. The confirmation value is never included in the request body. (Test.)
8. After registering, reloading the page keeps the user signed in — the refresh cookie set at
   registration works exactly as the one set at login. (Manual check.)
9. `/login` and `/register` link to each other, and both links resolve.
10. An authenticated user visiting `/register` is redirected to `/session`.
11. `grep` for `localStorage` and `sessionStorage` still returns nothing.
12. `PROJECT.md` and `ARCHITECTURE.md` are updated in this same commit.

## Tests

- **`useAuth.register`** (stub auth client): success sets the token and returns `true`; a `409`
  returns `false` with a message that mentions the email being taken; a `400` returns `false` with
  a validation message; a thrown error returns `false` with the network message; the session stays
  anonymous on every failure.
- **`RegisterView`**: a mismatched confirmation blocks the request; a short password blocks the
  request; a valid submit calls `register` with **email and password only** — assert the
  confirmation is absent from the arguments; a successful submit navigates to `/session`; a failed
  submit stays, shows the error, and leaves the entered values in the fields; fixing an invalid
  field and resubmitting clears the stale message.
- **Guard**: an authenticated visit to `/register` redirects; an anonymous visit renders it.
- Session module state is reset between tests, as established.

## Notes

- Suggested order: `useAuth.register` + tests → `RegisterView` + tests → route + guard → the login
  link → docs. Type-check after each.
- The confirmation field is presentation-layer only. If it appears anywhere near the composable or
  the request body, something has leaked.
- Follow `AGENTS.md`. Branch `feat/auth-register`, one commit, Conventional Commits, do not push.
  Check `git status` before committing.