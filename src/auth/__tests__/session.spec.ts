import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setAccessToken, clearSession, isAuthenticated, getAccessToken, session } from '../session'

describe('auth session module', () => {
  beforeEach(() => {
    clearSession()
  })

  it('starts anonymous with no token', () => {
    expect(isAuthenticated.value).toBe(false)
    expect(getAccessToken()).toBeNull()
  })

  it('setAccessToken stores the token and flips isAuthenticated to true', () => {
    setAccessToken('jwt-abc')

    expect(getAccessToken()).toBe('jwt-abc')
    expect(isAuthenticated.value).toBe(true)
    expect(session.status.value).toBe('authenticated')
  })

  it('clearSession nulls the token and flips isAuthenticated back to false', () => {
    setAccessToken('jwt-abc')

    clearSession()

    expect(getAccessToken()).toBeNull()
    expect(isAuthenticated.value).toBe(false)
    expect(session.status.value).toBe('anonymous')
  })

  it('two importers observe the same state', async () => {
    const otherImporter = await import('../session')

    setAccessToken('shared-token')

    expect(otherImporter.getAccessToken()).toBe('shared-token')
    expect(otherImporter.isAuthenticated.value).toBe(true)
  })

  it('starts resolving on a fresh module load, before any clearSession/setAccessToken call', async () => {
    vi.resetModules()
    const fresh = await import('../session')

    expect(fresh.session.status.value).toBe('resolving')
    expect(fresh.isAuthenticated.value).toBe(false)
  })
})
