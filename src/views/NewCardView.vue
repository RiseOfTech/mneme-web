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
    <RouterLink to="/cards">Cancel</RouterLink>
  </section>
</template>
