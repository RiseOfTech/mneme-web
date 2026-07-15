import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import NewCardView from '../NewCardView.vue'
import { client } from '@/api/client'
import { routes } from '@/router'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAsyncFn = (...args: any[]) => Promise<any>

vi.mock('@/api/client', () => ({
  client: {
    GET: vi.fn<AnyAsyncFn>(),
    POST: vi.fn<AnyAsyncFn>(),
  },
}))

const mockedPost = vi.mocked(client.POST)

async function mountAtNewCard(): Promise<{ router: Router; wrapper: ReturnType<typeof mount> }> {
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.push('/cards/new')
  await router.isReady()
  const wrapper = mount(NewCardView, { global: { plugins: [router] } })
  return { router, wrapper }
}

beforeEach(() => {
  mockedPost.mockReset()
})

describe('NewCardView', () => {
  it('shows validation messages for empty required fields and does not submit', async () => {
    const { wrapper } = await mountAtNewCard()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Word is required.')
    expect(wrapper.text()).toContain('Translation is required.')
    expect(wrapper.text()).toContain('Association is required.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('treats whitespace-only input as empty', async () => {
    const { wrapper } = await mountAtNewCard()

    await wrapper.find('#word').setValue('   ')
    await wrapper.find('#translation').setValue('   ')
    await wrapper.find('#association').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Word is required.')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('clears a stale validation message once the field is filled in and resubmitted', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'card-1', word: 'Katze', translation: 'cat', association: 'assoc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtNewCard()

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Word is required.')

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('a cat sounds like "katze"')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Word is required.')
    expect(mockedPost).toHaveBeenCalledTimes(1)
  })

  it('submits trimmed values and omits imageUrl when blank', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'card-1', word: 'Katze', translation: 'cat', association: 'assoc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtNewCard()

    await wrapper.find('#word').setValue('  Katze  ')
    await wrapper.find('#translation').setValue('  cat  ')
    await wrapper.find('#association').setValue('  a cat sounds like "katze"  ')
    await wrapper.find('#imageUrl').setValue('   ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPost).toHaveBeenCalledWith('/v1/cards', {
      body: {
        word: 'Katze',
        translation: 'cat',
        association: 'a cat sounds like "katze"',
      },
    })
  })

  it('includes imageUrl trimmed when provided', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'card-1', word: 'Katze', translation: 'cat', association: 'assoc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper } = await mountAtNewCard()

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('assoc')
    await wrapper.find('#imageUrl').setValue('  https://example.com/cat.png  ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockedPost).toHaveBeenCalledWith('/v1/cards', {
      body: {
        word: 'Katze',
        translation: 'cat',
        association: 'assoc',
        imageUrl: 'https://example.com/cat.png',
      },
    })
  })

  it('navigates to /cards on a successful submit', async () => {
    mockedPost.mockResolvedValue({
      data: { id: 'card-1', word: 'Katze', translation: 'cat', association: 'assoc' },
      error: undefined,
      response: { ok: true } as Response,
    })
    const { wrapper, router } = await mountAtNewCard()

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('assoc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('cards')
  })

  it('shows a form-level error, does not navigate, and keeps entered values on failure', async () => {
    mockedPost.mockResolvedValue({
      data: undefined,
      error: { title: 'boom' },
      response: { ok: false } as Response,
    })
    const { wrapper, router } = await mountAtNewCard()

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('assoc')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('new-card')
    expect(wrapper.text()).toContain('Failed to create the card')
    expect((wrapper.find('#word').element as HTMLInputElement).value).toBe('Katze')
    expect((wrapper.find('#translation').element as HTMLInputElement).value).toBe('cat')
  })
})
