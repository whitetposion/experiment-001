import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './Dialog'

function renderDialog(props: { hideClose?: boolean; closeLabel?: string } = {}) {
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent {...props}>
        <DialogTitle>Delete message</DialogTitle>
        <DialogDescription>This cannot be undone.</DialogDescription>
        <Button>Confirm</Button>
      </DialogContent>
    </Dialog>,
  )
}

async function openDialog() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Open' }))
  return { dialog: await screen.findByRole('dialog'), user }
}

describe('Dialog', () => {
  it('is named and described by its title and description', async () => {
    renderDialog()
    const { dialog } = await openDialog()

    expect(dialog).toHaveAccessibleName('Delete message')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('moves focus inside and keeps it there', async () => {
    renderDialog()
    const { dialog, user } = await openDialog()

    expect(dialog).toContainElement(document.activeElement as HTMLElement)

    await user.tab()
    await user.tab()
    await user.tab()

    expect(dialog).toContainElement(document.activeElement as HTMLElement)
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    renderDialog()
    const { user } = await openDialog()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus()
  })

  it('closes from the close button', async () => {
    renderDialog({ closeLabel: 'Dismiss' })
    const { user } = await openDialog()

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('can hide the close button', async () => {
    renderDialog({ hideClose: true })
    await openDialog()

    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})
