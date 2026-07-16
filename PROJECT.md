# mneme-web

> Browser client for **Mneme** — a vocabulary-learning app built on mnemonic
> associations the user writes themselves.

This document describes *what* the product is and *why*. For *how* the frontend is
built, see `ARCHITECTURE.md`. For the rules the coding agent follows, see `AGENTS.md`.

## What Mneme is

Mneme helps a person memorise foreign-language words through **mnemonic associations
they author themselves**. A card is one word paired with its translation and a personal
associative hook — a mental image, a pun, a story — that the user writes. A card may
optionally carry an image.

The system **never generates learning content.** The association is always the user's
own; that personal connection is the whole point, not a limitation.

Review scheduling uses **Leitner boxes**: a card sits in a box (1–5). Answering it
correctly promotes it to the next box (a longer interval before it is due again);
answering incorrectly sends it back to box 1. The grade is **binary** — correct or
incorrect. There is no partial credit.

## Division of responsibility: core vs. client

Mneme is two separate repositories with a strict boundary.

- **`mneme-core` (backend, done) serves data.** It returns the full card (word,
  translation, association, image, box, due date) and accepts a grade. It knows nothing
  about screens.
- **`mneme-web` (this repo) owns the experience.** What is shown first, what is hidden,
  what a tap reveals, the order of hints, the blur — all of this lives here. The API has
  no concept of "hints" or "reveal steps"; those are UI, not endpoints.

The core stays a **universal data service, not a screen-shaped one.** If the client ever
seems to need something the API doesn't offer, the answer is a client-side solution or
(later) a dedicated BFF service — **never** a change to the core.

## The core experience: a review session

This is the heart of the product and the reason this client exists. When the user sits
down to study, the client fetches the cards due now and walks them one at a time. For
each card the interaction is a **progressive reveal** — the user tries to recall before
seeing the answer:

1. **Prompt.** Show only the word. The user tries to recall the translation from memory.
2. **Hint 1 — the image.** The card carries the user's image on its back; tapping the card
   turns it over, and tapping again turns it back.
3. **Hint 2 — the association.** If still stuck, the user reveals the association text —
   their own mnemonic hook, the intended path back to the word.
4. **Answer.** The user reveals the translation and sees whether they were right.
5. **Grade.** The user self-assesses with one action: **correct** or **incorrect**. The
   core moves the Leitner box; the card leaves the session (its next due date is now in
   the future); the client advances to the next card.

The hints are **optional and sequential**: a confident user answers straight from the
word; a struggling user peels back image, then association, then translation. Whether the
user used hints does **not** change the grade — it is still just correct/incorrect
(binary, by design). "I remembered after a hint" is the user's call to grade honestly.

Direction is **word → translation** for now. Reversed direction (show the translation,
ask for the word) is a later option, not part of the first version.

## Scope

**Current milestone — the first thin slice: complete one review session, end to end.**
This proves the client↔core loop works:

- Authenticate with a manually-entered dev bearer token (no registration form yet).
- Fetch the due cards, run the progressive reveal above, submit a grade, and advance
  until the session is empty.

(The detailed slice spec lives with its agent task when we write it — not in this doc.)

**Deferred — later slices, deliberately not now:**

- Card management (create / edit / delete) — the next slice after the session loop works.
- Registration / login UI — a dev token is entered manually for now.
- Reversed-direction quizzing (translation → word).
- Settings, a statistics dashboard, gamification.
- Offline mode, sync, push notifications.
- AI image generation — a Phase-2 backend service, invisible to this client.
- Any screen-specific endpoint requested from the core. The client shapes what the core
  already returns.

## Reference

- **API contract:** `openapi.json` (the source of truth for request/response shapes).
- **Related docs:** `ARCHITECTURE.md` (how the frontend is built), `AGENTS.md` (rules for
  the coding agent).