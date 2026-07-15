import { ref, readonly } from 'vue'
import { client as defaultClient, type ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
type CreateCardRequestDto = components['schemas']['CreateCardRequestDto']
type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function useCards(client: ApiClient = defaultClient) {
  const cards = ref<CardResponseDto[]>([])
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)
  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  async function load() {
    status.value = 'loading'
    error.value = null

    try {
      const { data, error: err, response } = await client.GET('/v1/cards')

      if (err || !response.ok) {
        status.value = 'error'
        error.value = 'Failed to load your cards. Please try again.'
        return
      }

      cards.value = data ?? []
      status.value = cards.value.length > 0 ? 'ready' : 'empty'
    } catch {
      status.value = 'error'
      error.value = 'Failed to load your cards. Please try again.'
    }
  }

  async function create(payload: CreateCardRequestDto): Promise<CardResponseDto | null> {
    submitting.value = true
    submitError.value = null

    try {
      const { data, error: err, response } = await client.POST('/v1/cards', { body: payload })

      if (err || !response.ok) {
        submitError.value = 'Failed to create the card. Please try again.'
        return null
      }

      return data ?? null
    } catch {
      submitError.value = 'Failed to create the card. Please try again.'
      return null
    } finally {
      submitting.value = false
    }
  }

  return {
    cards: readonly(cards),
    status: readonly(status),
    error: readonly(error),
    submitting: readonly(submitting),
    submitError: readonly(submitError),
    load,
    create,
  }
}
