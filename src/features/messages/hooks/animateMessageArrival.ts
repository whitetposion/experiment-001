/**
 * Eases a new message into place. The scroll position is already final, so the list only
 * appears to slide there, which keeps the reader's position exact while it moves. The timing
 * comes from the design tokens, which drop to 0ms when the user prefers reduced motion.
 */
export function animateMessageArrival(message: HTMLElement) {
  const list = message.parentElement

  if (!list || typeof list.animate !== 'function') {
    return
  }

  const style = getComputedStyle(message)
  const slideMs = Number.parseFloat(style.getPropertyValue('--ds-duration-slow'))
  const fadeMs = Number.parseFloat(style.getPropertyValue('--ds-duration-normal'))
  const easing = style.getPropertyValue('--ds-ease-emphasized').trim()

  if (!slideMs || !fadeMs || !easing) {
    return
  }

  const shift = message.offsetHeight + Number.parseFloat(style.marginTop)

  // Added together, so a second message during this slide does not make the list jump.
  list.animate([{ transform: `translateY(${String(shift)}px)` }, { transform: 'translateY(0)' }], {
    composite: 'add',
    duration: slideMs,
    easing,
  })
  message.animate([{ opacity: 0 }, { opacity: 1 }], { duration: fadeMs, easing })
}
