import { Link, NavLink, useParams } from 'react-router-dom';
import { INFO_PAGES, TERMS } from '@/data/info';
import { usePageTitle } from '@/components/usePageTitle';
import NotFound from './NotFound';

const GROUPS: [string, string[]][] = [
  ['회사', ['about', 'careers', 'ads', 'a11y']],
  ['정책', ['terms', 'privacy', 'youth', 'openmarket', 'ethics', 'content']],
  ['판매자', ['seller', 'sellercenter', 'sellerguide']],
  ['신고·분쟁', ['efin', 'dispute', 'cyber', 'rights', 'copyright', 'bizinfo']],
];

const TERMS_TAIL = `\n\n제5조(배송) 회사는 이용자가 구매한 상품을 약정한 기간 안에 배송해요.\n제6조(환급) 회사는 상품을 배송할 수 없을 때 지체 없이 이용자에게 알리고 대금을 환급해요.\n제7조(개인정보) 회사는 개인정보처리방침에 따라 이용자의 개인정보를 보호해요.\n\n부칙: 이 약관은 2026년 10월 20일부터 시행해요.`;

/** Company / policy / legal pages linked from the footer. Bodies are static, trusted HTML. */
export default function Info() {
  const { key = '' } = useParams();
  const page = INFO_PAGES[key];
  usePageTitle(page?.[0] ?? '안내');
  if (!page) return <NotFound />;
  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › {page[0]}</div>
      <div className="mp">
        <nav className="mp-nav" aria-label="안내 메뉴">
          {GROUPS.map(([g, keys]) => (
            <div key={g} style={{ display: 'contents' }}>
              <div className="g">{g}</div>
              {keys.map((k) => <NavLink key={k} to={`/info/${k}`} aria-current={k === key ? 'page' : undefined}>{INFO_PAGES[k][0]}</NavLink>)}
            </div>
          ))}
        </nav>
        <article className="box infopage">
          <h1 className="ptitle">{page[0]}</h1>
          {key === 'terms' ? (
            <div style={{ whiteSpace: 'pre-line', lineHeight: 1.8 }}>{TERMS.tos[1] + TERMS_TAIL}</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: (page[1] ?? '').replace(/href="\/careers\/"/g, 'href="/careers"') }} />
          )}
        </article>
      </div>
    </main>
  );
}
