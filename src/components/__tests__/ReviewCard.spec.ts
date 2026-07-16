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
  it('shows the word on the front, hides translation and association, and renders no image initially', () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    expect(wrapper.text()).toContain(card.word)
    expect(wrapper.text()).not.toContain(card.translation)
    expect(wrapper.text()).not.toContain(card.association)
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('flips to the image on tap, and back to the word on a second tap', async () => {
    const card = makeCard()
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    const surface = wrapper.find('button[aria-label]')
    expect(surface.exists()).toBe(true)
    expect(wrapper.text()).toContain(card.word)

    await surface.trigger('click')

    expect(wrapper.find('img').attributes('src')).toBe(card.imageUrl)
    expect(wrapper.text()).not.toContain(card.word)

    await surface.trigger('click')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain(card.word)
  })

  it('does not flip and renders no image for a card with no imageUrl', async () => {
    const card = makeCard({ imageUrl: undefined })
    const wrapper = mount(ReviewCard, { props: { card, grading: false } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('button[aria-label]').exists()).toBe(false)

    const surface = wrapper.find('.card-surface')
    expect(surface.element.tagName).toBe('DIV')

    await surface.trigger('click')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain(card.word)
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
