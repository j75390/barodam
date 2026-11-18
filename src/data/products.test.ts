import { buildProduct, idFromPhoto, PRODUCTS } from './products';

describe('idFromPhoto', () => {
  it('reads the number from generated and CC0 photo names', () => {
    expect(idFromPhoto('gen/p025.jpg')).toBe(25);
    expect(idFromPhoto('cc/p140.jpg')).toBe(140);
    expect(idFromPhoto('cc/x007.jpg')).toBe(1007);
    expect(idFromPhoto('gen/hero0.jpg')).toBe(0);
  });
});

describe('buildProduct', () => {
  const entry = { f: 'gen/p025.jpg', type: 'tee', name: '모노픽 오버핏 티셔츠', brand: '모노픽', color: '베이지' };

  it('is deterministic for the same photo', () => {
    expect(buildProduct(entry)).toEqual(buildProduct(entry));
  });

  it('keeps price consistent with list price and discount', () => {
    const p = buildProduct(entry)!;
    expect(p.price).toBe(Math.round((p.base * (1 - p.off / 100)) / 10) * 10);
    expect(p.price).toBeLessThanOrEqual(p.base);
  });

  it('puts the photographed color first and never sells out every size', () => {
    const p = buildProduct(entry)!;
    expect(p.colors?.[0]).toBe('베이지');
    expect(p.sizes).toEqual(['S', 'M', 'L', 'XL']);
    expect(p.soldOut.length).toBeLessThan(p.sizes!.length);
  });

  it('returns null for unknown types', () => {
    expect(buildProduct({ ...entry, type: 'spaceship' })).toBeNull();
  });
});

describe('catalog', () => {
  it('has one product per photo with unique ids and photos', () => {
    expect(PRODUCTS.length).toBeGreaterThan(500);
    expect(new Set(PRODUCTS.map((p) => p.id)).size).toBe(PRODUCTS.length);
    expect(new Set(PRODUCTS.map((p) => p.photo)).size).toBe(PRODUCTS.length);
  });
});
