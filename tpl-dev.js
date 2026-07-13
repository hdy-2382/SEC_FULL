/* tpl-dev.js — 템플릿① 개발 (POC 모드 / Pilot 모드).
   진입점 renderDev(stage) — app.js의 renderData()가 stage(poc|pilot)에 따라 호출.

   페이지 골격은 케미컬(양산평가, tpl-mass renderOverview)과 동일하게 표준화한다:
     [종합 클리어(게이트 기준)] [완주 진행 트랙 + 큰 차트] [신뢰성 트랙 + 보조 차트 2]
     → 고장 분석 와이드(3패널) → 부서 협의 | 기술 개발 → 하위 탭(한눈에 보기 / 평가 상세 내역).
   골격(배관)은 공통, 각 트랙에 올라가는 렌즈만 단계별(docs/PROCESS.md §3):
     POC = 전수 4분류·수렴 추이·비정상 평가 / Pilot = MCBF 성장·시정조치 규율·형상. */

/* 게이트 크리테리아 값의 자동 치환: config gate.criteria[].value가 "auto:..."면 빌드 데이터로 채움 */
function devGateValue(v) {
  const run = DATA.run || {};
  if (v === 'auto:run') return `${fmt(run.cum)}/${fmt(run.target)}h`;
  if (v === 'auto:growth') {
    const g = DATA.growth || [], t = DATA.growthTarget;
    return `${g.length ? fmt(g[g.length - 1].mcbf) : '—'}/${fmt(t)}`;
  }
  if (v === 'auto:actions') { const a = DATA.actionRate || {}; return `${a.pct != null ? a.pct : '—'}% (${a.closed}/${a.total})`; }
  if (v === 'auto:abnormal') {
    const abn = DATA.abnormal || [];
    const pass = abn.filter(a => (a.verdict || '').includes('PASS')).length;
    const fail = abn.filter(a => (a.verdict || '').includes('FAIL')).length;
    return `${pass}/${abn.length} PASS${fail ? ` · ${fail} 재시험` : ''}`;
  }
  if (v === 'auto:fleet') { const f = DATA.fleet || {}; return `${f.qualified || 0}/${f.total || 0} 호기`; }
  if (v === 'auto:avail') {
    const r = DATA.ram || {}, cur = r.current || {};
    return `${cur.avail != null ? cur.avail : '—'}% / 목표 ${r.availTarget != null ? r.availTarget : '—'}%`;
  }
  return v;
}

function devGatePanel(C) {
  const g = C.gate || {};
  const crits = (g.criteria || []).map(c =>
    `<div class="crit"><div class="k">${esc(c.label || '')}</div><div class="v">${esc(devGateValue(c.value || ''))}</div><span class="s ${esc(c.status || 'prog')}">${esc({ pass: '충족', fail: '미달', prog: '진행', wait: '예정' }[c.status] || c.status || '')}</span></div>`).join('');
  return `
    <div class="panel mt">
      <div class="ph"><h3>게이트 통과 기준</h3><span class="vlabel" style="margin-left:auto">사전 확정 · 리뷰 ${esc(g.reviewDate || '—')}</span></div>
      <div class="psub">EXIT CRITERIA · 데이터 이전에 합의된 잣대 (docs/CRITERIA.md)</div>
      <div class="crit-grid">${crits}</div>
      <div style="display:flex;align-items:center;margin-top:12px"><span class="mini" style="margin-right:10px">게이트 리뷰 고정 안건 — TECOP</span>${tecopRow(C.tecop)}</div>
    </div>`;
}

/* 무고장 런 게이지 — 공통 컴포넌트 (파라미터만 단계별로 다름). 상세 탭에서 사용 */
function devRunPanel(C) {
  const run = DATA.run || {}, rc = C.run || {};
  const pct = Math.max(0, Math.min(100, run.pct || 0));
  const resets = run.resets || [];
  let mark = '';
  if (resets.length) {
    const last = resets[resets.length - 1];
    const prevAt = resets.length > 1 ? resets[resets.length - 2].at : 0;
    const attemptLen = Math.max(0, (last.at || 0) - prevAt);
    const mpos = Math.min(97, attemptLen / (run.target || 1) * 100);
    mark = `<span class="mark" style="left:${mpos}%" title="직전 시도: ${attemptLen}h 시점 리셋 (${esc(last.date || '')}) ${esc(last.note || '')}">↺</span>`;
  }
  const remain = Math.max(0, (run.target || 0) - (run.cum || 0));
  return `
    <div class="panel rgauge">
      <div class="ph"><h3>무고장 런 — ${esc(rc.criterion || '')} ${fmt(run.target)}${esc(rc.unit || 'h')}</h3><span class="vlabel" style="margin-left:auto">공통 컴포넌트 · ${esc(STAGE_LABEL[C.stage] || '')} 파라미터</span></div>
      <div class="paramrow"><span>목표 <b>${fmt(run.target)}${esc(rc.unit || 'h')}</b></span><span>잣대 <b>${esc(rc.criterion || '')}</b></span><span>환경 <b>${esc(rc.env || '')}</b></span><span>리셋 규칙 <b>사전 확정</b></span></div>
      <div class="glabel"><span>${run.attempt > 1 ? `${run.attempt}차 시도 ` : ''}<b>${fmt(run.cum)}${esc(rc.unit || 'h')}</b> 경과</span><span>남은 <b>${fmt(remain)}${esc(rc.unit || 'h')}</b></span></div>
      <div class="track"><i style="width:${pct}%"></i>${mark}</div>
      <div class="gfoot"><span>리셋 <b>${resets.length}회</b> · 누적 가동 <b>${fmt(run.totalHours)}h</b></span><span>에러/정지 기록은 <b>전 단계 공통 수집</b> — 게이트만 단계별 잣대 적용</span></div>
    </div>`;
}

/* Pareto 표 — 건수 막대 + 누적% (수정개발 우선순위) */
function devParetoPanel(withRecur) {
  const rows = DATA.pareto || [];
  const max = rows.length ? rows[0].count : 1;
  const recurModes = new Set(((DATA.recurrence || {}).items || []).map(it => it.mode));
  const tr = rows.map(r => `
    <tr><td>${esc(r.mode)}${withRecur && recurModes.has(r.mode) ? ' <span style="color:var(--crit)" title="동일 모드 재발">↺</span>' : ''}</td>
    <td style="width:90px"><div class="prog-bar"><i style="width:${Math.round(r.count / max * 100)}%"></i></div><span class="mini">${r.count}</span></td>
    <td class="r">${r.cumPct}%</td></tr>`).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>고장모드 Pareto</h3><span class="ps">건수 순 · 누적 % — 수정개발 우선순위</span></div>
      <div class="tbl-scroll" style="max-height:300px"><table><tr><th>고장모드</th><th>건수</th><th class="r">누적</th></tr>${tr}</table></div>
    </div>`;
}

/* ── 공통 유틸 (폐루프 상태·4분류 칩) ── */
/* 폐루프 상태 버킷 (빌드 _status_bucket과 동일 규칙) */
function pocStBucket(st) {
  st = st || '';
  if (/종결|완료/.test(st)) return 'closed';
  if (st.includes('검증')) return 'verifying';
  if (/조치|분석|진행/.test(st)) return 'acting';
  return 'new';
}
const POC_ST_BADGE = { closed: 'b-ok', verifying: 'b-prog', acting: 'b-wait', new: 'b-crit' };

/* 원인분류 → 칩 클래스 (전 단계 축 공통 — 카테고리당 색 1:1 고정, styles.css 팔레트와 동일 키) */
function c4Key(c) {
  const s = String(c || '').toLowerCase();
  if (s.includes('컨셉')) return 'risk';
  if (s.includes('설계')) return 'design';
  if (s.includes('부품')) return 'parts';
  if (s.includes('제작') || s.includes('조립')) return 'build';
  if (s.includes('설치') || s.includes('시공')) return 'install';
  if (s.includes('구현') || s.includes('sw') || s.includes('버그')) return 'sw';
  if (s.includes('환경') || s.includes('시험') || s.includes('자재')) return 'env';
  if (s.includes('운영') || s.includes('조작')) return 'oper';
  return '';
}
function c4Chip(c) {
  const k = c4Key(c);
  return k ? `<span class="c4 c4-${k}">${esc(c)}</span>` : esc(c || '—');
}

/* ══════════ 공유 셸 (케미컬 renderOverview 문법) ══════════ */

/* [트랙 0] 종합 클리어 — 게이트/합격 기준을 상태 타일로 (전 단계 공통 · 케미컬 tk-exec 형태).
   opts.criteria 로 기준 목록 교체 가능 — 양산평가는 계약 합격 기준(acceptance)을 넣는다 */
function devClearTrack(C, opts) {
  const g = C.gate || {};
  const crits = (opts && opts.criteria) || g.criteria || [];
  const title = (opts && opts.title) || '종합 클리어 — 게이트 기준';
  const ST = { pass: ['go', 100, '✓'], prog: ['warn', 55, '…'], fail: ['bad', 25, '!'], wait: ['todo', 10, '—'] };
  const tiles = crits.map(c => {
    const m = ST[c.status] || ST.prog;
    return `<div class="clr-tile clr-${m[0]}"><div class="clr-top"><span class="clr-label">${esc(String(c.label || '').replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, ''))}<em>${esc(devGateValue(String(c.value == null ? '' : c.value)))}</em></span><span class="clr-num">${m[1] === 100 ? '✓' : m[2]}</span></div><div class="clr-gauge"><i style="width:${m[1]}%"></i></div></div>`;
  }).join('');
  const dday = (typeof ddayLabel === 'function' && g.reviewDate) ? ddayLabel(g.reviewDate) : '';
  return `<div class="prog-track tk-exec"><div class="pt-h">${title}</div>
    <div class="clr-list">${tiles}</div>
    <div class="exec-roi"><div class="exec-roi-h">${esc(g.label || '게이트 리뷰')} <b>${esc(dday || '—')}</b></div>
      <div class="exec-roi-body" style="flex-direction:column;gap:9px">
        <span class="mini">${esc(g.reviewDate || '—')} · 사전 확정 잣대 — 사후 변경 금지<br>고정 안건 TECOP</span>${tecopRow(C.tecop)}</div></div>
  </div>`;
}

/* [트랙 A 상단] 무고장 런 히어로 (kg-prog) — 보조 스탯 2칸은 단계별 주입 */
function devRunHero(C, stats) {
  const run = DATA.run || {}, rc = C.run || {};
  const pct = Math.max(0, Math.min(100, run.pct || 0));
  const remain = Math.max(0, (run.target || 0) - (run.cum || 0));
  const resets = run.resets || [];
  let mark = '';
  if (resets.length) {
    const last = resets[resets.length - 1];
    const prevAt = resets.length > 1 ? resets[resets.length - 2].at : 0;
    const attemptLen = Math.max(0, (last.at || 0) - prevAt);
    const mpos = Math.min(97, attemptLen / (run.target || 1) * 100);
    mark = `<span class="pg-mark" style="left:${mpos}%" title="직전 시도: ${attemptLen}h 시점 리셋 (${esc(last.date || '')}) ${esc(last.note || '')}">↺</span>`;
  }
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>무고장 런 — ${esc(rc.criterion || '')}</span><span class="pg-subh-note">목표 ${fmt(run.target)}${esc(rc.unit || 'h')} · ${esc(rc.env || '—')}</span></div>
    <div class="pg-hero">
      <div class="pg-hero-main">
        <div class="pg-num"><b>${fmt(run.cum)}</b><span>/ ${fmt(run.target)}${esc(rc.unit || 'h')}${run.attempt > 1 ? ` · ${run.attempt}차 시도` : ''}</span></div>
        <div class="pg-bar pg-bar-mk"><i style="width:${pct}%"></i>${mark}</div>
        <div class="pg-remain">남은 <b>${fmt(remain)}${esc(rc.unit || 'h')}</b> · 리셋 <b>${resets.length}회</b> · 누적 가동 ${fmt(run.totalHours)}h</div>
      </div>
      <div class="pg-donut"><svg viewBox="0 0 42 42"><circle class="trk" cx="21" cy="21" r="15.9"/><circle class="arc" cx="21" cy="21" r="15.9" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/></svg><div class="pg-donut-ctr"><b>${Math.round(pct)}%</b></div></div>
    </div>
    <div class="pg-stats">${stats.join('')}</div></div>`;
}

/* 보조 스탯 칸 3종 — POC: 비정상 / Pilot: 시정조치 검증마감 / 공통: 게이트 리뷰 D-day */
function devStatAbnormal() {
  const abn = DATA.abnormal || [];
  const pass = abn.filter(a => (a.verdict || '').includes('PASS')).length;
  const fail = abn.filter(a => (a.verdict || '').includes('FAIL')).length;
  return `<div class="pg-stat"><span class="pg-stat-k">비정상 시나리오 (Fault Injection)</span><span class="pg-stat-v">${pass}<small>/${abn.length} PASS</small></span>
    <div class="pg-mini"><i style="width:${abn.length ? Math.round(pass / abn.length * 100) : 0}%;background:var(--sky)"></i></div>
    <span class="pg-stat-s">${fail ? `FAIL ${fail}건 — 개선 후 재시험` : '미통과 없음 · 잔여는 일정 확정'}</span></div>`;
}
function devStatActions() {
  const a = DATA.actionRate || {};
  return `<div class="pg-stat"><span class="pg-stat-k">시정조치 검증마감</span><span class="pg-stat-v">${a.pct != null ? a.pct : '—'}<small>% (${a.closed || 0}/${a.total || 0})</small></span>
    <div class="pg-mini"><i style="width:${a.pct || 0}%;background:var(--green)"></i></div>
    <span class="pg-stat-s">모든 수정 → 검증 런 · 무발생 확인 후 종결</span></div>`;
}
function devStatGate(C) {
  const g = C.gate || {};
  const dday = (typeof ddayLabel === 'function' && g.reviewDate) ? ddayLabel(g.reviewDate) : '';
  return `<div class="pg-stat"><span class="pg-stat-k">${esc(g.label || '게이트 리뷰')}</span><span class="pg-stat-v">${esc(dday || '—')}</span>
    <span class="pg-stat-s">${esc(g.reviewDate || '—')} · 리셋은 실패가 아니라 <b>잣대가 지켜진다는 증거</b></span></div>`;
}

/* [와이드 트랙] 조치 우선순위 큐 — "지금 먼저 잡을 것": 오픈 레코드를 S×O로 정렬.
   이 체계의 목적 그 자체 — 누적 데이터 기반으로 치명·빈발을 먼저 소진해 뒤 단계를 싸게 만든다 */
function devPriorityPanel() {
  const recs = DATA.records || [];
  const cnt = {};
  recs.forEach(r => { const k = r.modeCode || r.mode; if (k) cnt[k] = (cnt[k] || 0) + 1; });
  const occ = n => n >= 6 ? '빈발' : n >= 3 ? '보통' : '드묾';
  const open = recs.filter(r => pocStBucket(r.status) !== 'closed').map(r => {
    const band = occ(cnt[r.modeCode || r.mode] || 1);
    return { r, band, pr: PRIO[(r.severity || 'Minor') + '|' + band] || 'Low' };
  });
  const rank = { High: 0, Medium: 1, Low: 2 }, srank = { Critical: 0, Major: 1, Minor: 2 };
  open.sort((a, b) => (rank[a.pr] - rank[b.pr])
    || ((srank[a.r.severity] != null ? srank[a.r.severity] : 3) - (srank[b.r.severity] != null ? srank[b.r.severity] : 3))
    || ((cnt[b.r.modeCode || b.r.mode] || 0) - (cnt[a.r.modeCode || a.r.mode] || 0)));
  const PB = { High: 'b-crit', Medium: 'b-major', Low: 'b-minor' };
  const rows = open.slice(0, 8).map(({ r, band, pr }) =>
    `<tr><td class="c"><span class="badge ${PB[pr]}">${pr}</span></td>
     <td><b>${esc(r.id)}</b> ${esc(r.mode)}${r.recurLink ? ` <span class="rlink" title="재발 ↺ ${esc(r.recurLink)}">↺</span>` : ''}</td>
     <td class="c"><span class="badge ${SEV_BADGE[r.severity] || 'b-minor'}">${esc(sevLabel(r.severity))}</span></td>
     <td class="c">${band}</td>
     <td class="c"><span class="badge ${POC_ST_BADGE[pocStBucket(r.status)]}">${esc(r.status || '—')}</span></td></tr>`).join('');
  const highN = open.filter(o => o.pr === 'High').length;
  return `<div class="panel tight">
    <div class="ph"><h3>조치 우선순위 — 지금 먼저 잡을 것</h3><span class="ps">오픈 ${open.length}건 · S×O 정렬${highN ? ` · <b style="color:var(--crit)">High ${highN}</b>` : ''}</span><a class="more" href="#/${esc(CUR_PID || '')}/all">전체 대장 →</a></div>
    <div class="tbl-scroll" style="max-height:300px"><table><tr><th class="c">우선</th><th>레코드</th><th class="c">심각도</th><th class="c">발생도</th><th class="c">상태</th></tr>${rows || '<tr><td colspan="5" class="mini c">오픈 없음 — 전건 종결</td></tr>'}</table></div>
    <div class="mini mt">치명·빈발을 상류에서 소진할수록 하류가 싸진다 — 홈의 <b>심각도 깔때기</b>가 그 증거</div>
  </div>`;
}

/* [와이드 트랙] 최근 이슈/이벤트 피드 — 공통 레코드 스토어(records) 기반, 전 단계 동일 */
function devFeedPanel() {
  const recs = (DATA.records || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
  const items = recs.map(r => `<div class="it"><span class="badge ${SEV_BADGE[r.severity] || 'b-minor'}">${esc(r.id)}</span>
    <div class="tp"><div class="t1">${esc(r.mode)}${r.recurLink ? ` <span class="rlink" title="재발 ↺ ${esc(r.recurLink)}">↺</span>` : ''}</div><div class="t2">${esc(r.detail || '')}</div></div>
    <span class="dt">${esc(r.date || '')}<br>${esc(r.status || '')}</span></div>`).join('');
  return `<div class="panel tight"><div class="ph"><h3>최근 이슈 / 이벤트</h3><span class="ps">공통 레코드 · 최신순</span><a class="more" href="#/${esc(CUR_PID || '')}/all">전체 대장 →</a></div>
    <div class="feed">${items || '<div class="mini">기록 없음</div>'}</div></div>`;
}

/* [와이드 트랙] 위험 매트릭스 (S×O) + 심각도 도넛 — 공통 레코드 기반, 전 템플릿 공통.
   케미컬 pMatrix와 동일 조형: 고장모드별 발생도 밴드(드묾<3 ≤보통<6 ≤빈발) × 최고 심각도. */
function devMatrixPanel() {
  const recs = DATA.records || [];
  const SEV_RANK = { Critical: 3, Major: 2, Minor: 1 };
  const by = {};
  recs.forEach(r => {
    const k = r.modeCode || r.mode || '(미분류)';
    const o = by[k] || (by[k] = { name: r.mode || k, count: 0, sev: 'Minor' });
    o.count++;
    if ((SEV_RANK[r.severity] || 0) > (SEV_RANK[o.sev] || 0)) o.sev = r.severity;
  });
  const modes = Object.values(by).sort((a, b) => b.count - a.count);
  const occ = n => n >= 6 ? '빈발' : n >= 3 ? '보통' : '드묾';
  const mcell = {};
  modes.forEach((m, i) => { (mcell[m.sev + '|' + occ(m.count)] = mcell[m.sev + '|' + occ(m.count)] || []).push(i + 1); });
  const mrows = ['Critical', 'Major', 'Minor'], mcols = ['드묾', '보통', '빈발'];
  const mcls = { High: 'm-h', Medium: 'm-m', Low: 'm-l' };
  let mx = `<div class="lab"></div>` + mcols.map(c => `<div class="lab">${c}</div>`).join('');
  mrows.forEach(rk => {
    mx += `<div class="lab" style="color:${SEV_BAR[rk] || 'var(--muted)'}">${esc(sevLabel(rk))}</div>`;
    mcols.forEach(ck => {
      const p = PRIO[rk + '|' + ck], dots = (mcell[rk + '|' + ck] || []).map(n => `<span class="pt">${n}</span>`).join('');
      mx += `<div class="cell ${mcls[p]}">${dots}</div>`;
    });
  });
  const legend = modes.slice(0, 8).map((m, i) => `<span><b>${i + 1}</b>${esc(m.name)}</span>`).join('');
  const sd = { total: recs.length };
  recs.forEach(r => { if (r.severity) sd[r.severity] = (sd[r.severity] || 0) + 1; });
  return `<div class="panel tight ovmx"><div class="ph"><h3>위험 매트릭스 · 심각도</h3><span class="ps">S×O 우선순위 — 발생도 밴드 × 최고 심각도 (공통 레코드)</span></div>
    <div class="ovmx-row" style="display:flex;gap:12px;align-items:center">
      <div style="flex:1;min-width:0"><div class="matrix">${mx}</div><div class="legend-row">${legend}</div></div>
      <div class="ovmx-side" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:9px;border-left:1px solid var(--line-soft);padding-left:14px">
        <div style="position:relative;flex:none;width:104px;height:104px">${sevDonut(sd)}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font-size:22px;font-weight:800;color:var(--navy-deep)">${sd.total || 0}</b><span style="font-size:9.5px;color:var(--muted)">총 레코드</span></div></div>
        <div class="legend" style="width:100%">
          <div class="li"><span class="sw" style="background:#C0392B"></span>${esc(sevLabel('Critical'))}<b>${sd.Critical || 0}</b></div>
          <div class="li"><span class="sw" style="background:#E08600"></span>${esc(sevLabel('Major'))}<b>${sd.Major || 0}</b></div>
          <div class="li"><span class="sw" style="background:#3F7CC4"></span>${esc(sevLabel('Minor'))}<b>${sd.Minor || 0}</b></div></div></div></div></div>`;
}

/* 개발·운영 템플릿 차트 확대 모달 — 케미컬 openChart와 동일 UX */
function openDevChart(kind) {
  if (!DATA) return;
  const REG9 = {
    trend:  () => ({ t: '수렴 추이 — 누적 발견 vs 종결', h: pocTrendPanel({ wide: true }) }),
    growth: () => ({ t: 'MCBF 성장곡선', h: pilotGrowthPanel({ bot: 396, vbH: 448 }) }),
    ram:    () => ({ t: '월간 가동률 추이', h: (typeof opsRamTrendPanel === 'function') ? opsRamTrendPanel() : '' }),
  };
  const c = REG9[kind] && REG9[kind]();
  if (!c || !c.h) return;
  $('modal-title').textContent = c.t;
  $('modal-body').innerHTML = `<div style="padding:4px 2px">${c.h}</div>`;
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.add('wide');
  $('modal-back').classList.add('open');
}

/* [하단] 부서 협의 — config ui.overview.discussItems (케미컬과 동일 키·마크업, 재빌드 불필요) */
function devDiscussPanel() {
  const DTAG = { '긴급': 't-urgent', '검토': 't-review', '협의': 't-discuss', '진행': 't-review', '완료': 't-done', '보류': 't-hold' };
  const arr = Array.isArray(T('overview.discussItems')) ? T('overview.discussItems') : [];
  const groups = Array.isArray(T('overview.discGroups')) ? T('overview.discGroups') : ['안전', '운영', '기타'];
  const item = it => `<li class="ovd-it">${it.tag ? `<span class="disc-tag ${DTAG[it.tag] || 't-discuss'}">${esc(it.tag)}</span>` : ''}<span class="ovd-t">${esc(it.topic || it.title || '')}</span></li>`;
  const cols = groups.map(gr => {
    const items = arr.filter(it => (it.group || groups[groups.length - 1]) === gr);
    return `<div class="sw-col"><div class="sw-col-h">${esc(gr)}<span>${items.length}</span></div><ul class="ov-disc sw-col-body">${items.map(item).join('') || '<li class="ovd-empty">—</li>'}</ul></div>`;
  }).join('');
  return `<div class="panel tight"><div class="ph"><h3>${esc(T('overview.discussTitle', '협의 및 논의 필요'))}</h3><span class="ps" style="margin-left:auto">${arr.length}건</span></div><div class="sw-cols">${cols}</div></div>`;
}

/* [하단] 기술 개발 — config swModules (케미컬과 동일 키·마크업) */
function devSwPanel(C) {
  const groups = Array.isArray(T('overview.swGroups')) ? T('overview.swGroups') : ['로봇', '상위시스템', '환경'];
  const bar = s => {
    const col = s.pct >= 100 ? 'var(--green)' : s.pct >= 70 ? 'var(--sky)' : 'var(--major)';
    return `<div class="mod"><span class="nm">${esc(s.name)}</span><div class="bar"><i style="width:${s.pct}%;background:${col}"></i></div><span class="pc">${s.pct}%</span></div>`;
  };
  const cols = groups.map(gr => {
    const items = (C.swModules || []).filter(s => (s.group || groups[0]) === gr);
    return `<div class="sw-col"><div class="sw-col-h">${esc(gr)}<span>${items.length}</span></div><div class="sw-col-body">${items.map(bar).join('') || '<div class="mini">—</div>'}</div></div>`;
  }).join('');
  return `<div class="panel tight"><div class="ph"><h3>${esc(T('overview.swTitle', '소프트웨어 완성도'))}</h3><span class="ps">${esc(T('overview.swSub', '모듈별 진행 — 담당 협의 기준'))}</span></div><div class="sw-cols">${cols}</div></div>`;
}

/* 페이지 타이틀 줄 */
function devHead(stage, C) {
  const prj = C.project || {}, g = C.gate || {};
  const isPoc = stage === 'poc';
  return `
    <div class="ptitle">
      <span class="stagechip ${STAGE_CHIP[stage]}">${esc(STAGE_LABEL[stage])}</span>
      <span class="tmpl">템플릿 ① 개발 — ${isPoc ? 'POC' : 'Pilot'} 모드</span>
      <span class="meta">PM <b>${esc((prj.team || '').split(',')[0] || '—')}</b> · 기간 <b>${esc(prj.startDate || '')} ~ ${esc(prj.endDate || '')}</b> · ${esc(g.label || '게이트 리뷰')} <b>${esc(g.reviewDate || '—')} ${esc(typeof ddayLabel === 'function' ? ddayLabel(g.reviewDate) : '')}</b></span>
    </div>`;
}

/* 공유 셸 — 케미컬과 동일한 트랙 골격. slots(렌즈)만 단계별 주입 (s.head로 타이틀 줄 교체 가능 — tpl-ops) */
function devShell(stage, C, s) {
  return `
    ${s.head || devHead(stage, C)}
    <div class="pocv">
      <div class="qbox">${s.qbox}</div>
      <div class="ov-2col">
        ${devClearTrack(C, s.clear)}
        <div class="prog-track tk-a"><div class="pt-h">${s.aTitle}</div>${s.aHero}${s.aChart}</div>
        <div class="prog-track tk-b"><div class="pt-h">${s.bTitle}</div>${s.bTop}<div class="rel-charts">${s.bCharts.join('')}</div></div>
      </div>
      <div class="prog-track track-wide tk-c"><div class="pt-h">${s.cTitle}</div><div class="fault-grid">${s.cPanels.join('')}</div></div>
      ${s.extraWide || ''}
      <div class="dev-2col">
        <div class="prog-track tk-d"><div class="pt-h">부서 협의 및 기타사항</div>${devDiscussPanel()}</div>
        <div class="prog-track tk-dev"><div class="pt-h">기술 개발</div>${devSwPanel(C)}</div>
      </div>
    </div>`;
}

/* ══════════ POC 렌즈 ══════════ */

/* 전수 4분류 보드 — 컨셉 리스크 0이 히어로. "건수가 아니라 분류가 결론" */
function pocFourwayBoard() {
  const fw = DATA.fourway || [], st = DATA.issueStats || {};
  const by = {}; fw.forEach(f => { by[f.key] = f; });
  const nm9 = s => String(s || '').replace(/^[①②③④⑤]\s*/, '');
  const con = by.concept || { count: 0, label: '컨셉 리스크' };
  const ok = con.count === 0;
  const tile = (f, cls) => f ? `<div class="fwt ${cls}"><div class="t">${esc(nm9(f.label))}</div><div class="n">${f.count}<small>건</small></div><div class="m">종결 ${f.closed} · 진행 ${f.count - f.closed}</div></div>` : '';
  const SEG_SHORT = { design: '설계', impl: 'SW', env: '환경' };
  const segs = ['design', 'impl', 'env'].map(k => {
    const f = by[k]; if (!f || !f.count) return '';
    const cls = k === 'design' ? 'sg-design' : k === 'impl' ? 'sg-sw' : 'sg-env';
    return `<div class="sg ${cls}" style="flex:${f.count}"><span>${SEG_SHORT[k]} ${f.count}</span></div>`;
  }).join('');
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>발굴 이슈 전수 4분류</span><span class="pg-subh-note">${st.total || 0}건 전수 · 통계(MTBF) 금지 — 분류가 결론</span></div>
    <div class="fw-board">
      <div class="fwt risk hero${ok ? '' : ' hero-bad'}">
        <div class="hero-n ${ok ? 'ok' : 'bad'}">${con.count}<small>건</small></div>
        <div class="hero-tx"><div class="t">${esc(nm9(con.label))}</div>
          <div class="m">${ok ? '이 아키텍처로 해결 불가한 병 — <b>0건 유지가 POC의 결론</b>' : '<b>⚠ 컨셉 재검토 필요</b> — 즉시 게이트 보류'}</div></div>
        ${ok ? '<span class="fw-badge">POC의 성적표</span>' : ''}
      </div>
      ${tile(by.design, 'design')}${tile(by.impl, 'sw')}${tile(by.env, 'env')}
    </div>
    <div class="compo"><div class="sg sg-zero">컨셉 ${con.count}</div>${segs}</div>
    <div class="mini mt">"에러가 많이 났다"가 아니라 <b>"아키텍처를 죽이는 에러는 없었다"</b>로 읽는다 — 랩에서 찾은 에러는 싸고, 라인에서 찾은 에러는 비싸다.</div>
  </div>`;
}

/* 발굴 이슈 분류 보드 — 전 단계 동일 템플릿: [단계 결론 히어로] + 축 타일 + 구성 막대.
   축과 히어로만 단계별 (docs/PROCESS.md §3):
     POC  = 4분류 · 히어로 "컨셉 리스크 0" (이 아키텍처로 가도 되는가)
     Pilot = 근본원인 6분류 · 히어로 "만성(재발) 0" (수렴하는가)
     양산  = 근본원인 6분류 · 히어로 "관련 고장 ≤ 한도" (계약 기준 이내인가) */
const CAUSE6 = [
  ['design', '설계', ['설계']],
  ['parts', '부품', ['부품']],
  ['build', '제작·조립', ['제작', '조립']],
  ['sw', 'SW', ['sw', '구현', '버그']],
  ['env', '시험환경·자재', ['시험', '환경', '자재']],
  ['oper', '운영·조작', ['운영', '조작']],
];
// 카테고리 키 = 타일/세그 클래스 (색 1:1 고정 — styles.css 카테고리 팔레트와 동일 키)
const CAUSE6_TILE = { design: 'design', parts: 'parts', build: 'build', sw: 'sw', env: 'env', oper: 'oper' };
const CAUSE6_SEG = { design: 'sg-design', parts: 'sg-parts', build: 'sg-build', sw: 'sg-sw', env: 'sg-env', oper: 'sg-oper' };

function devClassBoard(stage) {
  if (stage === 'poc') return pocFourwayBoard();
  const recs = DATA.records || [];
  const rows = CAUSE6.map(([key, label, kws]) => {
    const subset = recs.filter(r => {
      const s = String(r.cause || '').toLowerCase();
      return kws.some(k => s.includes(k));
    });
    return { key, label, count: subset.length,
             closed: subset.filter(r => pocStBucket(r.status) === 'closed').length };
  });
  const mapped = rows.reduce((a, r) => a + r.count, 0);
  const unclass = recs.length - mapped;
  // 단계 결론 히어로
  let hero;
  if (stage === 'mass') {
    // 계약 관점: 에러 버짓(현 완주 시도, 관련 고장만 차감) — 한도 도달 = 리셋
    const eb = (DATA.metrics || {}).errorBudget || {};
    const rel = (DATA.adjudication || []).filter(j => j.verdict === '관련').length;
    const limit = eb.limit != null ? eb.limit : ((DATA.config || {}).acceptance || {}).errorLimit;
    const used = eb.used != null ? eb.used : rel;
    const ok = limit == null || used < limit;
    hero = { n: used, small: limit != null ? `/${limit} (현 시도)` : '건', ok, label: '에러 버짓 — 관련 고장만 차감',
             desc: ok ? `잔여 <b>${limit != null ? limit - used : '—'}회</b> · 누적 관련 ${rel}건 · 리셋 ${eb.resets || 0}회 — 판정 합의제(비관련 제외)`
                      : `<b>⚠ 한도 도달 — 완주 리셋</b> · 누적 관련 ${rel}건 · 리셋 ${eb.resets || 0}회`,
             badge: '양산평가의 성적표' };
  } else {
    const rec = DATA.recurrence || {};
    const ok = !rec.count;
    const items = (rec.items || []).map(it => `${esc(it.mode || it.type || it.code || '')}(${it.count})`).join(', ');
    hero = { n: rec.count || 0, small: '개 모드', ok, label: '만성(재발) 고장',
             desc: ok ? '동일 모드 재출현 없음 — <b>수렴의 증거</b>' : `<b>게이트 전 마감 필수(재발 0)</b> · ${items}`,
             badge: 'Pilot의 성적표' };
  }
  const tile = r =>
    `<div class="fwt ${CAUSE6_TILE[r.key]}"><div class="t">${esc(r.label)}</div><div class="n">${r.count}<small>건</small></div><div class="m">종결 ${r.closed} · 진행 ${r.count - r.closed}</div></div>`;
  const segs = rows.filter(r => r.count).map(r =>
    `<div class="sg ${CAUSE6_SEG[r.key]}" style="flex:${r.count}"><span>${esc(r.label)} ${r.count}</span></div>`).join('')
    + (unclass ? `<div class="sg sg-oper" style="flex:${unclass};opacity:.55"><span>미분류 ${unclass}</span></div>` : '');
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>발굴 이슈 분류 — 근본원인 6분류</span><span class="pg-subh-note">${recs.length}건 전수 · 4분류의 세분화 축${unclass ? ` · <b style="color:var(--major)">미분류 ${unclass}</b>` : ''}</span></div>
    <div class="fw-board">
      <div class="fwt risk hero${hero.ok ? '' : ' hero-bad'}">
        <div class="hero-n ${hero.ok ? 'ok' : 'bad'}">${hero.n}<small>${hero.small}</small></div>
        <div class="hero-tx"><div class="t">${esc(hero.label)}</div><div class="m">${hero.desc}</div></div>
        ${hero.ok ? `<span class="fw-badge">${esc(hero.badge)}</span>` : ''}
      </div>
      ${rows.map(tile).join('')}
    </div>
    <div class="compo">${segs || '<div class="mini">기록 없음</div>'}</div>
    <div class="mini mt">분류는 기록 시점에 판단 트리(지표 핸드북 ⑥)로 — 자유 텍스트 금지 · 세분화는 매핑표로만${unclass ? ' · <b>미분류는 에러로그 「원인분류」 컬럼 기재로 해소</b>' : ''}</div>
  </div>`;
}

/* 폐루프 FRACAS — 신규→조치중→검증중(무발생 감시)→종결 + 재발 시그널.
   POC·Pilot 공용 컴포넌트 (배관은 전 단계 하나 — 공통 레코드 스토어 DATA.records 기반) */
function fracasLoopPanel(opts) {
  opts = opts || {};
  const sd = DATA.statusDist || {}, rec = DATA.recurrence || {};
  const box = (k, label, sub) => `<div class="lp lp-${k}"><div class="n">${sd[k] || 0}</div><div class="t">${label}</div><div class="s">${sub}</div></div>`;
  const verifying = (DATA.records || []).filter(r => pocStBucket(r.status) === 'verifying' && r.verify);
  const vlist = verifying.map(r => `<b>${esc(r.id)}</b> ${esc(r.verify)}`).join(' · ');
  const recItems = (rec.items || []).map(it => `${esc(it.mode || it.type || it.code || '')}(${it.count})`).join(', ');
  const recNote = opts.recurZeroGate
    ? `↺ 재발(만성) 모드 <b>${rec.count || 0}개</b> — 게이트 전 마감 필수(재발 0)${recItems ? ` · ${recItems}` : ''}`
    : `↺ 재발 모드 <b>${rec.count || 0}개</b> — 동일 고장모드 재출현 = 근본원인 미해결 신호 → 재분석 의무${recItems ? ` · ${recItems}` : ''}`;
  return `<div class="panel looppanel${opts.mt ? ' mt' : ''}">
    <div class="ph"><h3>폐루프 FRACAS — 조치는 "했다"가 아니라 "닫혔다"</h3><span class="ps">종결 = 조치 후 동일 모드 무발생 (CRITERIA §5) · 전 단계 공통 배관</span></div>
    <div class="loopline">
      ${box('new', '신규', '대장 등록')}<span class="lar">→</span>
      ${box('acting', '조치중', '원인 가설·조치')}<span class="lar">→</span>
      ${box('verifying', '검증중', '무발생 감시')}<span class="lar">→</span>
      ${box('closed', '종결', '검증 완료')}
    </div>
    ${vlist ? `<div class="mini mt">무발생 감시 중: ${vlist}</div>` : ''}
    <div class="loopret">${recNote}</div>
  </div>`;
}

/* 수렴 추이 — 누적 발견 vs 누적 종결. opt.wide면 트랙 A용 대형 차트 */
function pocTrendPanel(opt) {
  opt = opt || {};
  const tr = DATA.trend || [];
  if (!tr.length) return '';
  const W = opt.wide ? 1000 : 420;
  const top = 20, bot = opt.wide ? 396 : 158, left = opt.wide ? 54 : 40, right = opt.wide ? 962 : 388;
  const vbH = opt.wide ? 448 : 196;
  const yMax = niceCeil(Math.max(...tr.map(t => t.found), 1));
  const n = tr.length;
  const x = i => n === 1 ? (left + right) / 2 : left + (right - left) * i / (n - 1);
  const y = v => bot - v / yMax * (bot - top);
  let axis = '';
  const ticks = 4;
  for (let k = 0; k <= ticks; k++) {
    const yy = top + (bot - top) * k / ticks, v = yMax * (1 - k / ticks);
    axis += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="${k === ticks ? '#C9DCEC' : '#EAF0F6'}"/>`;
    axis += `<text x="${left - 6}" y="${yy + 4}" font-size="11" fill="#8A99AC" text-anchor="end">${Math.round(v)}</text>`;
  }
  const xaxis = tr.map((t, i) => `<text x="${x(i)}" y="${bot + 18}" font-size="11.5" fill="#5A6B7E" text-anchor="middle">${t.week}주차</text>`).join('');
  const pf = tr.map((t, i) => `${x(i)},${y(t.found)}`).join(' ');
  const pc = tr.map((t, i) => `${x(i)},${y(t.closed)}`).join(' ');
  const area = pf + ' ' + tr.slice().reverse().map((t, i) => `${x(n - 1 - i)},${y(t.closed)}`).join(' ');
  const dots = tr.map((t, i) => `<circle cx="${x(i)}" cy="${y(t.found)}" r="3.5" fill="#2E89D6"><title>${t.week}주차 · 발견 ${t.found} · 종결 ${t.closed} · 오픈 ${t.found - t.closed}</title></circle>`
    + `<circle cx="${x(i)}" cy="${y(t.closed)}" r="3.5" fill="#3E9B6E"><title>${t.week}주차 · 종결 ${t.closed}</title></circle>`).join('');
  const last = tr[n - 1], open = last.found - last.closed;
  return `<div class="panel${opt.wide ? ' tight ovchart' : ''}"${opt.zoom ? ` onclick="openDevChart('trend')" title="클릭하면 크게 보기"` : ''}>
    <div class="ph"><h3>수렴 추이 — 누적 발견 vs 종결</h3><span class="ps">간격 = 오픈 ${open}건 · 좁혀지는가${opt.zoom ? ' ⤢' : ''}</span></div>
    <svg viewBox="0 0 ${W} ${vbH}" style="width:100%;height:auto;display:block" role="img" aria-label="주차별 누적 발견 대 누적 종결">
      ${axis}<line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/>
      <polygon points="${area}" fill="#2E89D6" opacity="0.07"/>
      <polyline fill="none" stroke="#2E89D6" stroke-width="2.2" points="${pf}"/>
      <polyline fill="none" stroke="#3E9B6E" stroke-width="2.2" points="${pc}"/>${dots}
      <text x="${x(n - 1) + 8}" y="${y(last.found) + 4}" font-size="12.5" font-weight="800" fill="#0F2E54">${last.found}</text>
      <text x="${x(n - 1) + 8}" y="${y(last.closed) + 4}" font-size="12.5" font-weight="800" fill="#2f7a52">${last.closed}</text>
      ${xaxis}</svg>
    <div class="clegend"><span><i style="background:#2E89D6"></i>누적 발견</span><span><i style="background:#3E9B6E"></i>누적 종결</span><span class="mini">간격 = 오픈 이슈</span></div>
  </div>`;
}

/* 비정상 상황 평가 (Fault Injection) */
function pocAbnormalPanel() {
  const rows = (DATA.abnormal || []).map(a => {
    const v = a.verdict || '';
    const cls = v.includes('PASS') ? 'b-ok' : v.includes('FAIL') ? 'b-crit' : 'b-wait';
    return `<tr><td>${esc(a.scenario)}</td><td class="c">${esc(a.recovery || '—')}</td><td class="c"><span class="badge ${cls}">${esc(v)}</span></td><td class="mini">${esc(a.notes || '')}</td></tr>`;
  }).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>비정상 상황 평가 (Fault Injection)</h3><span class="ps">의도적 이상 주입 → 복구 거동 검증 · 첫 MTTR 측정 지점</span></div>
      <div class="tbl-scroll" style="max-height:300px"><table><tr><th>시나리오</th><th class="c">복구시간</th><th class="c">판정</th><th>비고</th></tr>${rows}</table></div>
    </div>`;
}

/* 이슈 대장 행 — 재발 링크(↺ 선행 ID)·무발생 검증 진행 포함. full=상세 탭(전체 컬럼) */
function pocLedgerRows(list, full) {
  return list.map(i => {
    const idx = (DATA.issues || []).indexOf(i);
    const b = pocStBucket(i.status);
    const st = `<span class="badge ${POC_ST_BADGE[b]}">${esc(i.status || '—')}</span>${!full && i.verify ? `<div class="mini">${esc(i.verify)}</div>` : ''}`;
    const recur = i.recurOf ? `<span class="rlink" title="동일 고장모드 선행 레코드 — 재발(재분석 의무)">↺ ${esc(i.recurOf)}</span>` : '—';
    return `<tr><td><b>${esc(i.id)}</b></td><td class="c">${esc((i.date || '').slice(5))}</td><td>${esc(i.mode)}</td>
      <td class="c">${c4Chip(i.cause4)}</td><td class="c"><span class="badge ${SEV_BADGE[i.severity] || 'b-minor'}">${esc(sevLabel(i.severity))}</span></td>
      <td class="c">${recur}</td><td class="c">${st}</td>
      ${full ? `<td class="c">${esc(i.verify || '—')}</td><td class="c">${esc(i.closedDate || '—')}</td><td class="mini">${esc(i.detail || '')}</td>` : ''}
      <td class="c"><button class="btn" style="padding:3px 8px" onclick="openIssueModal(${idx})">＋</button></td></tr>`;
  }).join('');
}

/* 이슈 상세 모달 (POC 대장 전용 — DATA.issues 기반) */
function openIssueModal(i) {
  const e = (DATA.issues || [])[i]; if (!e) return;
  $('modal-title').textContent = `${e.id || ''} — ${e.mode || ''}`;
  const imgs = (e.images || []).map(fn =>
    `<img src="${BASE}errors/${esc(fn)}" alt="${esc(fn)}" onclick="lightbox('${BASE}errors/${esc(fn)}')" onerror="this.replaceWith(document.createTextNode('이미지 없음: ${esc(fn)}'))">`).join('');
  $('modal-body').innerHTML = `
    <div class="ed-meta"><span><b>발생일</b> ${esc(e.date || '—')}</span><span><b>심각도</b> ${esc(sevLabel(e.severity))}</span>
    <span><b>원인분류</b> ${esc(e.cause4 || '—')}</span><span><b>상태</b> ${esc(e.status || '—')}</span>
    ${e.closedDate ? `<span><b>종결일</b> ${esc(e.closedDate)}</span>` : ''}${e.verify ? `<span><b>무발생 검증</b> ${esc(e.verify)}</span>` : ''}
    ${e.unit ? `<span><b>호기</b> ${esc(e.unit)}</span>` : ''}${e.downtime ? `<span><b>다운타임</b> ${esc(e.downtime)}분</span>` : ''}
    ${e.recurOf ? `<span><b>재발</b> ↺ ${esc(e.recurOf)} 동일 모드 — 재분석 의무</span>` : ''}</div>
    <div class="ed-block"><div class="ed-lbl">상세</div><div class="ed-txt">${esc(e.detail) || '—'}</div></div>
    ${imgs ? `<div class="ed-block"><div class="ed-lbl">사진</div><div class="ed-imgs">${imgs}</div></div>` : ''}`;
  $('modal-back').classList.add('open');
}

/* POC 상세 탭 (s-steps) — 원본 기록 전체: 대장 전수 · 런 기록 · 비정상 · 게이트/단계 */
function pocSteps(C) {
  const all = (DATA.issues || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const runrows = (DATA.runlog || []).map(r =>
    `<tr><td>${esc(r.date)}</td><td class="c">${fmt(r.hours)}</td><td class="c">${r.errors ? `<b style="color:var(--crit)">${r.errors}</b>` : 0}</td><td class="mini">${esc(r.notes || '')}</td></tr>`).join('');
  return `<div class="pocv">
    <div class="sbox-h"><span class="tag">평가 상세</span><h2>평가 상세 내역 — 원본 기록</h2><span class="d">업체 이슈로그·런기록·비정상평가 (필수 5필드 + 선택 필드)</span></div>
    <section class="step" id="d1">
      ${stepHead(1, '이슈 대장 (전수)', '"이 고장모드는 컨셉의 병인가, 고칠 수 있는 병인가" — 전 건 4분류·폐루프 상태', `${all.length}건`, 'prog')}
      <div class="step-body"><div class="panel">
        <div class="ph"><h3>공통 레코드 스키마 — POC 필수 5필드</h3><span class="ps">종결일·무발생검증은 선택 (Pilot부터 필수) — docs/RECORD_SCHEMA.md</span></div>
        <div class="tbl-scroll" style="max-height:460px"><table><tr><th>ID</th><th class="c">발생</th><th>고장모드 (표준분류)</th><th class="c">4분류</th><th class="c">심각도</th><th class="c">재발</th><th class="c">상태</th><th class="c">무발생검증</th><th class="c">종결일</th><th>상세</th><th class="c">보기</th></tr>${pocLedgerRows(all, true)}</table></div>
        <div class="mini mt">재발(↺) = 동일 고장모드 재출현 (종결 여부 무관, docs/CRITERIA.md §5) · 원인 미상 건도 "조치중" 상태로 대장에 존재 — 모른다는 사실도 관리된다</div>
      </div></div>
    </section>
    <section class="step" id="d2">
      ${stepHead(2, '무고장 런 기록', '에러수>0인 날 = 리셋(0부터 재시작) — 부분 인정 없음, 사전 합의 규칙', `${(DATA.runlog || []).length}일`, 'prog')}
      <div class="step-body">
        ${devRunPanel(C)}
        <div class="panel mt"><div class="ph"><h3>일자별 런 기록</h3><span class="ps">장비 가동 시간 기준 (달력 시간 아님)</span></div>
        <table><tr><th>일자</th><th class="c">런시간(h)</th><th class="c">에러수</th><th>비고</th></tr>${runrows}</table></div>
      </div>
    </section>
    <section class="step" id="d3">
      ${stepHead(3, '비정상 상황 평가', '의도적 이상 주입(Fault Injection) → 복구 거동 검증 — 게이트 필수 항목', devGateValue('auto:abnormal'), 'prog')}
      <div class="step-body">${pocAbnormalPanel()}</div>
    </section>
    <section class="step" id="d4">
      ${stepHead(4, '단계 진행 · 게이트 통과 기준', '사전 확정된 잣대 — 데이터 이후 변경·재해석 금지 (docs/CRITERIA.md)', `리뷰 ${(C.gate || {}).reviewDate || '—'}`, 'prog')}
      <div class="step-body">${lifecycleStagePanel(C)}${devGatePanel(C)}</div>
    </section>
  </div>`;
}

/* ══════════ Pilot 렌즈 ══════════ */

/* MCBF 성장곡선 — opt로 트랙 A용 대형 사이즈 */
function pilotGrowthPanel(opt) {
  opt = opt || {};
  const g = DATA.growth || [], target = DATA.growthTarget || 0;
  if (!g.length) return '';
  const top = 26, bot = opt.bot || 196, left = 64, right = 950, vbH = opt.vbH || 236;
  const yMax = niceCeil(Math.max(target, ...g.map(w => w.mcbf)) * 1.05);
  const y = v => bot - v / yMax * (bot - top);
  const x = i => g.length === 1 ? (left + right) / 2 : left + (right - left) * i / (g.length - 1);
  const pts = g.map((w, i) => `${x(i)},${y(w.mcbf)}`).join(' ');
  const dots = g.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.mcbf)}" r="${i === g.length - 1 ? 5.5 : 4}" fill="#2E89D6"${i === g.length - 1 ? ' stroke="#fff" stroke-width="1.5"' : ''}><title>W${w.week} · MCBF ${fmt(w.mcbf)}</title></circle>`).join('');
  const vers = (DATA.versions || []);
  const xlab = g.map((w, i) => `<text x="${x(i)}" y="${bot + 20}" font-size="13" fill="#6E7D90" text-anchor="middle">W${w.week}</text>`).join('');
  const last = g[g.length - 1];
  return `
    <div class="panel${opt.vbH ? ' tight ovchart' : ''}"${opt.zoom ? ` onclick="openDevChart('growth')" title="클릭하면 크게 보기"` : ''}>
      <div class="ph"><h3>MCBF 성장곡선</h3><span class="ps">주차 누적 · 목표 ${fmt(target)}Cy — 안정화의 정량 증거${opt.zoom ? ' ⤢' : ''}</span></div>
      <svg viewBox="0 0 1000 ${vbH}" style="width:100%;height:auto;display:block" role="img" aria-label="주차별 MCBF 성장곡선">
        ${target ? `<line x1="${left}" y1="${y(target)}" x2="${right}" y2="${y(target)}" stroke="#E08600" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${left + 4}" y="${y(target) - 6}" font-size="12.5" fill="#B36F0A" font-weight="700">목표 ${fmt(target)}</text>` : ''}
        <line x1="${left}" y1="${bot}" x2="${right}" y2="${bot}" stroke="#C9DCEC"/>
        <g font-size="11" fill="#9aa9bb" text-anchor="end"><text x="${left - 8}" y="${bot + 4}">0</text><text x="${left - 8}" y="${y(yMax) + 8}">${fmt(yMax)}</text></g>
        <polyline fill="none" stroke="#2E89D6" stroke-width="2.2" points="${pts}"/>${dots}
        <text x="${x(g.length - 1)}" y="${y(last.mcbf) - 12}" font-size="13.5" font-weight="800" fill="#0F2E54" text-anchor="middle">${fmt(last.mcbf)}</text>
        ${xlab}</svg>
      <div class="clegend"><span><i style="background:#2E89D6"></i>주차별 MCBF</span><span><i style="background:#E08600"></i>목표 (점선)</span>${vers.length ? `<span>배포: ${vers.map(v => esc(v.ver)).join(' → ')}</span>` : ''}</div>
    </div>`;
}

/* 형상(버전) 기록 — 와이드 트랙용. (시정조치 규율 수치는 히어로 보조스탯·폐루프에 이미 표시 — 중복 제거) */
function pilotVersionPanel() {
  const vers = DATA.versions || [];
  const curVer = vers.length ? vers[vers.length - 1].ver : '—';
  const a = DATA.actionRate || {};
  return `
    <div class="panel">
      <div class="ph"><h3>형상(버전) 기록</h3><span class="ps">고장 시점 버전 필수 — "구버전 고장" 입증 수단</span></div>
      <table>
        <tr><th style="width:90px">현재 SW</th><td><b>${esc(curVer)}</b></td></tr>
        <tr><th>버전 이력</th><td class="mini">${vers.map(v => `${esc(v.ver)} (${esc(v.date)})`).join(' → ') || '—'}</td></tr>
        <tr><th>동결 규칙</th><td class="mini">동결 후 변경 시 <b>300h 리셋</b> (docs/CRITERIA.md §3)</td></tr>
        <tr><th>조치 검증마감</th><td class="mini"><b>${a.pct != null ? a.pct : '—'}%</b> (${a.closed || 0}/${a.total || 0}) — 원본은 상세 탭 「조치검증 대장」</td></tr>
      </table>
    </div>`;
}

/* 고장 레코드 대장 — 공통 레코드 스토어(records)와 조인: 원인분류·재발·상태 */
function pilotRecordsPanel() {
  const recs = DATA.records || [];
  const rows = (DATA.errors || []).map((e, i) => {
    const r = recs[i] || {};   // 공통 레코드 스토어 — errors 와 동일 순서 (빌드 보장)
    const b = pocStBucket(r.status);
    const recur = r.recurLink ? `<span class="rlink" title="동일 고장모드 선행 레코드 — 재발">↺ ${esc(r.recurLink)}</span>` : '—';
    return `
    <tr><td><b>${esc(e.code)}</b></td><td>${esc(e.type)}</td><td class="c">${esc(r.cause || '—')}</td><td class="mini">${esc(e.cause || '')}</td>
    <td class="c">${esc(e.sw_ver || '—')}<span class="req must">필수</span></td>
    <td class="c">${recur}</td>
    <td class="c"><span class="badge ${POC_ST_BADGE[b] || 'b-wait'}">${esc(r.status || '—')}</span></td>
    <td class="c">${esc(e.date || '')}</td><td class="c"><button class="btn" style="padding:3px 8px" onclick="openModal(${i})">＋상세</button></td></tr>`;
  }).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>고장 레코드 (공통 스키마)</h3><span class="ps">POC와 같은 대장이 이어진다 — Pilot부터 버전·무발생검증 <b>필수</b>, 원인분류는 4분류의 세분화 (docs/RECORD_SCHEMA.md)</span></div>
      <div class="tbl-scroll" style="max-height:460px"><table><tr><th>코드</th><th>고장모드</th><th class="c">원인분류</th><th>근본원인</th><th class="c">SW버전</th><th class="c">재발</th><th class="c">상태</th><th class="c">발생일</th><th class="c">상세</th></tr>${rows}</table></div>
    </div>`;
}

/* Pilot 상세 탭 (s-steps) — 레코드 전수 · 런/일일평가 · 시정조치 검증 · 게이트/단계 */
function pilotSteps(C) {
  const daily = (DATA.daily || []).map(d =>
    `<tr><td>${esc((d.date || '').slice(5))}</td><td class="c">${fmt(d.total)}</td><td class="c">${d.errors ? `<b style="color:var(--crit)">${d.errors}</b>` : 0}</td><td class="c">${fmt(d.hours)}</td><td class="mini">${esc(d.notes || '')}</td></tr>`).join('');
  const acts = (DATA.actions || []).map(a =>
    `<tr><td><b>${esc(a.id || '')}</b></td><td class="c">${esc(a.code || '')}</td><td>${esc(a.action || '')}</td><td class="c">${esc(a.owner || '')}</td><td class="c">${esc(a.due || '')}</td>
     <td class="c"><span class="badge ${RES_BADGE[a.status] || (String(a.status || '').includes('완료') ? 'b-ok' : 'b-prog')}">${esc(a.status || '—')}</span></td><td class="c">${esc(a.verifyStart || a.verifyStartDate || '—')}</td></tr>`).join('');
  return `<div class="pocv">
    <div class="sbox-h"><span class="tag">평가 상세</span><h2>평가 상세 내역 — 원본 기록</h2><span class="d">업체 일일평가·에러로그 + 관리 시트(조치검증) — Pilot부터 버전 필수</span></div>
    <section class="step" id="d1">
      ${stepHead(1, '고장 레코드 (전수)', '"우리는 수렴하고 있는가" — 모든 기록에 버전, 모든 수정에 검증 런', `${(DATA.errors || []).length}건`, 'prog')}
      <div class="step-body">${pilotRecordsPanel()}
        <div class="mini mt">재발(↺) = 동일 고장모드 재출현 (docs/CRITERIA.md §5) · 원인분류는 POC 4분류의 세분화 축 — 단계를 넘어 통계가 이어진다</div></div>
    </section>
    <section class="step" id="d2">
      ${stepHead(2, '무정지 런 · 일일평가 기록', '에러 발생일 = 리셋 — 부분 인정 없음 · 런 시간은 장비 가동 시간 기준', `${(DATA.daily || []).length}일`, 'prog')}
      <div class="step-body">
        ${devRunPanel(C)}
        <div class="panel mt"><div class="ph"><h3>일일평가 기록</h3><span class="ps">사이클·에러·가동시간 — 무정지 런과 MCBF의 원천 데이터</span></div>
        <div class="tbl-scroll" style="max-height:380px"><table><tr><th>일자</th><th class="c">사이클</th><th class="c">에러</th><th class="c">가동(h)</th><th>비고</th></tr>${daily}</table></div></div>
      </div>
    </section>
    <section class="step" id="d3">
      ${stepHead(3, '시정조치 검증 대장', '조치 후 동일 모드 무발생 확인 후에만 종결 — 폐루프의 원천 기록', devGateValue('auto:actions'), 'prog')}
      <div class="step-body"><div class="panel">
        <div class="ph"><h3>조치검증 (관리 시트)</h3><span class="ps">REPORT.xlsx 「조치검증」 — PM 작성</span></div>
        <table><tr><th>조치ID</th><th class="c">대상코드</th><th>조치내용</th><th class="c">담당</th><th class="c">목표일</th><th class="c">상태</th><th class="c">검증시작</th></tr>${acts}</table>
      </div></div>
    </section>
    <section class="step" id="d4">
      ${stepHead(4, '단계 진행 · 게이트 통과 기준', '사전 확정된 잣대 — 데이터 이후 변경·재해석 금지 (docs/CRITERIA.md)', `리뷰 ${(C.gate || {}).reviewDate || '—'}`, 'prog')}
      <div class="step-body">${lifecycleStagePanel(C)}${devGatePanel(C)}</div>
    </section>
  </div>`;
}

/* ══════════ 진입점 ══════════ */

/* POC 관제 — 케미컬 골격 + POC 렌즈 */
function renderPoc(C) {
  $('s-overview').innerHTML = devShell('poc', C, {
    qbox: `이 단계의 질문: <b>“이 고장모드는 컨셉의 병인가, 고칠 수 있는 병인가?”</b> — 표본이 작고 설계가 유동적이므로 통계(MTBF) 대신 <b>전수 4분류</b>로 보고. 단발성 조치의 연속이 아니라 <b>대장 위의 수렴</b>으로 읽히게 한다.`,
    aTitle: '완주 진행 → 수렴 · 연결된 지표',
    aHero: devRunHero(C, [devStatAbnormal(), devStatGate(C)]),
    aChart: pocTrendPanel({ wide: true, zoom: true }),
    bTitle: '전수 4분류 → 폐루프 · 연결된 지표',
    bTop: pocFourwayBoard(),
    bCharts: [fracasLoopPanel(), pocAbnormalPanel()],
    cTitle: '고장 분석 · 위험 매트릭스 · Pareto · 최근 알람',
    cPanels: [devMatrixPanel(), devParetoPanel(true), devPriorityPanel()],
  });
  $('s-steps').innerHTML = pocSteps(C);
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
}

/* Pilot 관제 — 같은 골격 + Pilot 렌즈 */
function renderPilot(C) {
  $('s-overview').innerHTML = devShell('pilot', C, {
    qbox: `이 단계의 질문: <b>“우리는 수렴하고 있는가?”</b> — 증거는 세 가지: <b>성장곡선의 기울기 · 줄어드는 Pareto · 재발 0</b>. 모든 수정에 검증 런, 모든 기록에 버전.`,
    aTitle: '완주 진행 → 성장 · 연결된 지표',
    aHero: devRunHero(C, [devStatActions(), devStatGate(C)]),
    aChart: pilotGrowthPanel({ bot: 396, vbH: 448, zoom: true }),
    bTitle: '발굴 이슈 분류 → 폐루프 · 연결된 지표',
    bTop: devClassBoard('pilot'),
    bCharts: [devParetoPanel(true), fracasLoopPanel({ recurZeroGate: true })],
    cTitle: '고장 분석 · 위험 매트릭스 · 형상 · 최근 알람',
    cPanels: [devMatrixPanel(), pilotVersionPanel(), devPriorityPanel()],
  });
  $('s-steps').innerHTML = pilotSteps(C);
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
}

function renderDev(stage) {
  const C = DATA.config || {};
  return stage === 'poc' ? renderPoc(C) : renderPilot(C);
}
