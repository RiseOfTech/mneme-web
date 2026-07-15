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

First milestone: a **dev bearer token**, with no registration or login UI.

- **Where the token lives:** an environment variable, `VITE_DEV_TOKEN`, in `.env.local`
  (git-ignored).
- **How it reaches each request:** an `openapi-fetch` **middleware** (`onRequest` hook) —
  an interceptor, equivalent to a Spring `HandlerInterceptor` or an OkHttp interceptor. It
  attaches `Authorization: Bearer <token>` to every outgoing request in one place; no call
  site repeats the header.

**Vite env exposure — important invariant.** Only `VITE_`-prefixed variables are exposed to
client code, and they are **baked into the built bundle at build time** — visible to anyone
who inspects it. This is acceptable for a local dev token. A real secret must never go in a
`VITE_` variable; it would leak into the bundle.

**Forward-compatible.** When a token-entry UI replaces the env var later, the injection
point (the middleware) stays the same — only the *source* of the token changes (from an env
var to reactive state). Deferring the UI now boxes us into nothing.

## Routing

**`vue-router`**, added in the cards-list slice. `src/router/index.ts` creates the router
with `createWebHistory()` (real URLs, no `#`) and these routes:

- `/session` (name `session`) → `SessionView`
- `/cards` (name `cards`) → `CardsView`
- `/` → redirect to `/session`
- A catch-all (`/:pathMatch(.*)*`) → redirect to `/session`. No 404 page.

`App.vue` no longer renders `SessionView` directly. It renders a minimal nav
(`<RouterLink>` to `/session` and `/cards`) plus `<RouterView />`, which renders whichever
view the current route matches. The active link gets vue-router's automatic active class;
one CSS rule styles it. No nav component, no layout system.

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

## Components

Minimal split for the first milestone:

- **`SessionView`** — the orchestrator (the "controller"). Owns `useReviewSession()`,
  decides what to show based on session state (loading / card / empty / finished), and
  handles advancing to the next card.
- **`ReviewCard`** — one card with the progressive reveal: word, blurred image (tap to
  un-blur), association (hidden → revealed), translation (hidden → revealed), and the
  correct/incorrect actions.

**Deliberately not split further.** The grade buttons and the blurred image are not their own
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
    client.ts              # createClient + auth middleware (the configured gateway)
  router/
    index.ts               # createRouter + route table (session, cards, cards/new, cards/:id/edit, redirects)
  composables/
    useReviewSession.ts    # session state + logic; calls the API client
    useCards.ts            # cards list + single card + mutations; calls the API client
  views/
    SessionView.vue        # orchestrator; owns useReviewSession()
    CardsView.vue          # orchestrator; owns useCards()
    NewCardView.vue        # orchestrator; owns useCards(), renders CardForm
    EditCardView.vue       # orchestrator; owns useCards(), renders CardForm + delete
  components/
    ReviewCard.vue         # one card + progressive reveal (props in, events out)
    CardForm.vue           # word/translation/association/imageUrl fields (props in, events out)
  App.vue                  # nav (RouterLink to /session, /cards) + RouterView
  main.ts                  # app entry; registers the router
```

The structure is a *consequence* of the decisions above, not a template chosen up front. It
grows only when a decision requires it.