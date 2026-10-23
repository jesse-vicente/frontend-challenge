let ready: Promise<void> = Promise.resolve()

/**
 * Requests and the realtime socket wait for the backend to accept traffic. With the
 * simulated backend this is the MSW worker start, which runs in parallel with the
 * first render; a real backend is ready immediately.
 */
export function setBackendReady(promise: Promise<void>): void {
  ready = promise
}

export function backendReady(): Promise<void> {
  return ready
}
