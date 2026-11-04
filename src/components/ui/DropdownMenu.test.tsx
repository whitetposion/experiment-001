import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './DropdownMenu'

function Menu({ onEdit, onDelete }: { onEdit?: () => void; onDelete?: () => void }) {
  const [muted, setMuted] = useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>Options</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem {...(onEdit ? { onSelect: onEdit } : {})}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={muted} onCheckedChange={setMuted}>
          Mute
        </DropdownMenuCheckboxItem>
        <DropdownMenuItem {...(onDelete ? { onSelect: onDelete } : {})} variant="destructive">
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens from the keyboard and focuses the first item', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.tab()
    await user.keyboard('{Enter}')

    expect(await screen.findByRole('menu')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus()
    })
  })

  it('skips disabled items with arrow keys', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{ArrowDown}')

    expect(screen.getByRole('menuitemcheckbox', { name: 'Mute' })).toHaveFocus()
  })

  it('runs the selected item and closes', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    render(<Menu onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledOnce()
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })

  it('does not select a disabled item', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const onEdit = vi.fn()
    render(<Menu onEdit={onEdit} />)

    await user.click(screen.getByRole('button', { name: 'Options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))

    expect(onEdit).not.toHaveBeenCalled()
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('toggles a checkbox item', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(screen.getByRole('button', { name: 'Options' }))
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Mute' }))
    await user.click(screen.getByRole('button', { name: 'Options', hidden: true }))

    expect(await screen.findByRole('menuitemcheckbox', { name: 'Mute' })).toBeChecked()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Menu />)

    await user.click(screen.getByRole('button', { name: 'Options' }))
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Options' })).toHaveFocus()
  })
})
