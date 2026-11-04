import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'

const icon = <svg aria-hidden="true" data-testid="icon" />

describe('IconButton', () => {
  it('uses label as its accessible name', () => {
    render(<IconButton label="Search">{icon}</IconButton>)

    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('swaps the icon for one spinner and keeps its name while loading', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onClick = vi.fn()
    render(
      <IconButton label="Send" loading onClick={onClick}>
        {icon}
      </IconButton>,
    )

    const button = screen.getByRole('button', { name: 'Send' })
    await user.click(button)

    expect(screen.queryByTestId('icon')).not.toBeInTheDocument()
    expect(button.querySelectorAll('svg')).toHaveLength(1)
    expect(onClick).not.toHaveBeenCalled()
  })
})
