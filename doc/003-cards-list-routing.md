# Cards list + routing — spec

## Goal

Introduce navigation and a read-only list of the caller's cards. This is the slice that
trips the trigger recorded in `ARCHITECTURE.md`: there are now two genuinely distinct
navigable places (`/session` and `/cards`), so `vue-router` earns its place.

Read-only on purpose. This slice introduces a new *architectural* element (routing) and
proves it with the safest possible payload — a list that changes no data. Create / edit /
delete come next, in their own slice.

Uses one new endpoint: `GET /v1/cards`.

## In scope

### Routing

- Add `vue-router` (runtime dependency). Confirm the current API against the installed
  version's docs rather than assuming.
- `src/router/index.ts` — create the router with `createWebHistory`, and these routes:
    - `/session` → `SessionView` (named `session`)
    - `/cards` → `CardsView` (named `cards`)
    - `/` → redirect to `/session`
    - A catch-all (`/:pathMatch(.*)*`) → redirect to `/session`. No 404 page in this slice.
- Register the router in `src/main.ts` (`app.use(router)`).
- **Both views are eagerly imported.** No lazy loading / route-level code splitting — two
  routes do not justify it. (YAGNI; revisit if the app grows.)

### `src/App.vue`

Changes role: it no longer renders `SessionView` directly.

- Renders a minimal nav with `<RouterLink>` to `/session` ("Review") and `/cards` ("Cards"),
  plus `<RouterView />`.
- The active link should be visually distinguishable — `vue-router` applies an active class
  automatically; a single CSS rule is enough. No nav component, no layout system.

### `src/composables/useCards.ts`

A new composable — **not** an extension of `useReviewSession`. The two own different data
with different lifecycles and belong to different screens; keep them separate.

Mirrors the established pattern exactly:

- `useCards(client: ApiClient = defaultClient)` — the client is an injected dependency.
- State: `cards` (`CardResponseDto[]`), `status` (`'idle' | 'loading' | 'ready' | 'empty' | 'error'`),
  `error` (`string | null`). Exposed via `readonly()`.
- `load()` — `status = 'loading'`; `GET /v1/cards`. Success (`no error && response.ok`):
  store `data ?? []`, `status = 'ready'` if non-empty else `'empty'`. HTTP failure **and**
  thrown failure both → `status = 'error'` with a user-facing message (both paths — the
  lesson from slice 002 applies here from the start; do not ship this composable without the
  `try/catch`).
- Types come from `src/api/schema.d.ts` (`components['schemas']['CardResponseDto']`). No
  hand-written shapes.

There is no `'finished'` status — a list has no end state.

### `src/views/CardsView.vue`

- Owns `useCards()`; calls `load()` on mount.
- Renders by `status`: `idle`/`loading` → loading indicator; `error` → the message plus a
  Retry button calling `load()`; `empty` → "No cards yet."; `ready` → the list.
- Each row shows **word and translation only.** Not the association, not the image, not
  `visibility`.
- Rows are not clickable and carry no actions — nothing to navigate to yet.
- Use `:key="card.id"` on the list items.

### `visibility` stays invisible

`visibility` is returned by the API and **must not be rendered, filtered on, or branched on**.
It is inert groundwork for a later phase (mirrors the core's own treatment of it). Do not add
a badge, a filter, or a toggle.

### Docs — update in this PR

- `ARCHITECTURE.md`: the "Routing" section currently states there is no router and names the
  trigger to add one. That trigger has now fired. Rewrite the section to describe the routing
  that exists: the routes, `createWebHistory`, eager imports (and why), and that in-session
  states remain conditional rendering, **not** routes — that distinction still holds and must
  survive the rewrite. Update the "Resulting structure" tree (`router/`, `useCards.ts`,
  `CardsView.vue`) and `App.vue`'s described role.
- `AGENTS.md`: the rule "Do not add `vue-router` or Pinia until a slice explicitly requires
  them" is now half-obsolete. Amend it so it still forbids Pinia and still forbids speculative
  routes, but no longer forbids the router itself.
- `PROJECT.md`: no change. Product scope has not moved; the card-management UI is still
  deferred to its own slice.

## Out of scope

- **No create / edit / delete.** No forms, no `POST`/`PUT`/`DELETE` to `/v1/cards`. Next slice.
- No card detail route, no clickable rows, no `/cards/:id`.
- No search, filter, sort controls, or pagination.
- No Pinia, no global store. Each view owns its composable.
- No lazy-loaded routes, no route guards, no navigation guards, no auth redirects.
- No 404 page — the catch-all redirects.
- No shared list/table component, no design system, no component library.
- No re-fetch coordination between the two views (visiting `/cards` after grading does not
  need to know anything happened).
- No DTO type narrowing (the optional-field noise from the contract stays a separate concern).
- Do not change `useReviewSession`, `ReviewCard`, the API client, or the auth middleware.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest
   non-interactively).
2. `/` redirects to `/session` and the review session still works exactly as before — this
   slice must not regress it.
3. Navigating to `/cards` lists the caller's cards, word and translation only. Navigating back
   to `/session` still works. Both are reachable by direct URL entry and by the nav links.
   (Manual check.)
4. A user with no cards sees the empty state, not an error.
5. With `mneme-core` stopped, `/cards` shows the error state with a working Retry — not a
   hanging loader (the slice-002 lesson, applied from the start).
6. `visibility` appears nowhere in the rendered output — verify by `grep`: it is not
   referenced in any `.vue` file.
7. No Pinia in `package.json`. `useCards` and `useReviewSession` remain separate; neither
   imports the other.
8. Components still never call the network directly — `client.GET`/`client.POST` appear only
   in composables (`grep`).
9. `ARCHITECTURE.md` and `AGENTS.md` are updated in this same commit, and no longer claim the
   app has no router.

## Tests

- **`useCards`** (stub client, no mount), mirroring `useReviewSession`'s existing tests:
    - `load` with cards → `status = 'ready'`, cards stored.
    - `load` with `[]` → `status = 'empty'`.
    - `load` when the client returns an HTTP error → `status = 'error'`, message set.
    - `load` when the client **rejects** → `status = 'error'`, message set, not stuck on
      `'loading'`.
- **`CardsView`** (`@vue/test-utils`, composable's client stubbed): renders a row per card
  showing word and translation; renders the empty state; renders the error state with a Retry
  that triggers a re-load.
- **Router**: `/` redirects to `/session`; `/cards` resolves to `CardsView`. Keep this to a
  route-resolution test — do not build an integration harness.
- Existing tests must still pass. `App.spec.ts` asserts App renders `SessionView`; that is no
  longer true — App now renders `RouterView`. Update it accordingly.

## Notes

- Suggested order: router + `main.ts` + `App.vue` (prove navigation with an empty
  `CardsView` stub) → `useCards` + tests → `CardsView` + tests → docs. `npm run type-check`
  after each step.
- `createWebHistory` (real URLs, no `#`) works in Vite dev without extra config. It requires a
  server-side rewrite in production; that is a deployment concern, not this slice's — do not
  add config for it now.
- Follow `AGENTS.md`. Branch `feat/cards-list-routing`, one commit, Conventional Commits, do
  not push.