<script lang="ts">
import type { components } from '@/api/schema'

export interface CardFormValues {
  word: string
  translation: string
  association: string
  imageUrl: string
}

export type CardFormSubmitPayload = Pick<
  components['schemas']['CreateCardRequestDto'],
  'word' | 'translation' | 'association' | 'imageUrl'
>
</script>

<script setup lang="ts">
import { reactive, ref } from 'vue'

const props = defineProps<{
  initialValues: CardFormValues
  submitting: boolean
  submitError: string | null
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [payload: CardFormSubmitPayload]
}>()

const word = ref(props.initialValues.word)
const translation = ref(props.initialValues.translation)
const association = ref(props.initialValues.association)
const imageUrl = ref(props.initialValues.imageUrl)

const fieldErrors = reactive({
  word: '',
  translation: '',
  association: '',
})

function validate() {
  fieldErrors.word = ''
  fieldErrors.translation = ''
  fieldErrors.association = ''

  const trimmedWord = word.value.trim()
  const trimmedTranslation = translation.value.trim()
  const trimmedAssociation = association.value.trim()

  if (!trimmedWord) fieldErrors.word = 'Word is required.'
  if (!trimmedTranslation) fieldErrors.translation = 'Translation is required.'
  if (!trimmedAssociation) fieldErrors.association = 'Association is required.'

  return {
    valid: !fieldErrors.word && !fieldErrors.translation && !fieldErrors.association,
    trimmedWord,
    trimmedTranslation,
    trimmedAssociation,
  }
}

function onSubmit() {
  const { valid, trimmedWord, trimmedTranslation, trimmedAssociation } = validate()
  if (!valid) return

  const payload: CardFormSubmitPayload = {
    word: trimmedWord,
    translation: trimmedTranslation,
    association: trimmedAssociation,
  }
  const trimmedImageUrl = imageUrl.value.trim()
  if (trimmedImageUrl) payload.imageUrl = trimmedImageUrl

  emit('submit', payload)
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <div class="field">
      <label for="word">Word</label>
      <input id="word" v-model="word" type="text" />
      <p v-if="fieldErrors.word" class="field-error">{{ fieldErrors.word }}</p>
    </div>

    <div class="field">
      <label for="translation">Translation</label>
      <input id="translation" v-model="translation" type="text" />
      <p v-if="fieldErrors.translation" class="field-error">{{ fieldErrors.translation }}</p>
    </div>

    <div class="field">
      <label for="association">Association</label>
      <textarea id="association" v-model="association" rows="4"></textarea>
      <p v-if="fieldErrors.association" class="field-error">{{ fieldErrors.association }}</p>
    </div>

    <div class="field">
      <label for="imageUrl">Image URL</label>
      <input id="imageUrl" v-model="imageUrl" type="text" />
    </div>

    <p v-if="submitError" class="form-error">{{ submitError }}</p>

    <div class="actions">
      <button type="submit" :disabled="submitting">{{ submitLabel }}</button>
    </div>
  </form>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--measure-text);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-haze);
}

input,
textarea {
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-ink);
  background: var(--color-surface);
  border: 1px solid var(--color-haze);
  border-radius: 0;
  padding: var(--space-3) var(--space-4);
}

input:focus-visible,
textarea:focus-visible {
  border-color: var(--color-coating);
}

textarea {
  resize: vertical;
}

.field-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
}

.form-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
}

.actions button[type='submit'] {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  padding: var(--space-3) var(--space-6);
}

.actions button[type='submit']:hover,
.actions button[type='submit']:focus-visible {
  border-color: var(--color-coating);
}

.actions button[type='submit']:disabled {
  border-color: var(--color-haze);
  color: var(--color-haze);
  cursor: not-allowed;
}
</style>
