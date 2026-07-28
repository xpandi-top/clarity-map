import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollectionBrowser } from './CollectionBrowser'
import { useCollectionBrowser } from './useCollectionBrowser'

function Harness() {
  const [items] = useState(['First', 'Second', 'Third'])
  const browser = useCollectionBrowser(items.length)

  return (
    <>
      <CollectionBrowser
        mode={browser.mode}
        onModeChange={browser.setMode}
        index={browser.index}
        total={items.length}
        itemLabel="thought"
        onPrevious={browser.previous}
        onNext={browser.next}
      />
      <p>{browser.mode === 'list' ? items.join(', ') : items[browser.index]}</p>
      <input aria-label="Example field" />
    </>
  )
}

describe('CollectionBrowser', () => {
  it('starts with one item and browses with controls or arrow keys', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 of 3')
    expect(screen.getByRole('button', { name: 'One at a time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Next thought' }))
    expect(screen.getByText('Second')).toBeInTheDocument()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByText('Third')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next thought' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'List' }))
    expect(screen.getByText('First, Second, Third')).toBeInTheDocument()
  })

  it('does not browse while an editable field has focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByLabelText('Example field'))
    await user.keyboard('{ArrowRight}')

    expect(screen.getByText('First')).toBeInTheDocument()
  })
})
