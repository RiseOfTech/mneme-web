<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app-shell">
    <nav class="app-nav">
      <RouterLink to="/session">Review</RouterLink>
      <RouterLink to="/cards">Cards</RouterLink>
    </nav>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-nav {
  padding: var(--space-5) var(--content-padding-inline) 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.app-nav a {
  display: inline-block;
  padding: var(--space-2) 0;
  color: var(--color-haze);
}

.app-nav a:hover {
  color: var(--color-coating);
}

.app-nav a + a::before {
  content: '·';
  margin-inline: var(--space-3);
  color: var(--color-haze);
}

.app-nav a.router-link-active {
  color: var(--color-coating);
  font-weight: 500;
}

.content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding: var(--space-6) var(--content-padding-inline) var(--space-8);
}
</style>
