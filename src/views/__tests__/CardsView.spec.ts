import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import CardsView from '../CardsView.vue'
import { client } from '@/api/client'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

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

const mockedGet = vi.mocked(client.GET)

beforeEach(() => {
  mockedGet.mockReset()
})

describe('CardsView', () => {
  it('renders a row per card showing only word and translation', async () => {
    const cardA = makeCard({
      id: 'card-1',
      word: 'Katze',
      translation: 'cat',
      association: 'a cat sounds like "katze"',
      visibility: 'PRIVATE',
    })
    const cardB = makeCard({ id: 'card-2', word: 'Hund', translation: 'dog' })
    mockedGet.mockResolvedValue({
      data: [cardA, cardB],
      error: undefined,
      response: { ok: true } as Response,
    })

    const wrapper = mount(CardsView)
    await flushPromises()

    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(wrapper.text()).toContain('Katze')
    expect(wrapper.text()).toContain('cat')
    expect(wrapper.text()).toContain('Hund')
    expect(wrapper.text()).toContain('dog')
    expect(wrapper.text()).not.toContain('a cat sounds like')
    expect(wrapper.text()).not.toContain('PRIVATE')
  })

  it('renders the empty state for a caller with no cards', async () => {
    mockedGet.mockResolvedValue({
      data: [],
      error: undefined,
      response: { ok: true } as Response,
    })

    const wrapper = mount(CardsView)
    await flushPromises()

    expect(wrapper.text()).toContain('No cards yet.')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('renders the error state with a Retry that reloads', async () => {
    mockedGet.mockResolvedValueOnce({
      data: undefined,
      error: { title: 'boom' },
      response: { ok: false } as Response,
    })

    const wrapper = mount(CardsView)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load your cards')
    const retryButton = wrapper.findAll('button').find((b) => b.text() === 'Retry')
    expect(retryButton).toBeTruthy()

    mockedGet.mockResolvedValueOnce({
      data: [makeCard()],
      error: undefined,
      response: { ok: true } as Response,
    })
    await retryButton?.trigger('click')
    await flushPromises()

    expect(mockedGet).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('li')).toHaveLength(1)
  })
})
