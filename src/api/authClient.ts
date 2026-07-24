import createClient from 'openapi-fetch'
import type { paths } from './authSchema'
import { createRetryMiddleware } from './retryMiddleware'

const baseUrl = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8081'

// A failed login or a failed refresh is a final answer: a 401 from /v1/auth/* must never
// trigger a refresh (refreshing in response to a failed refresh would recurse).
const AUTH_PATH_PREFIX = '/v1/auth/'

export const authClient = createClient<paths>({ baseUrl, credentials: 'include' })
authClient.use(
  createRetryMiddleware({
    excludeFromRetry: (pathname) => pathname.startsWith(AUTH_PATH_PREFIX),
  }),
)

export type AuthClient = typeof authClient
