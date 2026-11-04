export type ApiErrorCode =
  'aborted' | 'conflict' | 'forbidden' | 'network' | 'not-found' | 'validation'

export class ApiError extends Error {
  readonly code: ApiErrorCode

  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }

  /** Only network failures are worth retrying. The others fail the same way again. */
  get retryable() {
    return this.code === 'network'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
