<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { submitting, submitError, register } = useAuth()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const fieldErrors = reactive({
  email: '',
  password: '',
  confirmPassword: '',
})

function validate() {
  fieldErrors.email = ''
  fieldErrors.password = ''
  fieldErrors.confirmPassword = ''

  const trimmedEmail = email.value.trim()

  if (!trimmedEmail) fieldErrors.email = 'Email is required.'
  if (!password.value) {
    fieldErrors.password = 'Password is required.'
  } else if (password.value.length < 8 || password.value.length > 64) {
    fieldErrors.password = 'Password must be 8–64 characters.'
  }

  if (!confirmPassword.value) {
    fieldErrors.confirmPassword = 'Please confirm your password.'
  } else if (password.value && confirmPassword.value !== password.value) {
    fieldErrors.confirmPassword = 'Passwords do not match.'
  }

  return {
    valid: !fieldErrors.email && !fieldErrors.password && !fieldErrors.confirmPassword,
    trimmedEmail,
  }
}

async function onSubmit() {
  const { valid, trimmedEmail } = validate()
  if (!valid) return

  const success = await register(trimmedEmail, password.value)
  if (success) {
    router.push('/session')
  }
}
</script>

<template>
  <section class="register-view">
    <h1>Create account</h1>

    <form @submit.prevent="onSubmit">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" autocomplete="email" />
        <p v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</p>
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
        />
        <p v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</p>
      </div>

      <div class="field">
        <label for="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
        />
        <p v-if="fieldErrors.confirmPassword" class="field-error">
          {{ fieldErrors.confirmPassword }}
        </p>
      </div>

      <p v-if="submitError" class="form-error">{{ submitError }}</p>

      <div class="actions">
        <button type="submit" :disabled="submitting">Create account</button>
      </div>
    </form>

    <p class="alt-action">
      Already have an account? <RouterLink to="/login">Sign in</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.register-view {
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

.alt-action {
  font-family: var(--font-mono);
  font-size: var(--text-eyebrow);
  letter-spacing: var(--tracking-normal);
  color: var(--color-haze);
}

.alt-action a {
  color: var(--color-ink);
}
</style>
