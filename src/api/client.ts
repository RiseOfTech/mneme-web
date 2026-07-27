import createClient from 'openapi-fetch'
import type { paths } from './schema'
import { createRetryMiddleware } from './retryMiddleware'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export const client = createClient<paths>({ baseUrl })
client.use(createRetryMiddleware())

export type ApiClient = typeof client
