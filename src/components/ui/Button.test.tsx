import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('defaults to type button so it does not submit forms', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('calls onClick when activated by mouse or keyboard', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await user.click(screen.getByRole('button'))
    await user.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('does not fire when disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByRole('button')).toBeDisabled()
    expect(onClick).not.toHaveBeenCalled()
  })

  describe('while loading', () => {
    it('exposes the busy state and keeps its accessible name', () => {
      render(<Button loading>Save</Button>)

      const button = screen.getByRole('button', { name: 'Save' })
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('stays focusable but blocks keyboard activation', async () => {
      const user = userEvent.setup()
      const onClick = vi.fn()
      render(
        <Button loading onClick={onClick}>
          Save
        </Button>,
      )

      await user.tab()
      await user.keyboard('{Enter}')

      expect(screen.getByRole('button')).toHaveFocus()
      expect(onClick).not.toHaveBeenCalled()
    })

    it('blocks form submission', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn((event: React.SubmitEvent) => {
        event.preventDefault()
      })
      render(
        <form onSubmit={onSubmit}>
          <input aria-label="Name" />
          <Button loading type="submit">
            Save
          </Button>
        </form>,
      )

      await user.type(screen.getByLabelText('Name'), 'Asha{Enter}')

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('asChild', () => {
    it('renders the child element with button styling', () => {
      render(
        <Button asChild variant="outline">
          <a href="/docs">Docs</a>
        </Button>,
      )

      const link = screen.getByRole('link', { name: 'Docs' })
      expect(link).toHaveAttribute('href', '/docs')
      expect(link).toHaveClass('border')
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('marks a disabled child with aria-disabled and blocks clicks', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 })
      const onClick = vi.fn()
      render(
        <Button asChild disabled onClick={onClick}>
          <a href="#docs">Docs</a>
        </Button>,
      )

      const link = screen.getByRole('link')
      await user.click(link)

      expect(link).toHaveAttribute('aria-disabled', 'true')
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  it('lets className override variant classes', () => {
    render(<Button className="rounded-md">Save</Button>)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('rounded-md')
    expect(button).not.toHaveClass('rounded-control')
  })

  it('forwards refs and native attributes', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(
      <Button data-testid="save" ref={ref}>
        Save
      </Button>,
    )

    expect(ref.current).toBe(screen.getByTestId('save'))
  })
})
