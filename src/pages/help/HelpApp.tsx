import { useEffect, useRef, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CATS, catName, TYPE_LABEL } from '@/data/catalog';
import { BRANDS, PRODUCTS } from '@/data/products';
import { FAQ_CATEGORIES, FAQS, NOTICES } from '@/data/help';
import { orderState } from '@/domain/orderState';
import { fmtDate } from '@/lib/format';
import { local } from '@/lib/storage';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { openInquiryForm } from '@/components/Dialogs';
import { Footer } from '@/components/Footer';
import { ScrollTopButton } from '@/components/Chrome';
import { usePageTitle } from '@/components/usePageTitle';

const TITLE_SUFFIX = '바로담 고객센터';
const catLabel = (id: string) => FAQ_CATEGORIES.find((c) => c[0] === id)?.[1] ?? '';

/** Customer center as its own site (like help.gmarket.co.kr): global mini bar, sticky help header, own pages. */
export default function HelpApp() {
  return (
    <div className="csm">
      <GlobalBar />
      <StickyHelpHeader />
      <main className="wrap" id="page">
        <Routes>
          <Route index element={<HelpHome />} />
          <Route path="faq/:cat?" element={<FaqPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="notice" element={<NoticeList />} />
          <Route path="notice/:i" element={<NoticeDetail />} />
          <Route path="*" element={<HelpHome />} />
        </Routes>
      </main>
      <Footer />
      <ScrollTopButton />
    </div>
  );
}

function GlobalBar() {
  const user = useUser();
  const be = useBackend();
  const nav = useNavigate();
  const [open, setOpen] = useState<'cat' | 'svc' | null>(null);
  const [at, setAt] = useState('fashion');
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(null);
    const onScroll = () => window.scrollY > 60 && setOpen(null);
    document.addEventListener('click', close);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('click', close);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  const ps = PRODUCTS.filter((p) => p.cat === at);
  const types = [...new Set(ps.map((p) => p.type))];
  const half = Math.ceil(types.length / 2);
  const brands = [...new Set(ps.map((p) => p.brand))].slice(0, 6);
  return (
    <div className="gbar" ref={ref}>
      <div className="gw">
        <Link className="gl" to="/" aria-label="바로담 쇼핑 홈">담</Link>
        <form className="gs" role="search" onSubmit={(e) => { e.preventDefault(); nav(q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : '/'); }}>
          <input placeholder="통합검색" aria-label="바로담 통합검색" value={q} onChange={(e) => setQ(e.target.value)} />
          <button aria-label="검색"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg></button>
        </form>
        <div className="gdd">
          <button className="gt" aria-expanded={open === 'cat'} onClick={() => setOpen(open === 'cat' ? null : 'cat')}>카테고리 <i>{open === 'cat' ? '▴' : '▾'}</i></button>
          {open === 'cat' && (
            <div className="gmega">
              <div className="gl2">{CATS.filter((c) => c.id !== 'all').map((c) => <Link key={c.id} to={`/category/${c.id}`} className={c.id === at ? 'on' : ''} onMouseOver={() => setAt(c.id)}>{c.name}</Link>)}</div>
              <div className="gcols">
                <div><h6>{catName(at)}</h6>{types.slice(0, half).map((t) => <Link key={t} to={`/category/${at}?type=${t}`}>{TYPE_LABEL[t]}</Link>)}</div>
                <div><h6>&nbsp;</h6>{types.slice(half).map((t) => <Link key={t} to={`/category/${at}?type=${t}`}>{TYPE_LABEL[t]}</Link>)}</div>
                <div><h6>인기 브랜드</h6>{brands.map((b) => <Link key={b} to={`/brands/${encodeURIComponent(b)}`}>{b}</Link>)}</div>
                <div><h6>기획전</h6><Link to={`/category/${at}?deal=1`}>{catName(at)} 특가</Link><Link to={`/ranking?cat=${at}`}>{catName(at)} 랭킹</Link><Link to={`/category/${at}?sort=new`}>신상품 모아보기</Link></div>
              </div>
              <div className="gquick"><b>바로가기 ›</b>{BRANDS.slice(0, 6).map((b) => <Link key={b} to={`/brands/${encodeURIComponent(b)}`}>{b}</Link>)}</div>
            </div>
          )}
        </div>
        <span className="gsep" />
        <div className="gdd">
          <button className="gt" aria-expanded={open === 'svc'} onClick={() => setOpen(open === 'svc' ? null : 'svc')}>서비스 <i>{open === 'svc' ? '▴' : '▾'}</i></button>
          {open === 'svc' && (
            <div className="gsvc">
              <Link to="/ranking">바로담 랭킹</Link><Link to="/category/all?deal=1">오늘의 특가</Link><Link to="/brands">브랜드</Link>
              <Link to="/mypage/coupons">쿠폰 코드 등록</Link><Link to="/login?tab=guest">비회원 주문조회</Link><Link to="/help/faq/safe">안전거래 센터</Link>
            </div>
          )}
        </div>
        <nav className="gr">
          {user ? (
            <>
              <Link to="/mypage">{user.name}님</Link>
              <a href="/help" onClick={async (e) => { e.preventDefault(); await be.signOut(); }}>로그아웃</a>
            </>
          ) : (
            <><Link to="/login?next=/help">로그인</Link><Link to="/signup">회원가입</Link></>
          )}
          <Link to="/mypage">나의 바로담</Link>
        </nav>
      </div>
    </div>
  );
}

function SearchForm({ initial = '', className = 'cs-search' }: { initial?: string; className?: string }) {
  const nav = useNavigate();
  const [q, setQ] = useState(initial);
  return (
    <form className={className} role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/help/search?q=${encodeURIComponent(q.trim())}`); }}>
      <input className="inp" placeholder="자주하는 질문을 검색해 주세요" aria-label="자주 묻는 질문 검색" value={q} onChange={(e) => setQ(e.target.value)} />
      <button aria-label="검색"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg></button>
    </form>
  );
}

function StickyHelpHeader() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 230);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`cshead${show ? ' show' : ''}`} aria-hidden={!show}>
      <div className="wrap">
        <Link className="brand" to="/help"><span className="logo2">바로<b>담</b></span><span>고객센터</span></Link>
        <SearchForm />
      </div>
    </header>
  );
}

function useAsk() {
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  return (cat?: string) => (user ? void openInquiryForm(ui, be, { cat }) : nav('/login?next=/help'));
}

function HelpHome() {
  usePageTitle('', TITLE_SUFFIX);
  const user = useUser();
  const ask = useAsk();
  const [cat, setCat] = useState('order');
  const cards = FAQS.filter((f) => f[0] === cat).sort((a, b) => (b[3] ?? 0) - (a[3] ?? 0));
  const car = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: true });
  const upd = () => { const c = car.current; if (c) setEdge({ l: c.scrollLeft > 4, r: c.scrollLeft + c.clientWidth < c.scrollWidth - 4 }); };
  useEffect(() => { if (car.current) car.current.scrollLeft = 0; requestAnimationFrame(upd); }, [cat]);
  const recent = user?.orders[0];
  return (
    <>
      <div className="cs-hero"><h1><b>바로담</b>이 도와드릴게요!</h1><SearchForm /></div>
      <div className="cs-login bleed">
        {user ? (
          <>
            <span className="emb" style={{ width: 40, height: 40, background: 'var(--accent)', color: '#fff', fontWeight: 800 }}>{user.name[0]}</span>
            <span><b>{user.name}</b>님, 무엇을 도와드릴까요?{recent && <span className="hint"> 최근 주문: {fmtDate(recent.at)} · {orderState(recent).label}</span>}</span>
            {recent && <Link className="btn sm" style={{ textDecoration: 'none', color: 'inherit' }} to={`/orders/${recent.no}`}>주문 상세</Link>}
          </>
        ) : (
          <>
            <span className="emb" style={{ width: 40, height: 40, background: 'var(--sunk)', fontSize: 20 }}>🙋</span>
            <span>로그인하시면 더욱 편리하게 도움을 받으실 수 있어요</span>
            <Link className="btn sm primary" style={{ textDecoration: 'none' }} to="/login?next=/help">로그인</Link>
          </>
        )}
      </div>
      <section className="cs-sec">
        <h2 className="cs-h2">자주 묻는 질문을 확인하세요</h2>
        <div className="cs-cats" role="tablist">
          {FAQ_CATEGORIES.map(([id, label, icon]) => (
            <button key={id} role="tab" aria-selected={id === cat} onClick={() => setCat(id)}>
              <span className="ic"><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: icon }} /></span>{label}
            </button>
          ))}
        </div>
      </section>
      <div className="cs-band bleed">
        <div className="cs-in">
          <div className="rowb" style={{ margin: '0 0 18px' }}><h3>‘{catLabel(cat)}’ 관련 가장 자주 묻는 질문입니다</h3><Link to={`/help/faq/${cat}`}>질문 더보기 ›</Link></div>
          <div className="cs-car">
            {edge.l && <button className="cs-arr l" aria-label="이전 질문" onClick={() => car.current?.scrollBy({ left: -car.current.clientWidth, behavior: 'smooth' })}>‹</button>}
            <div className="cs-cards" ref={car} onScroll={upd}>
              {cards.map((f) => <Link key={f[1]} to={`/help/faq/${cat}`} className="cs-card"><b>Q.</b><strong>{f[1]}</strong><span>{f[2].slice(0, 70)}…</span></Link>)}
            </div>
            {edge.r && <button className="cs-arr r" aria-label="다음 질문" onClick={() => car.current?.scrollBy({ left: car.current.clientWidth, behavior: 'smooth' })}>›</button>}
          </div>
        </div>
      </div>
      <div className="cs-grid">
        <div>
          <h2 className="cs-h2">간편하게 해결하세요</h2>
          <div className="cs-list">
            {[['/mypage/qna', '나의 문의내역'], ['/mypage/orders', '주문·배송 조회'], ['/login?tab=guest', '비회원 주문조회'], ['/mypage/profile', '내 회원정보 수정'], ['/find/id', '아이디/비밀번호 찾기'], ['/mypage/coupons', '쿠폰 코드 등록']].map(([h, l]) => <Link key={h} to={h}>{l}<span>›</span></Link>)}
          </div>
        </div>
        <div>
          <h2 className="cs-h2">상담이 필요하신가요?</h2>
          <div className="cs-call">
            <Link className="hint" to="/help/faq/member" style={{ textDecoration: 'none' }}>일반회원/비회원 이용안내 ›</Link>
            <div className="tel num">0000-0000 <small>평일 09:00 ~ 18:00</small></div>
            <Link className="hint" to="/help/faq/point" style={{ textDecoration: 'none', display: 'block', marginTop: 14 }}>등급회원 전용 이용안내 ›</Link>
            <div className="tel num">0000-0002 <small>365일 09:00 ~ 18:00</small></div>
          </div>
          <h2 className="cs-h2" style={{ marginTop: 26 }}>판매 상담이 필요하신가요?</h2>
          <div className="cs-call">
            <div className="hint">판매고객</div>
            <div className="tel num">0000-0001 <small>평일 09:00 ~ 18:00</small></div>
            <button className="cs-big lnk" style={{ textDecoration: 'none' }} onClick={() => ask('입점·판매')}>판매자 전용 상담 ›</button>
            <Link className="cs-big" to="/info/seller">입점 안내 보기 ›</Link>
          </div>
        </div>
        <div className="cs-tiles">
          <a href="/help" className="t1" onClick={(e) => { e.preventDefault(); ask(); }}>문의글 작성 ›<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="m3 9 9 6 9-6M8 7V4h8v3" /></svg></a>
          <Link to="/help/faq/safe" className="t2">안전거래<br />신고센터 ›<svg viewBox="0 0 24 24"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg></Link>
        </div>
      </div>
      <div className="cs-nbar bleed">
        <div className="cs-in">
          <h2 className="cs-h2">공지사항 <Link className="lnk" to="/help/notice" style={{ fontSize: 13, fontWeight: 400 }}>전체 보기 ›</Link></h2>
          <div className="cs-notice">{NOTICES.slice(0, 3).map(([d, tag, t], i) => <Link key={t} to={`/help/notice/${i}`}>[{tag}] {t} <span className="hint num">{d.slice(2)}</span></Link>)}</div>
        </div>
      </div>
    </>
  );
}

function FaqItem({ f, open }: { f: (typeof FAQS)[number]; open?: boolean }) {
  const ask = useAsk();
  const idx = FAQS.indexOf(f);
  const [vote, setVote] = useState<string | undefined>(() => local.get<Record<string, string>>('bd_faqvote', {})[idx]);
  const cast = (v: string) => {
    const all = local.get<Record<string, string>>('bd_faqvote', {});
    all[idx] = v;
    local.set('bd_faqvote', all);
    setVote(v);
  };
  return (
    <details className="faq" open={open}>
      <summary><span style={{ flex: 1 }}>[{catLabel(f[0])}] {f[1]}</span></summary>
      <div>
        {f[2]}
        <div className="vote">
          이 답변이 도움이 되었나요?{' '}
          {vote ? (
            <b>{vote === 'y' ? '의견 고마워요!' : <>더 나은 답변을 준비할게요. <button className="lnk" onClick={() => ask()}>1:1 문의하기</button></>}</b>
          ) : (
            <><button className="btn sm ghost" onClick={() => cast('y')}>네</button><button className="btn sm ghost" onClick={() => cast('n')}>아니요</button></>
          )}
        </div>
      </div>
    </details>
  );
}

function FaqPage() {
  const { cat = 'member' } = useParams();
  const ask = useAsk();
  const c = FAQ_CATEGORIES.find((x) => x[0] === cat) ?? FAQ_CATEGORIES[0];
  usePageTitle(`자주 묻는 질문 · ${c[1]}`, TITLE_SUFFIX);
  return (
    <>
      <div className="crumb"><Link to="/help">고객센터</Link> › 자주 묻는 질문</div>
      <div className="cs-top"><SearchForm /></div>
      <h1 className="ptitle">자주 묻는 질문</h1>
      <div className="bfilter">{FAQ_CATEGORIES.map(([id, label]) => <Link key={id} to={`/help/faq/${id}`} className="lnk" style={{ textDecoration: 'none' }}><button tabIndex={-1} aria-pressed={id === c[0]}>{label}</button></Link>)}</div>
      <div className="box">{FAQS.filter((f) => f[0] === c[0]).map((f) => <FaqItem key={f[1]} f={f} />)}</div>
      <div className="note">원하는 답을 찾지 못하셨나요? <button className="lnk" onClick={() => ask()}>1:1 문의하기</button></div>
    </>
  );
}

function SearchPage() {
  const [sp] = useSearchParams();
  const q = (sp.get('q') ?? '').trim();
  const ask = useAsk();
  usePageTitle(`'${q}' 검색`, TITLE_SUFFIX);
  const ql = q.toLowerCase();
  const hits = FAQS.filter((f) => { const t = (f[1] + f[2]).toLowerCase(); return t.includes(ql) || ql.split(/\s+/).every((w) => t.includes(w)); });
  return (
    <>
      <div className="crumb"><Link to="/help">고객센터</Link> › 검색</div>
      <div className="cs-top"><SearchForm key={q} initial={q} /></div>
      <h1 className="ptitle">'{q}' 검색 결과 <span className="hint num">{hits.length}건</span></h1>
      {hits.length ? <div className="box">{hits.map((f) => <FaqItem key={f[1]} f={f} open={hits.length <= 2} />)}</div> : (
        <div className="empty-box">검색 결과가 없어요. 다른 단어로 찾아보거나 1:1 문의를 남겨 주세요.<div style={{ marginTop: 12 }}><button className="btn sm primary" onClick={() => ask()}>1:1 문의하기</button></div></div>
      )}
    </>
  );
}

function NoticeList() {
  usePageTitle('공지사항', TITLE_SUFFIX);
  return (
    <>
      <div className="crumb"><Link to="/help">고객센터</Link> › 공지사항</div>
      <h1 className="ptitle">공지사항</h1>
      <div className="box">
        <table className="tbl">
          <thead><tr><th style={{ width: 80 }}>구분</th><th>제목</th><th className="r" style={{ width: 110 }}>등록일</th></tr></thead>
          <tbody>{NOTICES.map(([d, tag, t], i) => <tr key={t}><td>{tag}</td><td><Link className="lnk" style={{ textDecoration: 'none', color: 'var(--ink)', fontWeight: 600 }} to={`/help/notice/${i}`}>{t}</Link>{i < 2 && <span className="mine">NEW</span>}</td><td className="r num">{d}</td></tr>)}</tbody>
        </table>
      </div>
    </>
  );
}

function NoticeDetail() {
  const { i = '0' } = useParams();
  const k = Number(i);
  const n = NOTICES[k];
  usePageTitle(n?.[2] ?? '공지사항', TITLE_SUFFIX);
  if (!n) return <NoticeList />;
  return (
    <>
      <div className="crumb"><Link to="/help">고객센터</Link> › <Link to="/help/notice">공지사항</Link></div>
      <div className="box">
        <div className="hint num">[{n[1]}] · {n[0]}</div>
        <h1 style={{ margin: '6px 0 14px', fontSize: 20 }}>{n[2]}</h1>
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>{n[3]}</div>
      </div>
      <div className="rowb">
        {k > 0 ? <Link className="lnk" to={`/help/notice/${k - 1}`}>‹ 다음 글: {NOTICES[k - 1][2]}</Link> : <span />}
        {k < NOTICES.length - 1 && <Link className="lnk" to={`/help/notice/${k + 1}`}>이전 글: {NOTICES[k + 1][2]} ›</Link>}
      </div>
      <div style={{ marginTop: 14 }}><Link className="btn ghost" style={{ textDecoration: 'none', color: 'inherit' }} to="/help/notice">목록</Link></div>
    </>
  );
}
