import { ref, readonly } from 'vue'
import { authClient as defaultAuthClient, type AuthClient } from '@/api/authClient'
import type { components } from '@/api/authSchema'

type ProfileResponseDto = components['schemas']['ProfileResponseDto']
type Status = 'idle' | 'loading' | 'ready' | 'error'

export function useProfile(client: AuthClient = defaultAuthClient) {
  const profile = ref<ProfileResponseDto | null>(null)
  const status = ref<Status>('idle')
  const error = ref<string | null>(null)
  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  async function load() {
    status.value = 'loading'
    error.value = null

    try {
      const { data, error: err, response } = await client.GET('/v1/profile')

      if (err || !response.ok) {
        status.value = 'error'
        error.value = 'Failed to load your profile. Please try again.'
        return
      }

      profile.value = data ?? null
      status.value = 'ready'
    } catch {
      status.value = 'error'
      error.value = 'Failed to load your profile. Please try again.'
    }
  }

  async function save(nickname: string): Promise<boolean> {
    submitting.value = true
    submitError.value = null

    try {
      const { data, error: err, response } = await client.PUT('/v1/profile', {
        body: { nickname },
      })

      if (err || !response.ok) {
        submitError.value = 'Failed to save your profile. Please try again.'
        return false
      }

      profile.value = data ?? null
      return true
    } catch {
      submitError.value = 'Failed to save your profile. Please try again.'
      return false
    } finally {
      submitting.value = false
    }
  }

  return {
    profile: readonly(profile),
    status: readonly(status),
    error: readonly(error),
    submitting: readonly(submitting),
    submitError: readonly(submitError),
    load,
    save,
  }
}
