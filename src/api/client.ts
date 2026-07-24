import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { getAccessToken } from '@/auth/session'
import { refreshAccessToken } from '@/auth/refresh'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const RETRY_HEADER = 'X-Refresh-Retry'

// Stashed here in onRequest, before the request is sent — by the time onResponse
// sees it, its body stream has already been consumed by fetch() and can no longer
// be cloned.
const originalRequests = new WeakMap<Request, Request>()

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    originalRequests.set(request, request.clone())
    return request
  },
  async onResponse({ request, response, options }) {
    if (response.status !== 401 || request.headers.has(RETRY_HEADER)) {
      return response
    }

    const token = await refreshAccessToken()
    const original = originalRequests.get(request)
    if (!token || !original) {
      return response
    }

    const headers = new Headers(original.headers)
    headers.set('Authorization', `Bearer ${token}`)
    headers.set(RETRY_HEADER, '1')
    const retryRequest = new Request(original, { headers })

    return options.fetch(retryRequest)
  },
}

export const client = createClient<paths>({ baseUrl })
client.use(authMiddleware)

export type ApiClient = typeof client
