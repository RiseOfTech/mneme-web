import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewCard from '../ReviewCard.vue'
import type { components } from '@/api/schema'

type SessionCardDto = components['schemas']['SessionCardDto']

function makeCard(overrides: Partial<SessionCardDto> = {}): SessionCardDto {
  return {
    cardId: 'card-1',
    word: 'Katze',
    translation: 'cat',
    association: 'a cat sounds like "katze"',
    imageUrl: 'https://example.com/cat.png',
    box: 1,
    dueAt: '2026-07-14T00:00:00Z',
    ...overrides,
  }
}

describe('ReviewCard', () => {
  it('shows the word, hides translation and association, and blurs the image initially', () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    expect(wrapper.text()).toContain(card.word)
    expect(wrapper.text()).not.toContain(card.translation)
    expect(wrapper.text()).not.toContain(card.association)
    expect(wrapper.find('img').classes()).toContain('blurred')
  })

  it('renders no image element when the card has no imageUrl', () => {
    const card = makeCard({ imageUrl: undefined })
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('has no grade actions before the answer is revealed', () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    expect(wrapper.findAll('button').every((b) => b.text() !== 'Correct')).toBe(true)
  })

  it('emits grade with the matching value after revealing the answer', async () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    const showAnswer = wrapper.findAll('button').find((b) => b.text() === 'Show answer')
    await showAnswer?.trigger('click')

    const correctButton = wrapper.findAll('button').find((b) => b.text() === 'Correct')
    await correctButton?.trigger('click')

    expect(wrapper.emitted('grade')).toEqual([['CORRECT']])

    const incorrectButton = wrapper.findAll('button').find((b) => b.text() === 'Incorrect')
    await incorrectButton?.trigger('click')

    expect(wrapper.emitted('grade')).toEqual([['CORRECT'], ['INCORRECT']])
  })

  it('disables grade actions while grading is true', async () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: true } })

    const showAnswer = wrapper.findAll('button').find((b) => b.text() === 'Show answer')
    await showAnswer?.trigger('click')

    const correctButton = wrapper.findAll('button').find((b) => b.text() === 'Correct')
    expect(correctButton?.attributes('disabled')).toBeDefined()
  })
})
