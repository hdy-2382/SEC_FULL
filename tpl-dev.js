/* tpl-dev.js — 템플릿① 개발 (POC 모드 / Pilot 모드).
   진입점 renderDev(stage) — app.js의 renderData()가 stage(poc|pilot)에 따라 호출.
   화면 구성은 design/mockup_multi.html의 과제 A(POC)·B(Pilot) 페이지를 따른다.
   에러분석 접근(docs/PROCESS.md §3): POC=전수 4분류(통계 금지) · Pilot=추세(MCBF 성장·Pareto·재발 0). */

/* 게이트 크리테리아 값의 자동 치환: config gate.criteria[].value가 "auto:run|growth|actions"면 빌드 데이터로 채움 */
function devGateValue(v) {
  const run = DATA.run || {};
  if (v === 'auto:run') return `${fmt(run.cum)}/${fmt(run.target)}h`;
  if (v === 'auto:growth') {
    const g = DATA.growth || [], t = DATA.growthTarget;
    return `${g.length ? fmt(g[g.length - 1].mcbf) : '—'}/${fmt(t)}`;
  }
  if (v === 'auto:actions') { const a = DATA.actionRate || {}; return `${a.pct != null ? a.pct : '—'}% (${a.closed}/${a.total})`; }
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

/* 무고장 런 게이지 — 공통 컴포넌트 (파라미터만 단계별로 다름) */
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
      <table><tr><th>고장모드</th><th>건수</th><th class="r">누적</th></tr>${tr}</table>
    </div>`;
}

/* ── POC 전용 ── */
function pocFourwayPanel() {
  const fw = DATA.fourway || [], st = DATA.issueStats || {};
  const cells = fw.map(f => `
    <div class="fw${f.key === 'concept' ? ' hero' : ''}"><div class="t">${esc(f.label)}</div><div class="n">${f.count}</div>
    <div class="m">${f.key === 'concept' ? (f.count === 0 ? '컨셉킬러 없음 — POC 핵심 결론' : '⚠ 컨셉 재검토 필요') : `종결 ${f.closed} · 진행 ${f.count - f.closed}`}</div></div>`).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>발굴 이슈 4분류 (전수)</h3><span class="ps">${st.total || 0}건 발굴 · 종결 ${st.closed || 0} · 진행 ${st.open || 0}</span></div>
      <div class="fourway">${cells}</div>
      <div class="mini mt">① 컨셉 리스크가 0이 아니게 되면 즉시 게이트 보류 → 컨셉 재검토. 정직한 분류가 이 단계 보고의 신뢰도를 결정.</div>
    </div>`;
}

function pocAbnormalPanel() {
  const rows = (DATA.abnormal || []).map(a => {
    const v = a.verdict || '';
    const cls = v.includes('PASS') ? 'b-ok' : v.includes('FAIL') ? 'b-crit' : 'b-wait';
    return `<tr><td>${esc(a.scenario)}</td><td class="c">${esc(a.recovery || '—')}</td><td class="c"><span class="badge ${cls}">${esc(v)}</span></td><td class="mini">${esc(a.notes || '')}</td></tr>`;
  }).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>비정상 상황 평가 (Fault Injection)</h3><span class="ps">의도적 이상 주입 → 복구 거동 검증 · 첫 MTTR 측정 지점</span></div>
      <table><tr><th>시나리오</th><th class="c">복구시간</th><th class="c">판정</th><th>비고</th></tr>${rows}</table>
    </div>`;
}

function pocRecordsPanel() {
  const rows = (DATA.issues || []).map(i => {
    const sevCls = SEV_BADGE[i.severity] || 'b-minor';
    const stCls = (i.status || '').includes('종결') ? 'b-ok' : (i.status || '').includes('검증') ? 'b-prog' : 'b-wait';
    return `<tr><td><b>${esc(i.id)}</b></td><td>${esc(i.mode)}</td><td class="c"><span class="badge ${sevCls}">${esc(sevLabel(i.severity) || i.severity)}</span></td><td>${esc(i.cause4)}</td><td class="mini">${esc(i.detail || '')}</td><td class="c">${esc(i.date || '')}</td><td class="c"><span class="badge ${stCls}">${esc(i.status)}</span></td></tr>`;
  }).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>이슈 레코드 (공통 스키마)</h3><span class="ps">POC 필수 5필드 — 버전·무발생검증<span class="req opt">선택</span>은 Pilot부터 필수</span></div>
      <div class="tbl-scroll"><table><tr><th>ID</th><th>고장모드 (표준분류)</th><th class="c">심각도</th><th>원인분류</th><th>상세</th><th class="c">발생일</th><th class="c">상태</th></tr>${rows}</table></div>
      <div class="mini mt">POC는 <b>보고 부담 최소화</b>가 원칙 — 필수 5필드(ID·고장모드·심각도·원인분류·상태)만 강제. docs/RECORD_SCHEMA.md</div>
    </div>`;
}

/* ── Pilot 전용 ── */
function pilotGrowthPanel() {
  const g = DATA.growth || [], target = DATA.growthTarget || 0;
  if (!g.length) return '';
  const top = 26, bot = 196, left = 64, right = 950, vbH = 236;
  const yMax = niceCeil(Math.max(target, ...g.map(w => w.mcbf)) * 1.05);
  const y = v => bot - v / yMax * (bot - top);
  const x = i => g.length === 1 ? (left + right) / 2 : left + (right - left) * i / (g.length - 1);
  const pts = g.map((w, i) => `${x(i)},${y(w.mcbf)}`).join(' ');
  const dots = g.map((w, i) => `<circle cx="${x(i)}" cy="${y(w.mcbf)}" r="${i === g.length - 1 ? 5.5 : 4}" fill="#2E89D6"${i === g.length - 1 ? ' stroke="#fff" stroke-width="1.5"' : ''}><title>W${w.week} · MCBF ${fmt(w.mcbf)}</title></circle>`).join('');
  const vers = (DATA.versions || []);
  const xlab = g.map((w, i) => `<text x="${x(i)}" y="${bot + 20}" font-size="13" fill="#6E7D90" text-anchor="middle">W${w.week}</text>`).join('');
  const last = g[g.length - 1];
  return `
    <div class="panel">
      <div class="ph"><h3>MCBF 성장곡선</h3><span class="ps">주차 누적 · 목표 ${fmt(target)}Cy — 수정개발이 안정화로 이어지는지의 정량 증거</span></div>
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

function pilotDisciplinePanels(C) {
  const a = DATA.actionRate || {}, rec = DATA.recurrence || {};
  const vers = DATA.versions || [];
  const curVer = vers.length ? vers[vers.length - 1].ver : '—';
  return `
    <div class="panel">
      <div class="ph"><h3>시정조치 규율</h3><span class="ps">모든 수정 → 검증 런 · 재발 추적</span></div>
      <div class="stat-big"><b>${a.pct != null ? a.pct : '—'}%</b><span>검증마감 ${a.closed || 0}/${a.total || 0}</span></div>
      <div class="prog-bar" style="height:10px"><i style="width:${a.pct || 0}%;background:var(--green)"></i></div>
      <div class="mini mt">재발 <b style="color:${rec.count ? 'var(--major)' : 'var(--green)'}">${rec.count || 0}건</b>${(rec.items || []).length ? ' — ' + rec.items.map(it => `${esc(it.mode)}(${it.count})`).join(', ') + '. 게이트 전 마감 필수.' : ' — 없음'}</div>
    </div>
    <div class="panel">
      <div class="ph"><h3>형상(버전) 기록</h3><span class="ps">고장 시점 버전 필수 — "구버전 고장" 입증 수단</span></div>
      <table>
        <tr><th style="width:90px">현재 SW</th><td><b>${esc(curVer)}</b></td></tr>
        <tr><th>버전 이력</th><td class="mini">${vers.map(v => `${esc(v.ver)} (${esc(v.date)})`).join(' → ') || '—'}</td></tr>
        <tr><th>동결 규칙</th><td class="mini">동결 후 변경 시 <b>300h 리셋</b> (docs/CRITERIA.md §3)</td></tr>
      </table>
    </div>`;
}

function pilotRecordsPanel() {
  const rows = (DATA.errors || []).map((e, i) => `
    <tr><td><b>${esc(e.code)}</b></td><td>${esc(e.type)}</td><td class="mini">${esc(e.cause || '')}</td><td class="mini">${esc(e.action || '')}</td>
    <td class="c">${esc(e.sw_ver || '—')}<span class="req must">필수</span></td><td class="c">${esc(e.hw_ver || '—')}</td>
    <td class="c">${esc(e.date || '')}</td><td class="c"><button class="btn" style="padding:3px 8px" onclick="openModal(${i})">＋상세</button></td></tr>`).join('');
  return `
    <div class="panel">
      <div class="ph"><h3>고장 레코드 (공통 스키마)</h3><span class="ps">Pilot부터 버전·무발생검증 <b>필수</b> — docs/RECORD_SCHEMA.md</span></div>
      <div class="tbl-scroll"><table><tr><th>코드</th><th>고장모드</th><th>근본원인</th><th>시정조치</th><th class="c">SW버전</th><th class="c">HW버전</th><th class="c">발생일</th><th class="c">상세</th></tr>${rows}</table></div>
    </div>`;
}

/* ── 진입점 ── */
function renderDev(stage) {
  const C = DATA.config || {};
  const prj = C.project || {};
  const g = C.gate || {};
  const isPoc = stage === 'poc';
  const qbox = isPoc
    ? `이 단계의 질문: <b>“이 고장모드는 컨셉의 병인가, 고칠 수 있는 병인가?”</b> — 표본이 작고 설계가 유동적이므로 통계(MTBF) 대신 <b>전수 4분류</b>로 보고.`
    : `이 단계의 질문: <b>“우리는 수렴하고 있는가?”</b> — 증거는 세 가지: <b>성장곡선의 기울기 · 줄어드는 Pareto · 재발 0</b>. 모든 수정에 검증 런, 모든 기록에 버전.`;

  const head = `
    <div class="ptitle">
      <span class="stagechip ${STAGE_CHIP[stage]}">${esc(STAGE_LABEL[stage])}</span>
      <span class="tmpl">템플릿 ① 개발 — ${isPoc ? 'POC' : 'Pilot'} 모드</span>
      <span class="meta">PM <b>${esc((prj.team || '').split(',')[0] || '—')}</b> · 기간 <b>${esc(prj.startDate || '')} ~ ${esc(prj.endDate || '')}</b> · ${esc(g.label || '게이트 리뷰')} <b>${esc(g.reviewDate || '—')} ${esc(typeof ddayLabel === 'function' ? ddayLabel(g.reviewDate) : '')}</b></span>
    </div>`;

  const stagePanels = isPoc ? `
      <div class="grid g23">${pocFourwayPanel()}${devParetoPanel(false)}</div>
      <div class="grid g2 mt">${devRunPanel(C)}${pocAbnormalPanel()}</div>`
    : `
      <div class="grid g23">${pilotGrowthPanel()}${devParetoPanel(true)}</div>
      <div class="grid g3 mt">${devRunPanel(C)}${pilotDisciplinePanels(C)}</div>`;

  $('s-overview').innerHTML = `
    ${head}
    <div class="sbox-h"><span class="tag">단계 진행</span><h2>${esc(T('overview.stageTitle', '세부 단계'))}</h2><span class="d">${esc(T('overview.stageSub', ''))}</span></div>
    ${lifecycleStagePanel(C)}
    ${devGatePanel(C)}
    <div class="sbox-h mt"><span class="tag">신뢰성 트랙</span><h2>에러 분석 — ${isPoc ? 'POC' : 'Pilot'} 방식</h2><span class="d">${isPoc ? '지표(MTBF) 없음 — 발굴·분류가 목적' : '개별 사건이 아니라 추세로 보고'}</span></div>
    <div class="qbox">${qbox}</div>
    ${stagePanels}
    <div class="sbox-h mt"><span class="tag">기록</span><h2>레코드 (공통 스키마)</h2><span class="d">전 과제·전 단계 동일 컬럼 구조</span></div>
    ${isPoc ? pocRecordsPanel() : pilotRecordsPanel()}`;

  // 개발 템플릿에는 라인 레이아웃·월 스냅샷이 없음 — 이전 과제 잔상 제거
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
  $('s-steps').innerHTML = '';
}
