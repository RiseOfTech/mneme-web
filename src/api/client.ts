import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { getAccessToken } from '@/auth/session'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = getAccessToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
}

export const client = createClient<paths>({ baseUrl })
client.use(authMiddleware)

export type ApiClient = typeof client
