<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCards } from '@/composables/useCards'
import CardForm, { type CardFormSubmitPayload } from '@/components/CardForm.vue'

const router = useRouter()
const { submitting, submitError, create } = useCards()

const initialValues = { word: '', translation: '', association: '', imageUrl: '' }

async function onSubmit(payload: CardFormSubmitPayload) {
  const created = await create(payload)
  if (created) router.push('/cards')
}
</script>

<template>
  <section class="new-card-view">
    <h1>New card</h1>

    <CardForm
      :initial-values="initialValues"
      :submitting="submitting"
      :submit-error="submitError"
      submit-label="Create"
      @submit="onSubmit"
    />
    <RouterLink to="/cards" class="cancel-link">Cancel</RouterLink>
  </section>
</template>

<style scoped>
.new-card-view {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-6);
}

h1 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  line-height: var(--leading-tight);
  color: var(--color-ink);
}

.cancel-link {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}

.cancel-link:hover,
.cancel-link:focus-visible {
  color: var(--color-coating);
}
</style>
