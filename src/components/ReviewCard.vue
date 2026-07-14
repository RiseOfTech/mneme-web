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

    <img
      v-if="card.imageUrl"
      :src="card.imageUrl"
      alt=""
      class="image"
      :class="{ blurred: !imageRevealed }"
      @click="imageRevealed = !imageRevealed"
    />

    <div class="hint">
      <button v-if="!associationRevealed" type="button" @click="associationRevealed = true">
        Show association
      </button>
      <p v-else class="association">{{ card.association }}</p>
    </div>

    <div class="answer">
      <button v-if="!answerRevealed" type="button" @click="answerRevealed = true">
        Show answer
      </button>
      <p v-else class="translation">{{ card.translation }}</p>
    </div>

    <div v-if="answerRevealed" class="grade-actions">
      <button type="button" :disabled="grading" @click="emit('grade', 'INCORRECT')">
        Incorrect
      </button>
      <button type="button" :disabled="grading" @click="emit('grade', 'CORRECT')">Correct</button>
    </div>
  </article>
</template>

<style scoped>
.review-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 24rem;
}

.image {
  max-width: 100%;
  display: block;
  cursor: pointer;
}

.image.blurred {
  filter: blur(16px);
}
</style>
