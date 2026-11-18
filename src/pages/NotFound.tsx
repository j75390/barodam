import { Link } from 'react-router-dom';
import { usePageTitle } from '@/components/usePageTitle';
import { POPULAR_KEYWORDS } from '@/components/SearchBox';

export default function NotFound({ message = '찾으시는 페이지가 없어요' }: { message?: string }) {
  usePageTitle('페이지를 찾을 수 없어요');
  return (
    <main className="wrap" style={{ padding: '70px 16px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--f-display)', fontSize: 72, color: 'var(--accent)', lineHeight: 1 }}>404</div>
      <h1 className="ptitle" style={{ marginTop: 10 }}>{message}</h1>
      <p className="hint">주소가 바뀌었거나 판매가 끝났을 수 있어요. 아래에서 다시 찾아보세요.</p>
      <div className="rel" style={{ justifyContent: 'center', marginTop: 16 }}>
        {POPULAR_KEYWORDS.slice(0, 6).map((k) => <Link key={k} to={`/search?q=${encodeURIComponent(k)}`}>{k}</Link>)}
      </div>
      <p style={{ marginTop: 20 }}><Link className="btn primary" style={{ display: 'inline-block', textDecoration: 'none' }} to="/">홈으로 가기</Link></p>
    </main>
  );
}
