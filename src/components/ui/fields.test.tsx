import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'
import { Textarea } from './Textarea'

describe('Input', () => {
  it('accepts typing and connects to its label', async () => {
    const user = userEvent.setup()
    render(
      <label>
        Name
        <Input />
      </label>,
    )

    await user.type(screen.getByLabelText('Name'), 'Asha')

    expect(screen.getByLabelText('Name')).toHaveValue('Asha')
  })

  it('does not leak the size variant to the native size attribute', () => {
    render(<Input aria-label="Name" size="lg" />)

    const input = screen.getByLabelText('Name')
    expect(input).not.toHaveAttribute('size')
    expect(input).toHaveClass('h-control-lg')
  })

  it('exposes invalid and disabled states', () => {
    render(<Input aria-invalid aria-label="Name" disabled />)

    const input = screen.getByLabelText('Name')
    expect(input).toBeInvalid()
    expect(input).toBeDisabled()
  })

  it('forwards refs so form libraries can register it', () => {
    const ref = { current: null as HTMLInputElement | null }
    render(<Input aria-label="Name" ref={ref} />)

    expect(ref.current).toBe(screen.getByLabelText('Name'))
  })
})

describe('Textarea', () => {
  it('accepts multi-line input', async () => {
    const user = userEvent.setup()
    render(<Textarea aria-label="Message" />)

    await user.type(screen.getByLabelText('Message'), 'one{Enter}two')

    expect(screen.getByLabelText('Message')).toHaveValue('one\ntwo')
  })

  it('switches resize behavior with autoResize', () => {
    render(<Textarea aria-label="Message" autoResize />)

    const textarea = screen.getByLabelText('Message')
    expect(textarea).toHaveClass('field-sizing-content', 'resize-none')
    expect(textarea).not.toHaveAttribute('autoresize')
  })
})
