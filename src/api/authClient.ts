import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './authSchema'
import { getAccessToken } from '@/auth/session'

const baseUrl = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8081'

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
}

export const authClient = createClient<paths>({ baseUrl, credentials: 'include' })
authClient.use(authMiddleware)

export type AuthClient = typeof authClient
