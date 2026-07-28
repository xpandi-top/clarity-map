import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
        <Route path="/reflect" element={<p>Reflect screen</p>} />
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
  it('opens the planning loop from a cold start', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Capture a thought' }))

    expect(screen.getByText('Capture screen')).toBeInTheDocument()
    expect(useStore.getState().workspaces).toHaveLength(1)
  })

  it('opens the learning loop from a cold start, without going through Capture', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Reflect on it' }))

    // The whole point: someone whose day just happened has their own door in.
    expect(screen.getByText('Reflect screen')).toBeInTheDocument()
    expect(useStore.getState().workspaces).toHaveLength(1)
  })

  it('enters either loop in the workspace you were last in', async () => {
    const user = userEvent.setup()
    const id = useStore.getState().startWorkspace('Last week')
    useStore.setState({ currentWorkspaceId: null })
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Reflect on it' }))

    expect(screen.getByText('Reflect screen')).toBeInTheDocument()
    // No second workspace was created just because a door was used.
    expect(useStore.getState().workspaces).toHaveLength(1)
    expect(useStore.getState().currentWorkspaceId).toBe(id)
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

  it('offers both loops as ways to start, not as a diagram', () => {
    renderScreen()

    const paths = screen.getByRole('region', { name: 'Ways to start' })
    expect(paths).toHaveTextContent('I have something on my mind')
    expect(paths).toHaveTextContent('Something just happened')
    expect(
      within(paths).getByRole('button', { name: 'Capture a thought' }),
    ).toBeInTheDocument()
    expect(within(paths).getByRole('button', { name: 'Reflect on it' })).toBeInTheDocument()
  })

  it('links each loop step once there is a workspace to open it in', () => {
    useStore.getState().startWorkspace('Mine')
    renderScreen()

    const paths = screen.getByRole('region', { name: 'Ways to start' })
    expect(within(paths).getByRole('link', { name: 'Matrix' })).toHaveAttribute(
      'href',
      '/matrix',
    )
    expect(within(paths).getByRole('link', { name: 'Model' })).toHaveAttribute('href', '/model')
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
