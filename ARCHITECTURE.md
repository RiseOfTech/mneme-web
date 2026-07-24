# Architecture — mneme-web

How the frontend is built. For *what* the product is, see `PROJECT.md`. For the rules the
coding agent follows, see `AGENTS.md`.

This document records the architectural decisions for the **first milestone** (one review
session, end to end) and the reasoning behind them — including what we deliberately did
*not* do, so those choices aren't re-litigated or "helpfully" reversed later.

## Stack

- **Vue 3** (Composition API, `<script setup>`) + **TypeScript** + **Vite** — a
  client-rendered single-page application (SPA).
- Exact versions live in `package.json`, which is the source of truth. This doc names
  tools, not version numbers.

**SPA, not SSR.** The app is served as one `index.html` plus a JS bundle; all rendering
happens in the browser. There is no server-side rendering: the app sits behind a token,
serves private data, and has no SEO needs, so rendering on a server would add moving parts
for no benefit. `mneme-core` is a pure JSON data API — it never serves HTML.

## State

Session state lives in a **composable** — a plain function, `useReviewSession()`, that
creates the reactive state (`ref`s) and exposes it together with the operations that mutate
it (fetch the session, grade the current card, advance). The pattern mirrors "thin
controller + service": the view stays presentational; the composable owns the session logic
and can be tested in isolation.

Two distinct pieces of state, in two places:

- **Session state** (the due cards, the current index) → the `useReviewSession()`
  composable. It outlives the switch from one card to the next.
- **Reveal state** of the current card (which hints have been shown) → **local component
  state** inside `ReviewCard`, ordinary `ref`s. This is pure presentation; the composable
  neither knows nor should know about it.

**Rejected: Pinia (a global store) — for now.** A store earns its place for state that
outlives a single screen or is shared across unrelated screens (the authenticated user, a
theme). Session state is born when the session starts and dies when it ends — it is not
global. Adding Pinia now would be premature. Revisit only when genuinely cross-screen state
appears.

## API layer

**Contract-first, generated from `openapi.json`.** Two small tools from the `openapi-ts`
project:

- **`openapi-typescript`** generates a TypeScript types file from `openapi.json` —
  request/response shapes (`SessionCardDto`, `GradeRequestDto`, etc.) that always match the
  core's contract. Zero runtime cost; types only.
- **`openapi-fetch`** — a small (~6 KB) typed wrapper over native `fetch` that consumes
  those types. A call like `client.GET('/v1/session/cards')` infers its response type
  automatically; a wrong path or a missing required body field becomes a compile-time error.

**The generated types file is committed but never hand-edited.** It is produced by a script
that re-reads `openapi.json`. When the core changes its contract, regenerate — don't patch
by hand. (The operational command lives in `AGENTS.md`.)

**Rejected: a full client generator** (openapi-generator and similar). For a ~5-endpoint API
that produces a large generated SDK for no benefit. Types plus a thin wrapper give full type
safety with far less machinery.

**Layering discipline:** component → composable → API client → core. Components never call
`fetch` directly; the composable never touches the DOM. This is the familiar
controller → service → gateway split.

## Authentication

Real authentication against the auth service (`mneme-auth`), a separate service from
`mneme-core`. Login obtains a short-lived JWT (15 minutes). The token expiry is invisible
to the user: a refresh cycle (below) renews it silently and a cold load restores the
session from the refresh cookie before the router decides anything.

**Two API clients**, both built with `openapi-fetch`:

- `src/api/client.ts` — the core client, typed from `schema.d.ts` (generated from
  `doc/openapi.json`). No `credentials` option; the core does not use cookies.
- `src/api/authClient.ts` — the auth client, typed from `authSchema.d.ts` (generated from
  `doc/auth-openapi.json`, which is **hand-written** pending a published contract from
  `mneme-auth`; it is replaced wholesale when one lands, never hand-maintained alongside
  generated types). Built with **`credentials: 'include'`**, required so the HttpOnly
  refresh cookie travels with requests to the auth service.

**Token storage — in memory only.** The access token lives in a module-scoped reactive
state object, `src/auth/session.ts` — never `localStorage`, `sessionStorage`, or a cookie
set by this app. The refresh token is an HttpOnly cookie owned entirely by the browser and
the auth service; this client never reads, parses, or stores it. The JWT itself is never
decoded — identity comes from calling the profile endpoint, not from inspecting the token.

**How the token reaches each request:** both clients register the same shape of
`onRequest` middleware — an interceptor, equivalent to a Spring `HandlerInterceptor` or an
OkHttp interceptor. It reads the current access token from the session module and attaches
`Authorization: Bearer <token>` when one exists; with no token, no header is sent. No call
site repeats this logic.

**State choice: a module-scoped reactive module, not Pinia, not a composable.** Auth state
must be readable from non-component code — the API middleware and the router guard — and
every reader must observe the same instance. A composable-per-caller would give each caller
its own state; Pinia was considered and declined, as it was for session state: one store,
no SSR, no plugin needs, doesn't earn its place for a single piece of cross-cutting state.
This is the deliberate, named exception to "no module-level shared state" — `AGENTS.md` is
amended accordingly. The module holds state only; it makes no API calls itself, so it stays
importable from the API client without an import cycle (`client.ts` → session module; the
session module imports nothing from `api/`).

**Vite env exposure — important invariant.** Only `VITE_`-prefixed variables are exposed to
client code, and they are **baked into the built bundle at build time** — visible to anyone
who inspects it. `VITE_AUTH_BASE_URL` is a URL, not a secret, so this is fine. A real secret
must never go in a `VITE_` variable; it would leak into the bundle. Nothing secret is ever
baked in — the access token is runtime state, not a build-time value.

### Refresh, retry, and startup restore

**A third session status.** `session.ts`'s `status` is `'resolving' | 'anonymous' |
'authenticated'`, initialised to `'resolving'`. A cold load genuinely doesn't know yet
whether the refresh cookie will restore a session; conflating "not yet known" with "signed
out" is exactly what would bounce a valid user to `/login` while the very first refresh is
still in flight. `session.ts` still holds state only and imports nothing of ours.

**`src/auth/refresh.ts`** is the only place allowed to call `/v1/auth/refresh` — direct
calls from anywhere else are forbidden (enforced by convention, not by types). It exposes:

- `refreshAccessToken(): Promise<string | null>` — **single-flight, by necessity, not as
  an optimisation.** The auth service rotates the refresh token on every use and runs
  strict reuse detection: a second `/v1/auth/refresh` call racing the first on the same
  cookie looks like a replay and **revokes the whole session**. This happens naturally —
  two screens' worth of requests 401 together and each would otherwise independently
  decide to refresh. `refreshAccessToken` holds the in-flight promise in a module-scoped
  variable; concurrent callers all await the same one. On success it calls
  `setAccessToken`; on any failure (401, other HTTP failure, thrown error) it calls
  `endSession()` and resolves `null`.
- `endSession()` — the guarded way to sign out. It drops any in-flight refresh promise
  (via a generation counter checked before a late-arriving success is committed) in
  addition to clearing session state, so a sign-out that lands mid-refresh can't be
  undone by a token that arrives a moment later. This is why it's a distinct export from
  `session.ts`'s `clearSession` (state-reset only, no promise awareness) rather than the
  same name doing more in one place and less in another: everything outside
  `session.ts`/`refresh.ts` that needs to end a session — currently `useAuth.ts`'s
  `logout()` — calls `endSession()`, never `clearSession()` directly.
- `initSession(): Promise<void>` / `sessionReady: Promise<void>` — called once from
  `main.ts` before the app mounts. It runs `refreshAccessToken()` and lets it set the
  session either way, and can never throw or surface an error — a cold load with no
  cookie is the normal signed-out case. `sessionReady` is what the router guard awaits.

**Retry-once, shared by both clients.** The retry middleware is a factory,
`createRetryMiddleware()` in `src/api/retryMiddleware.ts`, registering a middleware with both
`onRequest` and `onResponse`. It matters that it's both: by the time `onResponse` sees a
request, `fetch()` has already consumed its body stream, so `onRequest` clones the request
*before* it's sent and stashes the clone (keyed by the request object itself, so nothing
needs manual cleanup). On a `401`, `onResponse` calls `refreshAccessToken()`; if it returns a
token, the stashed clone is reissued once with the new `Authorization` header, and that
response replaces the `401`. A request that has already been retried carries a marker
header, so it is never retried a second time — a 401 → refresh → 401 loop is a bug, not a
recovery path.

`client.ts` uses the factory with no exclusion. `authClient.ts` — once profile was its first
token-bearing endpoint — uses it with one hard exclusion: a request whose path starts with
`/v1/auth/` never triggers a refresh or a retry, because a failed login or a failed refresh
is a final answer, and refreshing in response to a failed refresh would recurse. This gives
`retryMiddleware.ts` (which calls `refreshAccessToken`, from `refresh.ts`) and `refresh.ts`
(which calls `authClient` to POST `/v1/auth/refresh`) a genuine module cycle:
`authClient.ts → retryMiddleware.ts → refresh.ts → authClient.ts`. It's safe because every
cross-reference is only used inside a function body — invoked long after both modules have
finished evaluating — never at module top-level; the same reasoning already covers the
pre-existing `client.ts → refresh.ts → authClient.ts` chain.

**The router guard awaits startup restore.** `router/index.ts`'s `authGuard` is async: if
`status === 'resolving'` it awaits `sessionReady` before applying the existing
`requiresAuth` / already-authenticated-at-`/login` rules. Without this, the first
navigation on a cold load would evaluate while the startup refresh is still in flight, see
no token yet, and redirect a perfectly valid session to `/login`. `App.vue` mirrors this:
while `status === 'resolving'` it renders a loading treatment instead of the nav or
`RouterView`, so there's no flash of the login screen for a session that's about to
restore.

**Out of scope, deliberately:** no token persistence (still no `localStorage` /
`sessionStorage`); no JWT decoding or `exp`-based pre-emptive refresh — refresh is
reactive, triggered only by a `401`; no refresh scheduling, timers, or polling.

## Routing

**`vue-router`**, added in the cards-list slice. `src/router/index.ts` creates the router
with `createWebHistory()` (real URLs, no `#`) and these routes:

- `/session` (name `session`, `meta: { requiresAuth: true }`) → `SessionView`
- `/cards` (name `cards`, `meta: { requiresAuth: true }`) → `CardsView`
- `/cards/new`, `/cards/:id/edit` (`meta: { requiresAuth: true }`) → `NewCardView`,
  `EditCardView`
- `/profile` (name `profile`, `meta: { requiresAuth: true }`) → `ProfileView`
- `/login` (name `login`, public) → `LoginView`
- `/register` (name `register`, public) → `RegisterView`
- `/` → redirect to `/session`
- A catch-all (`/:pathMatch(.*)*`) → redirect to `/session`. No 404 page.

**A global navigation guard** (`router.beforeEach`) protects the app: routes are marked
with `meta.requiresAuth`, not a hard-coded path list inside the guard. An unauthenticated
visit to a protected route redirects to `/login`, preserving the intended destination as a
`redirect` query param so `LoginView` can send the user back there on success. An
authenticated visit to `/login` redirects to `/session`. The guard reads `isAuthenticated`
from the session module — the same reactive source the API middleware reads.

`App.vue` no longer renders `SessionView` directly. It renders a minimal nav
(`<RouterLink>` to `/session` and `/cards`, plus a **sign-out** control) plus
`<RouterView />`, which renders whichever view the current route matches. The nav is shown
only when authenticated — a signed-out user sees `LoginView` alone. The active link gets
vue-router's automatic active class; one CSS rule styles it. No nav component, no layout
system.

**Both views are eagerly imported — no lazy loading / route-level code splitting.** Two
routes do not justify it (YAGNI); revisit if the app grows.

**States are still not screens.** Within a session there are several *states* — loading,
showing a card, empty session, session finished. These remain **conditional rendering**
(`v-if` on state from the composable) inside `SessionView`, not routes. A route is
something worth bookmarking or linking to; an ephemeral step inside a one-off session is
not (a URL like `/session/card/3` is meaningless). The same holds for `CardsView`: its
`useCards()` states (`loading` / `ready` / `empty` / `error`) are conditional rendering,
not routes.

`createWebHistory` requires a server-side rewrite in production so deep links resolve to
`index.html`; that is a deployment concern, not addressed here.

## Design system

Values live in `src/assets/tokens.css` as CSS custom properties; components reference tokens
only — no raw hex, `rgba()`, duration, or spacing literal in a `.vue` file.

**Palette — warm ground.** `--color-ground` (page background), `--color-ink` (text, and the
active nav link's underline), `--color-surface` (translucent input/panel fill),
`--color-haze` / `--color-haze-soft` (secondary text, dividers, the inactive nav link),
`--color-muted` (secondary prose on state screens), `--color-coating` (interactive: focus,
the form's focus ring, the solid lens ring — never the nav), `--color-flare` (reveal
accents, the loading ring), `--color-warning` (validation messages). The active nav link is
marked by an ink underline, not a colour change to coating; nav has no violet in it.
Borders on ink use alpha tokens (`--border-ink-divider`, `--border-ink-panel`,
`--border-ink-control`) rather than a solid colour, so dividers and outlines read as part of
the ground rather than as separate objects.

**Type.** Three roles: `--font-display` (Bodoni Moda — the card word, state headings in
italic, list row words), `--font-body` (Instrument Sans — association prose in italic,
translation), `--font-mono` (IBM Plex Mono — every small label and control, uppercase,
letterspaced). A shared `--text-eyebrow` token is used for every mono label across the app
(position counter, field labels, list count) so they stay visually consistent; the nav uses
its own slightly larger `--text-nav` (13px) / `--tracking-nav` size, matching the reference.

**Radius is allowed** (`--radius-sm` 12px on buttons/actions, `--radius-md` 14px on inputs).
This reverses the "no radius" decision from the original visual-foundation slice — the
refreshed design uses soft geometry deliberately.

**The ring motif.** Two concentric rings sit behind the session card's word on its front
face: a solid `--color-coating`-tinted circle rotated `-4deg`, a dashed `--color-flare`-
tinted circle rotated `6deg`. They are absolutely positioned, sized relative to the card
(not the viewport, so they scale with its responsive `max-width`), `pointer-events: none`,
and clipped by the card's own bounds — they never affect layout or intercept clicks.

**Reveal motion.** The original "resolve from blur, never fade" signature (hidden state is
blurred, not absent; revealing sharpens it) is retired. It's replaced by two distinct
motions:

- **The image hint is a flip, not a blur.** See `ReviewCard` below.
- **Text reveals (association, translation, the grade actions) use a shared `softIn`
  keyframe** — opacity + blur + a small lift, driven by the existing `--motion-duration` /
  `--motion-easing` tokens — applied via one `Transition` per reveal. There is no longer a
  separate flare-coloured special case for the answer.

All motion (the flip squeeze, `softIn`, the loading ring's pulse) is neutralised under
`prefers-reduced-motion: reduce` by zeroing the relevant duration/lift tokens.

## Components

Minimal split for the first milestone:

- **`SessionView`** — the orchestrator (the "controller"). Owns `useReviewSession()`,
  decides what to show based on session state (loading / card / empty / finished), and
  handles advancing to the next card.
- **`ReviewCard`** — one card with the progressive reveal: a flippable surface (front: the
  word; back: the card's image, tap to turn over — only when the card has an image),
  association (hidden → revealed), translation (hidden → revealed), and the
  correct/incorrect actions.

**Deliberately not split further.** The grade buttons and the flip surface are not their own
components yet. Extract a component when it is reused or grows too large to read — not
preemptively.

**Data flow: props down, events up (one-way).** `SessionView` passes the current card into
`ReviewCard` as a **prop** — data flows down, parent to child. `ReviewCard` does not mutate
the card; when the user grades, it **emits** a `grade` event upward. `SessionView` catches
it, calls the composable's grade operation, and advances. A child signals intent; the state
owner decides. A prop is effectively read-only to the child.

**Resetting reveal state between cards:** bind `:key="card.cardId"` on `<ReviewCard>`. Vue
then treats each card as a fresh component instance and resets its local reveal state
automatically — no manual teardown.

## Resulting structure

```
src/
  api/
    schema.d.ts            # generated from openapi.json — do not hand-edit
    authSchema.d.ts        # generated from doc/auth-openapi.json — do not hand-edit
    client.ts              # createClient + retry middleware (the configured gateway) — core
    authClient.ts          # createClient + retry middleware, credentials: 'include' — auth
    retryMiddleware.ts     # createRetryMiddleware() factory — shared by both clients
  auth/
    session.ts             # module-scoped reactive auth state (access token, isAuthenticated)
    refresh.ts             # single-flight refresh, retry-once support, startup restore
  router/
    index.ts               # createRouter + route table + beforeEach auth guard
  composables/
    useReviewSession.ts    # session state + logic; calls the API client
    useCards.ts            # cards list + single card + mutations; calls the API client
    useAuth.ts             # login/logout operations over the session module
    useProfile.ts          # profile load/save; calls the auth client
  views/
    SessionView.vue        # orchestrator; owns useReviewSession()
    CardsView.vue          # orchestrator; owns useCards()
    NewCardView.vue        # orchestrator; owns useCards(), renders CardForm
    EditCardView.vue       # orchestrator; owns useCards(), renders CardForm + delete
    LoginView.vue          # orchestrator; owns useAuth(), email/password form
    ProfileView.vue        # orchestrator; owns useProfile(), nickname form
  components/
    ReviewCard.vue         # one card + progressive reveal (props in, events out)
    CardForm.vue           # word/translation/association/imageUrl fields (props in, events out)
  App.vue                  # nav (shown when authenticated) + RouterView
  main.ts                  # app entry; registers the router
```

The structure is a *consequence* of the decisions above, not a template chosen up front. It
grows only when a decision requires it.