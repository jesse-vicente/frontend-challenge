/** Runs before each request, e.g. to wake the simulated backend after the tab was idle. */
export type BackendCheck = () => Promise<void>

let ready: Promise<BackendCheck | undefined> = Promise.resolve(undefined)

/**
 * Requests and the realtime socket wait for the backend to accept traffic. With the
 * simulated backend this is the MSW worker start, which runs in parallel with the
 * first render and resolves with a check for later requests; a real backend is ready
 * immediately.
 */
export function setBackendReady(start: Promise<BackendCheck | undefined>): void {
  ready = start
}

export async function backendReady(): Promise<void> {
  const check = await ready
  await check?.()
}
