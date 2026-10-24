/**
 * Stand-in for `tldts`, aliased in vite.config.ts. MSW's cookie store (tough-cookie) only
 * calls `getDomain`, and `tldts` ships the whole public suffix list: about half of the mocks
 * chunk. The simulated API sets no cookies and serves the page's own origin, so the
 * registrable domain is approximated by the last two labels.
 */
const IP_ADDRESS = /^(\d{1,3}(\.\d{1,3}){3}|\[?[\da-f:]+\]?)$/i

export function getDomain(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (IP_ADDRESS.test(host)) return null
  const labels = host.split('.').filter(Boolean)
  return labels.length < 2 ? null : labels.slice(-2).join('.')
}
