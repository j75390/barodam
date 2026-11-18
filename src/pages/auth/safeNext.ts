/**
 * Only allow same-site relative paths as post-login redirects
 * (blocks open redirects like ?next=//evil.example or ?next=https://…).
 */
export function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null;
  return raw;
}
