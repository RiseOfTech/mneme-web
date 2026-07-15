# Session error state — catch network failures — spec

## Goal

Slice 001 handles *HTTP* failures (a 4xx/5xx response) correctly, but not *thrown* ones.
`openapi-fetch` returns `{ data, error, response }` only when a response arrives. When the
request never completes — the core is down (`ERR_CONNECTION_REFUSED`), DNS/CORS blocks it,
the network drops — the underlying `fetch` **rejects**, and the promise throws.

Today that throw is unhandled:

- `load()` has no `try/catch` → the exception escapes and `status` stays `'loading'` forever.
  The user sees "Loading your session…" indefinitely, with no error and no Retry.
- `grade()` has `try/finally` but no `catch` → `grading` is cleared, but `error` is never set
  and the card never advances. The user taps a grade button and *nothing happens* — a silent
  failure.

This slice makes both paths fail visibly. No new architecture, no new dependencies, no UI
redesign.

Reproduce before fixing: stop `mneme-core`, run `npm run dev`, open the app → it hangs on
"Loading your session…". That is the bug.

## In scope

### `src/composables/useReviewSession.ts`

- Wrap the `client.GET` call in `load()` in `try/catch`. On a thrown error, set
  `status = 'error'` and the same user-facing `error` message the HTTP-failure path already
  sets. The existing `err || !response.ok` branch stays exactly as it is — it is correct.
- Add a `catch` to the existing `try` in `grade()`. On a thrown error, set the same
  user-facing `error` message the HTTP-failure path sets, keep the current card, and do not
  advance. The existing `finally` that clears `grading` stays.
- Do not change the state shape, the exposed API, `readonly()` usage, or the success paths.
- The two failure modes (HTTP failure vs. thrown) may share one message each; do not surface
  raw exception text to the user.

### `src/views/SessionView.vue`

- Cover the `'idle'` status so the initial render before `onMounted` is not an empty section.
  Simplest acceptable fix: render the loading indicator for `'idle'` as well as `'loading'`.
- No other change.

## Out of scope

- No retry/backoff, no timeout, no exponential retry logic. Retry stays the user's manual
  button.
- No error-reporting service, no logging infrastructure, no toast/notification component.
- No change to the HTTP-failure branches — they work.
- No change to `ReviewCard`, the API client, the middleware, or `App.vue`.
- No new dependencies.
- No narrowing of the generated DTO types (the `?.`/`?? []` noise from the contract's missing
  `required` block is a known, separate concern — do not address it here).
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest run
   non-interactively).
2. With `mneme-core` stopped: the app shows the error state with a working Retry button —
   not a hanging loader. Start the core, click Retry, and the session loads. (Manual check.)
3. A thrown failure during `grade()` shows the grade error inline, keeps the current card,
   and clears `grading` so the buttons are usable again. (Covered by test.)
4. `status` is never left at `'loading'` after `load()` settles, on any path.
5. No raw exception message is rendered to the user.

## Tests

Extend `src/composables/__tests__/useReviewSession.spec.ts`, using the existing stub-client
pattern — a stub whose `GET`/`POST` **reject** (e.g. `vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))`),
which is what a real network failure looks like:

- `load()` when the client rejects → `status = 'error'`, `error` is set, and it does not stay
  `'loading'`.
- `grade()` when the client rejects → the current card is unchanged, `index` has not advanced,
  `error` is set, and `grading` is `false`.
- The existing tests must still pass unchanged — this slice adds paths, it does not alter
  existing behaviour.

## Notes

- The distinction to keep in mind: `{ error }` returned = the server answered and said no;
  a thrown exception = there was no answer at all. Both must reach the user, by different
  code paths.
- Follow the rules in `AGENTS.md`. Branch `fix/session-error-state`, one commit,
  Conventional Commits, do not push.