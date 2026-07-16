<script setup lang="ts">
import { onMounted } from 'vue'
import { useReviewSession } from '@/composables/useReviewSession'
import ReviewCard from '@/components/ReviewCard.vue'

const { cards, index, status, error, grading, currentCard, load, grade } = useReviewSession()

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

.state-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
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

.state-message {
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.state-heading {
  max-width: 18rem;
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 600;
  font-size: var(--text-heading);
  line-height: var(--leading-tight);
  color: var(--color-ink);
  overflow-wrap: break-word;
}

.state-heading.small {
  font-size: var(--text-heading-sm);
}

.state-prose {
  max-width: var(--measure-text);
  font-family: var(--font-body);
  font-size: var(--text-md);
  color: var(--color-muted);
}

.state-empty,
.state-finished,
.state-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.underline-action {
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
  border-bottom: 1px solid var(--border-ink-control);
  padding-bottom: var(--space-1);
  transition:
    letter-spacing var(--motion-duration) var(--motion-easing),
    border-bottom-color var(--motion-duration) var(--motion-easing);
}

.underline-action:hover,
.underline-action:focus-visible {
  letter-spacing: var(--tracking-hover);
  border-bottom-color: var(--color-ink);
}

.retry-button {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-5);
}

.retry-button:hover,
.retry-button:focus-visible {
  background: var(--surface-ink-hover);
}

.position-eyebrow {
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
  margin-bottom: var(--space-2);
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
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-warning);
}
</style>

<template>
  <section class="session-view">
    <div v-if="status === 'loading' || status === 'idle'" class="state-loading">
      <div class="loading-ring" aria-hidden="true"></div>
      <p class="state-message">Fetching due cards…</p>
    </div>

    <div v-else-if="status === 'error'" class="state-error">
      <h1 class="state-heading small">Couldn't load your session</h1>
      <p class="state-prose">{{ error }}</p>
      <button type="button" class="retry-button" @click="load">Retry</button>
    </div>

    <div v-else-if="status === 'empty'" class="state-empty">
      <h1 class="state-heading">Nothing due right now</h1>
      <p class="state-prose">Come back later, or add a card while it's quiet.</p>
      <RouterLink to="/cards" class="underline-action">Go to cards</RouterLink>
    </div>

    <div v-else-if="status === 'finished'" class="state-finished">
      <h1 class="state-heading">Session complete</h1>
      <p class="state-prose">You reviewed {{ cards.length }} card{{ cards.length === 1 ? '' : 's' }}.</p>
      <button type="button" class="underline-action" @click="load">Review again</button>
    </div>

    <div v-else-if="currentCard" class="session-card">
      <p class="position-eyebrow">Card {{ index + 1 }} of {{ cards.length }}</p>
      <p v-if="error" class="grade-error">{{ error }}</p>
      <ReviewCard :card="currentCard" :grading="grading" :key="currentCard.cardId" @grade="grade" />
    </div>
  </section>
</template>
