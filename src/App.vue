<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <div class="noise-overlay" aria-hidden="true"></div>
    <nav class="app-nav">
      <RouterLink to="/session">Review</RouterLink>
      <span class="nav-separator" aria-hidden="true">·</span>
      <RouterLink to="/cards">Cards</RouterLink>
    </nav>
    <main class="content">
      <RouterView />
    </main>
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

.content {
  flex: 1;
  width: 100%;
}
</style>
