import { GENERIC_ERROR_MESSAGE } from '@/lib/failureMessage'

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

/** The plain form of an ApiError, which is safe to keep in Redux state. */
export interface ApiFailure {
  readonly code: ApiErrorCode
  readonly message: string
  readonly retryable: boolean
}

export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message, retryable: error.retryable }
  }

  return { code: 'network', message: GENERIC_ERROR_MESSAGE, retryable: true }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
