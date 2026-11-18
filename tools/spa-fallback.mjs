// Post-build step for GitHub Pages.
// 1) 404.html = app shell, so unknown paths still load the React app.
// 2) A real index.html for every known route (products, categories, help, careers …) so those
//    URLs return 200 and carry their own <title> and Open Graph tags — shared links show the
//    product photo and name in messengers and search results.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://barodam.kro.kr';
if (!existsSync(`${DIST}/index.html`)) throw new Error('dist/index.html not found — run vite build first');
const shell = readFileSync(`${DIST}/index.html`, 'utf8');
copyFileSync(`${DIST}/index.html`, `${DIST}/404.html`);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
function page(path, { title, desc, image }) {
  let html = shell
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(desc)}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(desc)}`);
  if (image) html = html.replace(/(<meta property="og:image" content=")[^"]*/, `$1${SITE}${image}`);
  html = html.replace('</head>', `    <link rel="canonical" href="${SITE}${path}" />\n  </head>`);
  const file = join(DIST, path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

const photos = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
const idOf = (f) => { const m = /(p|x)(\d+)\.jpg$/.exec(f); return m ? (m[1] === 'x' ? 1000 : 0) + Number(m[2]) : 0; };
let n = 0;
for (const it of photos.items) {
  const id = idOf(it.f);
  if (!id) continue;
  page(`/products/${id}`, { title: `${it.name} | 바로담 마켓`, desc: `${it.brand} ${it.name} — 바로담 마켓에서 내일 도착, 판매처별 가격 비교까지.`, image: `/img/${it.f}` });
  n++;
}

const shop = (t) => `${t} | 바로담 마켓`;
const CATS = { fashion: '패션의류', shoes: '신발', bag: '가방·잡화', digital: '디지털', living: '리빙·주방', beauty: '뷰티', food: '식품', all: '전체' };
for (const [id, name] of Object.entries(CATS)) page(`/category/${id}`, { title: shop(name), desc: `바로담 마켓 ${name} — 오늘의 특가와 인기 상품` });
const STATIC = {
  '/search': '검색', '/ranking': '바로담 랭킹', '/brands': '브랜드', '/login': '로그인', '/signup': '회원가입', '/find/id': '아이디 찾기', '/find/pw': '비밀번호 재설정',
  '/checkout': '주문서', '/checkout/guest': '비회원 주문서', '/mypage': '마이페이지',
};
for (const [p, t] of Object.entries(STATIC)) page(p, { title: shop(t), desc: '바로담 마켓 - 오늘만 특가, 실시간 랭킹, 내일 도착까지.' });
for (const tab of ['orders', 'cancel', 'wish', 'recent', 'coupons', 'points', 'reviews', 'qna', 'addrs', 'profile']) page(`/mypage/${tab}`, { title: shop('마이페이지'), desc: '바로담 마켓 마이페이지' });
for (const k of ['about', 'careers', 'terms', 'privacy', 'youth', 'ads', 'a11y', 'seller', 'sellercenter', 'adcenter', 'sellerguide', 'bizinfo', 'efin', 'dispute', 'openmarket', 'ethics', 'cyber', 'rights', 'copyright', 'content']) {
  page(`/info/${k}`, { title: shop('안내'), desc: '(주)바로담 안내' });
}

const help = (t) => (t ? `${t} | 바로담 고객센터` : '바로담 고객센터');
page('/help', { title: help(''), desc: '바로담이 도와드릴게요! 자주 묻는 질문, 공지사항, 1:1 문의' });
for (const c of ['member', 'coupon', 'order', 'ship', 'return', 'point', 'product', 'safe']) page(`/help/faq/${c}`, { title: help('자주 묻는 질문'), desc: '바로담 고객센터 자주 묻는 질문' });
page('/help/search', { title: help('검색'), desc: '바로담 고객센터 검색' });
page('/help/notice', { title: help('공지사항'), desc: '바로담 공지사항' });
for (let i = 0; i < 6; i++) page(`/help/notice/${i}`, { title: help('공지사항'), desc: '바로담 공지사항' });

const careers = (t) => (t ? `${t} - 바로담 인재영입` : '바로담 인재영입 - 바로담 채용 사이트');
const careersImg = '/img/careers/hero.jpg';
page('/careers', { title: careers(''), desc: '필요한 모든 것을 바로 담는 커머스, 바로담과 함께할 동료를 찾습니다.', image: careersImg });
for (const [p, t] of Object.entries({ jobs: '채용공고', culture: '바로담 DNA', faq: '자주 묻는 질문', status: '지원 현황 조회', privacy: '채용 개인정보 처리방침' })) {
  page(`/careers/${p}`, { title: careers(t), desc: '바로담 채용 사이트', image: careersImg });
}
const careersSrc = readFileSync('src/data/careers.ts', 'utf8');
for (const m of careersSrc.matchAll(/\{id:'([a-z0-9]+)'.*?title:'([^']+)'/g)) {
  page(`/careers/jobs/${m[1]}`, { title: careers(m[2]), desc: `${m[2]} — 바로담 채용`, image: careersImg });
  page(`/careers/apply/${m[1]}`, { title: careers('지원서 작성'), desc: `${m[2]} 지원`, image: careersImg });
}
for (let i = 0; i < 6; i++) page(`/careers/stories/${i}`, { title: careers('구성원 이야기'), desc: '바로담 구성원이 들려주는 이야기', image: careersImg });

console.log(`spa-fallback: 404.html + ${n} product pages + static routes written`);
