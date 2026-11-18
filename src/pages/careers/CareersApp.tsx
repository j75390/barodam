import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CAREER_FAQ, DECK, JOBS, PILLARS, QUOTES, STORIES, WAYS, type Job } from '@/data/careers';
import { formatPhone } from '@/lib/format';
import { local, session } from '@/lib/storage';
import { EMAIL_RE, PHONE_RE } from '@/lib/validators';
import { careersService, type Application } from '@/services/careers';
import { useUI } from '@/state/ui';
import { usePageTitle } from '@/components/usePageTitle';

const SUFFIX = '바로담 인재영입 - 바로담 채용 사이트';
const DAY = 864e5;
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const deadline = (j: Job) => (j.end == null ? null : new Date(today().getTime() + j.end * DAY));
const dday = (j: Job): [string, boolean] => (j.end == null ? ['상시 채용', true] : j.end <= 0 ? ['오늘 마감', false] : [`D-${j.end}`, false]);
const fmtK = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
const img = (n: string) => `/img/careers/${n}.jpg`;
const FAMS = ['All', ...new Set(JOBS.map((j) => j.fam))];

/** Careers site (separate look and header, like careers.gmarket.com). */
export default function CareersApp() {
  const loc = useLocation();
  const dark = /^\/careers\/culture/.test(loc.pathname);
  return (
    <div className={`careers${dark ? ' c-dark-hd' : ''}`}>
      <CareersHeader />
      <main>
        <Routes>
          <Route index element={<Home />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="apply/:id" element={<Apply />} />
          <Route path="done/:no" element={<Done />} />
          <Route path="status" element={<Status />} />
          <Route path="culture" element={<Culture />} />
          <Route path="faq" element={<Faq />} />
          <Route path="stories/:i" element={<StoryPage />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <footer className="c-ft">
        <div className="c-w">
          <span>ⓒ BARODAM Corp. All rights reserved.</span>
          <Link to="/careers/privacy"><b>채용 개인정보 처리방침</b></Link>
          <Link to="/info/privacy">바로담 개인정보 처리방침</Link>
          <Link to="/careers/status">지원 현황 조회</Link>
          <select className="c-fam" aria-label="패밀리 사이트" value="" onChange={(e) => { if (e.target.value) window.open(e.target.value, '_blank', 'noopener'); }}>
            <option value="">Family site</option><option value="/">바로담 쇼핑</option><option value="/help">바로담 고객센터</option><option value="/info/about">바로담 회사소개</option>
          </select>
        </div>
      </footer>
    </div>
  );
}

function CareersHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const cur = (p: string) => loc.pathname.startsWith(p);
  return (
    <header className={`c-hd${scrolled ? ' c-scrolled' : ''}`}>
      <div className="c-w">
        <Link className="c-lg" to="/careers"><span className="c-b">바로<em>담</em></span><span className="c-c">Careers</span></Link>
        <button className="c-mnav" aria-label="메뉴 열기" aria-expanded={open} onClick={() => setOpen((o) => !o)}>☰</button>
        <nav className={`c-nav${open ? ' c-open' : ''}`}>
          <a href="/info/about" target="_blank" rel="noopener">회사소개</a>
          <NavLink to="/careers/culture" aria-current={cur('/careers/culture') ? 'page' : undefined}>바로담 DNA</NavLink>
          <NavLink to="/careers/jobs" aria-current={cur('/careers/jobs') || cur('/careers/apply') ? 'page' : undefined}>채용공고</NavLink>
          <NavLink to="/careers/faq" aria-current={cur('/careers/faq') ? 'page' : undefined}>자주 묻는 질문</NavLink>
        </nav>
      </div>
    </header>
  );
}

function JobCard({ j }: { j: Job }) {
  const [d, open] = dday(j);
  return (
    <Link className="c-jc" to={`/careers/jobs/${j.id}`}>
      <span className="c-t">{j.org} | {j.team}</span>
      <b>{j.title}</b>
      <span className={`c-d c-dd${open ? ' c-open' : ''}`}>{d}</span>
    </Link>
  );
}

function Marquee() {
  return (
    <div className="c-mq">
      <div className="c-tr">{[...JOBS, ...JOBS].map((j, i) => <JobCard key={`${j.id}-${i}`} j={j} />)}</div>
    </div>
  );
}

function JoinSection() {
  return (
    <section className="c-sec c-center">
      <h2 className="c-h2">바로담의 여정에 함께하세요</h2>
      <p className="c-lead">필요한 모든 것을 바로 담는 곳, 바로담<br />새로운 커머스의 기준을 함께 만들 분을 기다리고 있습니다.</p>
      <Marquee />
      <div style={{ marginTop: 40 }}><Link className="c-btn" to="/careers/jobs">채용공고 보러 가기 →</Link></div>
    </section>
  );
}

const StoryCard = ({ i }: { i: number }) => {
  const s = STORIES[i];
  return (
    <Link className="c-st" to={`/careers/stories/${i}`}>
      <div className="c-im"><img src={img(s.img)} alt="" loading="lazy" /></div>
      <span className="c-tag">{s.tag}</span>
      <b>{s.title}</b>
      <span>{s.by}</span>
    </Link>
  );
};

function Home() {
  usePageTitle('', SUFFIX);
  return (
    <>
      <div className="c-w">
        <h1 className="c-h1">필요한 모든 것을<br />바로 담는 커머스, 바로담</h1>
        <p className="c-lead">바로담은 구성원이 성장할 수 있는 기회와 새로운 도전을 끊임없이 만들어 갑니다.<br />우리는 치열하게 고민하고 과감하게 시도하며, 고객의 하루를 조금 더 편하게 만드는 일을 현실로 바꿔 가고 있습니다.<br />쇼핑의 내일을 함께 만들어 갈 여러분의 지원을 기다립니다.</p>
        <div className="c-ph"><img src={img('hero')} alt="바로담 사무실 책상" /></div>
        <JoinSection />
        <section className="c-sec">
          <h2 className="c-h2">바로담 구성원이 들려주는<br />우리들의 이야기</h2>
          <p className="c-lead">구성원이 직접 말하는 일하는 방식과 문화를 만나 보세요.</p>
          <div className="c-stg">{STORIES.map((_, i) => <StoryCard key={i} i={i} />)}</div>
        </section>
        <section className="c-sec">
          <h2 className="c-h2">바로담은 사람에 대한 존중과 믿음을 바탕으로<br />다양한 제도로 구성원의 성장을 지원합니다</h2>
          <div className="c-pil">{PILLARS.map((p) => <div key={p[0]}><i><svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: p[3] }} /></i><h3>{p[0]}</h3><p>{p[1]}</p><small>{p[2]}</small></div>)}</div>
          <div className="c-center" style={{ marginTop: 36 }}><Link className="c-btn c-ghost" to="/careers/culture">바로담 DNA 보러 가기 →</Link></div>
        </section>
        <section className="c-sec">
          <h2 className="c-h2">바로담에 대해 더 궁금하시다면?</h2>
          <div className="c-more">
            <a href="/help/notice" target="_blank" rel="noopener"><b>News</b><span>바로담의 새로운 소식과 공지를 확인해 보세요.</span><em>바로가기 ↗</em></a>
            <Link to="/careers/stories/0"><b>바로담 기술 이야기</b><span>바로담 개발자들이 직접 쓰는 기술과 경험 이야기입니다.</span><em>바로가기 →</em></Link>
            <a href="/" target="_blank" rel="noopener"><b>바로담 쇼핑</b><span>우리가 만드는 서비스를 직접 써 보세요.</span><em>바로가기 ↗</em></a>
          </div>
        </section>
      </div>
    </>
  );
}

function Jobs() {
  usePageTitle('채용공고', SUFFIX);
  const [fam, setFam] = useState('All');
  const [q, setQ] = useState('');
  const list = JOBS.filter((j) => (fam === 'All' || j.fam === fam) && (!q || `${j.title}${j.team}${j.org}${j.role}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => (a.end ?? 999) - (b.end ?? 999));
  return (
    <div className="c-w">
      <h1 className="c-h1">모집 중인 포지션</h1>
      <p className="c-lead">바로담은 최소한의 인적사항과 이력서 파일만으로 지원하는 '간편 지원'을 지향합니다.<br />진행 중인 포지션을 확인하시고 언제든 편하게 지원해 주세요.</p>
      <div className="c-ph"><img src={img('jobs')} alt="바로담 사무실 책상 위 노트북과 키보드" /></div>
      <div className="c-srch" style={{ marginTop: 56 }}>
        <div className="c-chips" style={{ margin: 0 }}>
          {FAMS.map((f) => <button key={f} aria-pressed={f === fam} onClick={() => setFam(f)}>{f}{f !== 'All' && <> <span className="c-num">{JOBS.filter((j) => j.fam === f).length}</span></>}</button>)}
        </div>
        <input type="search" placeholder="포지션 검색" aria-label="포지션 검색" value={q} onChange={(e) => setQ(e.target.value.trim())} />
      </div>
      <p className="c-cnt c-num" style={{ marginTop: 22 }}>{list.length}개 포지션</p>
      <div className="c-jl">
        {list.length ? list.map((j) => {
          const [d, open] = dday(j);
          return (
            <Link key={j.id} className="c-jr" to={`/careers/jobs/${j.id}`}>
              <div><b>{j.title}</b><div className="c-meta">{[j.org, j.team, j.role, j.career, j.type].map((m) => <span key={m}>{m}</span>)}</div></div>
              <span className={`c-dd${open ? ' c-open' : ''}`}>{d}</span>
            </Link>
          );
        }) : <p className="c-lead" style={{ padding: '40px 0' }}>조건에 맞는 포지션이 없어요.</p>}
      </div>
    </div>
  );
}

function JobDetail() {
  const { id } = useParams();
  const ui = useUI();
  const j = JOBS.find((x) => x.id === id);
  usePageTitle(j?.title ?? '채용공고', SUFFIX);
  if (!j) return <div className="c-done"><h1>마감되었거나 없는 공고예요</h1><Link className="c-btn" to="/careers/jobs">채용공고 보기</Link></div>;
  const [d, open] = dday(j);
  const dl = deadline(j);
  const share = async () => {
    const url = `${location.origin}/careers/jobs/${j.id}`;
    try { await navigator.clipboard.writeText(url); ui.toast('공고 링크를 복사했어요'); } catch { void ui.info('공고 링크', url); }
  };
  return (
    <>
      <div className="c-w"><div className="c-ph c-jhero" style={{ marginTop: 20 }}><img src={img('office')} alt="바로담 사무 공간" style={{ objectPosition: '50% 40%' }} /></div></div>
      <div className="c-jbar"><div className="c-w">
        <h1>{j.title}</h1>
        <button className="c-share" aria-label="공고 공유하기" onClick={share}><svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></svg></button>
        <Link className="c-btn" to={`/careers/apply/${j.id}`}>지원하기</Link>
      </div></div>
      <div className="c-jbody">
        <div className="c-jtags">{[j.career, j.type, j.org, j.team, j.role].map((t) => <span key={t}>{t}</span>)}<span className="c-num" style={{ color: open ? 'var(--ok)' : 'var(--accent)' }}>{d}</span></div>
        <div className="c-cobox"><div><b>바로<em>담</em></b>필요한 모든 것을 바로 담는 종합 커머스.<br />고객의 하루를 더 편하게 만듭니다.</div><div><b>{j.team}</b>{j.org} 조직 · 서울 바로구 본사</div></div>
        <h2>조직 및 역할 소개</h2><p>{j.intro}</p>
        <h2>주요 업무</h2>{j.duty.map(([h, l]) => <div key={h}><h4>■ {h}</h4><ul>{l.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
        <h2>자격 요건</h2><ul>{j.req.map((x) => <li key={x}>{x}</li>)}</ul>
        <h2>우대 사항</h2><ul>{j.pref.map((x) => <li key={x}>{x}</li>)}</ul>
        <h2>공통 요건</h2><ul><li>바로담 회원가입이 되어 있는 분</li><li>해외여행 결격 사유가 없는 분</li><li>국가보훈 대상자와 장애인은 관련 법에 따라 우대합니다</li></ul>
        <h2>지원 방법 및 전형 절차</h2>
        <ul><li>마감일 : {dl ? `${fmtK(dl)} 23시 59분` : '상시 채용 (적합한 분을 찾으면 조기 마감)'}</li><li>바로담 채용 사이트를 통해 지원</li></ul>
        <div className="c-proc">{j.proc.map((p, i) => <span key={p} style={{ display: 'contents' }}>{i > 0 && <i>›</i>}<span>{p}</span></span>)}</div>
        <ul><li>면접 세부 절차는 상황에 따라 바뀔 수 있어요.</li><li>최종 제출한 지원서는 수정할 수 없어요.</li></ul>
        <h2>기타 사항</h2>
        <ul><li>필수 정보: 이름, 연락처, 이메일, 이력서, 유관 경력 기간</li><li>지원서 내용이 사실과 다르면 채용이 취소될 수 있어요.</li><li>근무지: 바로담 본사 (서울특별시 바로구 담길 12, 바로담타워)</li><li>문의: <Link to="/careers/faq">자주 묻는 질문</Link> 또는 recruit@barodam.kro.kr</li></ul>
        <div className="c-applyend"><div><b style={{ fontSize: 20 }}>{j.title}</b><div style={{ color: 'var(--muted)' }}>{d} · {j.career} · {j.type}</div></div><Link className="c-btn c-acc" to={`/careers/apply/${j.id}`}>지원하기 →</Link></div>
      </div>
      <div className="c-w"><section className="c-sec"><h2 className="c-h2">다른 포지션도 살펴보세요</h2><Marquee /></section></div>
    </>
  );
}

const ROUTES = ['바로담 채용 사이트', '채용 플랫폼', '지인 추천', 'SNS', '채용 박람회·설명회', '기타'];
const YEARS = ['없음 (신입)', '1년 미만', '1~3년', '3~5년', '5~7년', '7~10년', '10년 이상'];

function Apply() {
  const { id = '' } = useParams();
  const ui = useUI();
  const nav = useNavigate();
  const j = JOBS.find((x) => x.id === id);
  usePageTitle('지원서 작성', SUFFIX);
  const draftKey = `bd_apply_draft_${id}`;
  const [v, setV] = useState(() => ({ name: '', email: '', phone: '', route: '', url: '', years: '', motive: '', ...local.get<Record<string, string>>(draftKey, {}) }));
  const [files, setFiles] = useState<Application['files']>({ resume: null, portfolio: null });
  const [vet, setVet] = useState('비대상');
  const [dis, setDis] = useState('비대상');
  const [agree, setAgree] = useState({ optional: false, sensitive: false, pool: false });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { local.set(draftKey, v); }, [draftKey, v]);
  if (!j) return <div className="c-done"><h1>없는 공고예요</h1><Link className="c-btn" to="/careers/jobs">채용공고 보기</Link></div>;
  const set = (k: keyof typeof v, val: string) => setV((x) => ({ ...x, [k]: val }));
  const pick = (key: 'resume' | 'portfolio') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { ui.toast('50MB 이하 파일만 올릴 수 있어요'); e.target.value = ''; return; }
    setFiles((x) => ({ ...x, [key]: { name: f.name, size: f.size } }));
  };
  const validate = () => {
    if (v.name.trim().length < 2) return '이름을 입력해 주세요.';
    if (!EMAIL_RE.test(v.email.trim())) return '이메일 형식을 확인해 주세요.';
    if (!PHONE_RE.test(v.phone)) return '연락처를 010-0000-0000 형식으로 입력해 주세요.';
    if (!v.route) return '지원경로를 선택해 주세요.';
    if (!files.resume) return '이력서 파일을 첨부해 주세요.';
    if (v.url && !/^https?:\/\/\S+\.\S+/.test(v.url.trim())) return 'URL은 https:// 로 시작하게 입력해 주세요.';
    if (!v.years) return '유관 경력 기간을 선택해 주세요.';
    if (!agree.sensitive) return '민감정보 수집 및 이용(필수)에 동의해 주세요.';
    return null;
  };
  const data = () => ({ jobId: j.id, title: j.title, name: v.name.trim(), email: v.email.trim(), phone: v.phone, route: v.route, files, url: v.url.trim(), years: v.years, motive: v.motive.trim(), veteran: vet, disability: dis, agree });
  const preview = () => {
    const d = data();
    void ui.open({
      title: '지원서 미리보기',
      render: (close) => (
        <div className="careers" style={{ background: 'none', minHeight: 0 }}>
          <h3 style={{ margin: '0 0 14px' }}>지원서 미리보기</h3>
          <dl className="c-kv">
            {([['포지션', d.title], ['이름', d.name], ['이메일', d.email], ['연락처', d.phone], ['지원경로', d.route], ['이력서', d.files.resume?.name], ['포트폴리오', d.files.portfolio?.name], ['URL', d.url], ['유관 경력', d.years], ['보훈·장애', `${d.veteran} · ${d.disability}`]] as [string, string | undefined][]).map(([k, val]) => <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{val || '-'}</dd></div>)}
          </dl>
          <h4 style={{ margin: '18px 0 6px' }}>지원동기</h4>
          <p style={{ whiteSpace: 'pre-line', color: 'var(--muted)', maxHeight: 200, overflow: 'auto', margin: 0 }}>{d.motive || '-'}</p>
          <div className="ctas" style={{ gridTemplateColumns: '1fr' }}><button className="btn primary" onClick={() => close(true)}>닫기</button></div>
        </div>
      ),
    });
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = validate();
    if (m) return setErr(m);
    const r = careersService.submit(data());
    if (!r.ok) return setErr(r.error);
    local.remove(draftKey);
    session.set('bd_appauth', r.app.no);
    nav(`/careers/done/${r.app.no}`);
  };
  const FileBox = ({ k, accept }: { k: 'resume' | 'portfolio'; accept: string }) => (
    <label className="c-file">
      <input type="file" accept={accept} onChange={pick(k)} />
      <span>📎</span>
      <span className={`c-nm${files[k] ? ' c-on' : ''}`}>{files[k] ? `${files[k]!.name} (${(files[k]!.size / 1024 / 1024).toFixed(1)}MB)` : '파일 첨부'}</span>
      {files[k] && <button type="button" className="c-x" aria-label="파일 지우기" onClick={(e) => { e.preventDefault(); setFiles((x) => ({ ...x, [k]: null })); }}>✕</button>}
    </label>
  );
  const downloadTemplate = () => {
    const txt = '바로담 표준 이력서\n\n1. 기본 정보\n이름:\n연락처:\n이메일:\n\n2. 경력 사항 (최근 순)\n회사명 / 기간 / 직무 / 주요 성과\n\n3. 프로젝트\n프로젝트명 / 기간 / 역할 / 결과\n\n4. 학력\n\n5. 자격·어학\n\n6. 자기소개 (선택)\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
    a.download = '바로담_표준_이력서_양식.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <form className="c-af" noValidate onSubmit={submit}>
      <button type="button" className="c-back" onClick={() => nav(`/careers/jobs/${j.id}`)}>← 이전으로</button>
      <h1>지원서 작성</h1>
      <p className="c-pos">{j.title}</p>
      <div className="c-fg"><label className="c-req" htmlFor="ap-nm">이름</label><input className="c-in" id="ap-nm" autoComplete="name" maxLength={30} value={v.name} onChange={(e) => set('name', e.target.value)} /></div>
      <div className="c-fg"><label className="c-req" htmlFor="ap-em">이메일</label><input className="c-in" id="ap-em" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} /></div>
      <div className="c-fg"><label className="c-req" htmlFor="ap-ph">연락처</label><input className="c-in c-num" id="ap-ph" inputMode="numeric" autoComplete="tel" placeholder="010-0000-0000" value={v.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} /></div>
      <div className="c-fg"><label className="c-req" htmlFor="ap-rt">지원경로</label><select className="c-in" id="ap-rt" value={v.route} onChange={(e) => set('route', e.target.value)}><option value="">선택해 주세요.</option>{ROUTES.map((r) => <option key={r}>{r}</option>)}</select></div>
      <div className="c-fg"><span className="c-lb c-req">이력서</span><p className="c-ds">본인을 가장 잘 보여 줄 수 있는 이력서를 올려 주세요. (50MB 이하 · PDF, DOC, DOCX, HWP)</p><FileBox k="resume" accept=".pdf,.doc,.docx,.hwp,.hwpx" />
        <button type="button" className="c-tpl c-btn c-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={downloadTemplate}>↓ 바로담 표준 이력서 양식</button></div>
      <div className="c-fg"><span className="c-lb">포트폴리오</span><p className="c-ds">이력서 외에 경력과 업무를 보여 줄 자료가 있다면 올려 주세요. (50MB 이하)</p><FileBox k="portfolio" accept=".pdf,.ppt,.pptx,.zip,.key" /></div>
      <div className="c-fg"><label htmlFor="ap-url">개인/업무 관련 URL</label><p className="c-ds">LinkedIn, GitHub, 블로그, Notion 등</p><input className="c-in" id="ap-url" placeholder="https://" value={v.url} onChange={(e) => set('url', e.target.value)} /></div>
      <div className="c-fg"><label className="c-req" htmlFor="ap-yr">유관 경력 기간</label><p className="c-ds">지원하는 포지션과 비슷한 업무를 한 기간을 골라 주세요.</p><select className="c-in" id="ap-yr" value={v.years} onChange={(e) => set('years', e.target.value)}><option value="">선택해 주세요.</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>
      <div className="c-fg"><label htmlFor="ap-mt">지원동기</label><p className="c-ds">이 포지션에 지원한 이유를 편하게 적어 주세요.</p><textarea className="c-in" id="ap-mt" maxLength={10000} value={v.motive} onChange={(e) => set('motive', e.target.value)} /><div className="c-cntr c-num">{v.motive.length.toLocaleString()}/10,000</div></div>
      <div className="c-fg"><span className="c-lb">보훈 여부</span><p className="c-ds">국가보훈 대상자는 관련 법에 따라 가산점을 드려요.</p><div className="c-radio">{['비대상', '대상'].map((x) => <label key={x}><input type="radio" name="vet" checked={vet === x} onChange={() => setVet(x)} /> {x}</label>)}</div></div>
      <div className="c-fg"><span className="c-lb">장애 여부</span><div className="c-radio">{['비대상', '대상'].map((x) => <label key={x}><input type="radio" name="dis" checked={dis === x} onChange={() => setDis(x)} /> {x}</label>)}</div></div>
      <div className="c-agr">
        {([['optional', '선택 항목 수집 및 이용에 동의합니다.', false, '1. 항목: 포트폴리오, 개인/업무 URL, 지원동기\n2. 목적: 채용 적합성 판단과 서류 심사·면접의 참고 자료\n3. 보유 기간: 지원서 제출 후 3년 (삭제 요청 시 5일 이내 삭제)\n※ 동의하지 않아도 지원할 수 있어요.'],
          ['sensitive', '민감정보 수집 및 이용에 동의합니다.', true, '1. 항목: 보훈 여부, 장애 여부\n2. 목적: 관련 법에 따른 우대 적용\n3. 보유 기간: 지원서 제출일부터 3년, 이후 지체 없이 파기\n※ 동의하지 않으면 채용 전형이 진행되지 않아요.'],
          ['pool', '인재풀 활용에 동의합니다.', false, '목적: 상시 채용을 위한 인재풀 활용\n보유 기간: 지원 접수 후 3년\n※ 동의하면 이번 포지션 외에도 잘 맞는 포지션이 열릴 때 먼저 제안드려요.']] as const).map(([k, label, req, tx]) => (
          <details key={k}>
            <summary><input type="checkbox" checked={agree[k]} onChange={(e) => setAgree((a) => ({ ...a, [k]: e.target.checked }))} onClick={(e) => e.stopPropagation()} /> {label}<span className={`c-k${req ? ' c-r' : ''}`}>{req ? '필수' : '선택'}</span></summary>
            <div className="c-tx">{tx}</div>
          </details>
        ))}
      </div>
      {err && <p className="c-err" role="alert">{err}</p>}
      <div className="c-fbtns"><button type="button" className="c-btn c-ghost" onClick={preview}>지원서 미리보기</button><button className="c-btn c-acc">제출하기</button></div>
      <p style={{ textAlign: 'center', marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>작성 중인 내용은 이 브라우저에 자동 저장돼요.</p>
    </form>
  );
}

function AppCard({ a }: { a: Application }) {
  const s = careersService.step(a);
  return (
    <div className="c-card">
      <dl className="c-kv">
        <dt>지원번호</dt><dd className="c-num"><b>{a.no}</b></dd>
        <dt>포지션</dt><dd><Link to={`/careers/jobs/${a.jobId}`}>{a.title}</Link></dd>
        <dt>지원일</dt><dd className="c-num">{new Date(a.at).toLocaleString('ko-KR')}</dd>
        <dt>이력서</dt><dd>{a.files.resume?.name ?? '-'}</dd>
        <dt>상태</dt><dd><b style={{ color: a.cancelledAt ? 'var(--muted)' : 'var(--accent)' }}>{a.cancelledAt ? '지원 취소' : ['접수 완료', '서류 검토 중'][s]}</b></dd>
      </dl>
      {!a.cancelledAt && (
        <>
          <div className="c-steps"><div className="c-on">접수 완료</div><div className={s >= 1 ? 'c-on' : ''}>서류 검토</div><div>면접</div><div>최종 결과</div></div>
          <p style={{ color: 'var(--muted)', fontSize: 13.5, margin: '10px 0 0' }}>서류 결과는 보통 1~2주 안에 {a.email} 로 안내해 드려요.</p>
        </>
      )}
    </div>
  );
}

function Done() {
  const { no = '' } = useParams();
  usePageTitle('지원 완료', SUFFIX);
  const a = useMemo(() => local.get<Application[]>('bd_apps', []).find((x) => x.no === no), [no]);
  if (!a || session.get<string>('bd_appauth', '') !== no) return <Status />;
  return (
    <div className="c-done">
      <div className="c-ok">✓</div>
      <h1 style={{ margin: '0 0 8px' }}>지원이 완료됐어요</h1>
      <p className="c-lead">{a.name}님, 바로담에 관심 가져 주셔서 고마워요.<br />지원번호는 지원 현황 조회에 필요하니 꼭 메모해 두세요.</p>
      <AppCard a={a} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}><Link className="c-btn c-ghost" to="/careers/jobs">다른 포지션 보기</Link><Link className="c-btn" to="/careers/status">지원 현황 조회</Link></div>
    </div>
  );
}

function Status() {
  usePageTitle('지원 현황 조회', SUFFIX);
  const ui = useUI();
  const [email, setEmail] = useState('');
  const [no, setNo] = useState('');
  const [found, setFound] = useState<Application | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const look = () => {
    const a = careersService.lookup(email.trim(), no.trim());
    setFound(a);
    setErr(a ? null : '일치하는 지원 내역이 없어요. 이메일과 지원번호를 확인해 주세요.');
  };
  return (
    <div className="c-done" style={{ textAlign: 'left' }}>
      <h1 className="c-h1" style={{ fontSize: 'clamp(32px,5vw,52px)', margin: '0 0 14px' }}>지원 현황 조회</h1>
      <p className="c-lead">지원할 때 입력한 이메일과 지원번호를 넣어 주세요.</p>
      <form className="c-card" noValidate onSubmit={(e) => { e.preventDefault(); look(); }}>
        <div className="c-fg" style={{ marginTop: 0 }}><label htmlFor="st-em">이메일</label><input className="c-in" id="st-em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="c-fg"><label htmlFor="st-no">지원번호</label><input className="c-in c-num" id="st-no" placeholder="BD로 시작하는 번호" style={{ textTransform: 'uppercase' }} value={no} onChange={(e) => setNo(e.target.value)} /></div>
        {err && <p className="c-err" role="alert">{err}</p>}
        <button className="c-btn c-acc" style={{ width: '100%', justifyContent: 'center', marginTop: 20 }}>조회하기</button>
      </form>
      {found && (
        <>
          <AppCard a={found} />
          {!found.cancelledAt && careersService.step(found) < 1 && (
            <>
              <button className="c-btn c-ghost" style={{ marginTop: 14 }} onClick={async () => {
                if (!(await ui.confirm('지원을 취소할까요?', `${found.title} 지원이 취소되고 되돌릴 수 없어요.`, '지원 취소', '닫기'))) return;
                careersService.cancel(found.no);
                ui.toast('지원을 취소했어요');
                look();
              }}>지원 취소하기</button>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>서류 검토가 시작되기 전까지 취소할 수 있어요.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Culture() {
  usePageTitle('바로담 DNA', SUFFIX);
  const ui = useUI();
  const openDeck = () => {
    let i = 0;
    const show = (): Promise<boolean> =>
      ui.open({
        title: 'Culture Deck',
        render: (close) => {
          const d = DECK[i];
          return (
            <div>
              <div style={{ background: d[0], color: '#fff', borderRadius: 16, padding: 32, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                <small style={{ opacity: 0.75, fontWeight: 800, letterSpacing: '.08em' }}>{d[1]}</small>
                <h4 style={{ fontFamily: 'var(--f-display)', fontWeight: 400, fontSize: 32, margin: 0, lineHeight: 1.3 }}>{d[2]}</h4>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 16, color: '#fff' }}>{d[3]}</p>
              </div>
              <div className="rowb" style={{ marginTop: 14 }}>
                <button className="btn sm" disabled={i === 0} onClick={() => { i--; close(false); void show(); }}>‹ 이전</button>
                <span className="hint num">{i + 1} / {DECK.length}</span>
                {i < DECK.length - 1
                  ? <button className="btn sm" onClick={() => { i++; close(false); void show(); }}>다음 ›</button>
                  : <Link className="btn sm primary" style={{ textDecoration: 'none' }} to="/careers/jobs" onClick={() => close(true)}>채용공고 보기</Link>}
              </div>
            </div>
          );
        },
      });
    void show();
  };
  const quotes = [...QUOTES, ...QUOTES];
  return (
    <>
      <section className="c-chero"><img src={img('culture')} alt="" /><div className="c-w"><h1 className="c-h1">바로담 DNA는<br />우리가 나아가야 할 방향입니다</h1><p>바로담만의 일하는 방식으로<br />우리의 비전을 이루고 존재 이유를 증명합니다.</p></div></section>
      <div className="c-qmq"><div className="c-tr">{quotes.map((q, i) => <div className="c-qc" key={i}><p>{q[0]}</p><b>{q[1]}<small>{q[2]}</small></b></div>)}</div></div>
      <div className="c-w">
        <div className="c-mv" style={{ marginTop: 40 }}><div className="c-lb">Mission</div><div><h3>쇼핑을 더 쉽고 즐겁게,<br />커머스 생태계를 더 건강하게</h3><p>바로담의 고객은 구매자와 판매자 모두입니다.</p><p>구매자에게는 필요한 것을 빠르고 즐겁게 찾는 경험을, 판매자에게는 정당한 성장의 기회를 드립니다.</p><p>우리는 모두가 함께 웃는 커머스 생태계를 만들어 갑니다.</p></div></div>
        <div className="c-mv"><div className="c-lb">Vision</div><div><h3>필요한 모든 것이<br />하루 안에 닿는 플랫폼</h3><p>바로담의 거래에는 한계가 없습니다.</p><p>시간과 공간, 온라인과 오프라인을 넘나들며 지금까지 없던 쇼핑 경험을 만들어 갑니다.</p><p>필요한 것을, 바로 담다. 그 기준을 바로담이 새로 씁니다.</p></div></div>
        <section className="c-sec">
          <span style={{ color: 'var(--accent)', fontWeight: 900 }}>Way of Working</span>
          <h2 className="c-h2" style={{ marginTop: 8 }}>일하는 방식을 소개합니다</h2>
          <div className="c-wow">{WAYS.map((w, i) => <div key={w[1]}><span className="c-n c-num">0{i + 1}</span><b>{w[0]}</b><span>{w[1]}</span></div>)}</div>
          <div className="c-deck"><div><h3>바로담 Culture Deck을 소개합니다</h3><p>미션, 비전, 일하는 방식 등 바로담의 문화를 담았습니다.</p></div><button className="c-btn" onClick={openDeck}>Culture Deck 1.0 보기 →</button></div>
        </section>
        <JoinSection />
      </div>
    </>
  );
}

function Faq() {
  usePageTitle('자주 묻는 질문', SUFFIX);
  const ui = useUI();
  const ask = () => {
    void ui.open({
      title: '1:1 문의하기',
      render: (close) => <RecruitInquiry onDone={() => { close(true); ui.toast('문의를 남겼어요. 영업일 기준 1~2일 안에 답변드릴게요'); }} onCancel={() => close(false)} />,
    });
  };
  return (
    <div className="c-w">
      <h1 className="c-h1">자주 묻는 질문</h1>
      <p className="c-lead">궁금한 내용은 먼저 '자주 묻는 질문'에서 확인해 보세요.<br />원하는 답이 없다면 '1:1 문의하기'로 남겨 주시면 담당자가 빠르게 답변드릴게요.</p>
      <div className="c-ph"><img src={img('faq')} alt="노트북으로 일하는 손" /></div>
      <div className="c-fq">{CAREER_FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><div className="c-a">{a}</div></details>)}</div>
      <div className="c-ask"><div><b style={{ fontSize: 20 }}>원하는 답을 찾지 못하셨나요?</b><div style={{ color: 'var(--muted)' }}>평일 09:00~18:00에 순서대로 답변드려요.</div></div><button className="c-btn" onClick={ask}>1:1 문의하기</button></div>
    </div>
  );
}

function RecruitInquiry({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: '', email: '', type: '채용 절차', body: '' });
  const [err, setErr] = useState<string | null>(null);
  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault();
      if (v.name.trim().length < 2 || !EMAIL_RE.test(v.email.trim()) || v.body.trim().length < 10) return setErr('이름, 이메일, 10자 이상의 내용을 입력해 주세요.');
      careersService.inquire({ name: v.name.trim(), email: v.email.trim(), type: v.type, body: v.body.trim() });
      onDone();
    }}>
      <h3>1:1 문의하기</h3>
      <p>답변은 입력한 이메일로 보내 드려요.</p>
      <label className="fld"><span>이름</span><input className="inp" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></label>
      <label className="fld"><span>이메일</span><input className="inp" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></label>
      <label className="fld"><span>문의 유형</span><select className="inp" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>{['채용 절차', '지원서 수정·취소', '면접 일정', '기타'].map((t) => <option key={t}>{t}</option>)}</select></label>
      <label className="fld"><span>내용</span><textarea className="inp" maxLength={2000} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></label>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="ctas"><button type="button" className="btn" onClick={onCancel}>취소</button><button className="btn primary">문의 남기기</button></div>
    </form>
  );
}

function StoryPage() {
  const { i = '0' } = useParams();
  const k = Number(i);
  const s = STORIES[k];
  usePageTitle(s?.title ?? '구성원 이야기', SUFFIX);
  if (!s) return <Home />;
  return (
    <>
      <article className="c-art">
        <Link className="c-back" to="/careers">← 목록으로</Link>
        <div style={{ marginTop: 20 }}><span className="c-tag">{s.tag}</span></div>
        <h1>{s.title}</h1>
        <div className="c-by">{s.by}</div>
        <img src={img(s.img)} alt="" />
        {s.body.map(([kind, t], n) => (kind === 'h' ? <h3 key={n}>{t}</h3> : kind === 'q' ? <blockquote key={n}>"{t}"</blockquote> : <p key={n}>{t}</p>))}
      </article>
      <div className="c-w">
        <section className="c-sec"><h2 className="c-h2">다른 이야기</h2><div className="c-stg">{STORIES.map((_, n) => n).filter((n) => n !== k).slice(0, 3).map((n) => <StoryCard key={n} i={n} />)}</div></section>
        <JoinSection />
      </div>
    </>
  );
}

function Privacy() {
  usePageTitle('채용 개인정보 처리방침', SUFFIX);
  return (
    <article className="c-art">
      <h1>채용 개인정보 처리방침</h1>
      <p>(주)바로담(이하 "회사")은 입사 지원자의 개인정보를 소중히 다루며, 「개인정보 보호법」에 따라 다음과 같이 처리합니다.</p>
      <h3>1. 수집 항목</h3><p>필수: 이름, 이메일, 연락처, 지원경로, 이력서, 유관 경력 기간, 보훈·장애 여부(민감정보)<br />선택: 포트폴리오, 개인/업무 URL, 지원동기</p>
      <h3>2. 이용 목적</h3><p>지원자 본인 확인, 채용 전형 진행과 결과 안내, 관련 법에 따른 우대 적용</p>
      <h3>3. 보유 및 이용 기간</h3><p>지원서 제출일부터 3년 동안 보관한 뒤 파기합니다. 지원자가 삭제를 요청하면 5일 이내에 삭제합니다.</p>
      <h3>4. 제3자 제공</h3><p>회사는 지원자의 개인정보를 외부에 제공하지 않습니다.</p>
      <h3>5. 지원자의 권리</h3><p>지원자는 언제든 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. [지원 현황 조회]에서 지원을 취소하거나 recruit@barodam.kro.kr 로 요청해 주세요.</p>
      <h3>6. 개인정보 보호책임자</h3><p>People팀 채용 담당 · recruit@barodam.kro.kr</p>
      <p style={{ color: 'var(--muted)' }}>시행일: 2026년 11월 1일</p>
    </article>
  );
}
