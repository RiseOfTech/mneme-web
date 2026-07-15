<script setup lang="ts">
import { onMounted } from 'vue'
import { useReviewSession } from '@/composables/useReviewSession'
import ReviewCard from '@/components/ReviewCard.vue'

const { status, error, grading, currentCard, load, grade } = useReviewSession()

onMounted(() => {
  load()
})
</script>

<style scoped>
.session-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: var(--space-4);
  text-align: center;
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
  align-items: center;
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

.session-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.grade-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}
</style>

<template>
  <section class="session-view">
    <p v-if="status === 'loading' || status === 'idle'" class="state-message">
      Loading your session…
    </p>

    <div v-else-if="status === 'error'" class="state-error">
      <p class="state-message">{{ error }}</p>
      <button type="button" class="retry-button" @click="load">Retry</button>
    </div>

    <p v-else-if="status === 'empty'" class="state-message">Nothing due. Come back later.</p>

    <p v-else-if="status === 'finished'" class="state-message">Session complete.</p>

    <div v-else-if="currentCard" class="session-card">
      <p v-if="error" class="grade-error">{{ error }}</p>
      <ReviewCard :card="currentCard" :grading="grading" :key="currentCard.cardId" @grade="grade" />
    </div>
  </section>
</template>
