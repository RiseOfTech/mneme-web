import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import EditCardView from '../EditCardView.vue'
import { client } from '@/api/client'
import { routes } from '@/router'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(),
    PUT: vi.fn<AnyAsyncFn>(),
    DELETE: vi.fn<AnyAsyncFn>(),
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
const mockedPut = vi.mocked(client.PUT)
const mockedDelete = vi.mocked(client.DELETE)

async function mountAtEditCard(
  id = 'card-1',
): Promise<{ router: Router; wrapper: ReturnType<typeof mount> }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push(`/cards/${id}/edit`)
  await router.isReady()
  const wrapper = mount(EditCardView, { global: { plugins: [router] } })
  await flushPromises()
  return { router, wrapper }
}

beforeEach(() => {
  mockedGet.mockReset()
  mockedPut.mockReset()
  mockedDelete.mockReset()
})

describe('EditCardView', () => {
  it('sends visibility unchanged when a PUBLIC card is saved without edits', async () => {
    const card = makeCard({ visibility: 'PUBLIC' })
    mockedGet.mockResolvedValue({
      data: card,
      error: undefined,
      response: { ok: true, status: 200 } as Response,
    })
    mockedPut.mockResolvedValue({
      data: card,
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtEditCard()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPut).toHaveBeenCalledWith('/v1/cards/{id}', {
      params: { path: { id: 'card-1' } },
      body: {
        word: 'Katze',
        translation: 'cat',
        association: 'a cat sounds like "katze"',
        visibility: 'PUBLIC',
      },
    })
  })

  it('renders the not-found state with no Retry button', async () => {
    mockedGet.mockResolvedValue({
      data: undefined,
      error: { title: 'Not Found' },
      response: { ok: false, status: 404 } as Response,
    })
    const { wrapper } = await mountAtEditCard('missing-id')

    expect(wrapper.text()).toContain('Card not found.')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Retry')).toBeUndefined()
    const backLink = wrapper.findAll('a').find((a) => a.text() === 'Back to cards')
    expect(backLink?.attributes('href')).toBe('/cards')
  })

  it('requires Confirm before deleting: Delete alone calls nothing', async () => {
    mockedGet.mockResolvedValue({
      data: makeCard(),
      error: undefined,
      response: { ok: true, status: 200 } as Response,
    })
    const { wrapper } = await mountAtEditCard()

    const deleteButton = wrapper.findAll('button').find((b) => b.text() === 'Delete')
    await deleteButton?.trigger('click')

    expect(mockedDelete).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Delete this card?')
  })

  it('Confirm deletes and navigates to /cards', async () => {
    mockedGet.mockResolvedValue({
      data: makeCard(),
      error: undefined,
      response: { ok: true, status: 200 } as Response,
    })
    mockedDelete.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: { ok: true, status: 204 } as Response,
    })
    const { wrapper, router } = await mountAtEditCard()

    const deleteButton = wrapper.findAll('button').find((b) => b.text() === 'Delete')
    await deleteButton?.trigger('click')
    const confirmButton = wrapper.findAll('button').find((b) => b.text() === 'Confirm')
    await confirmButton?.trigger('click')
    await flushPromises()

    expect(mockedDelete).toHaveBeenCalledWith('/v1/cards/{id}', {
      params: { path: { id: 'card-1' } },
    })
    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('Cancel at the confirm step deletes nothing and restores the normal state', async () => {
    mockedGet.mockResolvedValue({
      data: makeCard(),
      error: undefined,
      response: { ok: true, status: 200 } as Response,
    })
    const { wrapper } = await mountAtEditCard()

    const deleteButton = wrapper.findAll('button').find((b) => b.text() === 'Delete')
    await deleteButton?.trigger('click')
    const cancelButton = wrapper.findAll('button').find((b) => b.text() === 'Cancel')
    await cancelButton?.trigger('click')

    expect(mockedDelete).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Delete this card?')
    expect(wrapper.findAll('button').find((b) => b.text() === 'Delete')).toBeTruthy()
  })

  it('a failed save does not navigate and shows the error', async () => {
    mockedGet.mockResolvedValue({
      data: makeCard(),
      error: undefined,
      response: { ok: true, status: 200 } as Response,
    })
    mockedPut.mockResolvedValue({
      data: undefined,
      error: { title: 'boom' },
      response: { ok: false } as Response,
    })
    const { wrapper, router } = await mountAtEditCard()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('edit-card')
    expect(wrapper.text()).toContain('Failed to save the card')
  })
})
