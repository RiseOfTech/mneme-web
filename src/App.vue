<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { isAuthenticated, session } from '@/auth/session'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { logout } = useAuth()

async function onSignOut() {
  await logout()
  router.push('/login')
}
</script>

<template>
  <div class="app-shell">
    <div class="noise-overlay" aria-hidden="true"></div>

    <div v-if="session.status.value === 'resolving'" class="state-loading">
      <div class="loading-ring" aria-hidden="true"></div>
    </div>

    <template v-else>
      <nav v-if="isAuthenticated" class="app-nav">
        <RouterLink to="/session">Review</RouterLink>
        <span class="nav-separator" aria-hidden="true">·</span>
        <RouterLink to="/cards">Cards</RouterLink>
        <span class="nav-separator" aria-hidden="true">·</span>
        <button type="button" class="sign-out-button" @click="onSignOut">Sign out</button>
      </nav>
      <main class="content">
        <RouterView />
      </main>
    </template>
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.noise-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: soft-light;
  opacity: var(--overlay-noise-opacity);
  background-image: var(--overlay-noise);
}

.state-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.loading-ring {
  position: relative;
  width: 4rem;
  height: 4rem;
}

.loading-ring::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid var(--color-flare);
  animation: flare-pulse var(--motion-pulse-duration) ease-in-out infinite;
}

@keyframes flare-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.app-nav {
  display: flex;
  align-items: center;
  gap: var(--nav-gap);
  padding: var(--nav-padding-block) var(--screen-padding-inline) 0;
  font-family: var(--font-mono);
  font-size: var(--text-nav);
  text-transform: uppercase;
  letter-spacing: var(--tracking-nav);
}

.app-nav a {
  padding-bottom: var(--nav-underline-gap);
  border-bottom: 1px solid transparent;
  color: var(--color-haze);
  transition:
    color var(--motion-duration) var(--motion-easing),
    border-bottom-color var(--motion-duration) var(--motion-easing);
}

.app-nav a:hover {
  color: var(--color-ink);
}

.app-nav a.router-link-active {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
}

.nav-separator {
  color: var(--color-haze-soft);
}

.sign-out-button {
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  padding-bottom: var(--nav-underline-gap);
  border-bottom: 1px solid transparent;
  color: var(--color-haze);
  transition:
    color var(--motion-duration) var(--motion-easing),
    border-bottom-color var(--motion-duration) var(--motion-easing);
}

.sign-out-button:hover,
.sign-out-button:focus-visible {
  color: var(--color-ink);
}

.content {
  flex: 1;
  width: 100%;
}
</style>
