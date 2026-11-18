/**
 * Maps old hash URLs (#/p/105, #/mypage/orders, /help/#/cs/faq/ship) to the new clean paths.
 * Returns null when there is nothing to convert.
 */
export function legacyHashToPath(hash: string, pathname = '/'): string | null {
  if (!hash.startsWith('#/')) return null;
  const parts = hash.slice(2).split('/').map(decodeURIComponent);
  const [name, a, b] = parts;
  const enc = encodeURIComponent;
  if (pathname.startsWith('/help')) {
    if (name !== 'cs') return '/help';
    if (a === 'faq') return `/help/faq/${b ?? ''}`.replace(/\/$/, '');
    if (a === 'notice') return `/help/notice${b !== undefined ? `/${b}` : ''}`;
    if (a === 'search') return `/help/search?q=${enc(b ?? '')}`;
    return '/help';
  }
  if (pathname.startsWith('/careers')) {
    if (!name) return '/careers';
    return `/careers/${parts.join('/')}`;
  }
  switch (name) {
    case '':
    case undefined:
      return '/';
    case 'p':
      return `/products/${a}`;
    case 'search':
      return `/search?q=${enc(a ?? '')}`;
    case 'c':
      return `/category/${a}${b === 'deal' ? '?deal=1' : b ? `?type=${b}` : ''}`;
    case 'brand':
      return `/brands/${enc(a ?? '')}`;
    case 'order':
      return `/orders/${a}`;
    case 'complete':
      return `/orders/complete/${a}`;
    case 'gorder':
      return `/guest-orders/${a}`;
    case 'gcheckout':
      return '/checkout/guest';
    case 'cs':
      return '/help';
    case 'login':
      return a ? `/login?next=/${a}` : '/login';
    case 'signup':
      return '/signup';
    default:
      return `/${parts.filter(Boolean).join('/')}`;
  }
}
