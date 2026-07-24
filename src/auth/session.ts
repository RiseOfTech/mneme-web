import { computed, readonly, ref } from 'vue'

type Status = 'anonymous' | 'authenticated'

const accessToken = ref<string | null>(null)
const status = ref<Status>('anonymous')

export function setAccessToken(token: string) {
  accessToken.value = token
  status.value = 'authenticated'
}

export function clearSession() {
  accessToken.value = null
  status.value = 'anonymous'
}

export const isAuthenticated = computed(() => status.value === 'authenticated')

export function getAccessToken() {
  return accessToken.value
}

export const session = {
  accessToken: readonly(accessToken),
  status: readonly(status),
  isAuthenticated,
}
