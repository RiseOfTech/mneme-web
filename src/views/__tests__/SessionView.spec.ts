import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import SessionView from '../SessionView.vue'
import ReviewCard from '@/components/ReviewCard.vue'
import { client } from '@/api/client'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

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

const mockedGet = vi.mocked(client.GET)
const mockedPost = vi.mocked(client.POST)

beforeEach(() => {
  mockedGet.mockReset()
  mockedPost.mockReset()
})

describe('SessionView', () => {
  it('renders a loading state, then a ReviewCard for a ready session', async () => {
    let resolveGet!: (value: Awaited<ReturnType<typeof client.GET>>) => void
    mockedGet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve
        }),
    )

    const wrapper = mount(SessionView)
    await nextTick()
    expect(wrapper.text()).toContain('Fetching due cards')

    resolveGet({ data: [makeCard()], error: undefined, response: { ok: true } as Response })
    await flushPromises()

    expect(wrapper.findComponent(ReviewCard).exists()).toBe(true)
  })

  it('renders the empty state for a session with no due cards', async () => {
    mockedGet.mockResolvedValue({
      data: [],
      error: undefined,
      response: { ok: true } as Response,
    })

    const wrapper = mount(SessionView)
    await flushPromises()

    expect(wrapper.text()).toContain('Nothing due')
    expect(wrapper.findComponent(ReviewCard).exists()).toBe(false)
  })

  it('renders the finished state after grading the only card', async () => {
    mockedGet.mockResolvedValue({
      data: [makeCard()],
      error: undefined,
      response: { ok: true } as Response,
    })
    mockedPost.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: true } as Response,
    })

    const wrapper = mount(SessionView)
    await flushPromises()

    await wrapper.findComponent(ReviewCard).vm.$emit('grade', 'CORRECT')
    await flushPromises()

    expect(wrapper.text()).toContain('Session complete')
  })

  it('resets reveal state when advancing to the next card (key remount)', async () => {
    const cardA = makeCard({ cardId: 'card-1', translation: 'cat' })
    const cardB = makeCard({ cardId: 'card-2', translation: 'dog' })
    mockedGet.mockResolvedValue({
      data: [cardA, cardB],
      error: undefined,
      response: { ok: true } as Response,
    })
    mockedPost.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: true } as Response,
    })

    const wrapper = mount(SessionView)
    await flushPromises()

    const showAnswer = wrapper.findAll('button').find((b) => b.text() === 'Show answer')
    await showAnswer?.trigger('click')
    expect(wrapper.text()).toContain('cat')

    const correctButton = wrapper.findAll('button').find((b) => b.text() === 'Correct')
    await correctButton?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('dog')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Show answer')).toBe(true)
  })
})
