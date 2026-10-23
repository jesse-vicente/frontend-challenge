/** Query params read once at boot: `?scenario=<name>` and `?mock-reset`. */
const SCENARIO_PARAM = 'scenario'
const RESET_PARAM = 'mock-reset'

export interface MockBootParams {
  scenario: string | null
  reset: boolean
}

/**
 * Reads the mock params and removes them from the URL. Runs synchronously before the
 * router reads the location, so scenario params never become part of the router state.
 */
export function takeMockBootParams(): MockBootParams {
  const url = new URL(window.location.href)
  const params = { scenario: url.searchParams.get(SCENARIO_PARAM), reset: url.searchParams.has(RESET_PARAM) }
  if (params.scenario !== null || params.reset) {
    url.searchParams.delete(SCENARIO_PARAM)
    url.searchParams.delete(RESET_PARAM)
    window.history.replaceState(window.history.state, '', url)
  }
  return params
}
