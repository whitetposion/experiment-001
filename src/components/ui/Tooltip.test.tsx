import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Tooltip, TooltipProvider } from './Tooltip'

function renderTooltip() {
  render(
    <TooltipProvider delayDuration={0}>
      <Tooltip content="More information">
        <Button>Info</Button>
      </Tooltip>
    </TooltipProvider>,
  )
}

describe('Tooltip', () => {
  it('stays hidden until the trigger receives attention', () => {
    renderTooltip()

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens on keyboard focus and describes the trigger', async () => {
    const user = userEvent.setup()
    renderTooltip()

    await user.tab()

    expect(await screen.findByRole('tooltip')).toHaveTextContent('More information')
    expect(screen.getByRole('button', { name: 'Info' })).toHaveAccessibleDescription(
      'More information',
    )
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    renderTooltip()

    await user.tab()
    await screen.findByRole('tooltip')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
