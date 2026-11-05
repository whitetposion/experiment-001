import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function renderDialog(onConfirm: () => Promise<void>) {
  const onClose = vi.fn()

  render(
    <ConfirmDialog
      confirmLabel="Delete"
      description="This cannot be undone."
      onClose={onClose}
      onCloseAutoFocus={vi.fn()}
      onConfirm={onConfirm}
      open
      title="Delete this?"
    />,
  )

  return { onClose, user: userEvent.setup() }
}

describe('ConfirmDialog', () => {
  it('closes once the action succeeds', async () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const { onClose, user } = renderDialog(onConfirm)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('stays open and shows why when the action fails', async () => {
    const { onClose, user } = renderDialog(() =>
      Promise.reject(new Error('Could not reach the server')),
    )

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('cancels without running the action', async () => {
    const onConfirm = vi.fn(() => Promise.resolve())
    const { onClose, user } = renderDialog(onConfirm)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
