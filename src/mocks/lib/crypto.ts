const encoder = new TextEncoder()

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Salted SHA-256: the simulated API never stores passwords in clear text. */
export async function hashPassword(password: string, salt: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', encoder.encode(`${salt}:${password}`)))
}

export function randomToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '')
}

export function randomSalt(): string {
  return crypto.randomUUID().replaceAll('-', '')
}
