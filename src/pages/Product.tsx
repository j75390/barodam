import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Product as P } from '@/types';
import { catName, COLOR_HEX, TYPE_LABEL } from '@/data/catalog';
import { PRODUCTS, productById, productsByBrand } from '@/data/products';
import { DETAIL_FEATURES, REQUIRED_INFO, SELLER_QNA, SIZE_TABLES } from '@/data/productContent';
import { generateReviews, reviewKeywords, sellerOffers, type GeneratedReview } from '@/domain/productExtras';
import { deliveryPromise } from '@/domain/delivery';
import { orderState } from '@/domain/orderState';
import { fmtDate, won } from '@/lib/format';
import { local, session } from '@/lib/storage';
import { cart, wish } from '@/state/cart';
import { stockOf } from '@/services/stock';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import type { PublicInquiry, PublicReview } from '@/services/backend';
import { ProductCard } from '@/components/ProductCard';
import { BrandEmblem } from '@/components/BrandLogo';
import { openInquiryForm, openReviewForm } from '@/components/Dialogs';
import { CHECKOUT_KEY, type CheckoutDraft } from '@/components/CartDrawer';
import { usePageTitle } from '@/components/usePageTitle';
import NotFound from './NotFound';

const VIEWS: [string, number][] = [['50% 50%', 1], ['50% 35%', 1.6], ['30% 60%', 2], ['70% 70%', 2.2]];
const starText = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));

interface ReviewRow {
  id: string;
  who: string;
  star: number;
  txt: string;
  t: number;
  opt: string;
  help: number;
  size: string | null;
  color: string | null;
  photo: boolean;
  mine: boolean;
}
const fromGenerated = (r: GeneratedReview): ReviewRow => ({ ...r, mine: false });
const fromMember = (r: PublicReview): ReviewRow => ({ id: r.id, who: r.who, star: r.star, txt: r.txt, t: r.t, opt: r.opt, help: 0, size: null, color: null, photo: false, mine: r.mine });

export default function ProductPage() {
  const { id } = useParams();
  const p = productById(Number(id));
  if (!p) return <NotFound message="판매가 끝났거나 없는 상품이에요" />;
  return <ProductView key={p.id} p={p} />;
}

function ProductView({ p }: { p: P }) {
  usePageTitle(p.name);
  const be = useBackend();
  const user = useUser();
  const ui = useUI();
  const nav = useNavigate();
  const wished = wish.useIds().includes(p.id);
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [view, setView] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const [memberReviews, setMemberReviews] = useState<PublicReview[]>([]);
  const [questions, setQuestions] = useState<PublicInquiry[]>([]);
  const [tab, setTab] = useState('det');
  const [stock, setStock] = useState(p.stock);

  useEffect(() => {
    be.addRecent(p.id);
  }, [be, p.id]);
  useEffect(() => {
    let alive = true;
    setStock(p.stock);
    void stockOf(p.id).then((n) => {
      if (alive) setStock(n);
    });
    return () => {
      alive = false;
    };
  }, [p]);
  useEffect(() => {
    let alive = true;
    void Promise.all([be.reviewsFor(p.id), be.inquiriesFor(p.id)]).then(([r, q]) => {
      if (alive) {
        setMemberReviews(r);
        setQuestions(q);
      }
    });
    return () => {
      alive = false;
    };
  }, [be, p.id, user?.id]);

  const promise = deliveryPromise(p);
  const offers = useMemo(() => sellerOffers(p), [p]);
  const lowestSeller = offers.find((o) => o.lowest)!.seller;
  const generated = useMemo(() => generateReviews(p), [p]);
  const allReviews: ReviewRow[] = [...memberReviews.map(fromMember), ...generated.map(fromGenerated)];
  const dist = [5, 4, 3, 2, 1].map((s) => allReviews.filter((r) => r.star === s).length);
  const same = PRODUCTS.filter((x) => x.type === p.type && x.id !== p.id).sort((a, b) => b.sold - a.sold).slice(0, 12);
  const sameBrand = productsByBrand(p.brand).filter((x) => x.id !== p.id).slice(0, 12);
  const sellerQs = SELLER_QNA.filter((_, i) => (p.id + i) % 3 !== 0).map(([title, ans], i) => ({ id: `gq${i}`, title, ans, who: `구매자${(p.id + i) % 97}**`, t: Date.now() - (i * 5 + 3) * 864e5 }));
  const couponPrice = p.price - Math.min(10000, Math.floor((p.price * 0.15) / 10) * 10);

  const missingOption = () => (p.colors && !color ? '색상을 먼저 골라 주세요' : p.sizes && !size ? '사이즈를 먼저 골라 주세요' : null);
  const guard = () => {
    const m = missingOption();
    if (m) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      ui.toast(m);
    }
    return !m;
  };
  const addToCart = () => {
    if (!guard()) return;
    cart.add(p.id, color, size, qty);
    ui.toast('장바구니에 담았어요');
  };
  const buyNow = () => {
    if (!guard()) return;
    const draft: CheckoutDraft = { src: 'direct', lines: [{ key: `${p.id}|${color ?? ''}|${size ?? ''}`, id: p.id, color, size, qty }] };
    session.set(CHECKOUT_KEY, draft);
    if (user) return nav('/checkout');
    ui.toast('주문하려면 로그인해 주세요');
    nav('/login?next=/checkout');
  };
  const toggleWish = () => ui.toast(wish.toggle(p.id) ? '찜 목록에 담았어요' : '찜을 해제했어요');
  const share = async () => {
    const url = `${location.origin}/products/${p.id}`;
    try {
      await navigator.clipboard.writeText(url);
      ui.toast('상품 링크를 복사했어요');
    } catch {
      void ui.info('상품 링크', url);
    }
  };
  const writeReview = () => {
    if (!user) return nav(`/login?next=/products/${p.id}`);
    for (const o of user.orders) {
      const s = orderState(o);
      if (s.k !== 'done' && s.k !== 'confirmed') continue;
      const k = o.items.findIndex((it, i) => it.pid === p.id && !user.reviews.some((r) => r.oid === o.no && r.k === i));
      if (k >= 0) {
        void openReviewForm(ui, be, o, k).then(async (saved) => {
          if (saved) setMemberReviews(await be.reviewsFor(p.id));
        });
        return;
      }
    }
    void ui.info('상품평 쓰기', '이 상품을 구매하고 배송이 끝나면 상품평을 쓸 수 있어요. 마이페이지 > 나의 리뷰에서도 쓸 수 있어요.');
  };
  const askQuestion = () => {
    if (!user) return nav(`/login?next=/products/${p.id}`);
    void openInquiryForm(ui, be, { pid: p.id, productName: p.name }).then(async (saved) => {
      if (saved) setQuestions(await be.inquiriesFor(p.id));
    });
  };

  // sticky tabs follow the section in view
  const secRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((en) => en.isIntersecting && setTab(en.target.id.replace('s-', ''))), { rootMargin: '-200px 0px -60% 0px' });
    Object.values(secRefs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);
  const jump = (k: string) => document.getElementById(`s-${k}`)?.scrollIntoView({ behavior: 'smooth' });
  const sec = (k: string) => ({ id: `s-${k}`, ref: (el: HTMLDivElement | null) => { secRefs.current[k] = el; } });

  const imgStyle: React.CSSProperties = zoom
    ? { transformOrigin: zoom, transform: 'scale(2)' }
    : { objectPosition: VIEWS[view][0], transformOrigin: VIEWS[view][0], transform: `scale(${VIEWS[view][1]})` };

  return (
    <main className="wrap" id="page">
      <div className="crumb"><Link to="/">홈</Link> › <Link to={`/category/${p.cat}`}>{catName(p.cat)}</Link> › <Link to={`/category/${p.cat}?type=${p.type}`}>{TYPE_LABEL[p.type]}</Link></div>
      <div className="pdp">
        <div className="gal">
          <div className="th">
            {VIEWS.map((v, i) => (
              <button key={i} aria-current={i === view} aria-label={`${i + 1}번째 사진`} onMouseEnter={() => setView(i)} onClick={() => setView(i)}>
                <img src={`/img/${p.photo}`} alt="" style={{ objectPosition: v[0], transform: `scale(${v[1]})` }} />
              </button>
            ))}
          </div>
          <div
            className="main"
            onMouseMove={(e) => {
              if (!matchMedia('(hover: hover)').matches) return;
              const r = e.currentTarget.getBoundingClientRect();
              setZoom(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
            }}
            onMouseLeave={() => setZoom(null)}
          >
            <img src={`/img/${p.photo}`} alt={p.name} style={imgStyle} />
          </div>
        </div>

        <div className="buy">
          <div className="top">
            <Link to={`/brands/${encodeURIComponent(p.brand)}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BrandEmblem brand={p.brand} size={30} />{p.brand} 브랜드관 ›</Link>
            <div className="icons">
              <button aria-pressed={wished} aria-label="찜하기" onClick={toggleWish}><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></button>
              <button aria-label="공유하기" onClick={share}><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg></button>
            </div>
          </div>
          <h1>{p.name}</h1>
          <div className="rt"><span className="stars-s">{starText(p.rating)}</span><b style={{ color: 'var(--ink)' }}>{p.rating}</b><button className="lnk" onClick={() => jump('rv')}>상품평 {p.reviews.toLocaleString()}개</button>·<span className="num">한 달 {p.sold.toLocaleString()}개 구매</span></div>
          <div className="pbox">
            {p.off ? <div><span className="was num">{won(p.base)}</span></div> : null}
            <div className="bigprice" style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>{p.off ? <span className="off num">{p.off}%</span> : null}<span className="now num">{won(p.price)}</span></div>
            <button className="cp" onClick={() => void ui.info('쿠폰 혜택', `신규가입 15% 쿠폰(최대 10,000원)을 쓰면 ${won(couponPrice)}에 살 수 있어요. ${user ? '쿠폰은 주문서에서 고를 수 있어요.' : '회원가입하면 바로 쿠폰을 드려요.'}`)}>🎟 신규가입 쿠폰 적용 시 <b className="num">{won(couponPrice)}</b> ›</button>
          </div>
          <dl className="dline">
            <dt>배송</dt>
            <dd>
              {p.rocket ? (
                <><span className="cut">{p.dawn ? '새벽' : '내일'} 도착 보장</span> <b>{promise.date}</b> 도착 예정<br /><span className="hint num">{promise.beforeCutoff ? `오늘 14:00 전 주문 시 · ${promise.hoursLeft}시간 ${promise.minutesLeft}분 남음` : '오늘 14:00가 지나 다음 출고로 보내요'}</span></>
              ) : (<><b>{promise.date}</b> 도착 예정 (판매자 배송)</>)}
              <br />{p.free ? '무료배송' : '배송비 3,000원 (19,800원 이상 무료)'}
            </dd>
            <dt>적립</dt><dd className="num">최대 {won(Math.floor(p.price * 0.01))} 적립 <span className="hint">(구매확정 시 · 등급별 최대 3%)</span></dd>
            <dt>판매자</dt><dd>{lowestSeller} <span className="hint">· 최저가 판매처</span></dd>
          </dl>
          {p.colors && (
            <div className="opt">
              <label>색상 <span className="hint">{color ?? ''}</span></label>
              <div className="row">{p.colors.map((c) => <button key={c} aria-pressed={color === c} onClick={() => setColor(c)}><span className="swatch" style={{ background: COLOR_HEX[c] ?? '#ccc' }} />{c}</button>)}</div>
            </div>
          )}
          {p.sizes && (
            <div className="opt">
              <label>사이즈 <button className="lnk" style={{ fontWeight: 400 }} onClick={() => jump('size')}>사이즈 가이드</button></label>
              <div className="row">{p.sizes.map((s) => { const out = p.soldOut.includes(s); return <button key={s} aria-pressed={size === s} disabled={out} title={out ? '품절' : undefined} onClick={() => setSize(s)}>{s}{out ? ' (품절)' : ''}</button>; })}</div>
            </div>
          )}
          <div className="opt">
            <label>수량</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="qty">
                <button aria-label="수량 줄이기" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                <span className="num">{qty}</span>
                <button aria-label="수량 늘리기" onClick={() => (qty >= stock ? ui.toast(`재고가 ${stock}개 남았어요`) : setQty(qty + 1))}>+</button>
              </div>
              {stock > 0 && stock < 15 && <span className="num" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 12.5 }}>품절임박 · {stock}개 남음</span>}
            </div>
          </div>
          <div className="totline"><span>총 상품 금액</span><b className="num">{won(p.price * qty)}</b></div>
          {stock > 0
            ? <div className="ctas"><button className="btn" onClick={addToCart}>장바구니 담기</button><button className="btn primary" onClick={buyNow}>바로 구매</button></div>
            : <div className="ctas" style={{ gridTemplateColumns: '1fr' }}><button className="btn" disabled>일시품절 · 재입고 준비 중이에요</button></div>}
          <div className="seller">판매처별 가격 비교</div>
          <table className="compare num"><tbody>{offers.map((o) => <tr key={o.seller} className={o.lowest ? 'low' : ''}><td>{o.seller}{o.lowest ? ' · 최저가' : ''}</td><td>{o.ship}</td><td>{won(o.price)}</td></tr>)}</tbody></table>
        </div>
      </div>

      <section style={{ marginTop: 36 }}><div className="sec-head"><h2>함께 비교하면 좋을 상품</h2></div><div className="hscroll">{same.map((x) => <ProductCard key={x.id} p={x} />)}</div></section>

      <nav className="ptabs2" aria-label="상품 정보 탭">
        {[['det', '상품상세'], ['rv', `상품평 ${p.reviews.toLocaleString()}`], ['qa', `상품문의 ${questions.length + sellerQs.length}`], ['ship', '배송·교환·반품']].map(([k, l]) => (
          <a key={k} href={`#s-${k}`} className={tab === k ? 'on' : ''} onClick={(e) => { e.preventDefault(); jump(k); }}>{l}</a>
        ))}
      </nav>

      <div className="psec" {...sec('det')}>
        <h2>상품 상세</h2>
        <div className="big-photo"><img src={`/img/${p.photo}`} alt={`${p.name} 상세`} loading="lazy" /></div>
        <div className="feat3">{DETAIL_FEATURES[p.cat].map(([i, t, d]) => <div key={t}><i>{i}</i><b>{t}</b>{d}</div>)}</div>
        {SIZE_TABLES[p.cat] && p.sizes && (
          <>
            <h3 id="s-size" style={{ scrollMarginTop: 180 }}>사이즈 가이드</h3>
            <table className="infot num"><tbody>
              <tr><th>사이즈</th>{SIZE_TABLES[p.cat].map((r) => <td key={r[0]}>{r[0]}</td>)}</tr>
              <tr><th>{p.cat === 'fashion' ? '권장 체형' : '발 길이'}</th>{SIZE_TABLES[p.cat].map((r) => <td key={r[0]}>{r[1]}</td>)}</tr>
              <tr><th>{p.cat === 'fashion' ? '가슴단면(cm)' : '비고'}</th>{SIZE_TABLES[p.cat].map((r) => <td key={r[0]}>{r[2]}</td>)}</tr>
            </tbody></table>
            <p className="hint">측정 방법에 따라 1~3cm 차이가 있을 수 있어요.</p>
          </>
        )}
        <h3>필수 표기 정보</h3>
        <table className="infot"><tbody>
          {REQUIRED_INFO[p.cat](p).map(([k, v]) => <tr key={k}><th>{k}</th><td>{v || '상세 이미지 참조'}</td></tr>)}
          <tr><th>상품번호</th><td className="num">{String(9000000000 + p.id * 7331)}</td></tr>
        </tbody></table>
        <div className="warn">판매자가 현금 거래를 요구하면 거부하고 바로담 고객센터로 알려 주세요.</div>
      </div>

      <Reviews p={p} section={sec('rv')} all={allReviews} dist={dist} generated={generated} onWrite={writeReview} />

      <div className="psec" {...sec('qa')}>
        <h2 className="rowb" style={{ margin: '0 0 14px' }}>상품문의 <button className="btn sm" onClick={askQuestion}>문의하기</button></h2>
        <p className="hint">구매한 상품의 취소·반품·교환은 마이페이지 &gt; 1:1 문의를 이용해 주세요.</p>
        {questions.map((q) => (
          <div className="qna" key={q.id}>
            <div className="q"><b>Q</b> {q.title} <span className="who rate">{q.who}{q.mine && <span className="mine">내 문의</span>} · {fmtDate(q.t)}</span></div>
            {q.mine && <div style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{q.body}</div>}
            {q.answer ? <div className="a" style={{ whiteSpace: 'pre-line' }}><b>A</b> {q.answer} <span className="hint">· 바로담 {q.answeredAt ? fmtDate(q.answeredAt) : ''}</span></div> : <div className="hint">판매자가 확인하고 있어요. 답변이 달리면 마이페이지 1:1 문의에서도 볼 수 있어요.</div>}
          </div>
        ))}
        {sellerQs.map((q) => (
          <div className="qna" key={q.id}>
            <div className="q"><b>Q</b> {q.title} <span className="who rate">{q.who} · {fmtDate(q.t)}</span></div>
            <div className="a"><b>A</b> {q.ans} <span className="hint">· {lowestSeller}</span></div>
          </div>
        ))}
      </div>

      <div className="psec" {...sec('ship')}>
        <h2>배송·교환·반품 안내</h2>
        <table className="infot"><tbody>
          <tr><th>배송 방법</th><td>{p.rocket ? '바로담 직배송 (내일 도착 보장 상품)' : '택배 (판매자 배송)'}</td></tr>
          <tr><th>배송비</th><td>{p.free ? '무료배송' : '3,000원 · 19,800원 이상 구매 시 무료'} · 제주·도서산간 3,000원 추가</td></tr>
          <tr><th>배송 기간</th><td>{p.rocket ? '오후 2시 전 주문 시 다음 날 도착' : '결제 후 2~3일 (주말·공휴일 제외)'}</td></tr>
          <tr><th>교환·반품 신청 기간</th><td>상품을 받은 날부터 7일 이내 · 상품이 표시·광고와 다른 경우 안 날부터 30일 이내</td></tr>
          <tr><th>교환·반품 비용</th><td>단순 변심: 왕복 6,000원 · 상품 불량·오배송: 무료</td></tr>
          <tr><th>교환·반품이 안 되는 경우</th><td>사용하거나 훼손해 상품 가치가 떨어진 경우, 포장을 뜯어 다시 판매하기 어려운 경우{p.cat === 'food' ? ', 신선식품 특성상 단순 변심' : ''}</td></tr>
        </tbody></table>
      </div>

      {sameBrand.length > 0 && (
        <section>
          <div className="sec-head"><h2>{p.brand}의 다른 상품</h2><Link className="lnk" to={`/brands/${encodeURIComponent(p.brand)}`}>브랜드관 가기 ›</Link></div>
          <div className="hscroll">{sameBrand.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      )}

      <div className="mbar">
        <button className="btn" aria-label={wished ? '찜 해제' : '찜하기'} onClick={toggleWish}>{wished ? '♥' : '♡'}</button>
        {stock > 0 ? (
          <>
            <button className="btn" onClick={addToCart}>장바구니</button>
            <button className="btn primary" onClick={buyNow}>구매하기</button>
          </>
        ) : <button className="btn" disabled style={{ gridColumn: 'span 2' }}>일시품절</button>}
      </div>
    </main>
  );
}

function Reviews({ p, section, all, dist, generated, onWrite }: {
  p: P;
  section: { id: string; ref: (el: HTMLDivElement | null) => void };
  all: ReviewRow[];
  dist: number[];
  generated: GeneratedReview[];
  onWrite: () => void;
}) {
  const [sort, setSort] = useState('best');
  const [star, setStar] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [helped, setHelped] = useState<Set<string>>(() => new Set(local.get<string[]>('bd_helpful', [])));
  const total = all.length || 1;
  const survey = (key: 'size' | 'color', labels: string[]) => labels.map((k) => [k, Math.round((generated.filter((r) => r[key] === k).length / generated.length) * 100)] as const);
  const sizeS = p.sizes ? survey('size', ['정사이즈예요', '조금 커요', '조금 작아요']) : null;
  const colorS = p.colors ? survey('color', ['화면과 같아요', '조금 밝아요', '조금 어두워요']) : null;
  const by: Record<string, (r: ReviewRow) => number> = {
    best: (r) => -(r.mine ? 1e6 : 0) - r.help * 3 - r.txt.length / 10,
    new: (r) => -r.t,
    high: (r) => -r.star * 1e13 - r.t / 1e3,
    low: (r) => r.star * 1e13 - r.t / 1e3,
  };
  const list = all.filter((r) => (!star || r.star === star) && (!q || r.txt.includes(q))).sort((a, b) => by[sort](a) - by[sort](b));
  const per = 5;
  const pages = Math.max(1, Math.ceil(list.length / per));
  const pg = Math.min(page, pages);
  const toggleHelp = (id: string) => {
    const n = new Set(helped);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setHelped(n);
    local.set('bd_helpful', [...n]);
  };
  return (
    <div className="psec" {...section}>
      <h2>상품평</h2>
      <div className="rvsum">
        <div className="avg">
          <b className="num">{p.rating}</b>
          <div className="stars-s" style={{ fontSize: 20 }}>{starText(p.rating)}</div>
          <div className="hint num">{p.reviews.toLocaleString()}개 상품평</div>
          <button className="btn sm primary" style={{ marginTop: 10 }} onClick={onWrite}>상품평 쓰기</button>
        </div>
        <div className="dist">
          {['최고', '좋음', '보통', '별로', '나쁨'].map((l, i) => {
            const v = Math.round((dist[i] / total) * 100);
            return <div key={l}><span>{l}</span><span className="bar"><i style={{ width: `${v}%` }} /></span><span className="num hint">{v}%</span></div>;
          })}
        </div>
        <div className="survey">
          {sizeS && <><b>사이즈</b>{sizeS.map(([k, v]) => <div key={k}><span>{k}</span><b className="num">{v}%</b></div>)}</>}
          {colorS && <><b style={{ marginTop: 6 }}>색상</b>{colorS.map(([k, v]) => <div key={k}><span>{k}</span><b className="num">{v}%</b></div>)}</>}
          {!sizeS && !colorS && <><b>많이 나온 말</b>{reviewKeywords(p).map((k) => <div key={k.t}><span>{k.t}</span><b className="num">{k.v}%</b></div>)}</>}
        </div>
      </div>
      <div className="rvtools">
        <div className="l">{[['best', '베스트순'], ['new', '최신순'], ['high', '별점 높은순'], ['low', '별점 낮은순']].map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => { setSort(k); setPage(1); }}>{l}</button>)}</div>
        <div className="r">
          <select className="inp" style={{ width: 'auto' }} value={star} aria-label="별점 거르기" onChange={(e) => { setStar(Number(e.target.value)); setPage(1); }}>
            <option value={0}>모든 별점</option>
            {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{'★'.repeat(s)} {s}점</option>)}
          </select>
          <input className="inp" placeholder="상품평 검색" maxLength={20} value={q} aria-label="상품평 검색" onChange={(e) => { setQ(e.target.value.trim()); setPage(1); }} />
        </div>
      </div>
      {list.length ? (
        <>
          {list.slice((pg - 1) * per, pg * per).map((r) => {
            const h = r.help + (helped.has(r.id) ? 1 : 0);
            return (
              <div className="rv" key={r.id}>
                <div className="h">
                  <div className="av">{r.who[0]}</div>
                  <div><b>{r.who}</b>{r.mine && <span className="mine">내 상품평</span>}<div className="meta"><span className="stars-s">{'★'.repeat(r.star)}{'☆'.repeat(5 - r.star)}</span> · {fmtDate(r.t)} · 구매 옵션: {r.opt}</div></div>
                </div>
                {(r.size || r.color) && <div className="kv2">{r.size && <span><b>사이즈</b>{r.size}</span>}{r.color && <span><b>색상</b>{r.color}</span>}</div>}
                <div className="tx">{r.txt}</div>
                {r.photo && <div className="ph"><img src={`/img/${p.photo}`} alt="구매자 사진" loading="lazy" style={{ transform: 'scale(1.6)', objectPosition: ['30% 40%', '60% 60%', '50% 30%'][r.id.length % 3] }} /></div>}
                <div className="ft">
                  {r.mine ? <span /> : <button className="helpful" aria-pressed={helped.has(r.id)} onClick={() => toggleHelp(r.id)}>👍 도움돼요 <span className="num">{h || ''}</span></button>}
                  <span className="hint">{h ? `${h}명에게 도움이 됐어요` : ''}</span>
                </div>
              </div>
            );
          })}
          <div className="pager">
            {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - pg) < 4).map((n) => (
              <button key={n} aria-current={n === pg ? 'page' : undefined} onClick={() => { setPage(n); document.getElementById('s-rv')?.scrollIntoView({ behavior: 'smooth' }); }}>{n}</button>
            ))}
          </div>
        </>
      ) : <div className="empty-box">조건에 맞는 상품평이 없어요</div>}
    </div>
  );
}
