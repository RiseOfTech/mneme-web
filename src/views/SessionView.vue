<script setup lang="ts">
import { onMounted } from 'vue'
import { useReviewSession } from '@/composables/useReviewSession'
import ReviewCard from '@/components/ReviewCard.vue'

const { status, error, grading, currentCard, load, grade } = useReviewSession()

onMounted(() => {
  load()
})
</script>

<template>
  <section class="session-view">
    <p v-if="status === 'loading'">Loading your session…</p>

    <div v-else-if="status === 'error'">
      <p>{{ error }}</p>
      <button type="button" @click="load">Retry</button>
    </div>

    <p v-else-if="status === 'empty'">Nothing due right now.</p>

    <p v-else-if="status === 'finished'">Session complete.</p>

    <div v-else-if="currentCard">
      <p v-if="error" class="grade-error">{{ error }}</p>
      <ReviewCard :card="currentCard" :grading="grading" :key="currentCard.cardId" @grade="grade" />
    </div>
  </section>
</template>
