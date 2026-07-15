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
      <textarea id="association" v-model="association"></textarea>
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
