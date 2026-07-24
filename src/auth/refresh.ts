import { authClient } from '@/api/authClient'
import { setAccessToken, clearSession } from '@/auth/session'

let inFlight: Promise<string | null> | null = null
let generation = 0

export function endSession(): void {
  inFlight = null
  generation++
  clearSession()
}

async function performRefresh(startedAt: number): Promise<string | null> {
  try {
    const { data, error, response } = await authClient.POST('/v1/auth/refresh')

    if (error || !response.ok || !data) {
      endSession()
      return null
    }

    // endSession() may have run while this request was in flight (e.g. the user
    // signed out). A late-arriving token must not sign them back in.
    if (generation !== startedAt) {
      return null
    }

    setAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    endSession()
    return null
  } finally {
    if (generation === startedAt) {
      inFlight = null
    }
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) {
    return inFlight
  }

  const attempt = performRefresh(generation)
  inFlight = attempt
  return attempt
}

let resolveSessionReady!: () => void
export const sessionReady = new Promise<void>((resolve) => {
  resolveSessionReady = resolve
})

export async function initSession(): Promise<void> {
  try {
    await refreshAccessToken()
  } catch {
    // refreshAccessToken already swallows failures into null; this is a last-resort
    // guard so a cold load can never surface an error to the user.
  } finally {
    resolveSessionReady()
  }
}
