# Profile — spec

## Goal

A screen where the signed-in user can see and edit their profile: a nickname, and nothing else
the service exposes today. `GET /v1/profile` / `PUT /v1/profile`.

This slice also closes a gap deliberately left open in the refresh slice: **the auth client still
has no 401 retry.** The profile is its first token-bearing endpoint, so the retry arrives now.

After this, authentication is complete.

## Boundary

**Everything this slice needs is inside this repository.** Do not read, search, or navigate to any
other repository, do not start any service, and do not perform real network I/O. The auth contract
is `doc/auth-openapi.json`. Live verification is the human's; your gate is build, lint, and the
test suite against stubbed clients.

## In scope

### `src/api/authClient.ts` — 401 retry, with auth paths excluded

The refresh slice applied the retry middleware to the core client only, and recorded why: at that
point the auth client had no endpoint that carried a token, and `/v1/auth/*` responses must never
trigger a refresh.

Now the profile does carry one. Apply the same retry to the auth client, with one hard exclusion:

- **Requests to `/v1/auth/*` are never retried and never trigger a refresh.** A failed login is a
  final answer. A failed refresh is a final answer — and refreshing in response to a failed
  refresh would recurse.
- Everything else on this client (the profile) follows the established rule: `401` →
  `refreshAccessToken()` → retry **once** → never a second time.
- Reuse the existing middleware from `src/auth/refresh.ts` (or the core client's implementation)
  rather than writing a second copy. If that means extracting the shared middleware into a
  factory that takes the exclusion rule, do that — one implementation, two clients.

This is the only change to the auth plumbing. Do not touch the session module, the single-flight
refresh, or the startup restore.

### `src/composables/useProfile.ts`

A new composable — the profile is its own resource, like cards. Mirrors `useCards`'s shape
exactly.

- `useProfile(client: AuthApiClient = defaultAuthClient)` — injected dependency.
- State: `profile` (`ProfileResponseDto | null`), `status`
  (`'idle' | 'loading' | 'ready' | 'error'`), `error`, `submitting`, `submitError`, all exposed
  via `readonly()`.
- `load()` — `GET /v1/profile`. Success → store and `status = 'ready'`. HTTP failure **and** thrown
  failure → `status = 'error'` with a user-facing message.
- `save(nickname: string): Promise<boolean>` — `PUT /v1/profile`. Success → store the returned
  profile and return `true`. HTTP failure (including `400`) or thrown → `submitError` set, return
  `false`. Clear `submitting` in `finally`.
- Types come from `src/api/authSchema.d.ts`. No hand-written shapes.

### `src/views/ProfileView.vue`

- Route `/profile`, **protected** (`meta: { requiresAuth: true }`), like the rest of the app.
- Owns `useProfile()`; calls `load()` on mount.
- Renders by `status`: `idle`/`loading` → the loading treatment; `error` → message plus a Retry
  calling `load()`; `ready` → the form.
- The form, in the current design language (italic Bodoni title, mono eyebrow label, the standard
  input treatment, a bordered submit):
    - **Nickname** — a single text field, 1–50 characters after trimming. `nickname` may arrive as
      `null`; that renders as an empty field, which is a normal starting state and not an error.
    - Validation follows the established pattern: messages cleared at the top of each submit, the
      message under the field, `submitError` above the submit action, submit disabled while
      `submitting`, no request while invalid.
    - On success, **stay on the page** and show a brief confirmation. This is a settings screen, not
      a create-then-leave flow; navigating away after saving would be disorienting.
- Nothing else on the screen. The service exposes `userId` and `nickname`; `userId` is plumbing,
  not information the user needs. **Do not display the email** — the profile endpoint does not
  return it, and it must not be reconstructed by decoding the JWT.

### Navigation

- Add a `PROFILE` link to the nav, in the existing treatment, alongside `REVIEW`, `CARDS`, and
  `SIGN OUT`.

### Docs

- `PROJECT.md`: the profile screen exists; move it out of any deferred list.
- `ARCHITECTURE.md`: add `/profile` to the routes and `useProfile.ts` to the structure tree; update
  the Authentication section to record that the auth client now carries the retry with `/v1/auth/*`
  excluded, and why.
- `AGENTS.md`: no change.

## Out of scope

- **No nickname display outside this screen.** The nickname currently has no consumer — it is
  inert groundwork, like `visibility` on cards. Surfacing it in the nav or on the session screen is
  a product decision to be made deliberately, not smuggled in here.
- No avatar, no image upload, no file handling of any kind.
- No email display or email change — the contract offers neither.
- No password change, no account deletion, no data export — no endpoints exist for them.
- No uniqueness check on the nickname and no handling for a `409`: nicknames are **not unique** and
  the service will not reject a duplicate.
- No settings beyond the nickname.
- No changes to the session module, `refresh.ts`'s single-flight logic, the startup restore, the
  core client, or any existing view other than the nav.
- No new dependencies, no shared form-field component (still noted, still not now).
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. Existing tests pass with their intent intact.
3. `/profile` shows the current nickname, and saving a new one persists it across a reload.
   (Manual check.)
4. A user whose nickname is `null` sees an empty field and no error, and can save one.
5. A nickname that is empty or whitespace-only, or longer than 50 characters, blocks submission and
   sends **no** request.
6. `/profile` while signed out redirects to `/login`, like every other protected route.
7. **After the access token expires, opening `/profile` still works** — the request 401s, refresh
   runs, the request is retried, and the user sees their profile. (Manual check — the reason the
   retry was added here.)
8. **A failed login still shows the credentials error and does not trigger a refresh.** The
   `/v1/auth/*` exclusion holds. (Test.)
9. A `401` from refresh itself is not retried and does not recurse. (Test.)
10. `grep` for `localStorage` and `sessionStorage` still returns nothing.
11. No JWT decoding anywhere. (`grep` — no `atob`, no `jwt`-decoding helper.)
12. `PROJECT.md` and `ARCHITECTURE.md` are updated in this same commit.

## Tests

- **`useProfile`** (stub auth client), mirroring `useCards`'s tests: `load` success → `ready` with
  the profile; `load` HTTP failure → `error`; `load` rejected → `error`, not stuck on `loading`;
  `save` success → returns `true`, stores the returned profile, `submitting` false after; `save`
  HTTP failure and `save` rejected → return `false` with `submitError` set.
- **`ProfileView`**: a `null` nickname renders an empty field with no error; an empty or
  whitespace-only value blocks the request; an over-length value blocks the request; a valid save
  calls `save` with the **trimmed** value and shows the confirmation without navigating; a failed
  save shows the error and keeps the entered value.
- **Auth-client retry:** a `401` on `/v1/profile` triggers exactly one refresh and one retry; a
  `401` on `/v1/auth/login` triggers **no** refresh and no retry; a `401` on `/v1/auth/refresh`
  triggers no further refresh. These three together are what criterion 8 and 9 rest on.
- **Guard**: an anonymous visit to `/profile` redirects to `/login`.
- Session module state reset between tests, as established.

## Notes

- Suggested order: the auth-client retry + its exclusion tests (**get the `/v1/auth/*` exclusion
  right before anything depends on it** — a refresh loop here is the same class of failure as the
  concurrent-refresh bug) → `useProfile` + tests → `ProfileView` + tests → route + nav → docs.
  Type-check after each.
- If extracting the shared retry middleware into a factory touches the core client, that is
  expected and in scope — but its behaviour must not change. The core client's existing tests are
  the guard.
- Follow `AGENTS.md`. Branch `feat/profile`, one commit, Conventional Commits, do not push. Check
  `git status` before committing.