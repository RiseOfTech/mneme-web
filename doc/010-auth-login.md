# Auth: login, session state, route guard — spec

## Goal

Replace the dev token with real authentication: a login screen that obtains a JWT from the auth
service, in-memory session state that feeds the existing API middleware, a router guard
protecting the app, and logout.

This is the thinnest slice that is genuinely end to end: sign in → the existing review session
and card management work against the core API with a real token → sign out.

**Refresh is deliberately not in this slice.** The access token lives 15 minutes and dies on page
reload. Until the next slice lands, a reload or an expiry sends the user back to login. That is
expected and honest, not a defect.

## Boundary — read this first

**Everything this slice needs is inside this repository.** Do not read, inspect, clone, search,
or navigate to any other repository, and do not run commands outside this working tree. The
backend services are separate systems with their own repos and their own agents; from here they
exist only as the two contracts committed in `doc/`.

Specifically:

- **Do not verify backend configuration.** CORS, security filters, and service setup are not
  yours to check or fix. If a request fails at runtime for a CORS or configuration reason, that
  is a human's problem in another repo — report it, do not investigate it, and do not add a dev
  proxy to work around it unless this spec says so (it does not).
- **Do not look for a published contract.** `doc/auth-openapi.json` is the contract. It is
  **hand-written** from an integration brief because the auth service does not publish one yet.
  Treat it exactly as you would a generated one: generate types from it, never hand-edit those
  types, never hand-write types alongside them. If it later gains a published contract, that file
  is replaced wholesale — not maintained in parallel.
- **Live end-to-end verification is the human's**, as in every prior slice. Do not start any
  service and do not perform real network I/O. Your gate is build, lint, and the test suite
  against stubbed clients.

If something appears to be missing from a contract, the answer is a client-side solution — never
a backend change and never a trip into another repo.

## Decisions already made — do not revisit

These come from the auth service's security design, not from preference:

- The **access token lives in memory only.** Never `localStorage`, never `sessionStorage`, never
  a cookie set by this app.
- The **refresh token is an HttpOnly cookie** owned by the browser. Never read it, parse it,
  store it, or look for it in a response body.
- **Do not decode the JWT to make decisions.** For identity, call the profile endpoint.
- **State choice:** auth state lives in a **module-scoped reactive module**, not Pinia and not a
  composable-per-caller. It must be readable from non-component code — the API middleware and the
  router guard — and every reader must see the same instance. Pinia was considered and declined:
  one store, no SSR, no plugin needs. This is the deliberate exception to the "no module-level
  shared state" rule; `AGENTS.md` is amended accordingly in this commit.

## In scope

### Type generation

- Add an npm script `generate:auth-api` producing `src/api/authSchema.d.ts` from
  `doc/auth-openapi.json`, mirroring the existing `generate:api`. Confirm the CLI against the
  installed `openapi-typescript`.
- Run it and commit the generated file. It is never hand-edited.

### `src/auth/session.ts` — the session module

Module-scoped reactive state. Created once, imported everywhere.

- State: `accessToken` (`string | null`), `status` (`'anonymous' | 'authenticated'`). Export
  read-only views plus a computed `isAuthenticated`.
- `setAccessToken(token: string)` — sets the token, `status = 'authenticated'`.
- `clearSession()` — nulls the token, `status = 'anonymous'`.
- **No API calls in this module.** It holds state; it does not fetch. That keeps it importable
  from the API client without a cycle.

### `src/api/authClient.ts`

- A second `openapi-fetch` client typed from `authSchema.d.ts`.
- `baseUrl` = `import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8081'`.
- **`credentials: 'include'`** — required, or the refresh cookie never travels. Set it on the
  client so no call site can forget.
- The same auth middleware as the core client: attach `Authorization: Bearer <token>` from the
  session module when a token exists. With no token, send no header.

### `src/api/client.ts` — the core client

- **Remove `VITE_DEV_TOKEN` entirely**, along with the dev warning about it.
- The `onRequest` middleware now reads `accessToken` from the session module. With no token, send
  no header.
- Nothing else changes — this is the forward-compatible injection point working as designed.

### `src/composables/useAuth.ts`

Operations over the session module, mirroring the shape of `useCards`.

- `login(email: string, password: string): Promise<boolean>` — `POST /v1/auth/login`. On success
  call `setAccessToken(data.accessToken)` and return `true`. On failure set a user-facing error
  and return `false`.
- `logout(): Promise<void>` — `POST /v1/auth/logout` (always 204), then `clearSession()`.
  **Clear the session even if the call throws** — the user asked to leave.
- State: `submitting`, `submitError`, exposed `readonly()`, same pattern as `useCards`.
- **Error copy:** a `401` on login means invalid credentials. Show **one generic message**
  ("Email or password is incorrect"). Do not tell the user which was wrong — the service
  deliberately does not distinguish, and neither may the UI.
- Handle both HTTP failures and thrown failures (`try/catch`), as established in slice 002.

### `src/views/LoginView.vue`

- Route `/login`, public. Fields: email, password. Both required; password 8–64 characters
  (the service's rule — enforce it client-side too so an obvious mistake costs no round trip).
  Use `type="email"` and `type="password"`.
- Validation, submit, and error handling follow `CardForm`'s established pattern: messages
  cleared at the top of each submit, form-level error above the submit action, submit disabled
  while `submitting`.
- Styled with the current design language — mono eyebrow labels, the standard input treatment, a
  bordered submit control. It must not look like a screen from a different app.
- On success, navigate to the route the user was trying to reach, or `/session` by default.
- **No link to `/register`** — that route does not exist yet. Do not ship a dead link.

### Routing

- Add `/login` → `LoginView` (public), before the catch-all.
- **A global navigation guard** (`router.beforeEach`):
    - `/session`, `/cards`, `/cards/new`, `/cards/:id/edit` require authentication.
    - Unauthenticated access → redirect to `/login`, preserving the intended destination in a query
      param so login can return there.
    - An authenticated user hitting `/login` → redirect to `/session`.
    - Mark protection with route meta (`meta: { requiresAuth: true }`), not a hard-coded path list
      inside the guard.
- The catch-all redirect stays.

### `src/App.vue`

- The nav renders only when authenticated — a signed-out user sees the login screen alone.
- Add a **`SIGN OUT`** control to the nav, in the existing nav treatment. It calls `logout()` and
  navigates to `/login`.

### Env

- `.env.example`: remove `VITE_DEV_TOKEN`, add `VITE_AUTH_BASE_URL=http://localhost:8081`. Keep
  `VITE_API_BASE_URL`.
- Update `env.d.ts` to match. **`VITE_DEV_TOKEN` must not appear anywhere in the repo.**

### Docs — updated in this commit

- `PROJECT.md`: the scope line about a manually-entered dev bearer token is no longer true, and
  login is no longer deferred. Update both; keep the rest.
- `ARCHITECTURE.md`: rewrite the Authentication section (two API clients, in-memory access token,
  HttpOnly refresh cookie owned by the browser, middleware reading session state); record the
  module-scoped-state decision and why Pinia was declined; note that `doc/auth-openapi.json` is
  hand-written pending a published contract; add the guard to Routing; update the structure tree.
- `AGENTS.md`: amend the shared-state rule to permit the auth session module as the named
  exception (Pinia still not adopted, `useCards`-style composables still per-caller); remove any
  reference to `VITE_DEV_TOKEN`.

## Out of scope

- **No refresh, no 401-retry, no startup session restore.** Next slice. A 401 from the core here
  simply means the user must sign in again.
- No registration UI, no profile screen.
- No password reset, no email verification, no social login, no "remember me".
- No token persistence of any kind.
- No JWT decoding.
- No dev proxy in `vite.config.ts`.
- No new dependencies.
- Do not change any existing composable other than the client middleware change.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. Existing tests pass with their intent intact. Tests touching the old dev-token middleware will
   need updating — that is expected; nothing else may change.
3. Signing in with valid credentials lands on `/session`, and the session, list, creation,
   editing, and deletion all work with the real JWT. (Manual check.)
4. Signing in with wrong credentials shows one generic message that does not reveal whether the
   email or the password was wrong.
5. Visiting a protected route while signed out redirects to `/login`; after signing in the user
   lands on the page originally requested.
6. `SIGN OUT` clears the session, returns to `/login`, and protected routes are unreachable.
7. **`VITE_DEV_TOKEN` appears nowhere** — code, `.env.example`, `env.d.ts`, or docs. (`grep`.)
8. **No token is persisted**: `grep` for `localStorage` and `sessionStorage` returns nothing.
9. The auth client sends `credentials: 'include'`; the core client does not.
10. Components never call the network directly. (`grep`.)
11. `src/api/authSchema.d.ts` is generated from `doc/auth-openapi.json` and committed, not
    hand-edited.
12. `PROJECT.md`, `ARCHITECTURE.md`, and `AGENTS.md` are updated in this same commit.

## Tests

- **`useAuth`** (stub auth client): `login` success sets the token and returns `true`; `login`
  with a 401 returns `false`, sets a generic error, leaves the session anonymous; `login` when
  the client rejects behaves the same; `logout` clears the session **even when the call throws**.
- **Session module**: `setAccessToken` / `clearSession` flip `isAuthenticated`; two importers
  observe the same state. **Reset it between tests** — module state persists across test cases,
  and a leaked token will make an unrelated test pass for the wrong reason.
- **Core client middleware**: with a token in the session the outgoing request carries
  `Authorization: Bearer <token>`; with no token, no header.
- **`LoginView`**: validation blocks the request; a failed login shows the error and stays; a
  successful login navigates.
- **Guard**: an anonymous visit to a protected route redirects to `/login`; an authenticated
  visit passes; an authenticated visit to `/login` redirects away.

## Notes

- Suggested order: generated auth types → session module + core client change (the app is
  unauthenticated and broken at this point — expected) → `useAuth` → `LoginView` → guard +
  `App.vue` → env + docs. Type-check after each.
- Watch for an import cycle: `client.ts` imports the session module, so the session module must
  not import any client. That is why it holds no API calls.
- `SIGN OUT` needs no confirmation — signing back in costs one form.
- Follow `AGENTS.md`. Branch `feat/auth-login`, one commit, Conventional Commits, do not push.
  Check `git status` before committing.