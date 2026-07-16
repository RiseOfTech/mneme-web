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

    <template v-else-if="status === 'ready'">
      <p class="count-eyebrow">{{ cards.length }} cards</p>
      <ul class="card-list">
        <li v-for="card in cards" :key="card.id" class="card-row">
          <RouterLink :to="`/cards/${card.id}/edit`" class="card-link">
            <span class="word">{{ card.word }}</span>
            <span class="translation">{{ card.translation }}</span>
          </RouterLink>
        </li>
      </ul>
    </template>

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
  width: 100%;
  max-width: var(--measure-list);
  margin-inline: auto;
  padding: var(--screen-padding-top) var(--screen-padding-inline)
    var(--screen-padding-bottom-list);
}

.state-message {
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.count-eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
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
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
}

.retry-button:hover,
.retry-button:focus-visible {
  background: var(--surface-ink-hover);
}

.card-list {
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
}

.card-row {
  border-bottom: 1px solid var(--border-ink-divider);
}

.card-link {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-5) 0;
}

.card-link:hover,
.card-link:focus-visible {
  opacity: 0.7;
}

.word {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-xl);
  color: var(--color-ink);
}

.translation {
  font-family: var(--font-body);
  font-size: var(--text-md);
  color: var(--color-haze);
}

.new-card-action {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-6);
}

.new-card-action:hover,
.new-card-action:focus-visible {
  background: var(--surface-ink-hover);
}
</style>
