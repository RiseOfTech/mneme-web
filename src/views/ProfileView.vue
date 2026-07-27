<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useProfile } from '@/composables/useProfile'

const { profile, status, error, submitting, submitError, load, save } = useProfile()

const nickname = ref('')
const fieldError = ref('')
const saved = ref(false)

async function loadProfile() {
  await load()
  nickname.value = profile.value?.nickname ?? ''
}

onMounted(() => {
  loadProfile()
})

function validate() {
  fieldError.value = ''

  const trimmed = nickname.value.trim()

  if (!trimmed) {
    fieldError.value = 'Nickname is required.'
  } else if (trimmed.length > 50) {
    fieldError.value = 'Nickname must be 50 characters or fewer.'
  }

  return { valid: !fieldError.value, trimmed }
}

async function onSubmit() {
  saved.value = false
  const { valid, trimmed } = validate()
  if (!valid) return

  const success = await save(trimmed)
  if (success) {
    nickname.value = trimmed
    saved.value = true
  }
}
</script>

<template>
  <section class="profile-view">
    <h1>Profile</h1>

    <p v-if="status === 'idle' || status === 'loading'" class="state-message">
      Loading your profile…
    </p>

    <div v-else-if="status === 'error'" class="state-error">
      <p class="state-message">{{ error }}</p>
      <button type="button" class="retry-button" @click="loadProfile">Retry</button>
    </div>

    <form v-else-if="status === 'ready'" @submit.prevent="onSubmit">
      <div class="field">
        <label for="nickname">Nickname</label>
        <input id="nickname" v-model="nickname" type="text" />
        <p v-if="fieldError" class="field-error">{{ fieldError }}</p>
      </div>

      <p v-if="submitError" class="form-error">{{ submitError }}</p>
      <p v-if="saved" class="confirmation-message">Saved.</p>

      <div class="actions">
        <button type="submit" :disabled="submitting">Save</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.profile-view {
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

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

label {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

input {
  width: 100%;
  font-family: var(--font-body);
  font-size: var(--text-md);
  line-height: var(--leading-normal);
  color: var(--color-ink);
  background: var(--color-surface);
  border: 1px solid var(--border-ink-panel);
  border-radius: var(--radius-md);
  padding: var(--field-padding-block) var(--field-padding-inline);
  transition: border-color var(--motion-duration) var(--motion-easing);
}

input:focus-visible {
  border-color: var(--color-coating);
  box-shadow: 0 0 0 3px var(--color-coating-soft);
}

.field-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-normal);
  color: var(--color-warning);
}

.form-error {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-warning);
}

.confirmation-message {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
}

.actions button[type='submit'] {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-normal);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: var(--radius-sm);
  padding: var(--space-4) var(--space-6);
}

.actions button[type='submit']:hover,
.actions button[type='submit']:focus-visible {
  background: var(--surface-ink-hover);
}

.actions button[type='submit']:disabled {
  border-color: var(--color-haze);
  color: var(--color-haze);
  cursor: not-allowed;
}
</style>
