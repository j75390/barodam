import { useState } from 'react';
import { Link, Navigate, NavLink, useNavigate, useParams } from 'react-router-dom';
import type { User } from '@/types';
import { productById } from '@/data/products';
import { orderState, isDelivered } from '@/domain/orderState';
import { grade } from '@/domain/pricing';
import { inquiryAnswer, isAnswered, optionText } from '@/domain/orderText';
import { fmtDate, fmtDateTime, formatPhone, won } from '@/lib/format';
import { EMAIL_RE, isPasswordOk, PHONE_RE } from '@/lib/validators';
import { wish } from '@/state/cart';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { ProductCard } from '@/components/ProductCard';
import { CouponTicket } from '@/components/CouponTicket';
import { openInquiryForm, openReviewForm } from '@/components/Dialogs';
import { ItemImage, OrderCard, openAddressForm } from '@/components/orderParts';
import { usePageTitle } from '@/components/usePageTitle';

const MENU: [string, [string, string][]][] = [
  ['쇼핑', [['orders', '주문·배송'], ['cancel', '취소 내역'], ['wish', '찜한 상품'], ['recent', '최근 본 상품']]],
  ['혜택', [['coupons', '쿠폰'], ['points', '적립금']]],
  ['활동', [['reviews', '나의 리뷰'], ['qna', '1:1 문의']]],
  ['회원정보', [['addrs', '배송지 관리'], ['profile', '회원정보 수정']]],
];
const TITLES: Record<string, string> = Object.fromEntries(MENU.flatMap(([, items]) => items));

export default function MyPage() {
  const { tab = 'home', sub } = useParams();
  const user = useUser();
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  usePageTitle(TITLES[tab] ?? '마이페이지');
  const wishCount = wish.useIds().length;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(`/mypage${tab !== 'home' ? `/${tab}` : ''}`)}`} replace />;

  const states = user.orders.map((o) => orderState(o).k);
  const count = (k: string) => states.filter((s) => s === k).length;
  const spent = user.orders.filter((o) => !o.cancelledAt).reduce((a, o) => a + o.total, 0);
  const g = grade(spent);
  const usable = user.coupons.filter((c) => !c.used && c.exp > Date.now()).length;
  const badge: Record<string, number> = {
    orders: states.filter((s) => s !== 'cancel' && s !== 'confirmed').length,
    wish: wishCount,
    coupons: usable,
    qna: user.qna.filter((q) => !isAnswered(q)).length,
  };
  const reviewable = reviewableItems(user);

  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › 마이페이지</div>
      <div className="mp">
        <nav className="mp-nav" aria-label="마이페이지 메뉴">
          <NavLink to="/mypage" end>마이페이지 홈</NavLink>
          {MENU.map(([group, items]) => (
            <div key={group} style={{ display: 'contents' }}>
              <div className="g">{group}</div>
              {items.map(([k, l]) => <NavLink key={k} to={`/mypage/${k}`}>{l}{badge[k] ? <span className="num">{badge[k]}</span> : null}</NavLink>)}
            </div>
          ))}
          <div className="g">계정</div>
          <a href="/" onClick={async (e) => { e.preventDefault(); await be.signOut(); ui.toast('로그아웃했어요'); nav('/'); }}>로그아웃</a>
        </nav>
        <div>
          <div className="mp-head">
            <div>
              <div className="hi">{user.name}님<span className="grade">{g.name}</span></div>
              <div className="sub num">{g.next ? `${g.next[0]} 등급까지 ${won(g.next[1])} 남았어요 · ` : ''}구매 적립 {g.rate}% · 가입일 {fmtDate(user.joined)}</div>
            </div>
            <div className="assets">
              <Link to="/mypage/points"><b className="num">{user.points.toLocaleString()}</b><span>적립금</span></Link>
              <Link to="/mypage/coupons"><b className="num">{usable}</b><span>쿠폰</span></Link>
              <Link to="/mypage/reviews"><b className="num">{reviewable.length}</b><span>쓸 수 있는 리뷰</span></Link>
            </div>
          </div>
          <div className="ostat">
            {[['paid', '결제완료'], ['ready', '상품준비중'], ['ship', '배송중'], ['done', '배송완료'], ['confirmed', '구매확정']].map(([k, l]) => (
              <Link key={k} to={`/mypage/orders/${k}`} className={count(k) ? 'on' : ''}><b className="num">{count(k)}</b>{l}</Link>
            ))}
          </div>
          <Tab tab={tab} sub={sub} user={user} />
        </div>
      </div>
    </main>
  );
}

function reviewableItems(u: User) {
  const out: { o: User['orders'][number]; k: number }[] = [];
  for (const o of u.orders) {
    if (!isDelivered(orderState(o))) continue;
    o.items.forEach((_, k) => {
      if (!u.reviews.some((r) => r.oid === o.no && r.k === k)) out.push({ o, k });
    });
  }
  return out;
}

function Tab({ tab, sub, user }: { tab: string; sub?: string; user: User }) {
  switch (tab) {
    case 'orders': return <Orders user={user} filter={sub ?? 'all'} />;
    case 'cancel': return <Section title="취소 내역">{list(user.orders.filter((o) => o.cancelledAt), user, '취소한 주문이 없어요')}</Section>;
    case 'wish': return <Wish />;
    case 'recent': return <Recent user={user} />;
    case 'coupons': return <Coupons user={user} />;
    case 'points': return <Points user={user} />;
    case 'reviews': return <Reviews user={user} />;
    case 'qna': return <Qna user={user} />;
    case 'addrs': return <Addresses user={user} />;
    case 'profile': return <Profile user={user} />;
    default: return <HomeTab user={user} />;
  }
}

const Section = ({ title, right, children }: { title: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) => (
  <div className="mp-sec"><h2>{title}{right}</h2>{children}</div>
);
const Empty = ({ children }: { children: React.ReactNode }) => <div className="empty-box">{children}</div>;
const list = (orders: User['orders'], user: User, empty: string) =>
  orders.length ? orders.map((o) => <OrderCard key={o.no} o={o} user={user} />) : <Empty>{empty}</Empty>;

function HomeTab({ user }: { user: User }) {
  return (
    <>
      <Section title="최근 주문" right={<Link className="lnk" to="/mypage/orders">전체 보기</Link>}>
        {user.orders.length ? user.orders.slice(0, 2).map((o) => <OrderCard key={o.no} o={o} user={user} />) : <Empty>아직 주문한 상품이 없어요<br /><Link className="lnk" to="/">쇼핑하러 가기</Link></Empty>}
      </Section>
      <Section title="최근 본 상품" right={<Link className="lnk" to="/mypage/recent">전체 보기</Link>}><RecentGrid ids={user.recent} n={5} /></Section>
    </>
  );
}

function Orders({ user, filter }: { user: User; filter: string }) {
  const nav = useNavigate();
  const F: [string, string][] = [['all', '전체'], ['paid', '결제완료'], ['ready', '상품준비중'], ['ship', '배송중'], ['done', '배송완료'], ['confirmed', '구매확정']];
  const shown = user.orders.filter((o) => { const k = orderState(o).k; return k !== 'cancel' && (filter === 'all' || k === filter); });
  return (
    <Section title="주문·배송 조회">
      <div className="filters">{F.map(([k, l]) => <button key={k} aria-pressed={filter === k} onClick={() => nav(k === 'all' ? '/mypage/orders' : `/mypage/orders/${k}`)}>{l}</button>)}</div>
      {list(shown, user, '해당하는 주문이 없어요')}
    </Section>
  );
}

function RecentGrid({ ids, n }: { ids: number[]; n: number }) {
  const ps = ids.map(productById).filter((p): p is NonNullable<typeof p> => !!p).slice(0, n);
  return ps.length ? <div className="grid">{ps.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty>아직 본 상품이 없어요</Empty>;
}

function Wish() {
  const ids = wish.useIds();
  const ps = ids.map(productById).filter((p): p is NonNullable<typeof p> => !!p);
  return (
    <Section title={<>찜한 상품 <span className="hint num">{ps.length}개</span></>}>
      {ps.length ? <div className="grid">{ps.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty>하트를 눌러 마음에 드는 상품을 담아 보세요</Empty>}
    </Section>
  );
}

function Recent({ user }: { user: User }) {
  const be = useBackend();
  const ids = user.recent;
  return (
    <Section title="최근 본 상품" right={ids.length ? <button className="lnk" onClick={() => be.clearRecent()}>전체 삭제</button> : null}>
      <RecentGrid ids={ids} n={40} />
    </Section>
  );
}

function Coupons({ user }: { user: User }) {
  const be = useBackend();
  const ui = useUI();
  const [code, setCode] = useState('');
  const now = Date.now();
  const sorted = user.coupons.slice().sort((a, b) => Number(!!(a.used || a.exp < now)) - Number(!!(b.used || b.exp < now)));
  return (
    <Section title={<>쿠폰 <span className="hint num">사용 가능 {user.coupons.filter((c) => !c.used && c.exp > now).length}장</span></>}>
      <form className="box" onSubmit={async (e) => {
        e.preventDefault();
        const r = await be.registerCouponCode(code);
        ui.toast(r.ok ? '쿠폰을 받았어요' : r.error);
        if (r.ok) setCode('');
      }}>
        <div className="fld" style={{ margin: 0 }}>
          <span>쿠폰 코드 등록</span>
          <div className="with"><input className="inp" placeholder="예: WELCOME2026" maxLength={20} style={{ textTransform: 'uppercase' }} value={code} onChange={(e) => setCode(e.target.value)} aria-label="쿠폰 코드" /><button className="btn primary">등록</button></div>
          <small className="hint">이벤트·제휴로 받은 쿠폰 코드를 입력해 주세요. 진행 중인 코드는 <a className="lnk" href="/help/notice" target="_blank" rel="noopener">공지사항</a>에서 확인할 수 있어요.</small>
        </div>
      </form>
      <div style={{ marginTop: 12 }}>{sorted.length ? sorted.map((c) => <CouponTicket key={c.id} c={c} />) : <Empty>쿠폰이 없어요</Empty>}</div>
    </Section>
  );
}

function Points({ user }: { user: User }) {
  const soon = user.orders.filter((o) => !o.cancelledAt && !o.confirmedAt).reduce((a, o) => a + o.earn, 0);
  return (
    <Section title="적립금">
      <div className="box">
        <div className="rowb" style={{ margin: 0 }}>
          <div><div className="hint">사용 가능</div><div className="num" style={{ fontSize: 26, fontWeight: 900 }}>{won(user.points)}</div></div>
          <div style={{ textAlign: 'right' }}><div className="hint">구매확정하면 적립 예정</div><div className="num" style={{ fontSize: 18, fontWeight: 800 }}>{won(soon)}</div></div>
        </div>
      </div>
      <div className="box">
        <table className="tbl num">
          <thead><tr><th>날짜</th><th>내용</th><th className="r">금액</th><th className="r">잔액</th></tr></thead>
          <tbody>
            {user.plog.length ? user.plog.map((l, i) => (
              <tr key={i}><td>{fmtDate(l.t)}</td><td>{l.why}</td><td className={`r ${l.amt > 0 ? 'plus' : 'minus'}`}>{l.amt > 0 ? '+' : ''}{l.amt.toLocaleString()}</td><td className="r">{l.bal.toLocaleString()}</td></tr>
            )) : <tr><td colSpan={4}>내역이 없어요</td></tr>}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Reviews({ user }: { user: User }) {
  const be = useBackend();
  const ui = useUI();
  const can = reviewableItems(user);
  return (
    <>
      <Section title={<>쓸 수 있는 리뷰 <span className="hint num">{can.length}개</span></>}>
        <p className="hint">배송완료 또는 구매확정된 상품에 리뷰를 쓸 수 있어요. 리뷰마다 적립금 500원을 드려요.</p>
        {can.length ? can.map(({ o, k }) => {
          const it = o.items[k];
          return (
            <div className="oi" key={o.no + k}>
              <Link className="pic" to={`/products/${it.pid}`}><ItemImage it={it} /></Link>
              <div><Link className="nm" to={`/products/${it.pid}`} style={{ color: 'inherit', textDecoration: 'none' }}>{it.name}</Link><div className="op">{optionText(it)} · {fmtDate(o.at)} 주문</div></div>
              <div className="acts"><button className="btn sm primary" onClick={() => void openReviewForm(ui, be, o, k)}>리뷰 쓰기</button></div>
            </div>
          );
        }) : <Empty>지금 쓸 수 있는 리뷰가 없어요</Empty>}
      </Section>
      <Section title={<>내가 쓴 리뷰 <span className="hint num">{user.reviews.length}개</span></>}>
        {user.reviews.length ? user.reviews.map((r) => (
          <div className="box" key={r.id}>
            <div className="rowb" style={{ margin: 0 }}>
              <Link to={`/products/${r.pid}`} style={{ fontWeight: 800, color: 'inherit', textDecoration: 'none' }}>{r.name}</Link>
              <button className="lnk" onClick={async () => { if (await ui.confirm('리뷰 삭제', '이 리뷰를 지울까요? 받은 적립금은 그대로예요.', '삭제')) { await be.deleteReview(r.id); ui.toast('리뷰를 지웠어요'); } }}>삭제</button>
            </div>
            <div className="rate"><b>{'★'.repeat(r.star)}{'☆'.repeat(5 - r.star)}</b> · {fmtDate(r.t)} · {r.opt}</div>
            <div style={{ marginTop: 6, whiteSpace: 'pre-line' }}>{r.txt}</div>
          </div>
        )) : <Empty>아직 쓴 리뷰가 없어요</Empty>}
      </Section>
    </>
  );
}

function Qna({ user }: { user: User }) {
  const be = useBackend();
  const ui = useUI();
  return (
    <Section title="1:1 문의" right={<button className="btn sm primary" onClick={() => void openInquiryForm(ui, be, {})}>문의하기</button>}>
      {user.qna.length ? user.qna.map((q) => (
        <details className="faq box" style={{ padding: '4px 14px' }} key={q.id}>
          <summary><span style={{ flex: 1 }}>[{q.pid ? '상품' : q.cat}] {q.title}</span><span className="hint">{isAnswered(q) ? <b style={{ color: 'var(--ship)' }}>답변완료</b> : '답변대기'} · {fmtDate(q.t)}</span></summary>
          <div>
            <div style={{ color: 'var(--ink)', whiteSpace: 'pre-line' }}>{q.body}</div>
            {isAnswered(q) ? <div className="qna"><div className="a"><b>바로담 고객센터</b> · {fmtDateTime(q.t + 120000)}<br />{inquiryAnswer(q)}</div></div> : <p className="hint">순서대로 확인 후 답변해 드릴게요.</p>}
            <button className="lnk" onClick={async () => { if (await ui.confirm('문의 삭제', '이 문의를 지울까요?', '삭제')) await be.deleteInquiry(q.id); }}>문의 삭제</button>
          </div>
        </details>
      )) : <Empty>문의한 내역이 없어요</Empty>}
    </Section>
  );
}

function Addresses({ user }: { user: User }) {
  const be = useBackend();
  const ui = useUI();
  return (
    <Section title="배송지 관리" right={<button className="btn sm primary" onClick={() => void openAddressForm(ui, be, user)}>새 배송지 추가</button>}>
      {user.addrs.length ? user.addrs.map((a) => (
        <div className="addr" key={a.id}>
          <div className="t">{a.label || a.to}{a.def && <span className="def">기본 배송지</span>}</div>
          <div>{a.to} · <span className="num">{a.phone}</span></div>
          <div className="num">({a.zip}) {a.a1} {a.a2}</div>
          <div className="a">
            <button className="lnk" onClick={() => void openAddressForm(ui, be, user, a)}>수정</button>
            {!a.def && <button className="lnk" onClick={async () => { await be.setDefaultAddress(a.id); ui.toast('기본 배송지를 바꿨어요'); }}>기본으로</button>}
            {!a.def && <button className="lnk" onClick={async () => { if (await ui.confirm('배송지 삭제', '이 배송지를 지울까요?', '삭제')) await be.removeAddress(a.id); }}>삭제</button>}
          </div>
        </div>
      )) : <Empty>저장된 배송지가 없어요</Empty>}
    </Section>
  );
}

function Profile({ user }: { user: User }) {
  const be = useBackend();
  const ui = useUI();
  const nav = useNavigate();
  const [p, setP] = useState({ name: user.name, email: user.email, phone: user.phone, marketing: user.marketing });
  const [pErr, setPErr] = useState<string | null>(null);
  const [pw, setPw] = useState({ cur: '', next: '', next2: '' });
  const [pwErr, setPwErr] = useState<string | null>(null);
  const withdraw = async () => {
    let password = '';
    let error: string | null = null;
    const okGo = await ui.open({
      title: '회원탈퇴',
      render: (close) => (
        <WithdrawBox points={user.points} onCancel={() => close(false)} onConfirm={async (v) => { password = v; const r = await be.withdraw(password); if (!r.ok) { error = r.error; return r.error; } close(true); return null; }} />
      ),
    });
    if (okGo && !error) {
      ui.toast('탈퇴했어요. 그동안 고마웠어요');
      nav('/');
    }
  };
  return (
    <Section title="회원정보 수정">
      <form className="box" noValidate onSubmit={async (e) => {
        e.preventDefault();
        setPErr(null);
        if (p.name.trim().length < 2) return setPErr('이름을 2자 이상 입력해 주세요.');
        if (!EMAIL_RE.test(p.email.trim())) return setPErr('이메일 형식이 맞지 않아요.');
        if (!PHONE_RE.test(p.phone)) return setPErr('휴대폰 번호 형식이 맞지 않아요.');
        const r = await be.updateProfile({ name: p.name.trim(), email: p.email.trim(), phone: p.phone, marketing: p.marketing });
        if (!r.ok) return setPErr(r.error);
        ui.toast('회원정보를 저장했어요');
      }}>
        <dl className="kv"><dt>아이디</dt><dd><b>{user.id}</b></dd><dt>가입일</dt><dd className="num">{fmtDate(user.joined)}</dd></dl>
        <label className="fld"><span>이름</span><input className="inp" maxLength={20} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
        <label className="fld"><span>이메일</span><input className="inp" type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} /></label>
        <label className="fld"><span>휴대폰 번호</span><input className="inp num" inputMode="numeric" value={p.phone} onChange={(e) => setP({ ...p, phone: formatPhone(e.target.value) })} /></label>
        <label className="ck" style={{ marginTop: 14 }}><input type="checkbox" checked={p.marketing} onChange={(e) => setP({ ...p, marketing: e.target.checked })} /> 마케팅 정보 받기</label>
        {pErr && <p className="err" role="alert">{pErr}</p>}
        <button className="btn primary wide">저장</button>
      </form>
      <form className="box" noValidate onSubmit={async (e) => {
        e.preventDefault();
        setPwErr(null);
        if (!isPasswordOk(pw.next)) return setPwErr('새 비밀번호는 영문과 숫자를 섞어 8~20자로 만들어 주세요.');
        if (pw.next !== pw.next2) return setPwErr('새 비밀번호 확인이 맞지 않아요.');
        const r = await be.changePassword(pw.cur, pw.next);
        if (!r.ok) return setPwErr(r.error);
        ui.toast('비밀번호를 바꿨어요');
        setPw({ cur: '', next: '', next2: '' });
      }}>
        <h3>비밀번호 변경</h3>
        <label className="fld"><span>현재 비밀번호</span><input className="inp" type="password" autoComplete="current-password" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /></label>
        <label className="fld"><span>새 비밀번호</span><input className="inp" type="password" autoComplete="new-password" maxLength={20} placeholder="영문+숫자 8~20자" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></label>
        <label className="fld"><span>새 비밀번호 확인</span><input className="inp" type="password" autoComplete="new-password" maxLength={20} value={pw.next2} onChange={(e) => setPw({ ...pw, next2: e.target.value })} /></label>
        {pwErr && <p className="err" role="alert">{pwErr}</p>}
        <button className="btn wide">비밀번호 바꾸기</button>
      </form>
      <div className="box">
        <h3>회원탈퇴</h3>
        <p className="hint">탈퇴하면 주문 내역, 쿠폰, 적립금({won(user.points)})이 모두 사라지고 되돌릴 수 없어요.</p>
        <button className="btn ghost wide" onClick={withdraw}>회원탈퇴</button>
      </div>
    </Section>
  );
}

function WithdrawBox({ points, onCancel, onConfirm }: { points: number; onCancel: () => void; onConfirm: (pw: string) => Promise<string | null> }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <h3>정말 탈퇴할까요?</h3>
      <p>주문 내역·쿠폰·적립금({won(points)})이 모두 지워지고 되돌릴 수 없어요.{'\n'}확인을 위해 비밀번호를 입력해 주세요.</p>
      <input className="inp" type="password" style={{ marginTop: 12 }} autoComplete="current-password" aria-label="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="err" role="alert">{err}</p>}
      <div className="ctas"><button className="btn" onClick={onCancel}>취소</button><button className="btn primary" onClick={async () => setErr(await onConfirm(pw))}>탈퇴하기</button></div>
    </>
  );
}
