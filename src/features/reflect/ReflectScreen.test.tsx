import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ReflectScreen } from './ReflectScreen'
import { resetStore, useStore } from '../../store'

function renderScreen() {
  return render(
    <MemoryRouter>
      <ReflectScreen />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
  useStore.getState().startWorkspace('Test workspace')
})

describe('ReflectScreen', () => {
  it('saves a one-sentence observation without an interpretation', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(
      screen.getByLabelText('In your own words'),
      'After leaving the house, I became more willing to move.',
    )
    await user.click(screen.getByRole('button', { name: 'Save this reflection' }))

    const state = useStore.getState()
    expect(state.observations).toHaveLength(1)
    expect(state.observations[0].description).toBe(
      'After leaving the house, I became more willing to move.',
    )
    // Interpretation is optional, so nothing was concluded on the user's behalf.
    expect(state.evidence).toHaveLength(0)
  })

  it('keeps the observation and the interpretation as separate records', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText('In your own words'), 'I left the house.')
    await user.type(
      screen.getByLabelText('What do you think this may indicate?'),
      'Changing environments may help me move.',
    )
    await user.click(screen.getByRole('button', { name: 'Save this reflection' }))

    const state = useStore.getState()
    expect(state.observations[0].description).toBe('I left the house.')
    expect(state.evidence[0].statement).toBe('Changing environments may help me move.')
    expect(state.evidence[0].observationIds).toEqual([state.observations[0].id])
  })

  it('opens the belief update form when the experience contradicts a belief', async () => {
    const user = userEvent.setup()
    useStore.getState().addBelief({ statement: 'One indulgence means failure.' })
    renderScreen()

    await user.type(screen.getByLabelText('In your own words'), 'Dinner still got cooked.')
    await user.type(
      screen.getByLabelText('What do you think this may indicate?'),
      'One indulgence does not decide the rest of the day.',
    )
    await user.click(screen.getByLabelText('It contradicts an existing belief.'))
    await user.click(screen.getByRole('button', { name: 'Save this reflection' }))

    expect(screen.getByRole('dialog', { name: 'Update a belief' })).toBeInTheDocument()
    // Recorded against the reading, not silently dropped.
    expect(useStore.getState().evidence[0].contradictingObservationIds).toHaveLength(1)
  })

  it('only shows defaults the user has written that match the situation', async () => {
    const user = userEvent.setup()
    useStore.getState().addPersonalRule({
      name: 'Ten-minute limit',
      triggerDescription: 'I have been deliberating for a long time',
      defaultResponse: 'Choose a good-enough option, then reassess.',
    })
    renderScreen()

    expect(screen.getByText('Nothing you have recorded matches yet.')).toBeInTheDocument()

    await user.type(
      screen.getByLabelText('Where are you right now?'),
      'deliberating about dinner',
    )

    expect(screen.getByText('Ten-minute limit')).toBeInTheDocument()
    expect(screen.getByText('Choose a good-enough option, then reassess.')).toBeInTheDocument()
  })
})
