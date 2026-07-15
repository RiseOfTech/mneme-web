<script setup lang="ts">
import { ref } from 'vue'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']
type Grade = components['schemas']['GradeRequestDto']['grade']

defineProps<{
  card: SessionCardDto
  grading: boolean
}>()

const emit = defineEmits<{
  grade: [value: Grade]
}>()

const imageRevealed = ref(false)
const associationRevealed = ref(false)
const answerRevealed = ref(false)
</script>

<template>
  <article class="review-card">
    <h2 class="word">{{ card.word }}</h2>

    <button
      v-if="card.imageUrl"
      type="button"
      class="image-button"
      aria-label="Reveal image hint"
      @click="imageRevealed = !imageRevealed"
    >
      <img :src="card.imageUrl" alt="" class="image" :class="{ blurred: !imageRevealed }" />
    </button>

    <div class="hint">
      <Transition name="resolve">
        <button
          v-if="!associationRevealed"
          type="button"
          class="affordance"
          @click="associationRevealed = true"
        >
          Show association
        </button>
        <p v-else class="association">{{ card.association }}</p>
      </Transition>
    </div>

    <div class="answer">
      <Transition name="resolve-flare">
        <button
          v-if="!answerRevealed"
          type="button"
          class="affordance"
          @click="answerRevealed = true"
        >
          Show answer
        </button>
        <p v-else class="translation">{{ card.translation }}</p>
      </Transition>
    </div>

    <Transition name="resolve">
      <div v-if="answerRevealed" class="grade-actions">
        <button
          type="button"
          class="grade-button"
          :disabled="grading"
          @click="emit('grade', 'INCORRECT')"
        >
          Incorrect
        </button>
        <button
          type="button"
          class="grade-button grade-button--correct"
          :disabled="grading"
          @click="emit('grade', 'CORRECT')"
        >
          Correct
        </button>
      </div>
    </Transition>
  </article>
</template>

<style scoped>
.review-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-6);
  max-width: var(--measure-card);
  margin-inline: auto;
  text-align: center;
}

.word {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-display);
  line-height: var(--leading-tight);
  color: var(--color-ink);
  overflow-wrap: break-word;
}

.image-button {
  display: block;
}

.image {
  display: block;
  width: var(--measure-image);
  max-width: 100%;
  cursor: pointer;
  border: 1px solid var(--color-haze);
  background: var(--color-surface);
  padding: var(--space-2);
  filter: blur(0);
  transform: scale(1);
  transition:
    filter var(--motion-duration) var(--motion-easing),
    transform var(--motion-duration) var(--motion-easing);
}

.image.blurred {
  filter: blur(var(--blur-hidden));
  transform: scale(var(--motion-scale-from));
}

.hint,
.answer {
  min-height: var(--space-5);
}

.affordance {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}

.affordance:hover {
  color: var(--color-coating);
}

.association {
  max-width: var(--measure-text);
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-ink);
}

.translation {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--color-ink);
}

.grade-actions {
  display: flex;
  gap: var(--space-6);
}

.grade-button {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  padding: var(--space-2) var(--space-4);
  color: var(--color-ink);
}

.grade-button--correct {
  font-weight: 500;
}

.grade-button:disabled {
  color: var(--color-haze);
}

/* The resolve signature: hidden is blurred, not absent. Revealing sharpens. */
.resolve-enter-active {
  transition:
    filter var(--motion-duration) var(--motion-easing),
    transform var(--motion-duration) var(--motion-easing),
    color var(--motion-duration) var(--motion-easing);
}

.resolve-enter-from {
  filter: blur(var(--blur-hidden));
  transform: scale(var(--motion-scale-from));
  color: var(--color-haze);
}

.resolve-flare-enter-active {
  animation: resolve-flare var(--motion-duration) var(--motion-easing) both;
}

@keyframes resolve-flare {
  0% {
    filter: blur(var(--blur-hidden));
    transform: scale(var(--motion-scale-from));
    color: var(--color-haze);
  }
  55% {
    filter: blur(0);
    transform: scale(1);
    color: var(--color-flare);
  }
  100% {
    filter: blur(0);
    transform: scale(1);
    color: var(--color-ink);
  }
}
</style>
