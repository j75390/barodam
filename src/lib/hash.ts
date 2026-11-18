/**
 * Salted SHA-256 for locally stored credentials (guest-order passwords, local accounts).
 * Falls back to a non-cryptographic hash only where SubtleCrypto is unavailable
 * (non-secure contexts); the deployed site is HTTPS so SubtleCrypto is used.
 */
export async function hashSecret(secret: string, salt: string): Promise<string> {
  const text = `${salt}:${secret}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 5381;
  for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return `x${h.toString(16)}`;
}
