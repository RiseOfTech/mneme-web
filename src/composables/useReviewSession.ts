import { ref, computed, readonly } from 'vue'
import { client as defaultClient, type ApiClient } from '@/api/client'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']
type Grade = components['schemas']['GradeRequestDto']['grade']
type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'finished' | 'error'

export function useReviewSession(client: ApiClient = defaultClient) {
  const cards = ref<SessionCardDto[]>([])
  const index = ref(0)
  const status = ref<Status>('idle')
  const grading = ref(false)
  const error = ref<string | null>(null)

  const currentCard = computed<SessionCardDto | null>(() => cards.value[index.value] ?? null)

  async function load() {
    status.value = 'loading'
    error.value = null

    try {
      const { data, error: err, response } = await client.GET('/v1/session/cards')

      if (err || !response.ok) {
        status.value = 'error'
        error.value = 'Failed to load your session. Please try again.'
        return
      }

      cards.value = data ?? []
      index.value = 0
      status.value = cards.value.length > 0 ? 'ready' : 'empty'
    } catch {
      status.value = 'error'
      error.value = 'Failed to load your session. Please try again.'
    }
  }

  async function grade(grade: Grade) {
    const card = currentCard.value
    if (!card?.cardId) return

    grading.value = true
    try {
      const { error: err, response } = await client.POST('/v1/reviews/{cardId}', {
        params: { path: { cardId: card.cardId } },
        body: { grade },
      })

      if (err || !response.ok) {
        error.value = 'Failed to submit your grade. Please try again.'
        return
      }

      error.value = null
      index.value += 1
      if (index.value >= cards.value.length) {
        status.value = 'finished'
      }
    } catch {
      error.value = 'Failed to submit your grade. Please try again.'
    } finally {
      grading.value = false
    }
  }

  return {
    cards: readonly(cards),
    index: readonly(index),
    status: readonly(status),
    grading: readonly(grading),
    error: readonly(error),
    currentCard,
    load,
    grade,
  }
}
