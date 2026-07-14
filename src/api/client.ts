import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const authMiddleware: Middleware = {
  onRequest({ request }) {
    const token = import.meta.env.VITE_DEV_TOKEN
    if (!token) {
      console.warn('VITE_DEV_TOKEN is not set; outgoing requests will be unauthenticated.')
      return request
    }
    request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
}

export const client = createClient<paths>({ baseUrl })
client.use(authMiddleware)

export type ApiClient = typeof client
