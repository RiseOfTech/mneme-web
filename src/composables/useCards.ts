import { ref, readonly } from 'vue'
import { client as defaultClient, type ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type CardResponseDto = components['schemas']['CardResponseDto']
type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

export function useCards(client: ApiClient = defaultClient) {
  const cards = ref<CardResponseDto[]>([])
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)

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

  return {
    cards: readonly(cards),
    status: readonly(status),
    error: readonly(error),
    load,
  }
}
