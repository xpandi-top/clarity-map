import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { WelcomeScreen } from './WelcomeScreen'
import { resetStore, useStore } from '../../store'

/** Renders the entry page and reports where its buttons navigate to. */
function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/welcome']}>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/capture" element={<p>Capture screen</p>} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  resetStore()
})

describe('WelcomeScreen', () => {
  it('offers one primary way in on a first visit', async () => {
    const user = userEvent.setup()
    renderScreen()

    expect(screen.getByText('First time here')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))

    // A new workspace has nothing to show on the dashboard, so it opens
    // straight onto the empty page and one input.
    expect(screen.getByText('Capture screen')).toBeInTheDocument()
    expect(useStore.getState().workspaces).toHaveLength(1)
  })

  it('leads with the workspace you were last in, and opens its overview', async () => {
    const user = userEvent.setup()
    useStore.getState().startWorkspace('Last week')
    renderScreen()

    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Last week' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText('Dashboard screen')).toBeInTheDocument()
  })

  it('explains the two loops before the navigation asks you to know them', () => {
    renderScreen()

    const paths = screen.getByRole('region', { name: 'How Clarity Map is organised' })
    expect(paths).toHaveTextContent('What matters, and what is the next step?')
    expect(paths).toHaveTextContent('What happened, and what did it tell you?')
    expect(paths).toHaveTextContent('Capture')
    expect(paths).toHaveTextContent('Reflect')
  })

  it('lists other workspaces separately from the one it leads with', () => {
    useStore.getState().startWorkspace('First')
    useStore.getState().startWorkspace('Second')
    renderScreen()

    // The current one is the start card; only the rest go in the list.
    const others = screen.getByRole('heading', { name: 'Your other workspaces' })
    expect(others).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Open' })).toHaveLength(1)
  })
})
