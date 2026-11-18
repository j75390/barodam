import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { admin, type AdminApplication, type AdminInquiry, type AdminOrder, type AdminReview, type Overview, type RecruitInquiry } from '@/services/admin';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/services/careers';
import { fmtDateTime, won } from '@/lib/format';
import { productById } from '@/data/products';
import { useBackend, useUser } from '@/state/backendContext';
import { useUI } from '@/state/ui';
import { usePageTitle } from '@/components/usePageTitle';

const STEP_LABEL: Record<AdminOrder['step'], string> = { paid: '결제완료', ready: '상품준비중', ship: '배송중', done: '배송완료', confirmed: '구매확정', cancel: '주문취소' };
const MENU: [string, string][] = [['', '대시보드'], ['orders', '주문 관리'], ['inquiries', '상품·1:1 문의'], ['reviews', '상품평'], ['applications', '채용 지원'], ['recruit', '채용 문의']];

/** Operator console (/admin). Visible only to accounts with the admin flag; the server re-checks every call. */
export default function AdminApp() {
  const user = useUser();
  const be = useBackend();
  const loc = useLocation();
  usePageTitle('관리자', '바로담 파트너 오피스');
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (!user.isAdmin)
    return (
      <div className="adm-deny">
        <h1>접근 권한이 없어요</h1>
        <p>바로담 운영 계정으로 로그인해야 볼 수 있는 화면이에요.</p>
        <Link className="btn primary" to="/">바로담 홈으로</Link>
      </div>
    );
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/admin" className="adm-logo">바로<em>담</em> <small>파트너 오피스</small></Link>
        <nav>{MENU.map(([p, t]) => <NavLink key={p} to={`/admin${p ? `/${p}` : ''}`} end>{t}</NavLink>)}</nav>
        <div className="adm-me">
          <b>{user.name}</b> 운영자<br />
          <Link to="/">쇼핑몰 보기 ↗</Link> · <button className="lnk" onClick={() => void be.signOut()}>로그아웃</button>
        </div>
      </aside>
      <main className="adm-main">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="inquiries" element={<Inquiries />} />
          <Route path="reviews" element={<Reviews />} />
          <Route path="applications" element={<Applications />} />
          <Route path="recruit" element={<RecruitInquiries />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
}

/** Loads data once and offers a reload; shows server errors instead of a blank screen. */
function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const reload = useCallback(() => {
    load().then(setData, (e: Error) => setErr(e.message));
  }, [load]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, err, reload };
}

function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="adm-panel">
      <div className="adm-ph"><h2>{title}</h2>{right}</div>
      {children}
    </section>
  );
}
const Loading = ({ err }: { err: string | null }) => <p className="adm-empty">{err ?? '불러오는 중…'}</p>;

function Dashboard() {
  usePageTitle('대시보드', '바로담 파트너 오피스');
  const { data: o, err } = useLoad<Overview>(admin.overview);
  const { data: orders } = useLoad<AdminOrder[]>(useCallback(() => admin.orders(8), []));
  if (!o) return <Loading err={err} />;
  const cards: [string, string, string?][] = [
    ['오늘 매출', won(o.salesToday), `${o.ordersToday}건`],
    ['누적 매출', won(o.salesTotal), `${o.ordersTotal}건 · 취소 ${o.cancelled}건`],
    ['회원', `${o.members.toLocaleString()}명`, `오늘 가입 ${o.membersToday}명`],
    ['답변 대기 문의', `${o.pendingInquiries}건`, '/admin/inquiries'],
    ['새 채용 지원', `${o.newApplications}건`, '/admin/applications'],
    ['상품평', `${o.reviews}개`, `채용 문의 ${o.recruitInquiries}건`],
  ];
  return (
    <>
      <h1 className="adm-h1">대시보드</h1>
      <div className="adm-cards">
        {cards.map(([k, v, sub]) => (
          <div className="adm-card" key={k}>
            <span>{k}</span><b className="num">{v}</b>
            {sub?.startsWith('/') ? <Link to={sub}>처리하기 ›</Link> : <small>{sub}</small>}
          </div>
        ))}
      </div>
      <Panel title="최근 주문" right={<Link to="/admin/orders">전체 보기 ›</Link>}>
        {orders ? <OrderTable rows={orders} /> : <Loading err={null} />}
      </Panel>
    </>
  );
}

function OrderTable({ rows, onCancel }: { rows: AdminOrder[]; onCancel?: (o: AdminOrder) => void }) {
  if (!rows.length) return <p className="adm-empty">주문이 없어요</p>;
  return (
    <div className="adm-tw">
      <table className="adm-t">
        <thead><tr><th>주문번호</th><th>주문일시</th><th>주문자</th><th>상품</th><th className="r">결제 금액</th><th>상태</th>{onCancel && <th />}</tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.no}>
              <td className="num">{o.no}</td>
              <td className="num">{fmtDateTime(o.at)}</td>
              <td>{o.member ? <>{o.memberName} <small>({o.member})</small></> : <>{o.buyer?.name} <small>(비회원)</small></>}</td>
              <td>{o.items[0]?.name}{o.items.length > 1 && ` 외 ${o.items.length - 1}건`}</td>
              <td className="r num">{won(o.total)}</td>
              <td><span className={`adm-st adm-st-${o.step}`}>{STEP_LABEL[o.step]}</span></td>
              {onCancel && <td>{o.step !== 'cancel' && o.step !== 'confirmed' && <button className="btn sm" onClick={() => onCancel(o)}>취소·환불</button>}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Orders() {
  usePageTitle('주문 관리', '바로담 파트너 오피스');
  const ui = useUI();
  const { data, err, reload } = useLoad<AdminOrder[]>(useCallback(() => admin.orders(300), []));
  const [filter, setFilter] = useState<'all' | AdminOrder['step']>('all');
  if (!data) return <Loading err={err} />;
  const rows = filter === 'all' ? data : data.filter((o) => o.step === filter);
  const cancel = async (o: AdminOrder) => {
    if (!(await ui.confirm('주문 취소·환불', `${o.no} (${won(o.total)})을 판매자 사정으로 취소할까요?\n회원 주문이면 쓴 쿠폰과 적립금이 돌아가요.`, '취소·환불'))) return;
    try {
      await admin.cancelOrder(o.no);
      ui.toast('주문을 취소하고 환불했어요');
      reload();
    } catch (e) {
      ui.toast((e as Error).message);
    }
  };
  return (
    <>
      <h1 className="adm-h1">주문 관리</h1>
      <div className="adm-chips">
        {(['all', 'paid', 'ready', 'ship', 'done', 'confirmed', 'cancel'] as const).map((k) => (
          <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {k === 'all' ? '전체' : STEP_LABEL[k]} <span className="num">{k === 'all' ? data.length : data.filter((o) => o.step === k).length}</span>
          </button>
        ))}
      </div>
      <Panel title={`주문 ${rows.length}건`} right={<button className="btn sm" onClick={reload}>새로고침</button>}>
        <OrderTable rows={rows} onCancel={cancel} />
      </Panel>
    </>
  );
}

function Inquiries() {
  usePageTitle('문의 관리', '바로담 파트너 오피스');
  const ui = useUI();
  const [pending, setPending] = useState(true);
  const { data, err, reload } = useLoad<AdminInquiry[]>(useCallback(() => admin.inquiries(pending), [pending]));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const send = async (q: AdminInquiry) => {
    try {
      await admin.answer(q.id, draft[q.id] ?? '');
      ui.toast('답변을 등록했어요. 고객 화면에 바로 보여요');
      setDraft((d) => ({ ...d, [q.id]: '' }));
      reload();
    } catch (e) {
      ui.toast((e as Error).message);
    }
  };
  return (
    <>
      <h1 className="adm-h1">상품·1:1 문의</h1>
      <div className="adm-chips">
        <button aria-pressed={pending} onClick={() => setPending(true)}>답변 대기</button>
        <button aria-pressed={!pending} onClick={() => setPending(false)}>전체</button>
      </div>
      {!data ? <Loading err={err} /> : !data.length ? <p className="adm-empty">{pending ? '답변을 기다리는 문의가 없어요' : '문의가 없어요'}</p> : data.map((q) => {
        const p = q.pid ? productById(q.pid) : null;
        return (
          <article className="adm-panel adm-q" key={q.id}>
            <div className="adm-qh">
              <span className="adm-tag">{p ? '상품 문의' : q.cat}</span>
              <b>{q.title}</b>
              <small>{q.who} ({q.member}) · {fmtDateTime(q.t)}</small>
            </div>
            {p && <Link className="adm-prod" to={`/products/${p.id}`} target="_blank"><img src={`/img/${p.photo}`} alt="" />{p.name}</Link>}
            <p className="adm-body">{q.body}</p>
            {q.answer ? (
              <div className="adm-ans"><b>답변 완료</b> · {q.answeredAt && fmtDateTime(q.answeredAt)}<p>{q.answer}</p></div>
            ) : (
              <div className="adm-reply">
                <textarea className="inp" rows={3} placeholder="고객에게 보일 답변을 입력하세요" value={draft[q.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))} />
                <button className="btn primary" onClick={() => void send(q)}>답변 등록</button>
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

function Reviews() {
  usePageTitle('상품평 관리', '바로담 파트너 오피스');
  const ui = useUI();
  const { data, err, reload } = useLoad<AdminReview[]>(admin.reviews);
  const del = async (r: AdminReview) => {
    if (!(await ui.confirm('상품평 숨김', '운영 정책 위반으로 이 상품평을 삭제할까요?', '삭제'))) return;
    try {
      await admin.deleteReview(r.id);
      ui.toast('상품평을 삭제했어요');
      reload();
    } catch (e) {
      ui.toast((e as Error).message);
    }
  };
  return (
    <>
      <h1 className="adm-h1">상품평</h1>
      <Panel title={`회원이 쓴 상품평 ${data?.length ?? ''}개`}>
        {!data ? <Loading err={err} /> : !data.length ? <p className="adm-empty">아직 상품평이 없어요</p> : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead><tr><th>작성일</th><th>상품</th><th>별점</th><th>내용</th><th>작성자</th><th /></tr></thead>
              <tbody>{data.map((r) => (
                <tr key={r.id}>
                  <td className="num">{fmtDateTime(r.t)}</td>
                  <td><Link to={`/products/${r.pid}`} target="_blank">{r.name}</Link><br /><small>{r.opt}</small></td>
                  <td className="num">{'★'.repeat(r.star)}</td>
                  <td className="adm-long">{r.txt}</td>
                  <td>{r.who}</td>
                  <td><button className="btn sm" onClick={() => void del(r)}>삭제</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function Applications() {
  usePageTitle('채용 지원 관리', '바로담 파트너 오피스');
  const ui = useUI();
  const { data, err, reload } = useLoad<AdminApplication[]>(admin.applications);
  const set = async (a: AdminApplication, status: ApplicationStatus) => {
    try {
      await admin.setApplication(a.no, status);
      ui.toast(`${a.name}님 지원 상태를 '${status}'(으)로 바꿨어요. 지원자 현황 조회에 바로 보여요`);
      reload();
    } catch (e) {
      ui.toast((e as Error).message);
    }
  };
  return (
    <>
      <h1 className="adm-h1">채용 지원</h1>
      <Panel title={`지원서 ${data?.length ?? ''}건`}>
        {!data ? <Loading err={err} /> : !data.length ? <p className="adm-empty">지원서가 없어요</p> : (
          <div className="adm-tw">
            <table className="adm-t">
              <thead><tr><th>지원번호</th><th>지원일</th><th>포지션</th><th>지원자</th><th>경력</th><th>이력서</th><th>전형 단계</th></tr></thead>
              <tbody>{data.map((a) => (
                <tr key={a.no}>
                  <td className="num">{a.no}</td>
                  <td className="num">{fmtDateTime(a.at)}</td>
                  <td>{a.title}</td>
                  <td>{a.name}<br /><small>{a.email} · {a.phone}</small></td>
                  <td>{a.years}</td>
                  <td><small>{a.files?.resume?.name ?? '-'}</small></td>
                  <td>{a.cancelledAt ? <span className="adm-st adm-st-cancel">지원 취소</span> : (
                    <select className="inp sm" value={a.status} onChange={(e) => void set(a, e.target.value as ApplicationStatus)}>
                      {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function RecruitInquiries() {
  usePageTitle('채용 문의', '바로담 파트너 오피스');
  const { data, err } = useLoad<RecruitInquiry[]>(admin.recruitInquiries);
  return (
    <>
      <h1 className="adm-h1">채용 문의</h1>
      {!data ? <Loading err={err} /> : !data.length ? <p className="adm-empty">채용 문의가 없어요</p> : data.map((q) => (
        <article className="adm-panel adm-q" key={q.id}>
          <div className="adm-qh"><span className="adm-tag">{q.type}</span><b>{q.name}</b><small>{q.email} · {fmtDateTime(q.at)}</small></div>
          <p className="adm-body">{q.body}</p>
          <a className="btn sm" href={`mailto:${q.email}?subject=${encodeURIComponent('[바로담 채용] 문의 답변')}`}>메일로 답장</a>
        </article>
      ))}
    </>
  );
}
