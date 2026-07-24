# Auth: refresh, retry, session restore — spec

## Goal

Make the 15-minute access token invisible to the user. Three things:

1. **Startup restore** — on a cold load the in-memory token is gone, but the refresh cookie is
   not. Exchange it for a fresh token before the router decides anything.
2. **Silent retry** — a `401` from the core triggers a refresh and one retry of the original
   request. The component never learns it happened.
3. **Single-flight** — no matter how many requests fail at once, exactly one refresh is ever in
   flight.

## Boundary — read this first

**Everything this slice needs is inside this repository.** Do not read, search, clone, or
navigate to any other repository, and do not run commands outside this working tree. The backend
services exist here only as the two contracts in `doc/`. Do not verify their configuration and do
not start any service. Live end-to-end verification is the human's, as in every prior slice; your
gate is build, lint, and the test suite against stubbed clients.

## The rule that makes this slice dangerous

The auth service **rotates the refresh token on every use and runs strict reuse detection.** A
refresh token that has already been consumed is treated as stolen, and **the entire session is
revoked** — the user is signed out.

Therefore: **if this client ever fires two concurrent `/v1/auth/refresh` calls with the same
cookie, the second one looks like a replay and kills the session.** That is the service's designed
defence, not a bug to report. The mitigation belongs here.

This happens naturally — a screen loads cards and session data, both 401 together, and each
independently decides to refresh. Single-flight is not an optimisation; it is required for
correctness.

## In scope

### `src/auth/session.ts` — a third status

- `status` becomes `'resolving' | 'anonymous' | 'authenticated'`, initialised to **`'resolving'`**.
  On a cold load the app genuinely does not know yet, and that must be representable — conflating
  "not yet known" with "signed out" is exactly what bounces a valid user to the login screen.
- Keep everything else as it is. **Still no API calls in this module** — it holds state only, so
  the API clients can import it without a cycle.

### `src/auth/refresh.ts` — the single-flight refresh

A new module. It imports the auth client and the session module. **Nothing in `src/auth/session.ts`
may import it.**

- `refreshAccessToken(): Promise<string | null>` — the only way anything in the app may call
  `/v1/auth/refresh`. Direct calls to that endpoint from anywhere else are forbidden.
- **Single-flight, mandatory shape:** hold the in-flight promise in a module-scoped variable. If
  one exists, return it; concurrent callers await the same promise. Clear the variable when it
  settles, in a `finally`, so the next refresh can start.
- On success: `setAccessToken(token)` and return the token.
- On failure (a `401`, any other HTTP failure, or a thrown error): `clearSession()` and return
  `null`. The session is over.
- **`clearSession()` must also drop any in-flight refresh promise**, so a sign-out mid-flight
  cannot resurrect a session.

### `src/api/client.ts` — 401 retry on the core client

Add an `onResponse` middleware to the **core** client. Confirm the exact middleware signature and
retry mechanics against the installed `openapi-fetch` version rather than assuming.

Behaviour:

1. Response status is not `401` → return it untouched.
2. Status is `401` → call `refreshAccessToken()` (never `/v1/auth/refresh` directly).
3. Refresh returns a token → **re-issue the original request once**, with the new
   `Authorization` header, and return that response in place of the `401`.
4. Refresh returns `null` → the session is over. Return the `401`; the guard and the session state
   handle the redirect to login.
5. **Never retry more than once.** A request that has already been retried and 401s again returns
   that `401`. A loop of 401 → refresh → 401 is a bug, not a recovery. Mark the retried request so
   the middleware can recognise it.

**The auth client does not get this middleware in this slice.** Its only token-bearing endpoint is
the profile, which arrives later; and `/v1/auth/*` responses must never trigger a refresh — a
failed login or a failed refresh is a final answer.

### Startup restore

- A single `initSession(): Promise<void>`, called once at app startup, that calls
  `refreshAccessToken()` and lets it set the session either way. It must never throw and never
  surface an error to the user — a cold load with no cookie is the normal signed-out case, not a
  failure.
- Expose the promise (e.g. `sessionReady`) so the router guard can await it. Kick it off before
  the app mounts.

### Router guard — wait before deciding

- If `status === 'resolving'`, **await `sessionReady` before deciding.** This is the whole point
  of the third status: without it, the first navigation on a cold load evaluates while the refresh
  is still in flight, sees no token, and bounces a perfectly valid user to `/login`.
- After it resolves, the existing rules apply unchanged: protected routes require authentication;
  an authenticated user hitting `/login` is redirected to `/session`.
- Guard against awaiting forever — the guard must always call `next()` on every path.

### `src/App.vue`

- While `status === 'resolving'`, render the existing loading treatment rather than the nav or the
  login screen. The cold-load flash of a login form for an authenticated user is the thing this
  slice exists to prevent — it must not appear.

### Docs

- `ARCHITECTURE.md`: document the refresh cycle in the Authentication section — single-flight and
  why (reuse detection revokes the session), retry-once, the three-state session status, startup
  restore, and the guard awaiting it. Add `src/auth/refresh.ts` to the structure tree.
- `PROJECT.md`, `AGENTS.md`: no change.

## Out of scope

- No registration UI, no profile screen.
- No token persistence of any kind. `localStorage` and `sessionStorage` remain forbidden.
- No JWT decoding — do not read `exp` to refresh pre-emptively. Refresh is reactive, on `401`.
- No refresh scheduling, no timers, no background polling.
- No retry for anything other than `401` — a `500` or a network failure is not retried.
- No retry on the auth client, and never a refresh triggered by a `/v1/auth/*` response.
- No changes to `useCards`, `useReviewSession`, `ReviewCard`, or any view beyond `App.vue`.
- No new dependencies, no dev proxy.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. Existing tests pass with their intent intact.
3. **Reloading the page while signed in keeps the user signed in**, landing on the page they were
   on, with no flash of the login screen. (Manual check.)
4. Reloading while signed out shows `/login` with no error message — a missing cookie is normal.
5. After the access token expires, the next action succeeds anyway: the request 401s, refresh
   runs, the request is retried, and the user notices nothing. (Manual check — wait out 15
   minutes, or sign in and leave the tab.)
6. **Concurrent 401s cause exactly one refresh call.** (Test.)
7. A request is retried at most once. (Test.)
8. When refresh fails, the session is cleared and the user ends up at `/login`. (Test + manual.)
9. `grep` for `/v1/auth/refresh` outside `src/auth/refresh.ts` returns nothing.
10. `grep` for `localStorage` and `sessionStorage` returns nothing.
11. No timer, interval, or `exp`-based scheduling exists. (`grep` for `setInterval` / `setTimeout`
    in auth code returns nothing.)
12. `ARCHITECTURE.md` is updated in this same commit.

## Tests

The single-flight and retry-once behaviours are the reason this slice exists. Test them directly,
with a stubbed client and a stubbed refresh:

- **Single-flight:** fire several `refreshAccessToken()` calls concurrently while the underlying
  request is still pending; assert the auth client was called **exactly once** and every caller
  received the same result. This is the test that protects against session revocation — it must
  fail if the single-flight guard is removed.
- **Sequential refreshes still work:** after one settles, a later call starts a new request. The
  in-flight variable must actually be cleared.
- **Retry once:** a core request that 401s, refreshes successfully, and then succeeds on retry
  returns the retried response, with the request issued twice in total.
- **No loop:** a core request that 401s, refreshes successfully, and 401s again returns the 401
  without a third attempt.
- **Refresh failure:** a 401 from refresh clears the session and returns `null`; a thrown error
  does the same.
- **`clearSession` during an in-flight refresh** leaves the session anonymous — a late-arriving
  token must not sign the user back in.
- **Startup:** `initSession` with a successful refresh ends `authenticated`; with a 401 ends
  `anonymous` and surfaces no error; it never throws.
- **Guard:** a navigation that begins while `status === 'resolving'` waits and then decides
  correctly — it does not redirect to `/login` for a session that resolves to authenticated.
- **Session module reset between tests** — module state persists across cases, and a leaked token
  or a leaked in-flight promise will make an unrelated test pass for the wrong reason.

## Notes

- Suggested order: session status → `refresh.ts` + its tests (**get single-flight right and tested
  before anything depends on it**) → core client middleware + tests → startup + guard + `App.vue`
  → docs. Type-check after each.
- Import direction, to avoid a cycle: `session.ts` imports nothing of ours; `refresh.ts` imports
  `session.ts` and the auth client; `client.ts` imports `refresh.ts`.
- Manual verification of criterion 5 is slow by nature. A faster equivalent: sign in, then
  overwrite the in-memory token with a malformed value from the console (or add a temporary
  dev-only helper you remove before committing), and confirm the next action still succeeds.
- Follow `AGENTS.md`. Branch `feat/auth-refresh`, one commit, Conventional Commits, do not push.
  Check `git status` before committing.