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
const lastAction = ref<'save' | 'delete' | null>(null)

onMounted(() => {
  loadOne(id)
})

async function onSubmit(payload: CardFormSubmitPayload) {
  if (!card.value) return
  lastAction.value = 'save'
  const updated = await update(id, { ...payload, visibility: card.value.visibility })
  if (updated) router.push('/cards')
}

async function onConfirmDelete() {
  lastAction.value = 'delete'
  const deleted = await remove(id)
  if (deleted) router.push('/cards')
}
</script>

<template>
  <section class="edit-card-view">
    <h1>Edit card</h1>

    <p v-if="cardStatus === 'idle' || cardStatus === 'loading'" class="state-message">
      Loading card…
    </p>

    <div v-else-if="cardStatus === 'notFound'" class="state-error">
      <p class="state-message">Card not found.</p>
      <RouterLink to="/cards" class="cancel-link">Back to cards</RouterLink>
    </div>

    <div v-else-if="cardStatus === 'error'" class="state-error">
      <p class="state-message">{{ error }}</p>
      <button type="button" class="retry-button" @click="loadOne(id)">Retry</button>
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
        :submit-error="lastAction === 'delete' ? null : submitError"
        submit-label="Save"
        @submit="onSubmit"
      />
      <RouterLink to="/cards" class="cancel-link">Cancel</RouterLink>

      <div class="delete-zone">
        <button
          v-if="!confirmingDelete"
          type="button"
          class="bordered-button"
          @click="confirmingDelete = true"
        >
          Delete
        </button>
        <template v-else>
          <p class="delete-prompt">Delete this card?</p>
          <div class="delete-actions">
            <button
              type="button"
              class="bordered-button"
              :disabled="submitting"
              @click="onConfirmDelete"
            >
              Confirm
            </button>
            <button type="button" class="bordered-button" @click="confirmingDelete = false">
              Cancel
            </button>
          </div>
        </template>
        <p v-if="lastAction === 'delete' && submitError" class="delete-error">
          {{ submitError }}
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.edit-card-view {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-6);
  max-width: var(--measure-form);
  margin-inline: auto;
  padding: var(--screen-padding-top) var(--screen-padding-inline)
    var(--screen-padding-bottom-form);
}

h1 {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 600;
  font-size: var(--text-heading-sm);
  line-height: var(--leading-tight);
  color: var(--color-ink);
}

.state-message {
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.state-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.retry-button {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-4);
}

.retry-button:hover,
.retry-button:focus-visible {
  background: var(--surface-ink-hover);
}

.cancel-link {
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-muted);
  border-bottom: 1px solid var(--border-ink-control);
  padding-bottom: var(--space-1);
}

.cancel-link:hover,
.cancel-link:focus-visible {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
}

.delete-zone {
  width: 100%;
  border-top: 1px solid var(--border-ink-divider);
  margin-top: var(--space-7);
  padding-top: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
}

.bordered-button {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-3) var(--space-6);
}

.bordered-button:hover,
.bordered-button:focus-visible {
  background: var(--surface-ink-hover);
}

.bordered-button:disabled {
  border-color: var(--color-haze);
  color: var(--color-haze);
  cursor: not-allowed;
}

.delete-prompt {
  font-family: var(--font-body);
  font-size: var(--text-md);
  color: var(--color-ink);
}

.delete-actions {
  display: flex;
  gap: var(--space-4);
}

.delete-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-normal);
  color: var(--color-warning);
}
</style>
