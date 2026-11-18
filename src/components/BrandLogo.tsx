import { BRAND_ICONS, BRAND_LOGOS, LOGO_FONTS } from '@/data/brandLogos';
import { hashString } from '@/lib/random';

const logoOf = (b: string): [string, string, string, string] => BRAND_LOGOS[b] ?? [b, 'circle', `hsl(${hashString(b) % 360} 45% 38%)`, 's'];

/** Round emblem (white icon on the brand color). Icons are static, trusted SVG strings. */
export function BrandEmblem({ brand, size = 64, className = 'emb' }: { brand: string; size?: number; className?: string }) {
  const [, icon, color] = logoOf(brand);
  const s = Math.round(size * 0.52);
  return (
    <span className={className} style={{ width: size, height: size, background: color, ['--lg-bg' as string]: color }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={s} height={s} fill="#fff" color="#fff" dangerouslySetInnerHTML={{ __html: BRAND_ICONS[icon] ?? '' }} />
    </span>
  );
}

/** Horizontal lockup: icon + English wordmark in the brand's own type style. */
export function BrandMark({ brand, scale = 1 }: { brand: string; scale?: number }) {
  const [word, icon, color, font] = logoOf(brand);
  const [fontDecl, extra] = (LOGO_FONTS[font] ?? LOGO_FONTS.s).split(';');
  const baseSize = font === 'w' || font === 'c' || font === 'm' ? 13 : 16;
  const style: React.CSSProperties = { color, font: fontDecl, fontSize: `calc(${baseSize}px * ${scale})` };
  if (extra?.includes('letter-spacing')) style.letterSpacing = extra.split(':')[1];
  const iconSize = Math.round(22 * scale);
  return (
    <span className="bmark" style={style} aria-label={brand}>
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize} fill={color} color={color} style={{ ['--lg-bg' as string]: 'var(--surface)' }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAND_ICONS[icon] ?? '' }} />
      {word}
    </span>
  );
}
