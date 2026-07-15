import { ref, readonly } from 'vue'
import { client as defaultClient, type ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
type CreateCardRequestDto = components['schemas']['CreateCardRequestDto']
type UpdateCardRequestDto = components['schemas']['UpdateCardRequestDto']
type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
type CardStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'error'

export function useCards(client: ApiClient = defaultClient) {
  const cards = ref<CardResponseDto[]>([])
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)
  const submitting = ref(false)
  const submitError = ref<string | null>(null)
  const card = ref<CardResponseDto | null>(null)
  const cardStatus = ref<CardStatus>('idle')

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

  async function loadOne(id: string) {
    cardStatus.value = 'loading'
    error.value = null

    try {
      const { data, error: err, response } = await client.GET('/v1/cards/{id}', {
        params: { path: { id } },
      })

      if (response.status === 404) {
        cardStatus.value = 'notFound'
        return
      }

      if (err || !response.ok) {
        cardStatus.value = 'error'
        error.value = 'Failed to load the card. Please try again.'
        return
      }

      card.value = data ?? null
      cardStatus.value = 'ready'
    } catch {
      cardStatus.value = 'error'
      error.value = 'Failed to load the card. Please try again.'
    }
  }

  async function update(
    id: string,
    payload: UpdateCardRequestDto,
  ): Promise<CardResponseDto | null> {
    submitting.value = true
    submitError.value = null

    try {
      const { data, error: err, response } = await client.PUT('/v1/cards/{id}', {
        params: { path: { id } },
        body: payload,
      })

      if (err || !response.ok) {
        submitError.value = 'Failed to save the card. Please try again.'
        return null
      }

      return data ?? null
    } catch {
      submitError.value = 'Failed to save the card. Please try again.'
      return null
    } finally {
      submitting.value = false
    }
  }

  async function remove(id: string): Promise<boolean> {
    submitting.value = true
    submitError.value = null

    try {
      const { response } = await client.DELETE('/v1/cards/{id}', {
        params: { path: { id } },
      })

      if (!response.ok) {
        submitError.value = 'Failed to delete the card. Please try again.'
        return false
      }

      return true
    } catch {
      submitError.value = 'Failed to delete the card. Please try again.'
      return false
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
    card: readonly(card),
    cardStatus: readonly(cardStatus),
    load,
    create,
    loadOne,
    update,
    remove,
  }
}
