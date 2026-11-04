import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'
import { Badge } from './Badge'
import { Card, CardTitle } from './Card'
import { Separator } from './Separator'

describe('Avatar', () => {
  it('announces one name, not the fallback text', () => {
    render(<Avatar alt="Asha Rao" fallback="AR" />)

    expect(screen.getByRole('img', { name: 'Asha Rao' })).toBeInTheDocument()
    expect(screen.getByText('AR')).toHaveAttribute('aria-hidden', 'true')
  })

  it('is hidden as decoration when alt is empty', () => {
    render(<Avatar alt="" data-testid="avatar" fallback="AR" />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByTestId('avatar')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByTestId('avatar')).not.toHaveAttribute('aria-label')
  })

  it('shows the fallback while an image has not loaded', () => {
    render(<Avatar alt="Asha Rao" fallback="AR" src="/asha.png" />)

    expect(screen.getByText('AR')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('applies the variant and merges className', () => {
    render(
      <Badge className="px-4" variant="success">
        Online
      </Badge>,
    )

    const badge = screen.getByText('Online')
    expect(badge).toHaveClass('bg-success', 'px-4')
    expect(badge).not.toHaveClass('px-2')
  })
})

describe('Card', () => {
  it('lets the title match the document outline', () => {
    render(
      <Card>
        <CardTitle as="h2">Details</CardTitle>
      </Card>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Details' })).toBeInTheDocument()
  })

  it('defaults to a level 3 heading', () => {
    render(<CardTitle>Details</CardTitle>)

    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
  })
})

describe('Separator', () => {
  it('is hidden from assistive technology by default', () => {
    render(<Separator data-testid="separator" />)

    expect(screen.getByTestId('separator')).toHaveAttribute('role', 'none')
  })

  it('exposes semantics when it is not decorative', () => {
    render(<Separator decorative={false} orientation="vertical" />)

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical')
  })
})
