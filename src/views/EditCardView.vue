<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCards } from '@/composables/useCards'
import CardForm, { type CardFormSubmitPayload } from '@/components/CardForm.vue'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { card, cardStatus, error, submitting, submitError, loadOne, update, remove } = useCards()

const confirmingDelete = ref(false)

onMounted(() => {
  loadOne(id)
})

async function onSubmit(payload: CardFormSubmitPayload) {
  if (!card.value) return
  const updated = await update(id, { ...payload, visibility: card.value.visibility })
  if (updated) router.push('/cards')
}

async function onConfirmDelete() {
  const deleted = await remove(id)
  if (deleted) router.push('/cards')
}
</script>

<template>
  <section class="edit-card-view">
    <h1>Edit card</h1>

    <p v-if="cardStatus === 'idle' || cardStatus === 'loading'">Loading card…</p>

    <div v-else-if="cardStatus === 'notFound'">
      <p>Card not found.</p>
      <RouterLink to="/cards">Back to cards</RouterLink>
    </div>

    <div v-else-if="cardStatus === 'error'">
      <p>{{ error }}</p>
      <button type="button" @click="loadOne(id)">Retry</button>
    </div>

    <template v-else-if="cardStatus === 'ready' && card">
      <CardForm
        :initial-values="{
          word: card.word ?? '',
          translation: card.translation ?? '',
          association: card.association ?? '',
          imageUrl: card.imageUrl ?? '',
        }"
        :submitting="submitting"
        :submit-error="submitError"
        submit-label="Save"
        @submit="onSubmit"
      />
      <RouterLink to="/cards">Cancel</RouterLink>

      <div class="delete-control">
        <button v-if="!confirmingDelete" type="button" @click="confirmingDelete = true">
          Delete
        </button>
        <template v-else>
          <p>Delete this card?</p>
          <button type="button" :disabled="submitting" @click="onConfirmDelete">Confirm</button>
          <button type="button" @click="confirmingDelete = false">Cancel</button>
        </template>
      </div>
    </template>
  </section>
</template>
