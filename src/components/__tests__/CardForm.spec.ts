import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CardForm, { type CardFormValues } from '../CardForm.vue'

function makeInitialValues(overrides: Partial<CardFormValues> = {}): CardFormValues {
  return {
    word: '',
    translation: '',
    association: '',
    imageUrl: '',
    ...overrides,
  }
}

function mountForm(initialValues: CardFormValues = makeInitialValues()) {
  return mount(CardForm, {
    props: {
      initialValues,
      submitting: false,
      submitError: null,
      submitLabel: 'Create',
    },
  })
}

describe('CardForm', () => {
  it('populates the fields from initialValues', () => {
    const wrapper = mountForm(
      makeInitialValues({
        word: 'Katze',
        translation: 'cat',
        association: 'a cat sounds like "katze"',
        imageUrl: 'https://example.com/cat.png',
      }),
    )

    expect((wrapper.find('#word').element as HTMLInputElement).value).toBe('Katze')
    expect((wrapper.find('#translation').element as HTMLInputElement).value).toBe('cat')
    expect((wrapper.find('#association').element as HTMLTextAreaElement).value).toBe(
      'a cat sounds like "katze"',
    )
    expect((wrapper.find('#imageUrl').element as HTMLInputElement).value).toBe(
      'https://example.com/cat.png',
    )
    expect(wrapper.find('button[type="submit"]').text()).toBe('Create')
  })

  it('shows validation messages for empty required fields and emits nothing', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Word is required.')
    expect(wrapper.text()).toContain('Translation is required.')
    expect(wrapper.text()).toContain('Association is required.')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('treats whitespace-only input as empty and emits nothing', async () => {
    const wrapper = mountForm()

    await wrapper.find('#word').setValue('   ')
    await wrapper.find('#translation').setValue('   ')
    await wrapper.find('#association').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Word is required.')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('clears a stale validation message once the field is filled in and resubmitted', async () => {
    const wrapper = mountForm()

    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Word is required.')

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('a cat sounds like "katze"')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).not.toContain('Word is required.')
    expect(wrapper.emitted('submit')).toHaveLength(1)
  })

  it('emits trimmed values and omits imageUrl when blank', async () => {
    const wrapper = mountForm()

    await wrapper.find('#word').setValue('  Katze  ')
    await wrapper.find('#translation').setValue('  cat  ')
    await wrapper.find('#association').setValue('  a cat sounds like "katze"  ')
    await wrapper.find('#imageUrl').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        word: 'Katze',
        translation: 'cat',
        association: 'a cat sounds like "katze"',
      },
    ])
  })

  it('includes imageUrl trimmed when provided', async () => {
    const wrapper = mountForm()

    await wrapper.find('#word').setValue('Katze')
    await wrapper.find('#translation').setValue('cat')
    await wrapper.find('#association').setValue('assoc')
    await wrapper.find('#imageUrl').setValue('  https://example.com/cat.png  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        word: 'Katze',
        translation: 'cat',
        association: 'assoc',
        imageUrl: 'https://example.com/cat.png',
      },
    ])
  })

  it('shows submitError and disables the submit button while submitting', () => {
    const wrapper = mount(CardForm, {
      props: {
        initialValues: makeInitialValues(),
        submitting: true,
        submitError: 'Failed to save the card. Please try again.',
        submitLabel: 'Save',
      },
    })

    expect(wrapper.text()).toContain('Failed to save the card. Please try again.')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
