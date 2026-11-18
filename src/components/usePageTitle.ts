import { useEffect } from 'react';

/** Sets the browser tab title per page, like real stores do. */
export function usePageTitle(title: string, suffix = '바로담 마켓') {
  useEffect(() => {
    document.title = title ? `${title} | ${suffix}` : suffix;
  }, [title, suffix]);
}
