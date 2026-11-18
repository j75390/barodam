import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { NOTICES } from '@/data/help';
import { useUser } from '@/state/backendContext';

const ext = { target: '_blank', rel: 'noopener' } as const;

/** Site footer modeled on large Korean marketplaces: notice line, promo band, policy links, company and legal info. */
export function Footer() {
  const user = useUser();
  const [sellerOpen, setSellerOpen] = useState(false);
  const [awardOpen, setAwardOpen] = useState(false);
  const selRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !selRef.current?.contains(e.target as Node) && setSellerOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);
  const [date, tag, title] = NOTICES[0];
  return (
    <>
      <div className="fnotice">
        <div className="wrap">
          <b>알립니다</b>
          <span className="arw">›</span>
          <a href="/help/notice/0" {...ext}>[{tag}] {title}</a>
          <span className="fdate num">{date.replace(/\./g, '-')}</span>
        </div>
      </div>
      <footer className="sitefoot">
        <div className="fpromo">
          <div className="wrap">
            <span className="deco" aria-hidden="true">B</span>
            <span className="deco d2" aria-hidden="true">D</span>
            <p>바로담의 첫 구매 혜택, <b>15% 할인 쿠폰</b>을 받아 가세요.</p>
            <Link className="fbtn" to={user ? '/mypage/coupons' : '/signup'}>{user ? '↓ 내 쿠폰 보기' : '↓ 쿠폰 받기'}</Link>
          </div>
        </div>
        <div className="wrap">
          <div className="flinks2">
            <nav>
              <Link to="/info/about">(주)바로담 소개</Link>
              <a href="/careers" {...ext}>채용정보</a>
              <Link to="/info/terms">이용약관</Link>
              <Link to="/info/privacy"><b>개인정보처리방침</b></Link>
              <Link to="/info/youth">청소년보호정책</Link>
              <Link to="/info/ads">광고안내</Link>
              <Link to="/info/a11y">스크린리더 매뉴얼</Link>
            </nav>
            <div className="fsel" ref={selRef}>
              <button aria-expanded={sellerOpen} onClick={() => setSellerOpen((o) => !o)}>판매자서비스 <i>⌄</i></button>
              {sellerOpen && (
                <div className="fselp">
                  <Link to="/info/seller">입점 안내</Link>
                  <Link to="/info/sellercenter">판매자 센터</Link>
                  <Link to="/info/adcenter">광고 센터</Link>
                  <Link to="/info/sellerguide">판매 가이드</Link>
                </div>
              )}
            </div>
          </div>
          <div className="fcorp">
            <div>
              <b className="ft">상호명 및 호스팅 서비스 제공 : (주)바로담</b>
              <div>서울특별시 바로구 담길 12, 바로담타워 4층</div>
              <div>사업자등록번호 : 000-00-00000 | 통신판매업신고 : 제2026-서울바로-0000호 <Link className="fchip" to="/info/bizinfo">사업자정보확인 ›</Link></div>
              <div>대표이사 : 홍길동</div>
            </div>
            <div>
              <a className="ft" href="/help" {...ext}>고객센터 ›</a>
              <div>서울특별시 바로구 담길 12, 바로담타워 2층</div>
              <div>Tel : <a className="tel" href="/help" {...ext}>0000-0000(유료)</a> | 등급회원 전용 Tel : <a className="tel" href="/help" {...ext}>0000-0002(유료)</a></div>
              <div>Fax : 00-000-0000 | Mail : help@barodam.kro.kr</div>
            </div>
          </div>
          <div className="flegal">
            <div>
              <Link to="/info/efin">전자금융분쟁처리 ›</Link>
              <span>Tel : 0000-0000 | Fax : 00-000-0001 | Mail : efin@barodam.kro.kr</span>
              <Link to="/info/dispute">전자상거래법상의 소비자분쟁해결기준 ›</Link>
            </div>
            <div>
              <Link to="/info/openmarket">오픈마켓 자율준수규약 ›</Link>
              <Link to="/info/ethics">윤리경영 ›</Link>
              <Link to="/info/cyber">사이버범죄 신고시스템 ›</Link>
              <Link to="/info/rights">권리보호 프로그램 ›</Link>
              <a href="/help/faq/safe" {...ext}>안전거래센터 ›</a>
              <Link to="/info/copyright">저작권침해신고 ›</Link>
            </div>
          </div>
          <div className="fdisc">
            <p>
              (주)바로담은 통신판매중개자이며 통신판매의 당사자가 아닙니다. 따라서 (주)바로담은 상품·거래 정보 및 가격에 대하여 책임을 지지 않습니다.
              <br />본 사이트의 모든 정보, 콘텐츠, UI 등에 대한 무단 복제, 전송, 배포, 스크래핑 등의 행위는 엄격히 금지됩니다. <Link to="/info/content">콘텐츠산업 진흥법에 따른 표시</Link>
            </p>
            <p>Copyright BARODAM Corp. All rights reserved. · 개인 포트폴리오 프로젝트로 제작된 사이트이며 실제 상품 판매·결제는 이루어지지 않습니다.</p>
            <div className="faward">
              <span className="kola">KOSA</span>
              <span>한국온라인쇼핑협회(예시)</span>
              <button aria-expanded={awardOpen} onClick={() => setAwardOpen((o) => !o)}>수상·인증 내역 <i>{awardOpen ? '⌄' : '⌃'}</i></button>
            </div>
            {awardOpen && (
              <ul className="fawardl">
                <li>2026 소비자 선정 쇼핑 서비스 대상 (예시)</li>
                <li>정보보호 관리체계 인증 ISMS-P (예시)</li>
                <li>웹 접근성 품질인증 (예시)</li>
                <li>전자상거래 소비자보호 우수 기업 (예시)</li>
              </ul>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
