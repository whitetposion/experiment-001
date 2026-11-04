import { ApiError } from '@/services/apiError'

function abortedError() {
  return new ApiError('aborted', 'The request was cancelled.')
}

/** Waits for the given time. Aborting clears the timer, so nothing outlives the caller. */
export function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortedError())
      return
    }

    function handleAbort() {
      clearTimeout(timer)
      reject(abortedError())
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, ms)

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}
