import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { toMessageId, type MessageId } from '@/types/ids'
import { useChatScroll } from './useChatScroll'

// jsdom has no layout, so these values stand in for a real scrolling element.
const layout = { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 }
const originals = ['scrollHeight', 'clientHeight', 'scrollTop'].map(
  (name) => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)] as const,
)

beforeEach(() => {
  Object.assign(layout, { scrollHeight: 1000, clientHeight: 400, scrollTop: 0 })

  Object.defineProperties(Element.prototype, {
    scrollHeight: { configurable: true, get: () => layout.scrollHeight },
    clientHeight: { configurable: true, get: () => layout.clientHeight },
    scrollTop: {
      configurable: true,
      get: () => layout.scrollTop,
      set: (value: number) => {
        layout.scrollTop = value
      },
    },
  })
})

afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) {
      Object.defineProperty(Element.prototype, name, descriptor)
    }
  }
})

function Scroller({ ids, isLatestOwn = false }: { ids: MessageId[]; isLatestOwn?: boolean }) {
  const { handleScroll, isAwayFromBottom, scrollerRef, scrollToBottom } = useChatScroll({
    isLatestOwn,
    messageIds: ids,
  })

  return (
    <div data-testid="scroller" onScroll={handleScroll} ref={scrollerRef}>
      <button onClick={scrollToBottom} type="button">
        {isAwayFromBottom ? 'away' : 'at end'}
      </button>
    </div>
  )
}

const id = (value: string) => toMessageId(value)
const ids = (...values: string[]) => values.map(id)

function scrollTo(position: number) {
  layout.scrollTop = position
  fireEvent.scroll(screen.getByTestId('scroller'))
}

describe('useChatScroll', () => {
  it('starts at the newest message', () => {
    render(<Scroller ids={ids('a', 'b')} />)

    expect(layout.scrollTop).toBe(1000)
  })

  it('jumps to the end when messages arrive after an empty load', () => {
    const { rerender } = render(<Scroller ids={[]} />)
    layout.scrollTop = 0

    rerender(<Scroller ids={ids('a', 'b')} />)

    expect(layout.scrollTop).toBe(1000)
  })

  it('follows a new message when the reader is at the end', () => {
    const { rerender } = render(<Scroller ids={ids('a')} />)
    scrollTo(600)
    layout.scrollHeight = 1100

    rerender(<Scroller ids={ids('a', 'b')} />)

    expect(layout.scrollTop).toBe(1100)
  })

  it('stays put when someone else sends a message and the reader has scrolled up', () => {
    const { rerender } = render(<Scroller ids={ids('a')} />)
    scrollTo(100)
    layout.scrollHeight = 1100

    rerender(<Scroller ids={ids('a', 'b')} />)

    expect(layout.scrollTop).toBe(100)
  })

  it('always shows the reader their own message', () => {
    const { rerender } = render(<Scroller ids={ids('a')} />)
    scrollTo(100)
    layout.scrollHeight = 1100

    rerender(<Scroller ids={ids('a', 'b')} isLatestOwn />)

    expect(layout.scrollTop).toBe(1100)
  })

  it('keeps the view steady when older messages load above', () => {
    const { rerender } = render(<Scroller ids={ids('b', 'c')} />)
    scrollTo(50)
    layout.scrollHeight = 1500

    rerender(<Scroller ids={ids('a', 'b', 'c')} />)

    expect(layout.scrollTop).toBe(550)
  })

  it('does not move for an update that adds no messages', () => {
    const { rerender } = render(<Scroller ids={ids('a', 'b')} />)
    scrollTo(100)

    rerender(<Scroller ids={ids('a', 'b')} />)

    expect(layout.scrollTop).toBe(100)
  })

  it('reports leaving the end, and treats nearly at the end as there', () => {
    render(<Scroller ids={ids('a')} />)

    scrollTo(100)
    expect(screen.getByRole('button')).toHaveTextContent('away')

    scrollTo(540)
    expect(screen.getByRole('button')).toHaveTextContent('at end')
  })

  it('returns to the end on request', async () => {
    render(<Scroller ids={ids('a')} />)
    scrollTo(100)

    await userEvent.click(screen.getByRole('button'))

    expect(layout.scrollTop).toBe(1000)
  })

  it('stops observing size changes when removed', () => {
    let disconnected = false
    const Original = globalThis.ResizeObserver

    globalThis.ResizeObserver = class extends Original {
      override disconnect() {
        disconnected = true
      }
    }

    const { unmount } = render(<Scroller ids={ids('a')} />)
    act(() => {
      unmount()
    })
    globalThis.ResizeObserver = Original

    expect(disconnected).toBe(true)
  })
})
