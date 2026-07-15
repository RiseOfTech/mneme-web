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

    <div class="media">
      <button
        v-if="card.imageUrl"
        type="button"
        class="image-button"
        aria-label="Reveal image hint"
        @click="imageRevealed = !imageRevealed"
      >
        <img :src="card.imageUrl" alt="" class="image" :class="{ blurred: !imageRevealed }" />
      </button>
      <p v-if="card.imageUrl && !imageRevealed" class="image-caption">Tap to focus</p>
    </div>

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

    <div class="grade-row">
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
            class="grade-button"
            :disabled="grading"
            @click="emit('grade', 'CORRECT')"
          >
            Correct
          </button>
        </div>
      </Transition>
    </div>
  </article>
</template>

<style scoped>
.review-card {
  display: grid;
  grid-template-rows:
    auto
    var(--row-media)
    var(--row-text)
    var(--row-text)
    var(--space-8);
  gap: var(--space-6);
  padding-top: var(--space-7);
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

.media {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.image-button {
  display: block;
}

.image {
  display: block;
  width: var(--measure-image);
  max-width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  cursor: pointer;
  border: 1px solid var(--color-haze);
  background: var(--color-surface);
  padding: var(--space-3);
  filter: blur(0);
  transform: scale(1);
  transition:
    filter var(--motion-duration) var(--motion-easing),
    transform var(--motion-duration) var(--motion-easing);
}

.image.blurred {
  filter: blur(var(--blur-image));
  transform: scale(var(--motion-scale-from));
}

.image-caption {
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}

.affordance {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--color-haze);
}

.affordance:hover,
.affordance:focus-visible {
  color: var(--color-coating);
  border-bottom-color: var(--color-coating);
}

.association {
  max-width: var(--measure-text);
  margin-inline: auto;
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--color-ink);
}

.translation {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  line-height: var(--leading-normal);
  color: var(--color-ink);
}

.grade-row {
  display: flex;
  align-items: center;
  justify-content: center;
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
  border: 1px solid var(--color-ink);
  padding: var(--space-3) var(--space-6);
  color: var(--color-ink);
}

.grade-button:hover,
.grade-button:focus-visible {
  border-color: var(--color-coating);
}

.grade-button:disabled {
  border-color: var(--color-haze);
  color: var(--color-haze);
  cursor: not-allowed;
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
