import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

async function reachActions(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText('What is happening right now?'),
    'I feel sleepy. I opened the computer but have not started.',
  )
  await user.click(screen.getByRole('button', { name: 'Help me find the next step' }))
  await screen.findByRole('heading', { name: 'Is this understanding close?' })
  await user.click(screen.getByRole('button', { name: 'Yes, that is right' }))
  await user.click(screen.getByRole('button', { name: 'Show small actions' }))
}

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
  useStore.getState().startWorkspace('Test workspace')
})

describe('ReflectScreen', () => {
  it('reaches concrete actions without requiring observation or interpretation typing', async () => {
    const user = userEvent.setup()
    renderScreen()

    await reachActions(user)

    expect(screen.getAllByRole('button', { name: /Choose this/ })).toHaveLength(3)
    expect(screen.queryByText('Beliefs and model building')).not.toBeInTheDocument()
  })

  it('lets the user edit a suggestion before choosing it', async () => {
    const user = userEvent.setup()
    renderScreen()
    await reachActions(user)

    expect(
      screen.getByRole('button', { name: 'Generate new suggestions' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit suggestions' }))
    const veryLowSuggestion = screen.getByLabelText('Very low energy suggestion')
    await user.clear(veryLowSuggestion)
    await user.type(veryLowSuggestion, 'Put my badge beside the front door.')
    await user.click(screen.getByRole('button', { name: 'Finish editing' }))
    await user.click(
      screen.getByRole('button', { name: /Put my badge beside the front door/ }),
    )

    expect(screen.getByText('Only do this now:')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Put my badge beside the front door.' }))
      .toBeInTheDocument()
  })

  it('keeps current suggestions usable when on-device regeneration is unavailable', async () => {
    const user = userEvent.setup()
    renderScreen()
    await reachActions(user)

    await waitFor(() =>
      expect(
        screen.getByText(
          'New suggestions could not be generated. You can edit the current ones.',
        ),
      ).toBeInTheDocument(),
    )
    expect(screen.getAllByRole('button', { name: /Choose this/ })).toHaveLength(3)
  })

  it('visibly distinguishes observations from possible interpretations and allows edits', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.type(screen.getByLabelText('What is happening right now?'), 'The document is open.')
    await user.click(screen.getByRole('button', { name: 'Help me find the next step' }))

    expect(screen.getByText('Directly observed')).toBeInTheDocument()
    expect(screen.getByText('Possible interpretations')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Situation'))
    await user.type(screen.getByLabelText('Situation'), 'A document is open')
    expect(screen.getByDisplayValue('A document is open')).toBeInTheDocument()
  })

  it('makes a selected action smaller and enters focus mode', async () => {
    const user = userEvent.setup()
    renderScreen()
    await reachActions(user)

    const actionButtons = screen.getAllByRole('button', { name: /Choose this/ })
    await user.click(actionButtons[2])
    expect(screen.getByText('Only do this now:')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Still too difficult — make it smaller' }),
    )
    expect(screen.getByText('Open the place where this action would begin.')).toBeInTheDocument()
  })

  it('offers optional knowledge capture only after outcome feedback', async () => {
    const user = userEvent.setup()
    renderScreen()
    await reachActions(user)
    await user.click(screen.getAllByRole('button', { name: /Choose this/ })[0])
    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByText('Supporting evidence')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'It became easier to continue' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Supporting evidence')).toBeInTheDocument()
    expect(screen.getByText('Reusable strategy')).toBeInTheDocument()
    expect(screen.getByText('Reminder to review later')).toBeInTheDocument()
  })

  it('saves the untouched original entry as an observation', async () => {
    const user = userEvent.setup()
    renderScreen()
    await reachActions(user)
    await user.click(screen.getAllByRole('button', { name: /Choose this/ })[0])
    await user.click(screen.getByRole('button', { name: 'Done' }))
    await user.click(screen.getByRole('button', { name: 'No noticeable change' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'Save selected items' }))

    expect(useStore.getState().observations[0].description).toBe(
      'I feel sleepy. I opened the computer but have not started.',
    )
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Find one next step' })).toBeInTheDocument(),
    )
  })

  it('restores a safe in-progress draft after remounting', async () => {
    const user = userEvent.setup()
    const view = renderScreen()
    await user.type(screen.getByLabelText('What is happening right now?'), 'Packing is unfinished.')
    await user.click(screen.getByRole('button', { name: 'Help me find the next step' }))
    await screen.findByRole('heading', { name: 'Is this understanding close?' })
    view.unmount()

    renderScreen()
    expect(screen.getByRole('heading', { name: 'Is this understanding close?' })).toBeInTheDocument()
    expect(screen.getAllByText('Packing is unfinished.').length).toBeGreaterThan(0)
  })
})
