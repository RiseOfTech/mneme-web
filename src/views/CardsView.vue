<script setup lang="ts">
import { onMounted } from 'vue'
import { useCards } from '@/composables/useCards'

const { cards, status, error, load } = useCards()

onMounted(() => {
  load()
})
</script>

<template>
  <section class="cards-view">
    <p v-if="status === 'loading' || status === 'idle'">Loading your cards…</p>

    <div v-else-if="status === 'error'">
      <p>{{ error }}</p>
      <button type="button" @click="load">Retry</button>
    </div>

    <p v-else-if="status === 'empty'">No cards yet.</p>

    <ul v-else-if="status === 'ready'">
      <li v-for="card in cards" :key="card.id">
        <span class="word">{{ card.word }}</span>
        <span class="translation">{{ card.translation }}</span>
      </li>
    </ul>
  </section>
</template>
