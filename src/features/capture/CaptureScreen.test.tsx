import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CaptureScreen } from './CaptureScreen'
import { BUILTIN_DIMENSION, MOTIVATION_WANT } from '../../domain/defaults'
import { resetStore, useStore } from '../../store'

function renderScreen() {
  return render(
    <MemoryRouter>
      <CaptureScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
  useStore.getState().startWorkspace('Test workspace')
})

describe('CaptureScreen', () => {
  it('creates a thought on Enter and clears the input', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    await user.type(input, 'Change jobs{Enter}')

    expect(useStore.getState().thoughts.map((thought) => thought.text)).toEqual(['Change jobs'])
    expect(input).toHaveValue('')
    expect(screen.getByText(/1 thought captured/)).toBeInTheDocument()
  })

  it('keeps a line break on Shift+Enter instead of creating a thought', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    await user.type(input, 'First line{Shift>}{Enter}{/Shift}second line')

    expect(useStore.getState().thoughts).toHaveLength(0)
    expect(input).toHaveValue('First line\nsecond line')
  })

  it('records a Want answer for a captured thought', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText('Write a thought'), 'Learn photography{Enter}')
    await user.click(screen.getByRole('button', { name: /^Want/ }))

    const thought = useStore.getState().thoughts[0]
    expect(thought.dimensionValues[BUILTIN_DIMENSION.motivation]).toBe(MOTIVATION_WANT)
  })

  it('deletes a thought and offers an undo that restores it', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText('Write a thought'), 'Organize my room{Enter}')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(useStore.getState().thoughts).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Undo last deletion' }))
    expect(useStore.getState().thoughts.map((thought) => thought.text)).toEqual([
      'Organize my room',
    ])
  })

  it('reports how many thoughts still have no Want or Should answer', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    await user.type(input, 'One{Enter}')
    await user.type(input, 'Two{Enter}')

    expect(screen.getByText(/2 without a Want or Should answer/)).toBeInTheDocument()
  })
})
