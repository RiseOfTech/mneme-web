# Review session, end to end — spec

## Goal

Prove the client↔core loop with the product's core experience: fetch the cards due now,
walk them one at a time with the progressive reveal, grade each one, and advance until the
session is empty. This is the first thin vertical slice from `PROJECT.md`.

This slice **establishes** the frontend's architecture in code for the first time: the API
layer (generated types + typed client + auth middleware), the session composable, and the
two session components. Everything it builds follows `ARCHITECTURE.md`; do not deviate from
those decisions — if something the slice needs isn't covered there, stop and ask.

Uses two endpoints only: `GET /v1/session/cards` and `POST /v1/reviews/{cardId}`.

## In scope

### API layer (`src/api/`)

**Type generation.** Add `openapi-typescript` (dev dependency) and an npm script
`generate:api` that reads `doc/openapi.json` and writes `src/api/schema.d.ts`. Confirm the
exact CLI against the installed version; the shape is
`openapi-typescript doc/openapi.json -o src/api/schema.d.ts`. Run it and **commit the
generated file**. It is never hand-edited (AGENTS.md).

**Typed client** (`src/api/client.ts`). Add `openapi-fetch` (runtime dependency). Create a
client typed with the generated `paths`:

- `baseUrl` = `import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'`.
- Export the configured client and a type alias for it (e.g. `ApiClient`), so the composable
  can accept it as a typed dependency.

**Auth middleware.** Register an `openapi-fetch` middleware whose `onRequest` attaches
`Authorization: Bearer ${import.meta.env.VITE_DEV_TOKEN}` to every request. The header is set
in this one place; no call site repeats it. If `VITE_DEV_TOKEN` is unset, log a one-line dev
warning and proceed (the request will 401 — acceptable for this slice). Confirm the exact
middleware signature against the installed `openapi-fetch` version.

### Composable (`src/composables/useReviewSession.ts`)

A composable that owns session state and the operations over it. It accepts the API client as
an injected dependency defaulting to the real one:

```
useReviewSession(client: ApiClient = defaultClient)
```

**State** (reactive):
- `cards` — the fetched `SessionCardDto[]`.
- `index` — the current position.
- `status` — one of `'idle' | 'loading' | 'ready' | 'empty' | 'finished' | 'error'`.
- `grading` — true while a grade POST is in flight.
- `currentCard` — computed: `cards[index]` or `null`.

Expose state as read-only to callers; mutation happens only through the operations below.

**Operations:**
- `load()` — `status = 'loading'`; `GET /v1/session/cards`. On success: store the cards, set
  `index = 0`, and `status = 'ready'` if there are cards, else `'empty'`. On error:
  `status = 'error'`.
- `grade(grade: 'CORRECT' | 'INCORRECT')` — no-op if there is no current card. Set
  `grading = true`; `POST /v1/reviews/{cardId}` with the current card's `cardId` and
  `{ grade }`. On success: advance. On error: keep the current card and surface the error.
  Always clear `grading` afterward.
- Advancing means `index++`; when `index` passes the last card, `status = 'finished'`.

The session is fetched **once**; grading walks the already-fetched list. Do **not** re-fetch
the session after each grade.

The composable never imports anything from `vue`-DOM or touches components; it is unit-tested
in isolation with a stub client.

### Components

**`src/components/ReviewCard.vue`** — one card with the progressive reveal.

- Props: `card: SessionCardDto`, `grading: boolean`.
- Emits: `grade` with payload `'CORRECT' | 'INCORRECT'`.
- Local reveal state (ordinary refs, all start hidden): `imageRevealed`, `associationRevealed`,
  `answerRevealed`.
- Rendering:
    - **Word** — always visible.
    - **Image** — only if `card.imageUrl` is present. Shown **blurred** (CSS `filter: blur`)
      while `!imageRevealed`; a tap toggles `imageRevealed` (Hint 1). No image element when the
      card has no `imageUrl`.
    - **Association** — hidden until revealed; an affordance reveals `card.association` (Hint 2).
    - **Answer** — hidden until revealed; an affordance reveals `card.translation`.
    - **Grade** — the Correct / Incorrect actions appear once `answerRevealed` is true; each
      emits `grade` with its value. Both are disabled while `grading` is true.
- Reveals are **independent**, not sequentially gated: the user may reveal the answer directly
  without touching the image or association.

**`src/views/SessionView.vue`** — the orchestrator.

- Owns `useReviewSession()`; calls `load()` on mount.
- Renders by `status` (conditional rendering, not routes):
    - `loading` → a loading indicator.
    - `error` → an error message and a Retry action that calls `load()` again.
    - `empty` → a "nothing due right now" message.
    - `finished` → a "session complete" message.
    - `ready` → `<ReviewCard :card="currentCard" :grading="grading" :key="currentCard.cardId"
    @grade="..." />`. The `@grade` handler calls the composable's `grade()`.
- The `:key="currentCard.cardId"` is required: it makes Vue remount `ReviewCard` per card, so
  its local reveal state resets automatically between cards.

### App wiring & cleanup

- `src/App.vue` renders `<SessionView />` directly. No router.
- Update or remove the scaffold's placeholder `App.spec.ts`: `App` now only renders
  `SessionView`, so the old "renders a heading" assertion no longer applies.
- `index.html` title may stay `mneme-web`.

### Environment

- Add `.env.example` (committed) documenting the two variables:
  ```
  VITE_API_BASE_URL=http://localhost:8080
  VITE_DEV_TOKEN=
  ```
- The developer copies it to `.env.local` (git-ignored) and fills the dev token. Do **not**
  commit `.env.local`.
- Add `VITE_API_BASE_URL` and `VITE_DEV_TOKEN` to the `ImportMetaEnv` interface in the
  scaffold's env types file (`env.d.ts`) so `import.meta.env` is typed.

### Styling

Minimal — only what the interaction needs: the image blur, and enough layout that the reveal
steps are legible. No theming, no design system, no component library. Styling is a later
concern.

## Out of scope

- No card management (`create` / `edit` / `delete`); do not touch `/v1/cards`. Separate slice.
- No token-entry UI — the token comes from `.env.local` only. (The middleware injection point
  is designed to survive that later change; do not build the UI now.)
- No reversed-direction quizzing (translation → word).
- **No `vue-router`, no Pinia, no global store.** `App.vue` renders `SessionView` directly.
- No re-fetch of the session after each grade; advance through the pre-fetched list.
- No pagination, sorting, filtering, or search.
- No retry/backoff beyond "a failed grade keeps the card and shows an error."
- No end-to-end test framework; none is installed.
- Do not add dependencies beyond `openapi-typescript` (dev) and `openapi-fetch` (runtime).
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (run
   non-interactively).
2. The `generate:api` script exists, regenerates `src/api/schema.d.ts` from `doc/openapi.json`,
   and the generated file is committed. The file is not hand-edited.
3. Against a local core (`http://localhost:8080`) with a valid `VITE_DEV_TOKEN`: the session
   loads, cards appear one at a time, the reveal works (word → un-blur image → association →
   answer), grading posts and advances, and the session ends in the `finished` state.
4. A session that returns `200 []` shows the `empty` state — not an error, not a broken card.
5. Every outgoing request carries `Authorization: Bearer <token>` from `VITE_DEV_TOKEN`, set by
   the client middleware. No component or composable sets the header itself (verify by `grep`:
   only `client.ts` references `Authorization`).
6. No `vue-router` and no Pinia appear in `package.json`. `App.vue` renders `SessionView`
   directly.
7. Advancing to the next card resets the reveal: the next card shows word-only again.
8. Components never call the network directly — only the composable does, through the injected
   client (verify by `grep`: `client.GET`/`client.POST` appear only in the composable, and the
   raw `fetch`/client import does not appear in `.vue` files).
9. `.env.local` is not committed; `.env.example` is.

## Tests

- **Composable** (`useReviewSession`, stub client, no component mount):
    - `load` with a non-empty session → `status = 'ready'`, `currentCard` is the first card.
    - `load` with `[]` → `status = 'empty'`.
    - `load` when the client returns an error → `status = 'error'`.
    - `grade` on success → `POST` called with the current card's `cardId` and `{ grade }`, then
      the index advances; grading the last card → `status = 'finished'`.
    - `grade` on client error → stays on the same card, error surfaced, `grading` cleared.
- **`ReviewCard`** (`@vue/test-utils`):
    - Initially: word is shown; translation is not in the DOM; association is not shown; the
      image (when present) carries the blurred state.
    - Revealing the answer, then clicking Correct / Incorrect, emits `grade` with the matching
      value.
    - Grade actions are absent before the answer is revealed and disabled while `grading` is true.
    - A card with no `imageUrl` renders no image element.
- **`SessionView`** (`@vue/test-utils`, with the composable's client stubbed or the composable
  mocked): renders the loading state, then a `ReviewCard` for a ready session; renders the
  `empty` and `finished` states; a new current card resets reveal state (asserts the `:key`
  remount behaviour).

## Notes

- Suggested order, compiling/type-checking after each: API layer (deps → `generate:api` →
  `client.ts`) → composable → `ReviewCard` → `SessionView` → wire into `App.vue` → run against
  the local core. `npm run type-check` after each layer.
- **Confirm the exact CLI/API of `openapi-typescript` and `openapi-fetch` against their
  installed versions' docs** rather than assuming signatures. If a signature differs from what
  this spec sketches, follow the library and keep the behaviour described here.
- CORS on the core already allows `http://localhost:5173`; no proxy needed in dev.
- Follow the layering, naming, and workflow rules in `AGENTS.md`.