import { describe, it, expect, vi } from 'vitest'
import { useCards } from '../useCards'
import type { ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
type CreateCardRequestDto = components['schemas']['CreateCardRequestDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

function makeCard(overrides: Partial<CardResponseDto> = {}): CardResponseDto {
  return {
    id: 'card-1',
    word: 'Katze',
    translation: 'cat',
    association: 'a cat sounds like "katze"',
    visibility: 'PRIVATE',
    ...overrides,
  }
}

function makeCreatePayload(
  overrides: Partial<CreateCardRequestDto> = {},
): CreateCardRequestDto {
  return {
    word: 'Katze',
    translation: 'cat',
    association: 'a cat sounds like "katze"',
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

describe('useCards', () => {
  describe('load', () => {
    it('sets status to ready and stores the cards on a non-empty list', async () => {
      const card = makeCard()
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [card],
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const cards = useCards(client)
      await cards.load()

      expect(cards.status.value).toBe('ready')
      expect(cards.cards.value).toEqual([card])
    })

    it('sets status to empty on an empty list', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: [],
          error: undefined,
          response: { ok: true } as Response,
        }),
      })

      const cards = useCards(client)
      await cards.load()

      expect(cards.status.value).toBe('empty')
      expect(cards.cards.value).toEqual([])
    })

    it('sets status to error when the client returns an HTTP error', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'boom' },
          response: { ok: false } as Response,
        }),
      })

      const cards = useCards(client)
      await cards.load()

      expect(cards.status.value).toBe('error')
      expect(cards.error.value).not.toBeNull()
    })

    it('sets status to error when the client throws', async () => {
      const client = makeStubClient({
        GET: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const cards = useCards(client)
      await cards.load()

      expect(cards.status.value).toBe('error')
      expect(cards.error.value).not.toBeNull()
    })
  })

  describe('create', () => {
    it('posts the payload and returns the created card on success', async () => {
      const payload = makeCreatePayload()
      const created = makeCard()
      const postMock = vi.fn<AnyAsyncFn>().mockResolvedValue({
        data: created,
        error: undefined,
        response: { ok: true } as Response,
      })
      const client = makeStubClient({ POST: postMock })

      const cards = useCards(client)
      const result = await cards.create(payload)

      expect(postMock).toHaveBeenCalledWith('/v1/cards', { body: payload })
      expect(result).toEqual(created)
      expect(cards.submitting.value).toBe(false)
      expect(cards.submitError.value).toBeNull()
    })

    it('returns null and sets submitError on an HTTP failure', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockResolvedValue({
          data: undefined,
          error: { title: 'Validation failed' },
          response: { ok: false } as Response,
        }),
      })

      const cards = useCards(client)
      const result = await cards.create(makeCreatePayload())

      expect(result).toBeNull()
      expect(cards.submitError.value).not.toBeNull()
      expect(cards.submitting.value).toBe(false)
    })

    it('returns null and sets submitError when the client throws', async () => {
      const client = makeStubClient({
        POST: vi.fn<AnyAsyncFn>().mockRejectedValue(new TypeError('Failed to fetch')),
      })

      const cards = useCards(client)
      const result = await cards.create(makeCreatePayload())

      expect(result).toBeNull()
      expect(cards.submitError.value).not.toBeNull()
      expect(cards.submitting.value).toBe(false)
    })
  })
})
