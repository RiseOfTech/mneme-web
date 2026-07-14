# mneme-web — Project guidelines

Rules for the coding agent working in this repository. Where a global or user-level
agent configuration exists, the project-specific rules below take precedence on conflict.

`mneme-web` is the browser client of the **Mneme** product. Product scope lives in
`PROJECT.md`; the authoritative design lives in `ARCHITECTURE.md`. **Read `ARCHITECTURE.md`
before implementing.** If it does not cover something a task needs, that decision has not
been made — do not invent structure, ask.

The backend, `mneme-core`, is done and owns all data and rules. This client only shapes the
experience over the data the core returns.

## Stack

- Vue 3 (Composition API, `<script setup>`) + TypeScript + Vite — a client-rendered SPA.
- Package manager: npm.
- Exact versions live in `package.json` (the source of truth). Do not change versions
  unless a task asks for it.

## Commands

- Dev server: `npm run dev`
- Type-check: `npm run type-check`
- Build (type-check + bundle): `npm run build`
- Lint (auto-fixes in place): `npm run lint`
- Format: `npm run format`
- Unit tests, one-shot: `npx vitest run`

**Run tests non-interactively.** `npm run test:unit` starts Vitest in watch mode and will
hang an agent — always use `npx vitest run` in automated work.

**Definition of done for any task:** `npm run build`, `npm run lint`, and `npx vitest run`
are all green. Run them before committing.

## Working in slices

Same process as `mneme-core`: small, complete, vertical slices.

- Each task is a spec in `doc/` (e.g. `doc/001-review-session.md`). One spec = one slice =
  one branch = one commit = one PR.
- Before implementing, read `PROJECT.md`, `ARCHITECTURE.md`, `doc/openapi.json`, and the spec.
- Implement end to end across the layers the slice needs (api / composable / view / component).
  Type-check after each layer (`npm run type-check`).
- **Touch only the files the spec names.** Do not delete or rewrite anything outside its
  stated scope.
- Do not add dependencies the spec or `ARCHITECTURE.md` does not call for.
- Commit with a Conventional Commits message (`feat:`, `fix:`, `chore:`, `test:`, `refactor:`).
  Do not push unless asked.
- **Stop and ask** when a spec conflicts with `doc/openapi.json` or `ARCHITECTURE.md`,
  rather than working around it.

## Project rules

### The core is fixed

Never propose or assume a change to `mneme-core`. If the client seems to need something the
API doesn't offer, the answer is a client-side solution or (later) a BFF — never a core
change. Endpoints are consumed under `/v1`.

### Types come from the contract

Request/response types are generated from `doc/openapi.json` into `src/api/schema.d.ts` by
the project's api-generation script (defined when the API layer lands; see `ARCHITECTURE.md`).
**Never hand-edit the generated file; regenerate it** when the contract changes. Do not
hand-write types that duplicate generated shapes.

### Layering

- component → composable → API client → core. A component never calls the network directly;
  it goes through a composable. A composable never touches the DOM. This is the
  controller → service → gateway split.
- Non-trivial logic (session progression, grading) lives in composables
  (`src/composables/useXxx.ts`), unit-testable without mounting a component or hitting the
  network — the API client is a dependency of the composable, not a call baked into it.
- Data flows **props down, events up**. A child never mutates a prop; it emits an event and
  the state owner decides.
- UI-only state (e.g. which hints are revealed) is **local component state**, never in a
  composable or a store.

### Abstraction only where it earns its place

- Extract a component or composable when it is reused or too large to read — not
  preemptively. (The frontend echo of the core's "no interfaces over data": don't add a
  layer whose only job is to wrap one value or one caller.)
- **Do not add `vue-router` or Pinia** until a slice explicitly requires them; both are
  deliberately deferred (`ARCHITECTURE.md`). No speculative routing or global store.
- Do not invent the folder layout; it is defined in `ARCHITECTURE.md`.

### Conventions

- Single-file components, `<script setup lang="ts">`, Composition API — never the Options API.
- Component files PascalCase (`SessionView.vue`, `ReviewCard.vue`); composables `useXxx.ts`.
- TypeScript throughout; avoid `any`. Prefer generated types over inline shapes.

### Environment & secrets

Only `VITE_`-prefixed env vars reach client code, and they are **baked into the built
bundle** — not secret. Use them only for non-secrets (the dev token in `.env.local`). Never
put a real secret in a `VITE_` variable. `.env.local` is git-ignored; never commit it.

## Testing

- Vitest + `@vue/test-utils`. Run one-shot with `npx vitest run`.
- Unit-test composable logic in isolation with the API client mocked (session progression,
  grading). Component-test behaviour with `@vue/test-utils` (reveal steps; that grading emits
  the event).
- No end-to-end framework in the MVP (none is installed). Do not add one unless a slice asks.

## Out of scope (MVP)

See `PROJECT.md`. In short: no registration/login UI, no card-management UI until its slice,
no reversed-direction quizzing, no settings/stats/gamification, no offline/sync/push, no AI
image generation. Do not build these.