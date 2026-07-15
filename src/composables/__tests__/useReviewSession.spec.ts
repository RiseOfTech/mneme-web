import { describe, it, expect, vi } from 'vitest'
import { useReviewSession } from '../useReviewSession'
import type { ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

function makeCard(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    cardId: 'card-1',
    word: 'Katze',
    translation: 'cat',
    association: 'a cat sounds like "katze"',
    box: 1,
    dueAt: '2026-07-14T00:00:00Z',
    ...overrides,
  }
}

function makeStubClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
    ...overrides,
  } as unknown as ApiClient
}

describe('useReviewSession', () => {
  describe('load', () => {
    it('sets status to ready and currentCard to the first card on a non-empty session', async () => {
      const card = makeCard()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [card],
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const session = useReviewSession(client)
      await session.load()

      expect(session.status.value).toBe('ready')
      expect(session.currentCard.value).toEqual(card)
    })

    it('sets status to empty on an empty session', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [],
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const session = useReviewSession(client)
      await session.load()

      expect(session.status.value).toBe('empty')
      expect(session.currentCard.value).toBeNull()
    })

    it('sets status to error when the client returns an error', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'boom' },
          response: { ok: false } as Response,
        }),
      })

      const session = useReviewSession(client)
      await session.load()

      expect(session.status.value).toBe('error')
    })

    it('sets status to error when the client throws', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const session = useReviewSession(client)
      await session.load()

      expect(session.status.value).toBe('error')
      expect(session.error.value).not.toBeNull()
    })
  })

  describe('grade', () => {
    it('posts the grade and advances on a body-less success response', async () => {
      const cardA = makeCard({ cardId: 'card-1' })
      const cardB = makeCard({ cardId: 'card-2' })
      const post = vi.fn<AnyAsyncFn>().mockResolvedValue({
        data: undefined,
        error: undefined,
        response: { ok: true } as Response,
      })
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [cardA, cardB],
          error: undefined,
          response: { ok: true } as Response,
        }),
        POST: post,
      })

      const session = useReviewSession(client)
      await session.load()
      await session.grade('CORRECT')

      expect(post).toHaveBeenCalledWith('/v1/reviews/{cardId}', {
        params: { path: { cardId: 'card-1' } },
        body: { grade: 'CORRECT' },
      })
      expect(session.currentCard.value).toEqual(cardB)
      expect(session.status.value).toBe('ready')
    })

    it('sets status to finished after grading the last card', async () => {
      const card = makeCard()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [card],
          error: undefined,
          response: { ok: true } as Response,
        }),
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const session = useReviewSession(client)
      await session.load()
      await session.grade('CORRECT')

      expect(session.status.value).toBe('finished')
      expect(session.currentCard.value).toBeNull()
    })

    it('keeps the current card and surfaces the error, clearing grading, on failure', async () => {
      const card = makeCard()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [card],
          error: undefined,
          response: { ok: true } as Response,
        }),
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'boom' },
          response: { ok: false } as Response,
        }),
      })

      const session = useReviewSession(client)
      await session.load()
      await session.grade('CORRECT')

      expect(session.currentCard.value).toEqual(card)
      expect(session.error.value).not.toBeNull()
      expect(session.grading.value).toBe(false)
    })

    it('keeps the current card and surfaces the error, clearing grading, when the client throws', async () => {
      const card = makeCard()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [card],
          error: undefined,
          response: { ok: true } as Response,
        }),
        POST: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const session = useReviewSession(client)
      await session.load()
      await session.grade('CORRECT')

      expect(session.currentCard.value).toEqual(card)
      expect(session.index.value).toBe(0)
      expect(session.status.value).toBe('ready')
      expect(session.error.value).not.toBeNull()
      expect(session.grading.value).toBe(false)
    })
  })
})
