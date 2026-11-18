import { legacyHashToPath } from './legacyHash';
import { safeNext } from '@/pages/auth/safeNext';
import { formatPhone, maskId, won } from './format';
import { checkPassword, isPasswordOk } from './validators';

describe('legacyHashToPath', () => {
  it('maps old shop hash routes to clean URLs', () => {
    expect(legacyHashToPath('#/p/105')).toBe('/products/105');
    expect(legacyHashToPath('#/search/%ED%8C%A8%EB%94%A9')).toBe('/search?q=%ED%8C%A8%EB%94%A9');
    expect(legacyHashToPath('#/c/fashion/deal')).toBe('/category/fashion?deal=1');
    expect(legacyHashToPath('#/c/fashion/knit')).toBe('/category/fashion?type=knit');
    expect(legacyHashToPath('#/mypage/orders')).toBe('/mypage/orders');
    expect(legacyHashToPath('#/gorder/261119-1234567')).toBe('/guest-orders/261119-1234567');
  });
  it('maps old help-center links', () => {
    expect(legacyHashToPath('#/cs/faq/ship', '/help/')).toBe('/help/faq/ship');
    expect(legacyHashToPath('#/cs/notice/2', '/help/')).toBe('/help/notice/2');
  });
  it('ignores normal anchors', () => {
    expect(legacyHashToPath('#s-rv')).toBeNull();
    expect(legacyHashToPath('')).toBeNull();
  });
});

describe('safeNext', () => {
  it('allows same-site paths only', () => {
    expect(safeNext('/checkout')).toBe('/checkout');
    expect(safeNext('//evil.example')).toBeNull();
    expect(safeNext('https://evil.example')).toBeNull();
    expect(safeNext('/\\evil.example')).toBeNull();
    expect(safeNext(null)).toBeNull();
  });
});

describe('format & validators', () => {
  it('formats phone numbers while typing', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('0101234')).toBe('010-1234');
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
  });
  it('masks ids and formats money', () => {
    expect(maskId('tester01')).toBe('tes****');
    expect(won(21960)).toBe('21,960원');
  });
  it('checks password rules', () => {
    expect(checkPassword('abc12345')).toEqual({ len: true, mix: true, noSpace: true });
    expect(isPasswordOk('abcdefgh')).toBe(false);
    expect(isPasswordOk('abc 12345')).toBe(false);
  });
});
