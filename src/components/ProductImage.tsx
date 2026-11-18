interface Props {
  photo: string;
  alt?: string;
  eager?: boolean;
  style?: React.CSSProperties;
}

/** Product photo from /img (one photo per product). */
export function ProductImage({ photo, alt = '', eager = false, style }: Props) {
  return (
    <img
      src={`/img/${photo}`}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
    />
  );
}
