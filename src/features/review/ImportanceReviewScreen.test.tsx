import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ImportanceReviewScreen } from './ImportanceReviewScreen'
import { BUILTIN_DIMENSION, IMPORTANCE_NOT, IMPORTANCE_YES } from '../../domain/defaults'
import { resetStore, useStore } from '../../store'

function renderScreen() {
  return render(
    <MemoryRouter>
      <ImportanceReviewScreen />
    </MemoryRouter>,
  )
}

const api = () => useStore.getState()

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
  api().startWorkspace('Review test')
  for (const text of ['First thought', 'Second thought', 'Third thought']) {
    api().addThought(text)
  }
})

describe('ImportanceReviewScreen', () => {
  it('starts on the first thought with every thought in the queue', () => {
    renderScreen()
    expect(screen.getByText('Thought 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('First thought')).toBeInTheDocument()
    expect(screen.getByText(/0 of 3 answered/)).toBeInTheDocument()
  })

  it('counts each answer state on the filter buttons', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /^Important/ }))

    expect(screen.getByRole('button', { name: /Not answered yet 2/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marked important 1/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marked not important 0/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /All 3/ })).toBeInTheDocument()
  })

  it('shows only unanswered thoughts when that filter is chosen', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /^Important/ }))
    await user.click(screen.getByRole('button', { name: /Not answered yet/ }))

    expect(screen.getByText('Not answered yet: 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Second thought')).toBeInTheDocument()
  })

  it('does not skip a thought when answering inside the unanswered filter', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /Not answered yet/ }))
    expect(screen.getByText('First thought')).toBeInTheDocument()

    // The answered thought leaves the queue, so the next one takes its place
    // rather than being jumped over.
    await user.click(screen.getByRole('button', { name: /^Important/ }))
    expect(screen.getByText('Second thought')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Not important/ }))
    expect(screen.getByText('Third thought')).toBeInTheDocument()
  })

  it('advances normally when the answer keeps the thought in view', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /^Important/ }))
    expect(screen.getByText('Second thought')).toBeInTheDocument()
    expect(screen.getByText('Thought 2 of 3')).toBeInTheDocument()
  })

  it('keeps a thought in the unanswered queue when the answer is “not sure yet”', async () => {
    const user = userEvent.setup()
    renderScreen()
    await user.click(screen.getByRole('button', { name: /Not answered yet/ }))
    await user.click(screen.getByRole('button', { name: /Not sure yet/ }))

    expect(screen.getByRole('button', { name: /Not answered yet 3/ })).toBeInTheDocument()
    expect(screen.getByText('Second thought')).toBeInTheDocument()
  })

  it('offers a way out once nothing is left unanswered', async () => {
    const user = userEvent.setup()
    const thoughts = api().thoughts
    for (const thought of thoughts) {
      api().setDimensionValue(thought.id, BUILTIN_DIMENSION.importance, IMPORTANCE_YES)
    }
    renderScreen()
    await user.click(screen.getByRole('button', { name: /Not answered yet 0/ }))

    expect(screen.getByText(/Every thought has an answer/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all thoughts' }))
    expect(screen.getByText('Thought 1 of 3')).toBeInTheDocument()
  })

  it('lets an earlier answer be changed from the marked filters', async () => {
    const user = userEvent.setup()
    const [first] = api().thoughts
    api().setDimensionValue(first.id, BUILTIN_DIMENSION.importance, IMPORTANCE_NOT)
    renderScreen()

    await user.click(screen.getByRole('button', { name: /Marked not important 1/ }))
    expect(screen.getByText('First thought')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Important/ }))
    expect(api().thoughts[0].dimensionValues[BUILTIN_DIMENSION.importance]).toBe(IMPORTANCE_YES)
  })
})
