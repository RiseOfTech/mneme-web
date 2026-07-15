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
    <p v-if="status === 'loading' || status === 'idle'" class="state-message">
      Loading your cards…
    </p>

    <div v-else-if="status === 'error'" class="state-error">
      <p class="state-message">{{ error }}</p>
      <button type="button" class="retry-button" @click="load">Retry</button>
    </div>

    <p v-else-if="status === 'empty'" class="state-message">No cards yet.</p>

    <ul v-else-if="status === 'ready'" class="card-list">
      <li v-for="card in cards" :key="card.id" class="card-row">
        <RouterLink :to="`/cards/${card.id}/edit`" class="card-link">
          <span class="word">{{ card.word }}</span>
          <span class="translation">{{ card.translation }}</span>
        </RouterLink>
      </li>
    </ul>

    <RouterLink
      v-if="status === 'ready' || status === 'empty'"
      to="/cards/new"
      class="new-card-action"
      >New card</RouterLink
    >
  </section>
</template>

<style scoped>
.cards-view {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-5);
}

.state-message {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.retry-button {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-coating);
  border: 1px solid var(--color-coating);
  padding: var(--space-2) var(--space-4);
}

.retry-button:hover {
  background: color-mix(in srgb, var(--color-coating) 10%, transparent);
}

.card-list {
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}

.card-row + .card-row {
  border-top: 1px solid var(--color-haze);
}

.card-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-4) 0;
}

.card-link:hover,
.card-link:focus-visible {
  background: color-mix(in srgb, var(--color-coating) 10%, transparent);
}

.word {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-lg);
  color: var(--color-ink);
}

.translation {
  font-family: var(--font-body);
  font-size: var(--text-base);
  color: var(--color-haze);
}

.new-card-action {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  padding: var(--space-3) var(--space-6);
}

.new-card-action:hover,
.new-card-action:focus-visible {
  border-color: var(--color-coating);
}
</style>
