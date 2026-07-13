/* app.js — 셸(브랜드·내비) · 2차원 라우터(#/home · #/{과제}/{탭}) · 과제 로딩·마운트.
   입력: data/projects.json(레지스트리·전사 설정) + data/portfolio.json(홈 카드 요약, 빌드 산출)
        + data/projects/<id>/{dashboard,config}.json (과제별)
   로드 순서: core.js → tpl-mass.js → (tpl-dev.js) → home.js → app.js */

/* ── 전역 상태 ── */
let PORTFOLIO = null;          // data/portfolio.json
let VIEW = 'home';             // 'home' | 'project'
let CUR_PID = null;            // 현재 과제 id
let CUR_TAB = 'overview';      // 과제 내 탭 (overview | all | s1~s6)
const PROJ_CACHE = {};         // pid → { data, cfg }

const STAGE_LABEL = { poc: 'POC', pilot: 'Pilot', mass: '양산평가', spread: '확산', ops: '운영' };
const STAGE_CHIP = { poc: 'st-poc', pilot: 'st-pilot', mass: 'st-mass', spread: 'st-spread', ops: 'st-ops' };
const STAGE_COLOR = { poc: '#3F7CC4', pilot: '#B36F0A', mass: '#2F7A55', spread: '#7A4FB3', ops: '#5f6b7a' };

function defaultPid() { return (REG && REG.projects && REG.projects[0] && REG.projects[0].id) || 'chem'; }
function orgT(k, fb) { const v = REG && REG.org && REG.org[k]; return v == null ? (fb == null ? '' : fb) : v; }
function portfolioEntry(pid) {
  return ((PORTFOLIO && PORTFOLIO.projects) || []).find(p => p.id === pid) || null;
}

/* ── 사이드 내비: 홈 + 과제 목록(단계 배지) + 활성 과제의 하위 탭 ── */
function buildNav() {
  let html = `<a href="#/home"${VIEW === 'home' ? ' class="active"' : ''}><span class="st">▦</span> ${esc(orgT('homeLabel', '한눈에 보기'))}</a>`;
  html += `<a href="#/guide"${VIEW === 'guide' ? ' class="active"' : ''}><span class="st">✎</span> ${esc(orgT('guideLabel', '지표 핸드북'))}</a>`;
  html += `<div class="t">${esc(orgT('navProjects', '과제 (표준 템플릿)'))}</div>`;
  ((REG && REG.projects) || []).forEach(p => {
    const e = portfolioEntry(p.id) || {};
    const on = VIEW === 'project' && CUR_PID === p.id;
    const stg = e.stage ? `<span class="stage">${esc(STAGE_LABEL[e.stage] || e.stage)}</span>` : '';
    html += `<a href="#/${esc(p.id)}"${on ? ' class="active"' : ''}><span class="st">${esc(p.abbr || '')}</span> ${esc(p.name)}${stg}</a>`;
    if (on && e.hasData !== false) {
      // 하위 탭 (한눈에 보기 / 평가 상세 내역) — 전 템플릿 공통 (케미컬 페이지 문법으로 표준화)
      html += `<a class="sub${CUR_TAB === 'overview' ? ' on' : ''}" href="#/${esc(p.id)}/overview"><span class="st">◉</span> ${esc(T('nav.overview', '한눈에 보기'))}</a>`;
      html += `<a class="sub${CUR_TAB !== 'overview' ? ' on' : ''}" href="#/${esc(p.id)}/all"><span class="st">▤</span> ${esc(T('nav.all', '평가 상세 내역'))}</a>`;
    }
  });
  return html;
}

/* ── 정적 셸(브랜드·제목·내비) 텍스트 주입 — 홈/과제 모드 분기 ── */
function applyShellText() {
  const set = (id, prop, val) => { const el = $(id); if (el) el[prop] = val; };
  if (VIEW === 'home' || VIEW === 'guide') {
    document.title = orgT('title', document.title);
    set('brand-logo', 'textContent', orgT('brandLogo', 'R'));
    set('brand-name', 'innerHTML', orgT('brandName', ''));
    set('page-title', 'textContent', orgT('title', ''));
    set('foot-brand', 'textContent', orgT('footNote', ''));
    const n = ((PORTFOLIO && PORTFOLIO.projects) || []).length;
    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    set('topmeta', 'innerHTML', `<span>${esc(orgT('dateLabel', '기준일'))} <b>${ymd}</b></span><span>${esc(orgT('countLabel', '등록 과제'))} <b>${n}</b></span>`);
  } else {
    document.title = T('app.title', document.title);
    set('brand-logo', 'textContent', T('app.brandLogo'));
    set('brand-name', 'innerHTML', T('app.brandName'));
    set('page-title', 'textContent', T('app.title'));
    set('foot-brand', 'textContent', T('app.footBrand'));
    set('modal-title', 'textContent', T('modal.title'));
    const evalDate = DATA && DATA.generatedAt ? DATA.generatedAt.slice(0, 10) : '—';
    set('topmeta', 'innerHTML', `<span>${esc(T('app.evalDateLabel'))} <b>${esc(evalDate)}</b></span>`);
    { const fu = $('foot-updated'); if (fu) fu.textContent = T('app.updatedPrefix') + evalDate; }
    const sg = $('side-goals'); if (sg) sg.innerHTML = buildSideGoals();
  }
  set('print-btn', 'textContent', VIEW === 'project' ? T('app.printBtn', 'PDF 리포트') : orgT('printBtn', 'PDF 리포트'));
  const nav = $('nav'); if (nav) nav.innerHTML = buildNav();
}

/* ── 뷰 전환 ── */
const TOP_SECTIONS = ['s-overview', 's-steps'];   // 과제(실증 템플릿) 컨테이너
const SIDE_PANELS = ['side-goals', 'side-line', 'side-months'];

function showHome() {
  VIEW = 'home'; CUR_PID = null;
  $('s-home').style.display = '';
  { const g = $('s-guide'); if (g) g.style.display = 'none'; }
  TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = 'none'; });
  SIDE_PANELS.forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  { const tb = $('topbar-lc'); if (tb) { tb.style.display = 'none'; } }
  { const fu = $('foot-updated'); if (fu) fu.textContent = PORTFOLIO && PORTFOLIO.projects ? '' : '—'; }
  applyShellText();
  renderHome();
  scrollTo(0, 0);
}

/* 지표 핸드북 (#/guide) — 정적 설명 페이지 (guide.js renderGuide) */
function showGuide() {
  VIEW = 'guide'; CUR_PID = null;
  $('s-home').style.display = 'none';
  { const g = $('s-guide'); if (g) g.style.display = ''; }
  TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = 'none'; });
  SIDE_PANELS.forEach(id => { const el = $(id); if (el) el.style.display = 'none'; });
  { const tb = $('topbar-lc'); if (tb) { tb.style.display = 'none'; } }
  applyShellText();
  if (typeof renderGuide === 'function') renderGuide();
  scrollTo(0, 0);
}

/* 과제 내 탭 표시 (구 showOnly — 실증 템플릿의 관제/상세/스텝 필터) */
function showProjectTab(tab) {
  CUR_TAB = tab || 'overview';
  $('s-home').style.display = 'none';
  { const g = $('s-guide'); if (g) g.style.display = 'none'; }
  if (CUR_TAB === 'all' || CUR_TAB === 's-steps') {
    showAllSections();
  } else if (/^s[1-6]$/.test(CUR_TAB)) {
    TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = (t === 's-steps') ? '' : 'none'; });
    document.querySelectorAll('#s-steps section.step').forEach(s => { s.style.display = (s.id === CUR_TAB) ? '' : 'none'; });
  } else {
    TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = (t === 's-overview') ? '' : 'none'; });
    document.querySelectorAll('#s-steps section.step').forEach(s => { s.style.display = ''; });
  }
  const tbLc = $('topbar-lc'); if (tbLc) tbLc.style.display = (CUR_TAB === 'overview') ? '' : 'none';
  const nav = $('nav'); if (nav) nav.innerHTML = buildNav();
  scrollTo(0, 0);
}
function showAllSections() {   // 전체 보기·인쇄: 상세 스텝 전부 펼침 (관제 요약 탭은 제외 — 중복 방지)
  TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = (t === 's-overview') ? 'none' : ''; });
  document.querySelectorAll('#s-steps section.step').forEach(s => { s.style.display = ''; });
  const tbLc = $('topbar-lc'); if (tbLc) tbLc.style.display = 'none';
}

/* ── 과제 로딩·마운트 ── */
function loadProject(pid) {
  if (PROJ_CACHE[pid]) return Promise.resolve(PROJ_CACHE[pid]);
  const base = projectBase(pid);
  return Promise.all([
    fetch(base + 'dashboard.json?t=' + Date.now()).then(r => { if (!r.ok) throw new Error(base + 'dashboard.json ' + r.status); return r.json(); }),
    fetch(base + 'config.json?t=' + Date.now()).then(r => r.json()).catch(() => null),
  ]).then(([data, cfg]) => (PROJ_CACHE[pid] = { data, cfg }));
}

function openProject(pid, tab) {
  loadProject(pid).then(({ data, cfg }) => {
    VIEW = 'project'; CUR_PID = pid;
    DATA = data;
    U = (cfg && cfg.ui) || (data.config && data.config.ui) || {};
    BASE = projectBase(pid);
    // 월 스냅샷 상태는 과제 전환 시 반드시 초기화 (이전 과제의 FULL 백업 오염 방지)
    CUR_MONTH = null;
    FULL = {}; SNAP_KEYS.forEach(k => { FULL[k] = DATA[k]; });
    SIDE_PANELS.forEach(id => { const el = $(id); if (el) el.style.display = ''; });
    applyShellText();
    { const el = $('topbar-lc'); if (el) el.innerHTML = buildTopbarLc(DATA.config || {}); }
    renderData();
    showProjectTab(tab);
  }).catch(err => {
    const e = portfolioEntry(pid);
    const nm = e ? e.name : pid;
    $('s-home').style.display = 'none';
    { const g = $('s-guide'); if (g) g.style.display = 'none'; }
    TOP_SECTIONS.forEach(t => { const el = $(t); if (el) el.style.display = (t === 's-overview') ? '' : 'none'; });
    $('s-overview').innerHTML = `<div class="banner" style="margin:16px 0">『${esc(nm)}』 ${esc(orgT('noDataMsg', '데이터가 아직 없습니다 — 과제 폴더(config·엑셀) 구성 후 빌드하세요.'))}<br><span class="mini">${esc(err.message)}</span></div>`;
  });
}

/* 현재 과제 stage에 맞는 템플릿 렌더 (월 전환 selectMonth()도 이 함수를 재호출) */
function renderData() {
  const stage = (DATA && DATA.config && DATA.config.stage) || 'mass';
  if ((stage === 'poc' || stage === 'pilot') && typeof renderDev === 'function') return renderDev(stage);
  if ((stage === 'spread' || stage === 'ops') && typeof renderOps === 'function') return renderOps(stage);
  renderMass();
}

/* ── 라우터: #/home · #/{pid} · #/{pid}/{tab} (+ 레거시 해시 리다이렉트) ── */
function parseHash() {
  const h = location.hash || '';
  if (h.startsWith('#/')) {
    const seg = h.slice(2).split('/');
    if (!seg[0] || seg[0] === 'home') return { view: 'home' };
    if (seg[0] === 'guide') return { view: 'guide' };
    return { view: 'project', pid: seg[0], tab: seg[1] || 'overview' };
  }
  // 레거시 해시 (#s-overview · #all · #s1~#s6) → 첫 과제로 (구 북마크·인쇄 흐름 보호)
  const m = h.match(/^#(s-overview|s-steps|all|s[1-6])$/);
  if (m) return { view: 'project', pid: defaultPid(), tab: m[1] === 's-overview' ? 'overview' : m[1] };
  return { view: 'home' };
}
function route() {
  const r = parseHash();
  if (r.view === 'home') showHome();
  else if (r.view === 'guide') showGuide();
  else if (VIEW === 'project' && CUR_PID === r.pid) showProjectTab(r.tab);   // 같은 과제 내 탭 전환 — 재마운트 없음
  else openProject(r.pid, r.tab);
}
function initRouter() {
  addEventListener('hashchange', route);
  addEventListener('beforeprint', () => { if (VIEW === 'project') showAllSections(); });
  addEventListener('afterprint', () => { if (VIEW === 'project') showProjectTab(CUR_TAB); });
  route();
}

/* ── 부트스트랩: 레지스트리 + 포트폴리오 → 라우팅 시작 ── */
Promise.all([
  fetch('data/projects.json?t=' + Date.now()).then(r => r.json()),
  fetch('data/portfolio.json?t=' + Date.now()).then(r => r.json()).catch(() => null),
]).then(([reg, pf]) => {
  REG = reg;
  PORTFOLIO = pf || { projects: (reg.projects || []).map(p => ({ ...p, hasData: false })) };
  initRouter();
}).catch(err => {
  document.querySelector('.main').innerHTML = `<div class="banner" style="margin-top:20px">데이터를 불러오지 못했습니다 (data/projects.json). 로컬에서는 HTTP 서버로 여세요.<br><span class="mini">${esc(err.message)}</span></div>`;
});
