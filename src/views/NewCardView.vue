<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCards } from '@/composables/useCards'
import type { components } from '@/api/schema'

type CreateCardRequestDto = components['schemas']['CreateCardRequestDto']

const router = useRouter()
const { submitting, submitError, create } = useCards()

const word = ref('')
const translation = ref('')
const association = ref('')
const imageUrl = ref('')

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

async function onSubmit() {
  const { valid, trimmedWord, trimmedTranslation, trimmedAssociation } = validate()
  if (!valid) return

  const payload: CreateCardRequestDto = {
    word: trimmedWord,
    translation: trimmedTranslation,
    association: trimmedAssociation,
  }
  const trimmedImageUrl = imageUrl.value.trim()
  if (trimmedImageUrl) payload.imageUrl = trimmedImageUrl

  const created = await create(payload)
  if (created) router.push('/cards')
}
</script>

<template>
  <section class="new-card-view">
    <h1>New card</h1>

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
        <button type="submit" :disabled="submitting">Create</button>
        <RouterLink to="/cards">Cancel</RouterLink>
      </div>
    </form>
  </section>
</template>
