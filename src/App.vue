<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <nav class="app-nav">
    <RouterLink to="/session">Review</RouterLink>
    <RouterLink to="/cards">Cards</RouterLink>
  </nav>
  <RouterView />
</template>

<style scoped>
.app-nav a.router-link-active {
  font-weight: bold;
}
</style>
