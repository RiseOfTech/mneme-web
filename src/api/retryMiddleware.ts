import type { Middleware } from 'openapi-fetch'
import { getAccessToken } from '@/auth/session'
import { refreshAccessToken } from '@/auth/refresh'

const RETRY_HEADER = 'X-Refresh-Retry'

export interface RetryMiddlewareOptions {
  /** Paths for which a 401 must never trigger a refresh or retry. */
  excludeFromRetry?: (pathname: string) => boolean
}

export function createRetryMiddleware(options: RetryMiddlewareOptions = {}): Middleware {
  // Stashed here in onRequest, before the request is sent — by the time onResponse
  // sees it, its body stream has already been consumed by fetch() and can no longer
  // be cloned.
  const originalRequests = new WeakMap<Request, Request>()

  return {
    onRequest({ request }) {
      const token = getAccessToken()
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
      originalRequests.set(request, request.clone())
      return request
    },
    async onResponse({ request, response, options: fetchOptions }) {
      if (response.status !== 401 || request.headers.has(RETRY_HEADER)) {
        return response
      }

      if (options.excludeFromRetry?.(new URL(request.url).pathname)) {
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

      return fetchOptions.fetch(retryRequest)
    },
  }
}
