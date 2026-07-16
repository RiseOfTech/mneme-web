<script setup lang="ts">
import { computed, ref } from 'vue'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']
type Grade = components['schemas']['GradeRequestDto']['grade']

const props = defineProps<{
  card: SessionCardDto
  grading: boolean
}>()

const emit = defineEmits<{
  grade: [value: Grade]
}>()

const hasImage = computed(() => !!props.card.imageUrl)
const flipped = ref(false)
const flipping = ref(false)
const associationRevealed = ref(false)
const answerRevealed = ref(false)

function toggleFlip() {
  flipped.value = !flipped.value
  flipping.value = true
}

function onFlipAnimationEnd() {
  flipping.value = false
}
</script>

<template>
  <article class="review-card">
    <component
      :is="hasImage ? 'button' : 'div'"
      class="card-surface"
      :class="{ flipping }"
      v-bind="
        hasImage
          ? {
              type: 'button',
              'aria-label': flipped ? 'Show word' : 'Show image',
              onClick: toggleFlip,
            }
          : {}
      "
      @animationend="onFlipAnimationEnd"
    >
      <div v-if="!flipped" class="card-front">
        <span class="ring ring-solid" aria-hidden="true"></span>
        <span class="ring ring-dashed" aria-hidden="true"></span>
        <h2 class="word">{{ card.word }}</h2>
      </div>
      <div v-else class="card-back">
        <img :src="card.imageUrl" alt="" class="card-image" />
      </div>
    </component>
    <p v-if="hasImage" class="flip-hint">
      {{ flipped ? 'Tap to see the word' : 'Tap to see the image' }}
    </p>

    <div class="hint">
      <p v-if="associationRevealed" class="eyebrow">Association</p>
      <button
        v-if="!associationRevealed"
        type="button"
        class="affordance"
        @click="associationRevealed = true"
      >
        Show association
      </button>
      <Transition name="soft-in">
        <p v-if="associationRevealed" class="association">{{ card.association }}</p>
      </Transition>
    </div>

    <div class="answer">
      <p v-if="answerRevealed" class="eyebrow">Translation</p>
      <button
        v-if="!answerRevealed"
        type="button"
        class="affordance"
        @click="answerRevealed = true"
      >
        Show answer
      </button>
      <Transition name="soft-in">
        <p v-if="answerRevealed" class="translation">{{ card.translation }}</p>
      </Transition>
    </div>

    <div class="grade-row">
      <Transition name="soft-in">
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
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-5);
  padding-top: var(--space-7);
  max-width: var(--measure-card);
  margin-inline: auto;
  text-align: center;
}

.card-surface {
  position: relative;
  width: 360px;
  max-width: 78vw;
  height: 250px;
  overflow: hidden;
  transform: scaleX(1);
}

.card-surface.flipping {
  animation: flip-squeeze var(--motion-flip-duration) ease;
}

@keyframes flip-squeeze {
  0%,
  100% {
    transform: scaleX(1);
  }
  50% {
    transform: scaleX(0.06);
  }
}

.card-front,
.card-back {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back {
  border: 1px solid var(--border-ink-panel);
  background:
    repeating-linear-gradient(
      52deg,
      var(--color-card-back-hatch) 0px,
      var(--color-card-back-hatch) 2px,
      transparent 2px,
      transparent 10px
    ),
    linear-gradient(160deg, var(--color-card-back-start), var(--color-card-back-end));
}

.card-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ring {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  pointer-events: none;
}

.ring-solid {
  width: 78%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) rotate(-4deg);
  border: 1px solid var(--color-coating-ring);
}

.ring-dashed {
  width: 60%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%) rotate(6deg);
  border: 1px dashed var(--color-flare-ring);
}

.word {
  position: relative;
  margin: 0;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--text-word);
  line-height: var(--leading-tight);
  color: var(--color-ink);
  padding-inline: var(--space-4);
  overflow-wrap: break-word;
}

.flip-hint {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.hint,
.answer {
  min-height: var(--row-text);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.affordance {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--border-ink-control);
  transition:
    letter-spacing var(--motion-duration) var(--motion-easing),
    border-bottom-color var(--motion-duration) var(--motion-easing);
}

.affordance:hover,
.affordance:focus-visible {
  letter-spacing: var(--tracking-hover);
  border-bottom-color: var(--color-ink);
}

.association {
  max-width: var(--measure-text);
  margin-inline: auto;
  font-family: var(--font-body);
  font-style: italic;
  font-size: var(--text-lg);
  line-height: var(--leading-normal);
  color: var(--color-ink);
}

.translation {
  margin: 0;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-2xl);
  color: var(--color-ink);
}

.grade-row {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--space-8);
}

.grade-actions {
  display: flex;
  gap: var(--space-5);
}

.grade-button {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-6);
  color: var(--color-ink);
  transition:
    background-color var(--motion-duration) var(--motion-easing),
    border-color var(--motion-duration) var(--motion-easing),
    color var(--motion-duration) var(--motion-easing);
}

.grade-button:hover,
.grade-button:focus-visible {
  background: var(--surface-ink-hover);
}

.grade-button:disabled {
  border-color: var(--color-haze);
  color: var(--color-haze);
  cursor: not-allowed;
}

/* The soft-in signature: hidden reveals arrive by opacity, blur, and a small lift. */
@keyframes soft-in {
  from {
    opacity: 0;
    filter: blur(var(--blur-hidden));
    transform: translateY(var(--motion-lift));
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

.soft-in-enter-active {
  animation: soft-in var(--motion-duration) var(--motion-easing) both;
}

/* The disappearing control is never animated out — it is removed instantly. */
.soft-in-leave-active {
  animation: none;
  transition: none;
}
</style>
