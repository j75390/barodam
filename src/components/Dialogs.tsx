import { useState } from 'react';
import type { Order } from '@/types';
import type { Backend } from '@/services/backend';
import { optionText } from '@/domain/orderText';

type UI = ReturnType<typeof import('@/state/ui').useUI>;

/** Review form for one ordered item. Resolves true when saved. */
export function openReviewForm(ui: UI, be: Backend, order: Order, k: number): Promise<boolean> {
  const it = order.items[k];
  return ui.open({
    title: '리뷰 쓰기',
    render: (close) => <ReviewForm name={it.name} opt={optionText(it)} onCancel={() => close(false)} onSubmit={async (star, txt) => {
      const r = await be.writeReview({ orderNo: order.no, k, star, txt });
      if (!r.ok) return r.error;
      close(true);
      ui.toast('리뷰를 등록하고 적립금 500원을 드렸어요');
      return null;
    }} />,
  });
}

function ReviewForm({ name, opt, onCancel, onSubmit }: { name: string; opt: string; onCancel: () => void; onSubmit: (star: number, txt: string) => Promise<string | null> }) {
  const [star, setStar] = useState(5);
  const [txt, setTxt] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <h3>리뷰 쓰기</h3>
      <p>{name}<br />{opt}</p>
      <div className="stars" style={{ marginTop: 12 }} role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= star ? 'on' : ''} aria-label={`${n}점`} aria-checked={n === star} role="radio" onClick={() => setStar(n)}>★</button>
        ))}
      </div>
      <textarea className="inp" style={{ marginTop: 12 }} maxLength={500} placeholder="상품을 써 보니 어땠나요? (10자 이상)" value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="리뷰 내용" />
      <div className="hint num">{txt.length} / 500</div>
      {err && <p className="err">{err}</p>}
      <div className="ctas">
        <button className="btn" onClick={onCancel}>취소</button>
        <button className="btn primary" disabled={busy} onClick={async () => {
          if (txt.trim().length < 10) return setErr('10자 이상 써 주세요.');
          setBusy(true);
          const e = await onSubmit(star, txt.trim());
          setBusy(false);
          if (e) setErr(e);
        }}>등록 (+500원)</button>
      </div>
    </>
  );
}

/** Product question or 1:1 inquiry. */
export function openInquiryForm(ui: UI, be: Backend, opts: { pid?: number; productName?: string; cat?: string; title?: string }): Promise<boolean> {
  return ui.open({
    title: opts.pid ? '상품 문의' : '1:1 문의',
    render: (close) => <InquiryForm {...opts} onCancel={() => close(false)} onSubmit={async (cat, title, body) => {
      const r = await be.ask({ pid: opts.pid ?? null, cat, title, body });
      if (!r.ok) return r.error;
      close(true);
      ui.toast('문의를 등록했어요. 곧 답변해 드릴게요');
      return null;
    }} />,
  });
}

const INQUIRY_TYPES = ['주문/결제', '배송', '취소/반품/교환', '회원', '입점·판매', '기타'];

function InquiryForm({ pid, productName, cat: cat0, title: t0, onCancel, onSubmit }: { pid?: number; productName?: string; cat?: string; title?: string; onCancel: () => void; onSubmit: (cat: string, title: string, body: string) => Promise<string | null> }) {
  const [cat, setCat] = useState(cat0 ?? INQUIRY_TYPES[0]);
  const [title, setTitle] = useState(t0 ?? '');
  const [body, setBody] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (title.trim().length < 2 || body.trim().length < 10) return setErr('제목과 10자 이상의 내용을 입력해 주세요.');
      const r = await onSubmit(pid ? '상품' : cat, title.trim(), body.trim());
      if (r) setErr(r);
    }}>
      <h3>{pid ? '상품 문의' : '1:1 문의'}</h3>
      {productName && <p>{productName}</p>}
      {!pid && (
        <label className="fld"><span>문의 유형</span>
          <select className="inp" value={cat} onChange={(e) => setCat(e.target.value)}>{INQUIRY_TYPES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
      )}
      <label className="fld"><span>제목</span><input className="inp" maxLength={40} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="fld"><span>내용</span><textarea className="inp" maxLength={1000} placeholder="궁금한 점을 자세히 적어 주세요 (10자 이상)" value={body} onChange={(e) => setBody(e.target.value)} /></label>
      {err && <p className="err">{err}</p>}
      <div className="ctas">
        <button type="button" className="btn" onClick={onCancel}>취소</button>
        <button className="btn primary">등록</button>
      </div>
    </form>
  );
}
