export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Try again.'

/** The text to show for a caught value, which TypeScript can only know as unknown. */
export function getFailureMessage(failure: unknown) {
  if (typeof failure === 'object' && failure !== null && 'message' in failure) {
    return typeof failure.message === 'string' ? failure.message : GENERIC_ERROR_MESSAGE
  }

  return GENERIC_ERROR_MESSAGE
}
