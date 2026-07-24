import { ref, readonly } from 'vue'
import { authClient as defaultClient, type AuthClient } from '@/api/authClient'
import { setAccessToken } from '@/auth/session'
import { endSession } from '@/auth/refresh'

export function useAuth(client: AuthClient = defaultClient) {
  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  async function login(email: string, password: string): Promise<boolean> {
    submitting.value = true
    submitError.value = null

    try {
      const { data, error: err, response } = await client.POST('/v1/auth/login', {
        body: { email, password },
      })

      if (err || !response.ok) {
        submitError.value = 'Email or password is incorrect'
        return false
      }

      setAccessToken(data.accessToken)
      return true
    } catch {
      submitError.value = "Couldn't reach the server. Try again."
      return false
    } finally {
      submitting.value = false
    }
  }

  async function logout(): Promise<void> {
    try {
      await client.POST('/v1/auth/logout')
    } catch {
      // The user asked to leave; the session is cleared regardless.
    } finally {
      endSession()
    }
  }

  return {
    submitting: readonly(submitting),
    submitError: readonly(submitError),
    login,
    logout,
  }
}
