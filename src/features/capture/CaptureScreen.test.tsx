import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
  it('offers an explicit add action and enables it when there is something to save', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    const add = screen.getByRole('button', { name: 'Add thought' })
    expect(add).toBeDisabled()

    await user.type(input, 'Call my family')
    expect(add).toBeEnabled()
    await user.click(add)

    expect(useStore.getState().thoughts.map((thought) => thought.text)).toEqual([
      'Call my family',
    ])
    expect(input).toHaveValue('')
  })

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
    // Scoped to the thought's own control group, since the filter bar also
    // has a Want button.
    const controls = within(screen.getByRole('group', { name: /Learn photography/ }))
    await user.click(controls.getByRole('button', { name: /^Want/ }))

    const thought = useStore.getState().thoughts[0]
    expect(thought.dimensionValues[BUILTIN_DIMENSION.motivation]).toBe(MOTIVATION_WANT)
  })

  it('filters the list by Want, Should, and unanswered', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    await user.type(input, 'Learn photography{Enter}')
    await user.type(input, 'Renew the insurance{Enter}')

    const wanted = within(screen.getByRole('group', { name: /Learn photography/ }))
    await user.click(wanted.getByRole('button', { name: /^Want/ }))

    await user.click(screen.getByRole('button', { name: /^Want 1/ }))
    expect(screen.getByText('Learn photography')).toBeInTheDocument()
    expect(screen.queryByText('Renew the insurance')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Not answered 1/ }))
    expect(screen.getByText('Renew the insurance')).toBeInTheDocument()
    expect(screen.queryByText('Learn photography')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^All 2/ }))
    expect(screen.getByText('Learn photography')).toBeInTheDocument()
    expect(screen.getByText('Renew the insurance')).toBeInTheDocument()
  })

  it('searches what has been written', async () => {
    const user = userEvent.setup()
    renderScreen()

    const input = screen.getByLabelText('Write a thought')
    await user.type(input, 'Learn photography{Enter}')
    await user.type(input, 'Renew the insurance{Enter}')

    await user.type(screen.getByPlaceholderText('Search what you have written'), 'insur')
    expect(screen.getByText('Renew the insurance')).toBeInTheDocument()
    expect(screen.queryByText('Learn photography')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument()
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
