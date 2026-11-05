/** Separates parts of a row for screen readers, which would otherwise run words together. */
export function ScreenReaderPause() {
  return <span className="sr-only">, </span>
}
