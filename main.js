/* ============================================================
   에듀비즈온 뉴스 EduBizON News | main.js v3.3 — 2026-06-26
   ★ Cloudflare Pages 배포 환경 API 절대경로 대응
   ★ api.edubizonnews.co.kr 서브도메인 프록시 사용 (CORS 해결)
============================================================ */

/* ──────────────────────────────────────────────────────────
   0-A. API Base URL 환경 감지
   - Genspark 미리보기(axivywwx.gensparkspace.com, genspark.ai)  → 상대경로
   - Cloudflare Pages (edubizonnews.pages.dev, edubizonnews.co.kr) → 절대경로
   ★ 외부 배포 시: api.edubizonnews.co.kr (AAAA 100:: + Workers Route 방식)
────────────────────────────────────────────────────────── */
const _GENSPARK_API_BASE = (function() {
  const h = location.hostname;
  // Genspark 환경이면 상대경로 그대로 (Genspark가 직접 처리)
  if (h.includes('gensparkspace.com') || h.includes('genspark.ai') || h === 'localhost' || h === '127.0.0.1') {
    console.log('[ENV] Genspark 환경 감지 → 상대경로 API');
    return '';
  }
  // Cloudflare Pages (edubizonnews.co.kr 또는 edubizonnews.pages.dev)
  // → api.edubizonnews.co.kr Worker 프록시 경유
  console.log('[ENV] 외부 배포 환경 감지 (' + h + ') → api.edubizonnews.co.kr 프록시');
  return 'https://api.edubizonnews.co.kr/';
})();

/* API URL 헬퍼 — 어디서든 apiUrl('tables/articles?limit=10') 으로 호출 */
function apiUrl(path) {
  return _GENSPARK_API_BASE + path;
}

/* ── 즉시 API 연결 테스트 (배포 환경 디버그용) ── */
(async function _apiTest() {
  try {
    const r = await fetch(apiUrl('tables/articles?limit=1'));
    const d = await r.json();
    console.log('[API TEST] status:', r.status, '| total:', d.total, '| url:', r.url);
    if (!r.ok || !d.total) {
      console.error('[API TEST] ❌ 기사 데이터 없음 — status:', r.status);
    } else {
      console.log('[API TEST] ✅ API 정상 —', d.total, '건');
    }
  } catch(e) {
    console.error('[API TEST] ❌ fetch 실패:', e.message, e.name);
  }
})();

/* ─────────────────────────────
   0. 상수 / 유틸 색상맵
───────────────────────────── */
const CAT_COLOR = {
  '기업탐방'       : '#1a2d4a',
  'CEO인터뷰'      : '#b8860b',
  '정책자금'       : '#1a6b3c',
  '노인복지'       : '#0d6e8a',
  '인생기록'       : '#5b3f8a',
  '시민기자'       : '#cc1f1f',
  '일반기사'       : '#555555',
  '공지사항'       : '#cc1f1f',
  '약사건강칼럼'   : '#27ae60',
  '평생교육'       : '#c0522a',
  '지역사회서비스' : '#1565a8',
  '교육칼럼'       : '#7b3fa0',
};
const CAT_LABEL = {
  '기업탐방':'기업탐방', 'CEO인터뷰':'CEO인터뷰', '정책자금':'정부지원사업',
  '노인복지':'노인복지', '인생기록':'인생기록', '시민기자':'시민기자',
  '일반기사':'일반기사', '공지사항':'공지사항',
  '약사건강칼럼':'약사건강칼럼', '평생교육':'평생교육', '지역사회서비스':'지역사회서비스', '교육칼럼':'교육칼럼',
};
function catLabel(cat) { return CAT_LABEL[normalizeCategory(cat)] || cat || '기사'; }

/* 카테고리 정규화: 잘못 저장된 값도 올바른 카테고리로 매핑 */
function normalizeCategory(cat) {
  if (!cat) return '일반기사';
  if (CAT_COLOR[cat]) return cat; // 이미 올바른 값
  const c = cat.replace(/\s/g, '');
  if (c.includes('정책') || c.includes('자금') || c.includes('지원')) return '정책자금';
  if (c.includes('노인') || c.includes('복지') || c.includes('실버')) return '노인복지';
  if (c.includes('시민') || c.includes('기자')) return '시민기자';
  if (c.includes('인생') || c.includes('기록')) return '인생기록';
  if (c.includes('CEO') || c.includes('인터뷰')) return 'CEO인터뷰';
  if (c.includes('기업') || c.includes('탐방')) return '기업탐방';
  if (c.includes('공지')) return '공지사항';
  if (c.includes('약사') || c.includes('건강칼럼')) return '약사건강칼럼';
  if (c.includes('평생교육') || c.includes('평생학습')) return '평생교육';
  if (c.includes('지역사회') || c.includes('사회서비스')) return '지역사회서비스';
  if (c.includes('교육칼럼') || c.includes('교육컬럼')) return '교육칼럼';
  return '일반기사';
}
function catColor(cat) { return CAT_COLOR[normalizeCategory(cat)] || '#cc1f1f'; }

/* ── NEW 배지 유틸: 등록일 기준 3일 이내면 true ── */
function isNew(dateVal) {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d)) return false;
  return (Date.now() - d.getTime()) < 3 * 24 * 60 * 60 * 1000; // 72시간
}
function newBadge() {
  return '<span class="new-badge">NEW</span>';
}
function newRibbon() {
  return '<span class="new-ribbon">NEW</span>';
}

/* ─────────────────────────────
   1. 날짜 표시
───────────────────────────── */
(function setDate() {
  const days = ['일','월','화','수','목','금','토'];
  const d = new Date();
  const str = `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
  const els = ['top-date','header-date'];
  els.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = str; });
})();

/* ─────────────────────────────
   1-1. 스크롤 프로그레스 바
───────────────────────────── */
(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

/* ─────────────────────────────
   2. SPA 상태
───────────────────────────── */
let currentPage = '홈';
let prevPage    = '홈';
let allArticles = [];
window._allCourses = [];
window._allBooks   = [];
const loadedPages  = new Set();

/* ─────────────────────────────
   3. 내비게이션
───────────────────────────── */
function navigate(page) {
  hideArticleDetail();
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) {
    target.classList.add('active');
    prevPage    = currentPage;
    currentPage = page;
  }
  // nav 링크 active 처리
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  window.scrollTo({ top: 0, behavior: 'instant' });
  loadPageData(page);
  closeMobileMenu();
  return false;
}

/* ─────────────────────────────
   4. 페이지별 데이터 로드
───────────────────────────── */
async function loadPageData(page) {
  switch (page) {
    case '전체뉴스':
      if (!loadedPages.has('전체뉴스')) {
        loadedPages.add('전체뉴스');
        loadCategoryGrid(null, 'page-allnews-grid');
        loadSidebarRank('sidebar-popular-allnews');
      }
      break;

    case '일반기사':
      if (!loadedPages.has('일반기사')) {
        loadedPages.add('일반기사');
        loadCategoryGrid('일반기사', 'page-general-grid');
        loadSidebarRank('sidebar-popular-general', '일반기사');
      }
      break;

    case '공지사항':
      if (!loadedPages.has('공지사항')) {
        loadedPages.add('공지사항');
        loadCategoryGrid('공지사항', 'page-notice-grid');
      }
      break;

    case '홈':
      if (!loadedPages.has('home')) {
        loadedPages.add('home');
        try {
          // ① 기사 관련 — 우선 병렬 로드 (사용자가 바로 보는 것들)
          await Promise.all([
            loadHomeMain(),                              // 헤드라인 배너 + 4열 최신
            loadHomeListSection('인생기록', 'home-life-list', 4),
            loadSidebarPopular(),                        // 실시간 인기뉴스
            loadSidebarPharm(),                          // 사이드 약사칼럼
          ]);
        } catch(e) {
          console.warn('홈 기사 로드 실패:', e.message);
          const titleEl = document.getElementById('hlb-title');
          if (titleEl && titleEl.textContent.includes('불러오는 중')) {
            titleEl.textContent = '뉴스를 불러올 수 없습니다. 새로고침 해주세요.';
          }
        }
        // ② 강좌/도서/정책 — 비블로킹 (느려도 기사 표시에 영향 없음)
        Promise.all([
          loadHomePolicyGuide(),
          loadHomeCourses(),
          loadHomeBooks(),
          loadSidebarCourses(),
        ]).catch(e => console.warn('홈 부가 콘텐츠 로드 실패:', e.message));
      }
      break;

    case '기업탐방':
      if (!loadedPages.has('기업탐방')) {
        loadedPages.add('기업탐방');
        loadCategoryGrid('기업탐방', 'page-company-grid');
        loadSidebarRank('sidebar-popular-company');
      }
      break;
    case 'CEO인터뷰':
      if (!loadedPages.has('CEO인터뷰')) {
        loadedPages.add('CEO인터뷰');
        loadCategoryGrid('CEO인터뷰', 'page-ceo-grid');
      }
      break;
    case '정책자금':
      if (!loadedPages.has('정책자금')) {
        loadedPages.add('정책자금');
        loadPolicyGuidePage();        // 정책브리핑 기업활용 기사
        loadCategoryGrid('정책자금', 'page-policy-grid');
      }
      break;
    case '노인복지':
      if (!loadedPages.has('노인복지')) {
        loadedPages.add('노인복지');
        loadCategoryGrid('노인복지', 'page-welfare-grid');
      }
      break;
    case '인생기록뉴스':
      if (!loadedPages.has('인생기록뉴스')) {
        loadedPages.add('인생기록뉴스');
        loadCategoryGrid('인생기록', 'page-liferec-grid');
      }
      break;

    case '공간대여':
      /* 전용 섹션으로 바로 이동 — 별도 로드 불필요 */
      break;

    case '평생교육원':
      if (!loadedPages.has('평생교육원')) {
        loadedPages.add('평생교육원');
        loadAllCourses('courses-grid-edu');
      }
      break;
    case '독서토론':
      if (!loadedPages.has('독서토론')) { loadedPages.add('독서토론'); loadCoursesByCategory('독서토론','courses-reading'); }
      break;
    case '글쓰기':
      if (!loadedPages.has('글쓰기'))   { loadedPages.add('글쓰기');   loadCoursesByCategory('글쓰기','courses-writing'); }
      break;
    case '시창작':
      if (!loadedPages.has('시창작'))   { loadedPages.add('시창작');   loadCoursesByCategory('시창작','courses-poetry'); }
      break;
    case '인생에세이':
      if (!loadedPages.has('인생에세이')) { loadedPages.add('인생에세이'); loadCoursesByCategory('인생에세이','courses-essay'); }
      break;
    case '자서전쓰기':
      if (!loadedPages.has('자서전쓰기')) { loadedPages.add('자서전쓰기'); loadCoursesByCategory('자서전쓰기','courses-memoir'); }
      break;

    case '출판도서':
      if (!loadedPages.has('출판도서')) { loadedPages.add('출판도서'); loadAllBooks('books-grid-pub'); }
      break;

    case '약사건강칼럼':
      if (!loadedPages.has('약사건강칼럼')) {
        loadedPages.add('약사건강칼럼');
        loadPharmPage();
        loadSidebarPharmPopular('sidebar-pharm-popular');
      }
      break;

    case '평생교육':
      if (!loadedPages.has('평생교육')) {
        loadedPages.add('평생교육');
        loadCategoryGrid('평생교육', 'page-edu-grid');
        loadSidebarRank('sidebar-popular-edu', '평생교육');
      }
      break;

    case '교육칼럼':
      if (!loadedPages.has('교육칼럼')) {
        loadedPages.add('교육칼럼');
        loadCategoryGrid('교육칼럼', 'page-educolumn-grid');
        loadSidebarRank('sidebar-popular-educolumn', '교육칼럼');
      }
      break;

    case '지역사회서비스':
      if (!loadedPages.has('지역사회서비스')) {
        loadedPages.add('지역사회서비스');
        loadCategoryGrid('지역사회서비스', 'page-local-grid');
        loadSidebarRank('sidebar-popular-local', '지역사회서비스');
      }
      break;

    case '인사말':
    case '협찬안내':
      /* 정적 페이지 — 별도 데이터 로드 불필요 */
      break;
  }
}

/* ─────────────────────────────
   5. API 헬퍼
───────────────────────────── */

async function apiFetch(url, timeoutMs = 15000) {
  const fullUrl = apiUrl(url);
  for (let attempt = 1; attempt <= 2; attempt++) { // 최대 2회 시도
    try {
      const ctrl  = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      const res   = await fetch(fullUrl, { signal: ctrl.signal, cache: 'no-cache' });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (e.name === 'AbortError') console.warn(`API 타임아웃(${attempt}차):`, fullUrl);
      else console.warn(`API Error(${attempt}차):`, fullUrl, e.message);
      if (attempt === 2) return null;
      await new Promise(r => setTimeout(r, 1000)); // 1초 후 재시도
    }
  }
  return null;
}

/* 전체 기사 캐시 로드 — published_at 내림차순 정렬 */
async function ensureArticlesCache() {
  if (allArticles.length) return; // 이미 캐시됨
  if (ensureArticlesCache._loading) {
    // 이미 로드 중이면 완료될 때까지 대기
    await ensureArticlesCache._loading;
    return;
  }

  let resolve;
  ensureArticlesCache._loading = new Promise(r => { resolve = r; });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

    const res = await fetch(apiUrl('tables/articles?limit=200'), {
      signal: controller.signal,
      cache: 'no-cache'
    });
    clearTimeout(timer);

    if (res.ok) {
      const d = await res.json();
      const rows = (d && Array.isArray(d.data)) ? d.data : [];
      if (rows.length) {
        allArticles = rows.sort((a, b) => {
          const ta = a.published_at ? new Date(a.published_at).getTime()
                   : a.created_at  ? new Date(a.created_at).getTime() : 0;
          const tb = b.published_at ? new Date(b.published_at).getTime()
                   : b.created_at  ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
      }
    } else {
      console.warn('articles API 응답 오류:', res.status);
    }
  } catch(e) {
    console.warn('기사 로드 실패:', e.name === 'AbortError' ? '타임아웃(15s)' : e.message);
    // 실패 시 limit=50으로 재시도
    if (!allArticles.length) {
      try {
        const r2 = await fetch(apiUrl('tables/articles?limit=50'), { cache: 'no-cache' });
        if (r2.ok) {
          const d2 = await r2.json();
          const rows2 = (d2 && Array.isArray(d2.data)) ? d2.data : [];
          if (rows2.length) {
            allArticles = rows2.sort((a, b) => {
              const ta = a.published_at ? new Date(a.published_at).getTime() : (a.created_at || 0);
              const tb = b.published_at ? new Date(b.published_at).getTime() : (b.created_at || 0);
              return tb - ta;
            });
            console.log('[재시도] 기사 로드 성공:', allArticles.length, '건');
          }
        }
      } catch(e2) { console.warn('[재시도] 실패:', e2.message); }
    }
  } finally {
    ensureArticlesCache._loading = null;
    resolve && resolve();
  }
}

/* ─────────────────────────────
   6. 홈 — 헤드라인 배너 (korea.kr 스타일)
───────────────────────────── */
let _hlbArticles = [];
let _hlbIdx = 0;
let _hlbTimer = null;

async function loadHomeMain() {
  await ensureArticlesCache();
  // 헤드라인 배너 — 최근 90일 이내 기사 우선, 없으면 전체 최신순
  const _hlbCutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  _hlbArticles = allArticles.filter(a => {
    const t = a.published_at ? new Date(a.published_at).getTime()
            : a.created_at  ? new Date(a.created_at).getTime() : 0;
    return t >= _hlbCutoff;
  }).slice(0, 8);
  if (!_hlbArticles.length) _hlbArticles = allArticles.slice(0, 8);

  // 기사 없을 때 로딩 중 텍스트 제거
  if (!_hlbArticles.length) {
    const titleEl = document.getElementById('hlb-title');
    if (titleEl) titleEl.textContent = '등록된 기사가 없습니다.';
    const gridEl = document.getElementById('home-4col-grid');
    if (gridEl) gridEl.innerHTML = emptyState('📰', '아직 등록된 기사가 없습니다');
    return;
  }

  _buildHlbSlides();
  _hlbSetActive(0);
  _hlbStartAuto();

  /* 4열 최신뉴스 그리드 — 최근 90일 이내 기사 우선, 없으면 전체 최신순 */
  const gridEl = document.getElementById('home-4col-grid');
  if (gridEl) {
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000; // 90일 전
    let latestItems = allArticles.filter(a => {
      const t = a.published_at ? new Date(a.published_at).getTime()
              : a.created_at  ? new Date(a.created_at).getTime() : 0;
      return t >= cutoff;
    }).slice(0, 8);
    // 최근 90일 기사가 없으면 전체 최신순 fallback
    if (!latestItems.length) latestItems = allArticles.slice(0, 8);
    gridEl.innerHTML = latestItems.length
      ? latestItems.map(a => createKrCard(a)).join('')
      : emptyState('📰', '최신 기사가 없습니다');
  }

  /* 비즈니스 탭 초기 로드 (기업탐방) */
  loadHomeBizTab('기업탐방');

  /* 복지·건강 탭 초기 로드 (노인복지) */
  loadHomeWelfareTab('노인복지');
}

function _buildHlbSlides() {
  const track = document.getElementById('hlb-slide-track');
  const dots  = document.getElementById('hlb-dots');
  if (!track || !dots) return;

  track.innerHTML = _hlbArticles.map((a, i) => {
    const color = catColor(a.category);
    const bgStyle = a.image_url
      ? `background:url('${a.image_url}') center/cover no-repeat`
      : `background:linear-gradient(135deg,${color}dd,${color}66)`;
    return `
      <div class="hlb-slide" onclick="openArticleDetail('${a.id}')">
        <div class="hlb-slide-bg" style="${bgStyle}">
          ${!a.image_url ? `<span style="font-size:5rem;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:.5;">${catEmoji(a.category)}</span>` : ''}
        </div>
        <div class="hlb-slide-overlay"></div>
        <div class="hlb-slide-info">
          <span class="hlb-slide-cat" style="background:${color};">${escHtml(a.category||'기사')}</span>
          <div class="hlb-slide-title">${escHtml(a.title)}</div>
        </div>
      </div>`;
  }).join('');

  dots.innerHTML = _hlbArticles.map((_, i) =>
    `<span class="hlb-dot${i===0?' active':''}" onclick="hlbGoTo(${i})"></span>`
  ).join('');
}

function _hlbSetActive(idx) {
  _hlbIdx = idx;
  const a = _hlbArticles[idx];
  if (!a) return;

  /* 좌측 텍스트 업데이트 */
  const titleEl = document.getElementById('hlb-title');
  const summaryEl = document.getElementById('hlb-summary');
  const metaEl = document.getElementById('hlb-meta');
  const btnEl  = document.getElementById('hlb-read-btn');
  if (titleEl) { titleEl.textContent = a.title; titleEl.onclick = () => openArticleDetail(a.id); }
  if (summaryEl) summaryEl.textContent = a.summary || '';
  if (metaEl) metaEl.innerHTML = `<span><i class="fa fa-user-circle"></i> ${escHtml(a.author||'편집부')}</span><span><i class="fa fa-clock"></i> ${fmtDate(a.published_at)}</span>`;
  if (btnEl) { btnEl.onclick = () => openArticleDetail(a.id); }

  /* 슬라이드 트랙 이동 */
  const track = document.getElementById('hlb-slide-track');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;

  /* 도트 업데이트 */
  document.querySelectorAll('.hlb-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function hlbSlide(dir) {
  const next = (_hlbIdx + dir + _hlbArticles.length) % _hlbArticles.length;
  _hlbSetActive(next);
  _hlbRestartAuto();
}
function hlbGoTo(idx) {
  _hlbSetActive(idx);
  _hlbRestartAuto();
}
function _hlbStartAuto() {
  _hlbTimer = setInterval(() => hlbSlide(1), 5000);
}
function _hlbRestartAuto() {
  clearInterval(_hlbTimer);
  _hlbStartAuto();
}

/* ─────────────────────────────
   7. 홈 — 섹션별 탭 로더
───────────────────────────── */
const BIZ_NAV = { '기업탐방': '기업탐방', 'CEO인터뷰': 'CEO인터뷰', '정책자금': '정책자금' };
const WELFARE_NAV = { '노인복지': '노인복지', '약사건강칼럼': '약사건강칼럼', '지역사회서비스': '지역사회서비스' };

async function loadHomeBizTab(category) {
  const el = document.getElementById('home-biz-grid');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="grid-column:1/-1"></div>';
  await ensureArticlesCache();
  const items = allArticles.filter(a => normalizeCategory(a.category) === category).slice(0, 3);
  el.innerHTML = items.length ? items.map(a => createKrCard(a)).join('') : emptyState('📰', `${category} 기사가 없습니다`);
  const moreLink = document.getElementById('biz-more-link');
  if (moreLink) moreLink.onclick = (e) => { e.preventDefault(); navigate(BIZ_NAV[category] || '기업탐방'); };
}

function switchBizTab(btn, category) {
  document.querySelectorAll('#biz-tabs .kr-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadHomeBizTab(category);
}

async function loadHomeWelfareTab(category) {
  const el = document.getElementById('home-welfare-grid');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="grid-column:1/-1"></div>';
  await ensureArticlesCache();
  const items = allArticles.filter(a => normalizeCategory(a.category) === category).slice(0, 3);
  el.innerHTML = items.length ? items.map(a => createKrCard(a)).join('') : emptyState('📰', `${category} 기사가 없습니다`);
  const moreLink = document.getElementById('welfare-more-link');
  if (moreLink) moreLink.onclick = (e) => { e.preventDefault(); navigate(WELFARE_NAV[category] || '노인복지'); };
}

function switchWelfareTab(btn, category) {
  document.querySelectorAll('#welfare-tabs .kr-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadHomeWelfareTab(category);
}

/* ─────────────────────────────
   8. 홈 — 강좌/도서
───────────────────────────── */
async function loadHomeCourses() {
  const el = document.getElementById('home-courses-grid');
  if (!el) return;
  await loadApplyCounts();
  const d = await apiFetch('tables/courses?limit=4');
  if (!d || !d.data || !d.data.length) { el.innerHTML = emptyState('📚','등록된 강좌가 없습니다'); return; }
  window._allCourses = d.data;
  el.innerHTML = d.data.map(createCourseCard).join('');
}

async function loadHomeBooks() {
  const el = document.getElementById('home-books-grid');
  if (!el) return;
  const d = await apiFetch('tables/books?limit=4');
  if (!d || !d.data || !d.data.length) { el.innerHTML = emptyState('📖','등록된 도서가 없습니다'); return; }
  window._allBooks = d.data;
  el.innerHTML = d.data.map((b, i) => createBookCard(b, i)).join('');
}

/* ─────────────────────────────
   7-2. 홈 / 정책자금 페이지 — 정책브리핑 기업활용 로더
───────────────────────────── */
async function loadHomePolicyGuide() {
  const el = document.getElementById('home-policy-guide-grid');
  if (!el) return;
  try {
    const res  = await fetch(apiUrl('tables/policy_articles?limit=4&page=1'));
    const json = await res.json();
    const items = (json.data || []).filter(a => a.status === 'published').slice(0, 4);
    if (!items.length) { el.innerHTML = emptyState('📄', '정책기사가 없습니다'); return; }
    el.innerHTML = items.map(a => createPolicyCard(a)).join('');
  } catch(e) { el.innerHTML = emptyState('📄', '데이터를 불러올 수 없습니다'); }
}

async function loadPolicyGuidePage() {
  const el = document.getElementById('page-policy-guide-list');
  if (!el) return;
  el.innerHTML = '<div class="spinner" style="grid-column:1/-1"></div>';
  try {
    const res  = await fetch(apiUrl('tables/policy_articles?limit=8&page=1'));
    const json = await res.json();
    const items = (json.data || []).filter(a => a.status === 'published');
    if (!items.length) { el.innerHTML = emptyState('📄', '정책기사가 없습니다'); return; }
    el.innerHTML = items.map(a => createPolicyCard(a)).join('');
  } catch(e) { el.innerHTML = emptyState('📄', '데이터를 불러올 수 없습니다'); }
}

/* 정책브리핑 기업활용 카드 */
function createPolicyCard(a) {
  const CAT_COL = {
    '정부지원금':'#0a1628','인증·인정':'#b8860b','고용·노무':'#0d6e8a',
    'R&D·기술':'#5b3f8a','수출·무역':'#0d5c3a','창업·벤처':'#c0392b',
    '세제·금융':'#1352a2','환경·탄소':'#166534',
  };
  const col = CAT_COL[a.category] || '#1352a2';
  const dlDiff = a.deadline && a.deadline !== '상시 접수'
    ? Math.ceil((new Date(a.deadline) - new Date()) / 86400000) : null;
  const ddTag = dlDiff !== null && dlDiff >= 0 && dlDiff <= 14
    ? `<span style="background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:1px 6px;border-radius:2px;margin-left:4px;">D-${dlDiff}</span>` : '';
  return `
    <article class="kr-card" onclick="window.location='policy.html'" style="border-top:3px solid ${col};">
      <div style="background:${col};padding:9px 12px;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:10px;color:rgba(255,255,255,.8);font-weight:700;display:flex;align-items:center;gap:5px;">
          <i class="fa fa-university" style="color:rgba(255,255,255,.6);"></i>
          ${escHtml(a.press_release_source||'정책브리핑')}
          ${a.is_hot?'<span style="background:#c8960c;font-size:9px;padding:1px 5px;border-radius:2px;">HOT</span>':''}
        </span>
        <span style="font-size:10px;color:rgba(255,255,255,.45);">${escHtml(a.press_release_date||a.published_at||'')}</span>
      </div>
      <div class="kr-card-body">
        <div style="display:flex;gap:5px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="background:${col};color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:2px;">${escHtml(a.category||'정책')}</span>
        </div>
        <h4 class="kr-card-title">${escHtml(a.title)}</h4>
        <p class="kr-card-summary">${escHtml(a.summary||'')}</p>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin:6px 0;border-top:1px solid #f3f4f6;padding-top:6px;">
          <span style="font-size:10px;color:#1352a2;background:#eff6ff;border:1px solid #bfdbfe;padding:2px 7px;border-radius:2px;font-weight:600;">📄 보도자료 인용</span>
          <span style="font-size:10px;color:#047857;background:#ecfdf5;border:1px solid #6ee7b7;padding:2px 7px;border-radius:2px;font-weight:600;">✍️ 기사화</span>
          <span style="font-size:10px;color:#92400e;background:#fffbeb;border:1px solid #fbbf24;padding:2px 7px;border-radius:2px;font-weight:600;">🏢 기업적용</span>
        </div>
        <div class="kr-card-meta">
          <span style="color:#0d5c3a;font-weight:700;font-size:11px;">${escHtml(a.support_amount||'')} ${ddTag}</span>
          <span>${a.deadline?escHtml(a.deadline):''}</span>
        </div>
      </div>
    </article>`;
}

/* 이전 버전 호환용 (다른 섹션에서 호출할 수 있어 남겨둠) */
async function loadHomeListSection(category, containerId, limit = 4, asGrid = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  await ensureArticlesCache();
  const items = allArticles.filter(a => normalizeCategory(a.category) === category).slice(0, limit);
  if (!items.length) { el.innerHTML = emptyState('📰', `${category} 기사가 없습니다`); return; }
  if (asGrid) {
    el.innerHTML = items.map(a => createKrCard(a)).join('');
  } else {
    el.innerHTML = items.map(a => createKrListItem(a)).join('');
  }
}

/* ─────────────────────────────
   9. 사이드바 위젯 (kr-* 클래스)
───────────────────────────── */
async function loadSidebarPopular() {
  await loadSidebarRank('sidebar-popular');
}

async function loadSidebarRank(containerId, category = null) {
  const el = document.getElementById(containerId);
  if (!el) return;
  await ensureArticlesCache();
  const filtered = category ? allArticles.filter(a => normalizeCategory(a.category) === category) : allArticles;
  const sorted = [...filtered]
    .sort((a, b) => (Number(b.views)||0) - (Number(a.views)||0))
    .slice(0, 6);
  if (!sorted.length) { el.innerHTML = emptyState('📰','기사가 없습니다'); return; }
  el.innerHTML = sorted.map((a, i) => `
    <div class="kr-rank-item" onclick="openArticleDetail('${a.id}')">
      <span class="kr-rank-num ${i < 3 ? 'top-3' : ''}">${i+1}</span>
      <div class="kr-rank-info">
        <div class="kr-rank-title">${escHtml(a.title)}</div>
        <div class="kr-rank-meta">${escHtml(a.category||'기사')} · <i class="fa fa-eye"></i> ${(Number(a.views)||0).toLocaleString()}</div>
      </div>
    </div>`).join('');
}

async function loadSidebarCourses() {
  const el = document.getElementById('sidebar-courses');
  if (!el) return;
  if (!window._allCourses.length) {
    const d = await apiFetch('tables/courses?limit=20');
    if (d && d.data) window._allCourses = d.data;
  }
  const courses = window._allCourses.slice(0, 4);
  if (!courses.length) { el.innerHTML = emptyState('📚','강좌가 없습니다'); return; }
  const COURSE_COLOR = { '독서토론':'#1a2d4a','글쓰기':'#b8860b','시창작':'#cc1f1f','인생에세이':'#1a6b3c','자서전쓰기':'#5b3f8a' };
  el.innerHTML = courses.map(c => {
    const col = COURSE_COLOR[c.category] || '#1a2d4a';
    return `
      <div class="kr-side-course-item" onclick="navigate('평생교육원')">
        <span class="kr-side-course-tag" style="background:${col};">${escHtml(c.category||'강좌')}</span>
        <div class="kr-side-course-title">${escHtml(c.title)}</div>
        <div class="kr-side-course-meta">${c.instructor?escHtml(c.instructor):''}</div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────
   10. 기사 카드 렌더러
───────────────────────────── */

/* korea.kr 스타일 카드 (4열/3열 그리드용) */
function createKrCard(article) {
  const color = catColor(article.category);
  const date  = fmtDate(article.published_at);
  const _new  = isNew(article.published_at);
  const thumbStyle = article.image_url
    ? `background:url('${article.image_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${color}bb,${color}44)`;
  return `
    <article class="kr-card" onclick="openArticleDetail('${article.id}')">
      <div class="kr-card-thumb" style="${thumbStyle}">
        ${article.image_url ? '' : `<span style="font-size:1.8rem;">${catEmoji(article.category)}</span>`}
        ${_new ? newRibbon() : ''}
      </div>
      <div class="kr-card-body">
        <span class="kr-card-cat" style="color:${color};">${catLabel(article.category)}</span>
        <h4 class="kr-card-title">${escHtml(article.title)}${_new ? newBadge() : ''}</h4>
        <p class="kr-card-summary">${escHtml(article.summary||'')}</p>
        <div class="kr-card-meta">
          <span><i class="fa fa-user-circle"></i> ${escHtml(article.author||'편집부')}</span>
          <span>${date}</span>
        </div>
      </div>
    </article>`;
}

/* korea.kr 스타일 리스트 아이템 (인생기록 등 리스트형) */
function createKrListItem(article) {
  const color = catColor(article.category);
  const date  = fmtDate(article.published_at);
  const _new  = isNew(article.published_at);
  const thumbStyle = article.image_url
    ? `background:url('${article.image_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${color}cc,${color}55)`;
  return `
    <div class="kr-list-item" onclick="openArticleDetail('${article.id}')">
      <div class="kr-list-thumb" style="${thumbStyle}" style="position:relative;">
        ${article.image_url ? '' : `<span>${catEmoji(article.category)}</span>`}
        ${_new ? newRibbon() : ''}
      </div>
      <div class="kr-list-info">
        <span class="kr-list-cat" style="color:${color};">${catLabel(article.category)}</span>
        <div class="kr-list-title">${escHtml(article.title)}${_new ? newBadge() : ''}</div>
        <div class="kr-list-meta">${escHtml(article.author||'편집부')} · ${date}</div>
      </div>
    </div>`;
}

/* 구형 카드 (기업탐방 홈 섹션 등) — 하위 호환 */
function createArtCard(article) {
  const color = catColor(article.category);
  const date  = fmtDate(article.published_at);
  const thumbStyle = article.image_url
    ? `background:url('${article.image_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${color}bb,${color}66)`;
  return `
    <article class="art-card" onclick="openArticleDetail('${article.id}')">
      <div class="art-card-thumb" style="${thumbStyle}">
        <span style="font-size:2rem;">${article.image_url ? '' : catEmoji(article.category)}</span>
      </div>
      <div class="art-card-body">
        <span class="art-card-cat" style="color:${color};">${catLabel(article.category)}</span>
        <h4 class="art-card-title">${escHtml(article.title)}</h4>
        <p class="art-card-summary">${escHtml(article.summary||'')}</p>
        <div class="art-card-meta">
          <span><i class="fa fa-user-circle"></i> ${escHtml(article.author||'편집부')}</span>
          <span>${date}</span>
        </div>
      </div>
    </article>`;
}

/* 리스트 아이템 (정책자금, CEO인터뷰 등 좁은 섹션) */
function createArtListItem(article) {
  const color = catColor(article.category);
  const date  = fmtDate(article.published_at);
  const thumbStyle = article.image_url
    ? `background:url('${article.image_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${color}cc,${color}55)`;
  return `
    <div class="art-list-item" onclick="openArticleDetail('${article.id}')">
      <div class="ali-thumb" style="${thumbStyle}">
        <span>${article.image_url ? '' : catEmoji(article.category)}</span>
      </div>
      <div class="ali-body">
        <span class="ali-cat" style="color:${color};">${catLabel(article.category)}</span>
        <div class="ali-title">${escHtml(article.title)}</div>
        <div class="ali-meta">${escHtml(article.author||'편집부')} · ${date}</div>
      </div>
    </div>`;
}

/* 페이지 그리드 카드 (기업탐방/CEO/정책자금 페이지) */
function createPageArtCard(article) {
  const color = catColor(article.category);
  const date  = fmtDate(article.published_at);
  const views = (Number(article.views)||0).toLocaleString();
  const _new  = isNew(article.published_at);
  const thumbStyle = article.image_url
    ? `background:url('${article.image_url}') center/cover no-repeat`
    : `background:linear-gradient(135deg,${color}bb,${color}44)`;
  return `
    <article class="art-card" onclick="openArticleDetail('${article.id}')">
      <div class="art-card-thumb" style="${thumbStyle}">
        <span style="font-size:2.2rem;">${article.image_url ? '' : catEmoji(article.category)}</span>
        ${_new ? newRibbon() : ''}
      </div>
      <div class="art-card-body">
        <span class="art-card-cat" style="color:${color};">${catLabel(article.category)}</span>
        <h4 class="art-card-title">${escHtml(article.title)}${_new ? newBadge() : ''}</h4>
        <p class="art-card-summary">${escHtml(article.summary||'')}</p>
        <div class="art-card-meta">
          <span><i class="fa fa-user-circle"></i> ${escHtml(article.author||'편집부')}</span>
          <span><i class="fa fa-eye"></i> ${views}</span>
          <span>${date}</span>
        </div>
      </div>
    </article>`;
}

/* ─────────────────────────────
   11. 카테고리별 기사 페이지 로드
───────────────────────────── */
async function loadCategoryGrid(category, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="spinner" style="grid-column:1/-1"></div>`;
  await ensureArticlesCache();
  // category가 null이면 전체 기사 — published_at 내림차순 정렬
  const items = (category ? allArticles.filter(a => normalizeCategory(a.category) === category) : [...allArticles])
    .sort((a, b) => {
      const ta = a.published_at ? new Date(a.published_at).getTime() : (a.created_at || 0);
      const tb = b.published_at ? new Date(b.published_at).getTime() : (b.created_at || 0);
      return tb - ta;
    });
  if (!items.length) { el.innerHTML = emptyState('📰', `${category || '전체'} 기사가 없습니다`); return; }
  el.innerHTML = items.map(a => createPageArtCard(a)).join('');
}

/* ─────────────────────────────
   12. 강좌 렌더링
───────────────────────────── */
const COURSE_CAT_COLOR = {
  '독서토론':'#1a2d4a', '글쓰기':'#b8860b', '시창작':'#cc1f1f',
  '인생에세이':'#1a6b3c', '자서전쓰기':'#5b3f8a'
};

/* 강좌별 신청 건수 캐시 */
window._applyCounts = {};

async function loadApplyCounts() {
  if (window._applyCountsLoaded) return; // 이미 로드됨
  try {
    let all = [], page = 1;
    while (page <= 5) { // 최대 5페이지 (500건) 제한 — 무한루프 방지
      const res  = await fetch(apiUrl('tables/applications?limit=100&page=' + page));
      if (!res.ok) break;
      const json = await res.json();
      const rows = json.data || [];
      all = all.concat(rows);
      if (all.length >= (json.total || 0) || rows.length === 0) break;
      page++;
    }
    window._applyCounts = {};
    all.filter(a => a.type === '수강신청' && a.course_name)
       .forEach(a => {
         const key = a.course_name.trim();
         window._applyCounts[key] = (window._applyCounts[key] || 0) + 1;
       });
    window._applyCountsLoaded = true;
  } catch(e) { window._applyCounts = {}; }
}

function createCourseCard(course) {
  const col   = COURSE_CAT_COLOR[course.category] || '#1a2d4a';
  const fee   = course.fee ? Number(course.fee).toLocaleString() + '원' : '문의';
  const count = window._applyCounts[course.title] || 0;
  const max   = course.max_students ? Number(course.max_students) : 0;
  const pct   = (max > 0 && count > 0) ? Math.min(Math.round(count / max * 100), 100) : 0;
  const barColor = pct >= 90 ? '#e53935' : pct >= 60 ? '#f59e0b' : '#1a7a4a';
  const countBadge = `
    <div style="margin:10px 0 6px;">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#666;margin-bottom:4px;">
        <span><i class="fa fa-user-check" style="color:${barColor};margin-right:3px;"></i>신청 <strong style="color:${barColor};font-size:13px;">${count}</strong>명${max > 0 ? ` / 정원 ${max}명` : ''}</span>
        ${pct >= 90 ? '<span style="color:#e53935;font-weight:700;font-size:11px;">🔥 마감임박</span>' : ''}
      </div>
      ${max > 0 ? `<div style="background:#eee;border-radius:4px;height:5px;"><div style="background:${barColor};width:${pct}%;height:5px;border-radius:4px;transition:width .4s;"></div></div>` : ''}
    </div>`;
  return `
    <div class="course-card" style="border-top:3px solid ${col};">
      <span class="course-cat-tag" style="background:${col};">${escHtml(course.category||'강좌')}</span>
      <h3 class="course-title">${escHtml(course.title)}</h3>
      <p class="course-desc">${escHtml(course.description||'')}</p>
      <div class="course-info">
        ${course.instructor ? `<div class="ci-row"><i class="fa fa-user"></i>${escHtml(course.instructor)}</div>` : ''}
        ${course.schedule   ? `<div class="ci-row"><i class="fa fa-clock"></i>${escHtml(course.schedule)}</div>` : ''}
        ${course.duration   ? `<div class="ci-row"><i class="fa fa-calendar"></i>${escHtml(course.duration)}</div>` : ''}
      </div>
      ${countBadge}
      <div class="course-fee">${fee}<span> / 강좌</span></div>
      <button class="btn-apply" onclick="openApplyModal('${escHtml(course.title).replace(/'/g,"\\'")}','${course.id}')">
        <i class="fa fa-check-circle"></i> 수강신청
      </button>
    </div>`;
}

async function loadAllCourses(gridId) {
  const el = document.getElementById(gridId);
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  await loadApplyCounts();
  const d = await apiFetch('tables/courses?limit=50');
  if (!d || !d.data || !d.data.length) { el.innerHTML = emptyState('📚','등록된 강좌가 없습니다'); return; }
  window._allCourses = d.data;
  el.innerHTML = d.data.map(createCourseCard).join('');
}

async function loadCoursesByCategory(category, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  if (!window._allCourses.length) {
    await loadApplyCounts();
    const d = await apiFetch('tables/courses?limit=50');
    if (d && d.data) window._allCourses = d.data;
  }
  const filtered = window._allCourses.filter(c => c.category === category);
  if (!filtered.length) { el.innerHTML = emptyState('📚', `${category} 강좌가 없습니다`); return; }
  el.innerHTML = filtered.map(createCourseCard).join('');
}

function filterCourses(category, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('courses-grid-edu');
  if (!el || !window._allCourses.length) return;
  const filtered = category === '전체' ? window._allCourses : window._allCourses.filter(c => c.category === category);
  el.innerHTML = filtered.length ? filtered.map(createCourseCard).join('') : emptyState('📚', `${category} 강좌가 없습니다`);
}

/* ─────────────────────────────
   13. 도서 렌더링
───────────────────────────── */
const BOOK_GRADS = [
  'linear-gradient(160deg,#1a3a5c,#0a2040)',
  'linear-gradient(160deg,#2d5a27,#1a3a18)',
  'linear-gradient(160deg,#5a2d1a,#3a1a0a)',
  'linear-gradient(160deg,#2d1b4e,#1a0a30)',
  'linear-gradient(160deg,#1a4a3a,#0a2a22)',
];

function createBookCard(book, i) {
  const grad  = BOOK_GRADS[i % BOOK_GRADS.length];
  const price = book.price ? Number(book.price).toLocaleString() + '원' : '문의';
  const cat   = book.category || '';
  return `
    <div class="book-card">
      <div class="book-cover" style="background:${grad};">
        <div class="book-spine"></div>
        ${cat ? `<div class="book-cat-pill">${escHtml(cat)}</div>` : ''}
        <div class="book-cover-title">${escHtml(book.title)}</div>
        <div class="book-cover-author">${escHtml(book.author||'')}</div>
      </div>
      <div class="book-info">
        <h3 class="book-title">${escHtml(book.title)}</h3>
        <p class="book-author"><i class="fa fa-pen-nib"></i> ${escHtml(book.author||'')}</p>
        <p class="book-desc">${escHtml(book.description||'')}</p>
        <div class="book-meta">
          <span class="book-price">${price}</span>
          <span class="book-date">${book.published_date||''}</span>
        </div>
      </div>
    </div>`;
}

async function loadAllBooks(gridId) {
  const el = document.getElementById(gridId);
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  const d = await apiFetch('tables/books?limit=50');
  if (!d || !d.data || !d.data.length) { el.innerHTML = emptyState('📖','등록된 도서가 없습니다'); return; }
  window._allBooks = d.data;
  el.innerHTML = d.data.map((b, i) => createBookCard(b, i)).join('');
}

function filterBooks(category, btn) {
  document.querySelectorAll('.book-filter-tabs .tab-btn, #page-출판도서 .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById('books-grid-pub');
  if (!el || !window._allBooks.length) return;
  const filtered = category === '전체'
    ? window._allBooks
    : window._allBooks.filter(b => (b.category||'').replace(/\s/g,'') === category.replace(/\s/g,''));
  el.innerHTML = filtered.length ? filtered.map((b, i) => createBookCard(b, i)).join('') : emptyState('📖', `${category} 도서가 없습니다`);
}

/* ─────────────────────────────
   14. 기사 상세페이지 (v3 ID 매핑)
───────────────────────────── */
async function openArticleDetail(articleId) {
  // SPA 섹션 숨기기
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));

  const detPage = document.getElementById('article-detail-page');
  if (!detPage) return;
  detPage.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'instant' });

  // 뒤로가기 버튼
  const backBtn = document.getElementById('det-back-btn');
  if (backBtn) {
    backBtn.onclick = () => {
      hideArticleDetail();
      navigate(currentPage !== '검색' ? currentPage : prevPage);
    };
  }

  // 로딩 초기화
  const _det = (id, val, prop = 'textContent') => {
    const el = document.getElementById(id);
    if (el) el[prop] = val;
  };
  _det('det-title', '불러오는 중...');
  _det('det-author', '');
  _det('det-date', '');
  _det('det-views', '');
  _det('det-cat', '기사');
  _det('det-body', '', 'innerHTML');
  _det('det-tags', '', 'innerHTML');
  _det('det-related', '', 'innerHTML');
  _det('det-thumb', '', 'innerHTML');

  // 데이터 로드 — allArticles 캐시에서 먼저 찾고, 없으면 API 직접 호출
  await ensureArticlesCache();
  let article = allArticles.find(a => a.id === articleId);
  if (!article) article = await apiFetch(`tables/articles/${articleId}`);
  if (!article) {
    _det('det-title', '기사를 불러올 수 없습니다.');
    return;
  }

  // 카테고리
  const catEl = document.getElementById('det-cat');
  if (catEl) {
    catEl.textContent = catLabel(article.category);
    catEl.style.background = catColor(article.category);
  }

  // 기본 정보
  _det('det-title', article.title || '');
  _det('det-author', article.author || '편집부');
  _det('det-date', fmtDate(article.published_at));
  _det('det-views', (Number(article.views)||0).toLocaleString());

  // 썸네일
  const thumbEl = document.getElementById('det-thumb');
  if (thumbEl) {
    const col = catColor(article.category);
    if (article.image_url) {
      thumbEl.style.background = `url('${article.image_url}') center/cover no-repeat`;
      thumbEl.innerHTML = '';
    } else {
      thumbEl.style.background = `linear-gradient(135deg, ${col}cc, ${col}55)`;
      thumbEl.innerHTML = `<span style="font-size:4rem;">${catEmoji(article.category)}</span>`;
    }
  }

  // 본문 — content가 HTML이면 바로 innerHTML, 아니면 단락 분리
  const bodyEl = document.getElementById('det-body');
  if (bodyEl) {
    if (article.content) {
      const raw = String(article.content).trim();
      // HTML 태그가 포함돼 있으면 그대로 렌더링
      if (/<[a-z][\s\S]*>/i.test(raw)) {
        bodyEl.innerHTML = raw;
      } else {
        // 순수 텍스트: 줄바꿈 기준으로 단락 분리
        const paras = raw.split(/\n+/).filter(p => p.trim());
        bodyEl.innerHTML = paras.length
          ? paras.map(p => `<p>${escHtml(p)}</p>`).join('')
          : `<p>${escHtml(raw)}</p>`;
      }
    } else {
      bodyEl.innerHTML = `
        <p>${escHtml(article.summary||'')}</p>
        <p>이 기사의 상세 내용은 준비 중입니다. 취재 담당 기자에게 문의해주세요.</p>`;
    }
  }

  // 태그
  const tagsEl = document.getElementById('det-tags');
  if (tagsEl && article.tags) {
    const tags = String(article.tags).split(',').map(t => t.trim()).filter(Boolean);
    tagsEl.innerHTML = tags.map(t => `<span class="art-tag">#${escHtml(t)}</span>`).join('');
  }

  // 관련기사 사이드바 인기 기사
  loadRelatedArticles(article.category, articleId);
  loadSidebarRank('sidebar-popular-det');
}

function hideArticleDetail() {
  const el = document.getElementById('article-detail-page');
  if (el) el.style.display = 'none';
}

async function loadRelatedArticles(category, excludeId) {
  const el = document.getElementById('det-related');
  if (!el) return;
  await ensureArticlesCache();
  const related = allArticles.filter(a => normalizeCategory(a.category) === category && a.id !== excludeId).slice(0, 3);
  if (!related.length) {
    el.innerHTML = '<p style="color:#999;font-size:0.85rem;padding:10px 0;">관련 기사가 없습니다.</p>';
    return;
  }
  el.innerHTML = related.map(a => {
    const col  = catColor(a.category);
    const date = fmtDate(a.published_at);
    return `
      <div class="related-item" onclick="openArticleDetail('${a.id}')">
        <div class="related-thumb" style="background:linear-gradient(135deg,${col}bb,${col}44);">
          <span>${catEmoji(a.category)}</span>
        </div>
        <div class="related-info">
          <div class="related-cat" style="color:${col};">${escHtml(a.category||'기사')}</div>
          <div class="related-title">${escHtml(a.title)}</div>
          <div class="related-date">${escHtml(a.author||'편집부')} · ${date}</div>
        </div>
      </div>`;
  }).join('');
}

/* ─────────────────────────────
   15. 공유 기능
───────────────────────────── */
function copyUrl() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다!', 'success'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('링크가 복사되었습니다!', 'success');
  }
}

/* 기사 상세에서 제목+URL 함께 복사 */
function copyArticleLink(btn) {
  const title = document.getElementById('det-title')?.textContent?.trim() || '에듀비즈온 뉴스';
  const url   = window.location.href;
  const text  = `${title}\n${url}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('링크가 복사되었습니다! 카카오톡·SNS에 붙여넣기 하세요.', 'success');
      if (btn) { btn.innerHTML = '<i class="fa fa-check"></i> 복사됨'; setTimeout(() => { btn.innerHTML = '<i class="fa fa-link"></i> 링크 복사'; }, 2000); }
    });
  } else {
    copyUrl();
  }
}

/* X(트위터) 공유 */
function shareToX() {
  const title = document.getElementById('det-title')?.textContent?.trim() || '에듀비즈온 뉴스';
  const url   = encodeURIComponent(window.location.href);
  const text  = encodeURIComponent(`${title} — 에듀비즈온 뉴스`);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
}

function shareKakao() {
  // 카카오 SDK 미적용 — 링크+제목 복사로 대체
  copyArticleLink(null);
  showToast('📋 링크 복사 완료! 카카오톡에 붙여넣기 하세요.', 'success');
}

/* ─────────────────────────────
   16. 검색
───────────────────────────── */
function doSearch(event) {
  if (event && event.preventDefault) event.preventDefault();
  const inp = document.getElementById('header-search-input');
  const q   = inp ? inp.value.trim() : '';
  if (!q) return false;
  _execSearch(q);
  return false;
}

function doMainSearch() {
  const inp = document.getElementById('search-main-input');
  const q   = inp ? inp.value.trim() : '';
  if (!q) return;
  _execSearch(q);
}

function doMobSearch() {
  const inp = document.getElementById('mob-search-input');
  const q   = inp ? inp.value.trim() : '';
  if (!q) return;
  closeMobileMenu();
  _execSearch(q);
}

async function _execSearch(query) {
  navigate('검색');
  const mainInp = document.getElementById('search-main-input');
  if (mainInp) mainInp.value = query;

  const countEl = document.getElementById('search-result-heading');
  const listEl  = document.getElementById('search-results-list');
  if (countEl) countEl.textContent = '검색 중...';
  if (listEl)  listEl.innerHTML = '<div class="spinner"></div>';

  await ensureArticlesCache();
  const q = query.toLowerCase();
  const results = allArticles.filter(a =>
    (a.title   && a.title.toLowerCase().includes(q)) ||
    (a.summary && a.summary.toLowerCase().includes(q)) ||
    (a.content && a.content.toLowerCase().includes(q)) ||
    (a.author  && a.author.toLowerCase().includes(q)) ||
    (a.tags    && a.tags.toLowerCase().includes(q))
  );

  if (countEl) countEl.textContent = `"${query}" 검색결과 ${results.length}건`;

  if (!listEl) return;
  if (!results.length) {
    listEl.innerHTML = `<div class="empty-state"><i class="fa fa-search" style="font-size:2rem;opacity:.3;display:block;margin-bottom:10px;"></i><p>"${escHtml(query)}"에 대한 기사가 없습니다.</p></div>`;
    return;
  }
  listEl.innerHTML = results.map(a => {
    const col   = catColor(a.category);
    const date  = fmtDate(a.published_at);
    const title = highlightKeyword(escHtml(a.title), escHtml(query));
    const summ  = highlightKeyword(escHtml(a.summary||''), escHtml(query));
    return `
      <div class="search-result-item" onclick="openArticleDetail('${a.id}')">
        <div class="sri-thumb" style="background:linear-gradient(135deg,${col}cc,${col}55);">
          <span>${catEmoji(a.category)}</span>
        </div>
        <div class="sri-body">
          <span class="sri-cat" style="color:${col};">${escHtml(a.category||'기사')}</span>
          <div class="sri-title">${title}</div>
          <div class="sri-summ">${summ}</div>
          <div class="sri-meta">${escHtml(a.author||'편집부')} · ${date}</div>
        </div>
      </div>`;
  }).join('');
}

function highlightKeyword(text, query) {
  if (!query) return text;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}

/* ─────────────────────────────
   17. 폼 처리
───────────────────────────── */

/* 공통 폼 제출 핸들러 */
async function submitFormGeneric(event, type) {
  event.preventDefault();
  const form = event.target;
  const btn  = form.querySelector('.btn-submit');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 처리 중...'; btn.disabled = true; }

  const fd = new FormData(form);
  const payload = { status: '접수' };

  const SUCCESS_IDS = {
    reporter : 'reporter-success',
    report   : 'report-success',
    sponsor  : 'sponsor-success',
    ad       : 'ad-success',
    lr       : 'lr-success',
  };

  switch (type) {
    case 'reporter':
      payload.type    = '시민기자';
      payload.name    = fd.get('name');
      payload.phone   = fd.get('phone');
      payload.email   = fd.get('email');
      payload.message = `[분야: ${fd.get('field')||'-'}]\n${fd.get('message')||''}`;
      break;
    case 'report':
      payload.type    = '기사제보';
      payload.name    = fd.get('name') || '익명';
      payload.phone   = fd.get('phone');
      payload.message = `[제목: ${fd.get('title')||'-'}]\n${fd.get('message')||''}`;
      break;
    case 'sponsor':
      payload.type    = '후원문의';
      payload.name    = fd.get('name');
      payload.phone   = fd.get('phone');
      payload.email   = fd.get('email');
      payload.message = `[등급: ${fd.get('tier')||'-'}]\n${fd.get('message')||''}`;
      break;
    case 'ad':
      payload.type    = '광고문의';
      payload.name    = fd.get('name');
      payload.phone   = fd.get('phone');
      payload.email   = fd.get('email');
      payload.company = fd.get('company');
      payload.message = `[광고유형: ${fd.get('ad_type')||'-'}]\n${fd.get('message')||''}`;
      break;
    case 'lr':
      payload.type    = '인생기록상담';
      payload.name    = fd.get('name');
      payload.phone   = fd.get('phone');
      payload.message = `[출판형태: ${fd.get('pub_type')||'-'}]\n${fd.get('message')||''}`;
      break;
  }

  try {
    const res = await fetch(apiUrl('tables/applications'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    form.style.display = 'none';
    const sid = SUCCESS_IDS[type];
    const sel = document.getElementById(sid);
    if (sel) sel.style.display = 'block';
    showToast('신청이 완료되었습니다! 감사합니다.', 'success');
  } catch {
    showToast('처리 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

/* 기업 상담 신청 */
async function submitEntForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn  = form.querySelector('.btn-submit');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 처리 중...'; btn.disabled = true; }

  const fd = new FormData(form);
  const payload = {
    type   : '기업문의',
    status : '접수',
    name   : fd.get('name'),
    phone  : fd.get('phone'),
    email  : fd.get('email'),
    company: fd.get('company'),
    message: `[분야: ${fd.get('field')||'-'}]\n${fd.get('message')||''}`,
  };
  try {
    const res = await fetch(apiUrl('tables/applications'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    form.style.display = 'none';
    const suc = document.getElementById('ent-success');
    if (suc) suc.style.display = 'block';
    showToast('상담 신청이 완료되었습니다!', 'success');
  } catch {
    showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

/* 기업 카드 클릭 → 분야 자동선택 후 폼 스크롤 */
function focusEntForm(fieldName) {
  const sel = document.getElementById('ent-field-select');
  if (sel) {
    for (const opt of sel.options) {
      if (opt.text.includes(fieldName.replace(/ 상담/g, ''))) { opt.selected = true; break; }
    }
  }
  const wrap = document.getElementById('ent-form-wrap');
  if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* 공간대여 문의 폼 제출 */
async function submitSpaceForm(event) {
  event.preventDefault();
  const form = event.target;
  const btn  = form.querySelector('.btn-submit');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 처리 중...'; btn.disabled = true; }
  const data = {
    type: '공간대여문의',
    name:      form.name.value.trim(),
    phone:     form.phone.value.trim(),
    purpose:   form.purpose.value,
    date:      form.date.value,
    headcount: form.headcount.value,
    message:   form.message.value.trim(),
  };
  try {
    await fetch(apiUrl('tables/contacts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    form.style.display = 'none';
    const suc = document.getElementById('space-success');
    if (suc) suc.style.display = 'block';
    showToast('문의 신청이 완료되었습니다!', 'success');
  } catch {
    showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

/* 수강신청 모달 */
function openApplyModal(courseName, courseId) {
  const titleEl = document.getElementById('modal-course-title');
  const idEl    = document.getElementById('modal-course-id');
  if (titleEl) titleEl.textContent = `수강신청 — ${courseName}`;
  if (idEl)    idEl.value = courseId;
  ['ap-name','ap-phone','ap-email','ap-msg'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const modal = document.getElementById('apply-modal');
  if (modal) modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeApply() {
  const modal = document.getElementById('apply-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function closeApplyOuter(e) {
  if (e.target === e.currentTarget) closeApply();
}

async function submitApply(event) {
  event.preventDefault();
  const btn  = event.target.querySelector('.btn-submit');
  const orig = btn ? btn.innerHTML : '';
  if (btn) { btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> 처리 중...'; btn.disabled = true; }

  const titleEl = document.getElementById('modal-course-title');
  const courseName = titleEl ? titleEl.textContent.replace('수강신청 — ', '') : '';
  const payload = {
    type       : '수강신청',
    status     : '접수',
    name       : document.getElementById('ap-name')?.value || '',
    phone      : document.getElementById('ap-phone')?.value || '',
    email      : document.getElementById('ap-email')?.value || '',
    course_name: courseName,
    message    : document.getElementById('ap-msg')?.value || '',
  };
  try {
    const res = await fetch(apiUrl('tables/applications'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('API Error');
    closeApply();
    showToast(`${courseName} 수강신청이 완료되었습니다!`, 'success');
  } catch {
    showToast('오류가 발생했습니다. 다시 시도해주세요.', 'error');
    if (btn) { btn.innerHTML = orig; btn.disabled = false; }
  }
}

/* ─────────────────────────────
   18. 시민기자단 탭 전환
───────────────────────────── */
function switchRepTab(name, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.rep-sub-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`rep-${name}`);
  if (target) target.classList.add('active');
}

/* ─────────────────────────────
   20. 스크롤 & Back-to-top
───────────────────────────── */
window.addEventListener('scroll', () => {
  const btn = document.getElementById('back-to-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 200);
}, { passive: true });

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function scrollToSponsorForm() {
  document.getElementById('sponsor-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToLRForm() {
  document.getElementById('lr-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─────────────────────────────
   21. 토스트 알림
───────────────────────────── */
let _toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.className = `show ${type}`;
  t.innerHTML = `<span>${type === 'success' ? '✅' : '⚠️'}</span> ${msg}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

/* ─────────────────────────────
   22. 유틸 함수
───────────────────────────── */
function escHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(val) {
  if (!val) return '';
  const d = new Date(val);
  if (!isNaN(d) && String(val).length > 7) {
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }
  return String(val).slice(0, 10);
}

function catEmoji(cat) {
  const map = {
    '기업탐방':'🏢', 'CEO인터뷰':'🎙️', '정책자금':'💰',
    '노인복지':'🤲', '인생기록':'📖', '시민기자':'✍️',
    '일반기사':'📰', '공지사항':'📢', '약사건강칼럼':'💊',
    '평생교육':'🎓', '지역사회서비스':'🏘️', '교육칼럼':'📝',
  };
  return map[normalizeCategory(cat)] || '📰';
}

function emptyState(icon, msg) {
  return `<div class="empty-state" style="grid-column:1/-1;text-align:center;padding:40px 20px;">
    <span style="font-size:2.5rem;display:block;margin-bottom:10px;opacity:.3;">${icon}</span>
    <p style="color:#999;font-size:0.88rem;">${escHtml ? escHtml(msg) : msg}</p>
  </div>`;
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ─────────────────────────────
   22-b. 복지정보 아코디언 토글
   — .wf-accord-item 의 open 클래스 on/off
   — 토글 버튼 아이콘 +/- 전환
   — aria-expanded 접근성 처리
───────────────────────────── */
function toggleWfAccord(id) {
  const item = document.getElementById(id);
  if (!item) return;

  const isOpen   = item.classList.contains('open');
  const btn      = item.querySelector('.wf-accord-head');
  const iconEl   = item.querySelector('.wf-accord-toggle i');

  if (isOpen) {
    // 닫기
    item.classList.remove('open');
    if (btn)    btn.setAttribute('aria-expanded', 'false');
    if (iconEl) { iconEl.classList.remove('fa-minus'); iconEl.classList.add('fa-plus'); }
  } else {
    // 열기
    item.classList.add('open');
    if (btn)    btn.setAttribute('aria-expanded', 'true');
    if (iconEl) { iconEl.classList.remove('fa-plus'); iconEl.classList.add('fa-minus'); }
  }
}

/* ─────────────────────────────
   23. ESC 키 / 이벤트
───────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeApply();
    closeMobileMenu();
    hideArticleDetail();
  }
});

/* ─────────────────────────────
   24. 약사건강칼럼 로더 & 렌더러
───────────────────────────── */

/* 홈 화면 — 약사건강칼럼 미니 리스트 */
async function loadHomePharm() {
  const el = document.getElementById('home-pharm-list');
  if (!el) return;
  await ensureArticlesCache();
  const items = allArticles.filter(a => a.category === '약사건강칼럼').slice(0, 4);
  if (!items.length) { el.innerHTML = emptyState('💊', '등록된 칼럼이 없습니다'); return; }
  el.innerHTML = items.map(a => createPharmCard(a)).join('');
}

/* 사이드바 약사건강칼럼 위젯 */
async function loadSidebarPharm() {
  await loadSidebarPharmPopular('sidebar-pharm');
}

async function loadSidebarPharmPopular(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  await ensureArticlesCache();
  const items = allArticles
    .filter(a => a.category === '약사건강칼럼')
    .sort((a, b) => (Number(b.views)||0) - (Number(a.views)||0))
    .slice(0, 4);
  if (!items.length) { el.innerHTML = emptyState('💊', '칼럼이 없습니다'); return; }
  el.innerHTML = items.map((a, i) => `
    <div class="kr-rank-item" onclick="openArticleDetail('${a.id}')">
      <span class="kr-rank-num ${i < 3 ? 'top-3' : ''}" style="${i < 3 ? 'background:#27ae60;' : ''}">${i+1}</span>
      <div class="kr-rank-info">
        <div class="kr-rank-title">${escHtml(a.title)}</div>
        <div class="kr-rank-meta">약사 ${escHtml(a.author||'')} · <i class="fa fa-eye"></i> ${(Number(a.views)||0).toLocaleString()}</div>
      </div>
    </div>`).join('');
}

/* 약사건강칼럼 전용 페이지 로드 */
let _pharmArticles = [];
let _pharmFilter = '전체';

async function loadPharmPage() {
  const el = document.getElementById('pharm-col-grid');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';
  await ensureArticlesCache();
  _pharmArticles = allArticles.filter(a => a.category === '약사건강칼럼');
  renderPharmGrid(_pharmFilter);
}

function renderPharmGrid(filter) {
  const el = document.getElementById('pharm-col-grid');
  if (!el) return;
  let items = _pharmArticles;
  if (filter && filter !== '전체') {
    // 태그 기반 필터
    const filterMap = {
      '복용법'  : ['복용법','복용','먹는법','복약'],
      '주의사항': ['주의','부작용','상호작용','금기','오남용'],
      '건강상식': ['건강','상식','예방','생활','습관'],
    };
    const keywords = filterMap[filter] || [];
    items = _pharmArticles.filter(a => {
      const target = ((a.tags||'') + (a.title||'') + (a.summary||'')).toLowerCase();
      return keywords.some(kw => target.includes(kw));
    });
  }
  if (!items.length) { el.innerHTML = emptyState('💊', `${filter} 칼럼이 없습니다`); return; }
  el.innerHTML = items.map(a => createPharmCard(a)).join('');
}

function filterPharm(filter, btn) {
  document.querySelectorAll('#page-약사건강칼럼 .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _pharmFilter = filter;
  renderPharmGrid(filter);
}

/* 약사건강칼럼 카드 렌더러 */
function createPharmCard(article) {
  const date  = fmtDate(article.published_at);
  const views = (Number(article.views)||0).toLocaleString();
  // 태그 추출 (최대 3개)
  const tags = article.tags
    ? String(article.tags).split(',').map(t => t.trim()).filter(Boolean).slice(0, 3)
    : [];
  return `
    <article class="pharm-card" onclick="openArticleDetail('${article.id}')">
      <div class="pharm-card-icon">💊</div>
      <div class="pharm-card-body">
        <div class="pharm-card-meta-top">
          <span class="pharm-badge">약사 건강칼럼</span>
          <span class="pharm-author"><i class="fa fa-user-md"></i> ${escHtml(article.author||'편집부')}</span>
        </div>
        <h3 class="pharm-card-title">${escHtml(article.title)}</h3>
        <p class="pharm-card-summary">${escHtml(article.summary||'')}</p>
        <div class="pharm-card-tags">
          ${tags.map(t => `<span class="pharm-tag">#${escHtml(t)}</span>`).join('')}
        </div>
        <div class="pharm-card-foot">
          <span><i class="fa fa-clock"></i> ${date}</span>
          <span><i class="fa fa-eye"></i> ${views}</span>
          <span class="pharm-read-more">칼럼 읽기 →</span>
        </div>
      </div>
    </article>`;
}

/* ─────────────────────────────
   24-a. 날씨 위젯 (부산 북구)
   — Open-Meteo API (CORS 허용, 무료, 키 불필요)
   — 위도 35.197, 경도 128.987 (부산 북구)
───────────────────────────── */
async function loadWeather() {
  const el = document.getElementById('weather-widget');
  if (!el) return;

  const WMO_ICON = {
    0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️',
    45:'🌫️', 48:'🌫️',
    51:'🌦️', 53:'🌦️', 55:'🌧️',
    61:'🌧️', 63:'🌧️', 65:'🌧️',
    71:'🌨️', 73:'🌨️', 75:'❄️',
    80:'🌦️', 81:'🌧️', 82:'⛈️',
    95:'⛈️', 96:'⛈️', 99:'⛈️'
  };
  const WMO_DESC = {
    0:'맑음', 1:'대체로 맑음', 2:'구름 조금', 3:'흐림',
    45:'안개', 48:'짙은 안개',
    51:'이슬비', 53:'이슬비', 55:'강한 이슬비',
    61:'비', 63:'비', 65:'강한 비',
    71:'눈', 73:'눈', 75:'강한 눈',
    80:'소나기', 81:'강한 소나기', 82:'폭우',
    95:'뇌우', 96:'뇌우+우박', 99:'강한 뇌우'
  };

  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=35.197&longitude=128.987' +
      '&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m' +
      '&timezone=Asia%2FSeoul&forecast_days=1';

    const res  = await fetch(url);
    const data = await res.json();
    const cur  = data.current;

    const code  = cur.weathercode ?? 0;
    const temp  = Math.round(cur.temperature_2m ?? 0);
    const wind  = Math.round(cur.windspeed_10m  ?? 0);
    const humi  = Math.round(cur.relativehumidity_2m ?? 0);
    const icon  = WMO_ICON[code]  || '🌤️';
    const desc  = WMO_DESC[code]  || '맑음';

    const iconEl   = document.getElementById('ww-icon');
    const tempEl   = document.getElementById('ww-temp');
    const descEl   = document.getElementById('ww-desc');
    const detailEl = document.getElementById('ww-details');
    const timeEl   = document.getElementById('ww-update-time');

    if (iconEl)   iconEl.textContent  = icon;
    if (tempEl)   tempEl.textContent  = temp;
    if (descEl)   descEl.textContent  = desc;
    if (detailEl) detailEl.innerHTML  =
      `<span><i class="fa fa-wind"></i> ${wind}m/s</span>` +
      `<span><i class="fa fa-tint"></i> ${humi}%</span>`;

    const now = new Date();
    if (timeEl) timeEl.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')} 기준`;

  } catch(e) {
    const descEl = document.getElementById('ww-desc');
    if (descEl) descEl.textContent = '날씨 정보를 가져올 수 없습니다.';
    console.warn('날씨 위젯 오류:', e);
  }
}

/* ─────────────────────────────
   24-b. 속보 티커 동적 로드
   — articles 테이블 최신 기사 15개를 fetch해
     #ticker-scroll 에 삽입 / 2배 복제로 무한 루프
───────────────────────────── */
async function loadNewsTicker() {
  const el = document.getElementById('ticker-scroll');
  if (!el) return;

  try {
    const d = await apiFetch('tables/articles?limit=15&sort=-published_at');
    if (!d || !d.data || !d.data.length) {
      // 데이터 없으면 placeholder 유지
      return;
    }

    const items = d.data;
    // 기사 링크 HTML 생성 (2배 복제 → CSS translateX(-50%) 무한 루프)
    const makeItems = (arr) =>
      arr.map(a => {
        const cat  = normalizeCategory(a.category);
        const emoji = catEmoji(cat);
        const title = escHtml(a.title || '(제목 없음)');
        return `<a href="#" onclick="openArticleDetail('${a.id}');return false;">${emoji} ${title}</a>`;
      }).join('');

    el.innerHTML = makeItems(items) + makeItems(items); // 2배 복제

    // 기사 수에 따라 애니메이션 속도 조절 (기사 1개당 약 3초)
    const duration = Math.max(20, items.length * 3);
    el.style.animationDuration = duration + 's';

    // 애니메이션 재시작 (기존 placeholder 상태에서 리셋)
    el.style.animation = 'none';
    void el.offsetWidth; // reflow 강제
    el.style.animation = `ticker-run ${duration}s linear infinite`;

  } catch (err) {
    console.warn('속보 티커 로드 실패:', err);
  }
}

/* ─────────────────────────────
   25. DOMContentLoaded 초기 실행
───────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // ① 기사 캐시 로드 (최대 8초 대기)
  await ensureArticlesCache();

  // ② 1차 로드 실패 시 3초 후 1회 재시도
  if (!allArticles.length) {
    console.warn('기사 로드 실패 — 3초 후 재시도');
    await new Promise(r => setTimeout(r, 3000));
    await ensureArticlesCache();
  }

  // ③ 그래도 실패 시 fallback UI
  if (!allArticles.length) {
    const titleEl = document.getElementById('hlb-title');
    if (titleEl) titleEl.textContent = '뉴스를 불러올 수 없습니다.';
    const grid4 = document.getElementById('home-4col-grid');
    if (grid4) grid4.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:32px;color:#999;">' +
      '기사를 불러오지 못했습니다. ' +
      '<button onclick="location.reload()" style="margin-left:8px;padding:6px 16px;' +
      'background:#1a2d4a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">' +
      '새로고침</button></div>';
  }

  // ④ 홈 렌더링
  await loadPageData('홈');

  // ⑤ 나머지 병렬 실행 (순서 무관)
  loadTopAdBanner();
  checkNavNew();
  loadNewsTicker();
  loadWeather();
});

/* ─────────────────────────────
   25. 네비게이션 NEW 배지 자동 표시
   — 각 메뉴 카테고리에 72시간(3일) 이내
     새 글이 있으면 배지를 자동 표시
─────────────────────────────── */
async function checkNavNew() {
  const THRESHOLD = 3 * 24 * 60 * 60 * 1000; // 72시간
  const now = Date.now();

  function hasNew(items, dateField) {
    return (items || []).some(item => {
      const d = new Date(item[dateField] || 0);
      return !isNaN(d) && (now - d.getTime()) < THRESHOLD;
    });
  }

  function showBadge(id, color) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = 'NEW';
    if (color) el.style.background = color;
    el.style.display = 'inline-block';
  }

  try {
    // ── articles 테이블 전체 로드 (캐시 재활용) ──
    let articles = allArticles;
    if (!articles.length) {
      const d = await apiFetch('tables/articles?limit=100&sort=-published_at');
      if (d && d.data) { allArticles = d.data; articles = d.data; }
    }

    // 메뉴 ↔ 카테고리 매핑
    const menuCatMap = {
      '전체뉴스'     : null,           // 카테고리 무관 — 전체 기사
      '기업탐방'     : ['기업탐방', 'CEO인터뷰'],
      '기업성장센터' : ['기업탐방', '정책자금'],
      '노인복지'     : ['노인복지', '약사건강칼럼', '지역사회서비스'],
      '평생교육원'   : ['평생교육', '교육칼럼', '독서토론', '글쓰기', '시창작', '인생에세이', '자서전쓰기'],
    };

    Object.entries(menuCatMap).forEach(([menu, cats]) => {
      const filtered = cats === null
        ? articles
        : articles.filter(a => cats.includes(normalizeCategory(a.category)));
      if (hasNew(filtered, 'published_at')) showBadge('nav-new-' + menu);
    });

    // ── essays 테이블 (창작 마당) ──
    const essayData = await apiFetch('tables/essays?limit=20&sort=-submitted_at');
    const approvedEssays = (essayData?.data || []).filter(e => e.status === '승인');
    if (hasNew(approvedEssays, 'submitted_at')) showBadge('nav-new-창작마당', '#c8960c');

    // ── poems 테이블 (창작 마당) ──
    const poemData = await apiFetch('tables/poems?limit=20&sort=-submitted_at');
    const approvedPoems = (poemData?.data || []).filter(p => p.status === '승인');
    if (hasNew(approvedPoems, 'submitted_at')) showBadge('nav-new-창작마당', '#c8960c');

    // ── 지역사회서비스 (ssbn) — articles에서 해당 카테고리 체크 ──
    const localNew = articles.filter(a => normalizeCategory(a.category) === '지역사회서비스');
    if (hasNew(localNew, 'published_at')) showBadge('nav-new-지역사회서비스', '#f47920');

  } catch(e) {
    console.warn('checkNavNew 오류:', e);
  }
}

/* ─────────────────────────────
   25. 상단 광고 리본 배너
───────────────────────────── */
async function loadTopAdBanner() {
  const ribbon = document.getElementById('top-ad-ribbon');
  if (!ribbon) return;
  try {
    const res  = await fetch(apiUrl('tables/ads?limit=20'));
    const json = await res.json();
    const today = new Date().toISOString().slice(0, 10);

    // position=top, is_active=true, 기간 유효한 광고만 필터
    const ads = (json.data || []).filter(ad => {
      if (!ad.is_active) return false;
      if (ad.position !== 'top') return false;
      if (ad.start_date && ad.start_date > today) return false;
      if (ad.end_date   && ad.end_date   < today) return false;
      return true;
    }).sort((a, b) => (Number(a.sort_order)||99) - (Number(b.sort_order)||99));

    if (!ads.length) { ribbon.style.display = 'none'; return; }

    // 여러 광고 시 순환 (현재는 첫 번째 노출)
    const ad = ads[0];
    ribbon.style.display = 'block';

    // 이미지 배너 vs 텍스트 배너
    if (ad.image_url) {
      ribbon.innerHTML = `
        <a class="ad-ribbon-wrap" href="${escHtml(ad.link_url||'#')}" target="_blank" rel="noopener"
           onclick="recordAdClick('${ad.id}')"
           style="background:${escHtml(ad.bg_color||'#1a2d4a')};">
          <img class="ad-ribbon-img" src="${escHtml(ad.image_url)}" alt="${escHtml(ad.advertiser||'광고')}"/>
          <button class="ad-ribbon-close" onclick="closeAdRibbon(event)" title="닫기">✕</button>
          <span class="ad-ribbon-tag">AD</span>
        </a>`;
    } else {
      const bg  = ad.bg_color   || 'linear-gradient(135deg,#7b2d00,#c8500a)';
      const col = ad.text_color || '#ffffff';
      ribbon.innerHTML = `
        <a class="ad-ribbon-wrap" href="${escHtml(ad.link_url||'#')}" target="_blank" rel="noopener"
           onclick="recordAdClick('${ad.id}')"
           style="background:${bg};color:${col};">
          <div class="ad-ribbon-icon">🧑‍🎓</div>
          <div class="ad-ribbon-text">
            <div class="ad-ribbon-label" style="color:${col};">광고</div>
            <div class="ad-ribbon-title">${escHtml(ad.title||ad.advertiser||'')}</div>
            ${ad.sub_title ? `<div class="ad-ribbon-sub">${escHtml(ad.sub_title)}</div>` : ''}
          </div>
          <div class="ad-ribbon-cta">
            <span style="color:${col};">자세히 보기 →</span>
          </div>
          <button class="ad-ribbon-close" onclick="closeAdRibbon(event)" title="닫기">✕</button>
          <span class="ad-ribbon-tag" style="color:${col};">AD</span>
        </a>`;
    }

    // 여러 광고 있을 경우 5초마다 순환
    if (ads.length > 1) {
      let idx = 0;
      setInterval(() => {
        idx = (idx + 1) % ads.length;
        renderSingleAd(ribbon, ads[idx]);
      }, 3000);
    }
  } catch(e) {
    ribbon.style.display = 'none';
  }
}

function renderSingleAd(ribbon, ad) {
  const bg  = ad.bg_color   || 'linear-gradient(135deg,#7b2d00,#c8500a)';
  const col = ad.text_color || '#ffffff';
  ribbon.style.opacity = '0';
  ribbon.style.transition = 'opacity .4s';
  setTimeout(() => {
    if (ad.image_url) {
      ribbon.innerHTML = `
        <a class="ad-ribbon-wrap" href="${escHtml(ad.link_url||'#')}" target="_blank" rel="noopener"
           onclick="recordAdClick('${ad.id}')"
           style="background:${bg};">
          <img class="ad-ribbon-img" src="${escHtml(ad.image_url)}" alt="${escHtml(ad.advertiser||'광고')}"/>
          <button class="ad-ribbon-close" onclick="closeAdRibbon(event)" title="닫기">✕</button>
          <span class="ad-ribbon-tag">AD</span>
        </a>`;
    } else {
      ribbon.innerHTML = `
        <a class="ad-ribbon-wrap" href="${escHtml(ad.link_url||'#')}" target="_blank" rel="noopener"
           onclick="recordAdClick('${ad.id}')"
           style="background:${bg};color:${col};">
          <div class="ad-ribbon-icon">🧑‍🎓</div>
          <div class="ad-ribbon-text">
            <div class="ad-ribbon-label" style="color:${col};">광고</div>
            <div class="ad-ribbon-title">${escHtml(ad.title||ad.advertiser||'')}</div>
            ${ad.sub_title ? `<div class="ad-ribbon-sub">${escHtml(ad.sub_title)}</div>` : ''}
          </div>
          <div class="ad-ribbon-cta">
            <span style="color:${col};">자세히 보기 →</span>
          </div>
          <button class="ad-ribbon-close" onclick="closeAdRibbon(event)" title="닫기">✕</button>
          <span class="ad-ribbon-tag" style="color:${col};">AD</span>
        </a>`;
    }
    ribbon.style.opacity = '1';
  }, 200);
}

function closeAdRibbon(e) {
  e.preventDefault();
  e.stopPropagation();
  const ribbon = document.getElementById('top-ad-ribbon');
  if (ribbon) {
    ribbon.style.transition = 'max-height .4s, opacity .3s';
    ribbon.style.opacity = '0';
    setTimeout(() => { ribbon.style.display = 'none'; }, 350);
  }
}

async function recordAdClick(adId) {
  // 클릭 수 기록 (비동기, 실패해도 무관)
  try {
    const r = await fetch(apiUrl(`tables/ads/${adId}`));
    const d = await r.json();
    const clicks = (Number(d.sort_order) || 0); // sort_order 필드 재활용 대신 별도 없으므로 무시
  } catch(e) {}
}

/* ─────────────────────────────
   26. 모바일 메뉴
───────────────────────────── */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const ham  = document.getElementById('hamburger');
  if (!menu) return;
  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    menu.classList.remove('open');
    if (ham) ham.classList.remove('open');
    document.body.style.overflow = '';
  } else {
    menu.classList.add('open');
    if (ham) ham.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const ham  = document.getElementById('hamburger');
  if (menu) menu.classList.remove('open');
  if (ham)  ham.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleMobSub(el) {
  const sub = el.nextElementSibling;
  if (!sub) return;
  const isOpen = sub.classList.contains('open');
  // 모든 열린 서브메뉴 닫기
  document.querySelectorAll('.mob-sub.open').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.mob-nav-link .fa-chevron-up').forEach(i => {
    i.classList.remove('fa-chevron-up');
    i.classList.add('fa-chevron-down');
  });
  if (!isOpen) {
    sub.classList.add('open');
    const icon = el.querySelector('.fa');
    if (icon) {
      icon.classList.remove('fa-chevron-down');
      icon.classList.add('fa-chevron-up');
    }
  }
}

// 모바일 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
  const menu = document.getElementById('mobile-menu');
  const ham  = document.getElementById('hamburger');
  if (!menu || !menu.classList.contains('open')) return;
  if (!menu.contains(e.target) && !ham.contains(e.target)) {
    closeMobileMenu();
  }
});
