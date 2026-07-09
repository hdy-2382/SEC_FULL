/* core.js — 공용 유틸·차트(SVG)·상수·모달. 과제/템플릿 무관.
   로드 순서: core.js → tpl-mass.js → (tpl-dev.js) → home.js → app.js (클래식 스크립트, 전역 공유) */
'use strict';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('ko-KR');
let DATA = null;

/* ── 멀티 과제 ──
   REG  = data/projects.json (과제 레지스트리 + 전사 설정)
   BASE = 현재 과제의 데이터 루트 (data/projects/<id>/) — 이미지 등 상대 자원의 기준 경로 */
let REG = null;
let BASE = 'data/projects/chem/';
const projectBase = (id) => 'data/projects/' + id + '/';

/* ── 화면 글자(ui) 접근 헬퍼 ──
   U = config.json 의 ui 블록. T()=글자 가져오기, TT()=글자+{치환}, tpl()=치환 엔진 */
let U = {};
const tpl = (s, vars) => String(s == null ? '' : s)
  .replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null) ? vars[k] : '');
const T = (path, fb) => {
  const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), U);
  return v == null ? (fb == null ? '' : fb) : v;
};
const TT = (path, vars, fb) => tpl(T(path, fb), vars);

/* ── 차트 헬퍼 (SVG 문자열) ── */
// 달성률 도넛(밝은 배경용): fill=목표 대비 달성률(%), 중앙=실제값, 아래=라벨/부가
function miniDonut(pct, color, center, label, sub, size = 72) {
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div style="text-align:center;flex:1;min-width:62px">
    <svg width="${size}" height="${size}" viewBox="0 0 42 42" style="display:block;margin:0 auto">
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--line-soft)" stroke-width="4.5"/>
      <circle cx="21" cy="21" r="15.9" fill="none" stroke="${color}" stroke-width="4.5" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25" stroke-linecap="round"/>
      <text x="21" y="21" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="var(--navy-deep)">${esc(center)}</text>
    </svg>
    <div style="font-size:12.5px;font-weight:700;color:var(--navy-deep);margin-top:6px">${esc(label)}</div>
    <div style="font-size:10.5px;color:var(--muted);margin-top:1px">${esc(sub)}</div>
  </div>`;
}
function sevDonut(sd) {
  const tot = sd.total || 1; let cum = 0, c = '';
  [['#C0392B', sd.Critical || 0], ['#E08600', sd.Major || 0], ['#3F7CC4', sd.Minor || 0]].forEach(([col, n]) => {
    const pct = n / tot * 100;
    c += `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${25 - cum}"/>`;
    cum += pct;
  });
  return `<svg width="104" height="104" viewBox="0 0 42 42">${c}</svg>`;
}
// 목표 곡선 모양: 진행률 p(0~1) → 목표값. K=1 선형, 2 이차, 3 삼차.
const CURVE_K = { linear: 1, quad: 2, cubic: 3 };

const parseYMD = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
// 값 v 이상에서 가장 가까운 "깔끔한" 상한 (1·2·5 ×10ⁿ). 작은 값(에러율 %)도 처리.
function niceCeil(v) {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * pow;
}
// 축 눈금 간격 (4~5칸)
function niceStep(maxv) {
  if (maxv <= 5) return 1;
  if (maxv <= 10) return 2;
  if (maxv <= 20) return 5;
  if (maxv <= 50) return 10;
  if (maxv <= 100) return 25;
  if (maxv <= 200) return 50;
  if (maxv <= 500) return 100;
  return Math.round(maxv / 5);
}
// 평가기간(startDate~endDate)을 주(월요일 시작) 단위로 분할한 시작일 목록
function weekAxis(startStr, endStr, fallbackN) {
  if (!startStr || !endStr) return Array.from({ length: fallbackN }, () => '');
  const end = parseYMD(endStr), mon = parseYMD(startStr);
  mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));   // 그 주의 월요일로 정렬
  const slots = [];
  for (const d = new Date(mon); d <= end; d.setDate(d.getDate() + 7)) {
    slots.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return slots;
}

// 주차 시작일 → "(M/D-M/D)" 7일 범위 (평가종료일 endStr 넘으면 그날로 클램프)
function weekRange(s, endStr) {
  if (!s) return '';
  const a = parseYMD(s), b = new Date(a); b.setDate(b.getDate() + 6);
  if (endStr) { const e = parseYMD(endStr); if (b > e) b.setTime(e.getTime()); }
  return `(${a.getMonth() + 1}/${a.getDate()}-${b.getMonth() + 1}/${b.getDate()})`;
}
function weeklyChart(weekly, target, opt) {
  opt = opt || {};
  const C = (DATA && DATA.config) || {}, proj = C.project || {};
  const top = 16, bot = opt.bot || 188, left = 50, right = 986, vbH = opt.vbH || 244;
  // x축: 평가기간 전체를 주차로 분할, 데이터 주차를 weekStart로 슬롯 매핑
  const slots = weekAxis(proj.startDate, proj.endDate, weekly.length || 1);
  const nSlots = Math.max(slots.length, weekly.length, 1);
  const placed = weekly.map((w, i) => {
    let idx = w.weekStart ? slots.indexOf(w.weekStart) : -1;
    return { ...w, slot: idx < 0 ? i : idx };
  });
  // y축 최대: 고정(기본 400) ↔ auto(데이터에 맞춤). y는 클램프하지 않고 목표곡선만 clip → 왜곡 방지
  const dataMax = Math.max(...weekly.map(w => w.cumStreak), 1);
  const yMax = opt.auto ? niceCeil(dataMax) : (Number(T('steps.yAxisMax', 400)) || 400);
  const y = v => bot - (v / yMax) * (bot - top);
  const slotW = (right - left) / nSlots;
  const cx = i => left + slotW * (i + 0.5);

  // y축 격자 + 눈금
  const step = niceStep(yMax);
  let yaxis = '';
  for (let v = 0; v <= yMax + 0.1; v += step) {
    yaxis += `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="${v === 0 ? '#C9DCEC' : '#EAF0F6'}"/>`;
    yaxis += `<text x="${left - 8}" y="${y(v) + 4.5}" font-size="13" fill="#5A6B7E" text-anchor="end">${v}</text>`;
  }
  // 목표 곡선 0 → target (전체 슬롯 폭). plot 영역으로 clip → auto scale에서도 모양 유지
  const curve = T('steps.targetCurve', 'linear');
  const K = CURVE_K[curve] || 1;
  const ramp = Array.from({ length: 61 }, (_, i) => {
    const p = i / 60;
    return `${(left + (right - left) * p).toFixed(1)},${y(target * Math.pow(p, K)).toFixed(1)}`;
  }).join(' ');
  // x축 라벨: "N주차" + 그 아래 "(시작-끝)" 날짜 범위
  let xaxis = '';
  slots.forEach((s, i) => {
    xaxis += `<text x="${cx(i)}" y="${bot + 22}" font-size="13" font-weight="600" fill="#3D4F63" text-anchor="middle">${i + 1}주차</text>`;
    xaxis += `<text x="${cx(i)}" y="${bot + 39}" font-size="9.5" fill="#8A99AC" text-anchor="middle">${esc(weekRange(s, proj.endDate))}</text>`;
  });
  // 막대(누적연속=빨강, 슬롯 중앙 정렬) + 리셋 ✕
  let bars = '';
  placed.forEach(w => {
    const x = cx(w.slot), bw = Math.min(17, slotW * 0.34);
    bars += `<rect x="${x - bw / 2}" y="${y(w.cumStreak)}" width="${bw}" height="${bot - y(w.cumStreak)}" fill="#C0392B"/>`;
    if (w.reset) {
      const yy = y(w.cumStreak) - 10, r = 5;
      bars += `<path d="M${x - r},${yy - r} L${x + r},${yy + r} M${x - r},${yy + r} L${x + r},${yy - r}" stroke="#8B2E1F" stroke-width="2.4" stroke-linecap="round"/>`;
    }
  });
  const curveName = (T('steps.targetCurveNames', {})[curve]) || curve;
  return `<svg viewBox="0 0 1000 ${vbH}" style="width:100%;height:auto;display:block">
    <defs><clipPath id="wkclip"><rect x="${left}" y="${top - 2}" width="${right - left}" height="${bot - top + 2}"/></clipPath></defs>
    ${yaxis}
    <polyline fill="none" stroke="#1565C0" stroke-width="2" stroke-dasharray="6 5" points="${ramp}" clip-path="url(#wkclip)"/>
    <text x="${right - 4}" y="${Math.max(top + 11, y(target) - 6)}" font-size="13" font-weight="600" fill="#1565C0" text-anchor="end">${esc(TT('steps.growthTargetLabel', { v: target, curve: curveName }))}</text>
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/>
    ${bars}${xaxis}</svg>`;
}
// 우하단 토글: y축 auto scale on/off → 차트만 다시 그림
function stabChart(weekly, opt) {
  // 듀얼 축: 좌=이동 에러율(%, 빨강), 우=누적 MTBF(Cycle, 파랑)
  opt = opt || {};
  const top = 16, bot = opt.bot || 150, left = 44, right = 376, vbH = opt.vbH || 176;
  const errs = weekly.map(w => w.errRate), mt = weekly.map(w => w.mtbf);
  const n = weekly.length || 1;
  const x = i => n === 1 ? (left + right) / 2 : left + (right - left) * i / (n - 1);
  const eMax = niceCeil(Math.max(...errs, 1)), mMax = niceCeil(Math.max(...mt, 1));
  const yL = v => bot - (v / eMax) * (bot - top);
  const yR = v => bot - (v / mMax) * (bot - top);
  // 격자 4분할 + 좌/우 눈금
  let axis = '';
  const ticks = 4;
  for (let k = 0; k <= ticks; k++) {
    const yy = top + (bot - top) * k / ticks, ev = eMax * (1 - k / ticks), mv = mMax * (1 - k / ticks);
    axis += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="${k === ticks ? '#C9DCEC' : '#EAF0F6'}"/>`;
    axis += `<text x="${left - 6}" y="${yy + 4}" font-size="11" fill="#8B2E1F" text-anchor="end">${ev < 10 ? ev.toFixed(1) : Math.round(ev)}</text>`;
    axis += `<text x="${right + 6}" y="${yy + 4}" font-size="11" fill="#2E89D6" text-anchor="start">${Math.round(mv)}</text>`;
  }
  let xaxis = '';
  weekly.forEach((w, i) => { xaxis += `<text x="${x(i)}" y="${bot + 18}" font-size="11.5" fill="#5A6B7E" text-anchor="middle">${i + 1}주차</text>`; });
  const pe = errs.map((v, i) => `${x(i)},${yL(v)}`).join(' ');
  const pm = mt.map((v, i) => `${x(i)},${yR(v)}`).join(' ');
  const ed = errs.map((v, i) => `<circle cx="${x(i)}" cy="${yL(v)}" r="3" fill="#8B2E1F"/>`).join('');
  const md = mt.map((v, i) => `<circle cx="${x(i)}" cy="${yR(v)}" r="3" fill="#2E89D6"/>`).join('');
  return `<svg viewBox="0 0 420 ${vbH}" style="width:100%;height:auto;display:block">${axis}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/><line x1="${right}" y1="${top}" x2="${right}" y2="${bot}" stroke="#C9DCEC"/>
    <polyline fill="none" stroke="#8B2E1F" stroke-width="2.4" points="${pe}"/>${ed}
    <polyline fill="none" stroke="#2E89D6" stroke-width="2.4" points="${pm}"/>${md}${xaxis}</svg>`;
}
// 기간별 에러율 안정화: 막대=그 기간 실측 에러율(건/100Cy), 선=누적 평균(안정화 추세)
function errRateChart(rows, opt) {
  opt = opt || {};
  const top = 18, bot = opt.bot || 176, left = 54, right = 980, vbH = opt.vbH || 226;
  const n = rows.length || 1;
  const yMax = niceCeil(Math.max(...rows.map(r => Math.max(r.rate, r.cumRate)), 1));
  const y = v => bot - (v / yMax) * (bot - top);
  const slotW = (right - left) / n;
  const cx = i => left + slotW * (i + 0.5);
  const step = niceStep(yMax);
  let yaxis = '';
  for (let v = 0; v <= yMax + 0.1; v += step) {
    yaxis += `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="${v === 0 ? '#C9DCEC' : '#EAF0F6'}"/>`;
    yaxis += `<text x="${left - 8}" y="${y(v) + 4.5}" font-size="13" fill="#5A6B7E" text-anchor="end">${v}%</text>`;
  }
  let bars = '', xaxis = '';
  rows.forEach((r, i) => {
    const x = cx(i), bw = Math.min(48, slotW * 0.5);
    bars += `<rect x="${x - bw / 2}" y="${y(r.rate)}" width="${bw}" height="${bot - y(r.rate)}" rx="2" fill="#E08600" opacity="0.85"/>`;
    bars += `<text x="${x}" y="${y(r.rate) - 7}" font-size="12.5" font-weight="600" fill="#B36A00" text-anchor="middle">${r.rate}%</text>`;
    xaxis += `<text x="${x}" y="${bot + 24}" font-size="13" font-weight="600" fill="#3D4F63" text-anchor="middle">${esc(r.period)}</text>`;
    if (r.range) xaxis += `<text x="${x}" y="${bot + 40}" font-size="9.5" fill="#8A99AC" text-anchor="middle">${esc(r.range)}</text>`;
  });
  const pts = rows.map((r, i) => `${cx(i)},${y(r.cumRate)}`).join(' ');
  const dots = rows.map((r, i) => `<circle cx="${cx(i)}" cy="${y(r.cumRate)}" r="4" fill="#8B2E1F"/>`).join('');
  const line = n > 1 ? `<polyline fill="none" stroke="#8B2E1F" stroke-width="2.5" points="${pts}"/>` : '';
  return `<svg viewBox="0 0 1000 ${vbH}" style="width:100%;height:auto;display:block">${yaxis}<line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/>${bars}${line}${dots}${xaxis}</svg>`;
}

const SEV_BADGE = { Critical: 'b-crit', Major: 'b-major', Minor: 'b-minor' };
// 등급 배지에 표시할 글자(빈발 고장 Top5 등). 여기만 고치면 모든 화면에 반영됨.
const SEV_LABEL = { Critical: '치명', Major: '중대', Minor: '경미' };
const sevLabel = s => SEV_LABEL[s] || s;
const SEV_BAR = { Critical: 'var(--crit)', Major: 'var(--major)', Minor: 'var(--minor)' };
const PRIO = {
  'Critical|드묾': 'Medium', 'Critical|보통': 'High', 'Critical|빈발': 'High',
  'Major|드묾': 'Low', 'Major|보통': 'Medium', 'Major|빈발': 'High',
  'Minor|드묾': 'Low', 'Minor|보통': 'Low', 'Minor|빈발': 'Medium',
};
const RES_BADGE = { '검증완료': 'b-ok', '검증중': 'b-prog', '조치중': 'b-wait', '재발': 'b-crit' };

function openModal(i) {
  const e = DATA.errors[i]; if (!e) return;
  $('modal-title').textContent = TT('modal.titleFull', { code: e.code || '', no: e.no });
  const imgs = (e.images || []).map(fn =>
    `<img src="${BASE}errors/${esc(fn)}" alt="${esc(fn)}" onclick="lightbox('${BASE}errors/${esc(fn)}')" onerror="this.replaceWith(document.createTextNode('${esc(TT('modal.imgMissing', { fn }))}'))">`).join('');
  $('modal-body').innerHTML = `
    <div class="ed-meta"><span><b>${esc(T('modal.occur'))}</b> ${esc(e.date)} ${esc(e.time || '')}</span><span><b>${esc(T('modal.cycle'))}</b> ${fmt(e.cycle)}</span>
    <span><b>${esc(T('modal.type'))}</b> ${esc(e.type || '—')}</span><span><b>${esc(T('modal.owner'))}</b> ${esc(TT('modal.ownerVal', { sec: e.owner_sec || '—', vendor: e.owner || '—' }))}</span></div>
    <div class="ed-block"><div class="ed-lbl">${esc(T('modal.detail'))}</div><div class="ed-txt">${esc(e.detail) || '—'}</div></div>
    <div class="ed-block"><div class="ed-lbl">${esc(T('modal.cause'))}</div><div class="ed-txt">${esc(e.cause) || '—'}</div></div>
    <div class="ed-block"><div class="ed-lbl">${esc(T('modal.action'))}</div><div class="ed-txt">${esc(e.action) || '—'} ${e.result ? '→ <span class="badge b-ok">' + esc(e.result) + '</span>' : ''}</div></div>
    ${e.detailMore ? `<div class="ed-block"><div class="ed-lbl">${esc(T('modal.detailMore'))}</div><div class="ed-txt">${esc(e.detailMore).replace(/\n/g, '<br>')}</div></div>` : ''}
    ${imgs ? `<div class="ed-block"><div class="ed-lbl">${esc(T('modal.images'))}</div><div class="ed-imgs">${imgs}</div></div>` : ''}`;
  $('modal-back').classList.add('open');
}
function closeModal() {
  $('modal-back').classList.remove('open');
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.remove('wide');
}
function openStagePopup() {
  const C = (DATA && DATA.config) || {};
  $('modal-title').textContent = T('overview.stageTitle', '개발 진행 단계');
  $('modal-body').innerHTML = lifecycleStagePanel(C);
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.add('wide');
  $('modal-back').classList.add('open');
}
function lightbox(src) { $('lightbox-img').src = src; $('lightbox').classList.add('open'); }
/* 설비 평가 진행(라인 레이아웃) 확대 팝업: 개발단계 돋보기처럼 박스 자체를 모달로 확대 */
function openLineLayout() {
  const C = (DATA && DATA.config) || {};
  const m = DATA.metrics || {};
  const img = (C.line && C.line.layoutImage) || (BASE + 'assets/line_layout.png');
  const Lfit = T('overview.lineImageFit', 'contain');
  const prog = (m && m.progress) || {};
  const cap = TT('overview.lineCaption',
    { cum: prog.cum != null ? prog.cum : '', target: prog.target != null ? prog.target : '' },
    '현재 평가 <b>설비 3 (적재) · {cum}/{target}</b> · 설비 1·설비 2 통과 · 설비 4 대기');
  $('modal-title').textContent = T('overview.lineTitle');
  $('modal-body').innerHTML = `
    <div class="layout-figure">
      <div class="layout-img" style="height:min(64vh,620px)"><img src="${esc(img)}" alt="${esc(T('overview.lineTitle'))}" style="object-fit:${esc(Lfit)}" onerror="this.style.opacity=.25"></div>
      <div class="layout-cap">${cap}</div>
    </div>`;
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.add('wide');
  $('modal-back').classList.add('open');
}

/* 관제 그래프 확대 팝업: 클릭 시 같은 차트를 넓은 기본 형상으로 다시 그려 모달 표시 */
let chartModalAuto = false;   // 팝업 내 주차별 추이 y축 오토스케일 상태 (기본 OFF = 목표 곡선 표시)
function weeklyModalBody() {
  const m = DATA.metrics || {};
  return `<div style="padding:4px 2px">${weeklyChart(m.weekly || [], m.progress.target, { auto: chartModalAuto })}
    <div class="clegend" style="margin-top:12px">
      <span><i style="background:#C0392B"></i>누적 연속</span>
      <span style="color:#8B2E1F">✕ 리셋</span>
      <span><span style="display:inline-block;width:16px;border-top:2px dashed #1565C0;vertical-align:middle"></span> 목표 곡선</span>
      <button class="btn" onclick="toggleChartScale()" style="margin-left:auto;padding:4px 11px;font-size:11.5px">오토스케일: ${chartModalAuto ? 'ON' : 'OFF'}</button>
    </div></div>`;
}
function toggleChartScale() { chartModalAuto = !chartModalAuto; $('modal-body').innerHTML = weeklyModalBody(); }
function openChart(key) {
  if (!DATA) return;
  const m = DATA.metrics || {};
  const lg = (items) => `<div class="clegend" style="margin-top:12px">${items}</div>`;
  let title, body;
  if (key === 'weekly') {
    title = '주차별 연속 사이클 추이'; body = weeklyModalBody();
  } else {
    const REG = {
      stab: () => ({ t: '시스템 안정성 추이', s: stabChart(m.weekly || []),
        l: lg('<span><i style="background:#8B2E1F"></i>이동 에러율(좌·%)</span><span><i style="background:#2E89D6"></i>누적 MTBF(우·Cy)</span>') }),
      errrate: () => ({ t: '기간별 에러율 안정화', s: errRateChart(m.errRate || []),
        l: lg('<span><i style="background:#E08600"></i>기간 에러율</span><span><i style="background:#8B2E1F"></i>누적 평균(추세)</span>') }),
    };
    const c = REG[key] && REG[key](); if (!c) return;
    title = c.t; body = `<div style="padding:4px 2px">${c.s}${c.l}</div>`;
  }
  $('modal-title').textContent = title;
  $('modal-body').innerHTML = body;
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.add('wide');
  $('modal-back').classList.add('open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('lightbox').classList.remove('open'); } });

/* ── 평가 기간 타임라인 ── */
function fmtMD(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
