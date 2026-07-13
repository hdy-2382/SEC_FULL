/* tpl-ops.js — 템플릿③ 양산 적용 (확산 모드 / 운영·관제 모드).
   진입점 renderOps(stage) — app.js의 renderData()가 stage(spread|ops)에 따라 호출.

   페이지 골격은 케미컬(양산평가)과 동일한 공유 셸(devShell, tpl-dev.js)을 재사용한다.
   골격(배관)은 공통, 렌즈만 단계별(docs/PROCESS.md §2.5·§3):
     확산 = "설계의 병인가, 이 호기만의 병인가" — 호기별 퀄(설치→SAT→축약 런) · 원인계층 · 호기별 층화
     운영 = "어떤 고장부터 없애는 게 경제적인가" — 월간 RAM · 알람→FRACAS 승격 · 다운타임 Pareto · CIP */

/* 원인계층 → 칩 클래스 (CAUSE_LAYER_MAP 키워드와 동일 규칙) */
function layerKey(c) {
  const s = String(c || '');
  if (s.includes('설계')) return 'design';
  if (s.includes('제작') || s.includes('조립')) return 'build';
  if (s.includes('설치') || s.includes('시공')) return 'install';
  if (s.includes('운영') || s.includes('환경') || s.includes('조작')) return 'oper';
  return '';
}
function layerChip(c) {
  const k = layerKey(c);
  return k ? `<span class="c4 c4-${k}">${esc(c)}</span>` : esc(c || '—');
}

/* ══════════ 확산 렌즈 ══════════ */

/* [트랙 A 상단] 함대 퀄 히어로 — 퀄 완료 호기 n/m (설치→SAT→축약 런) */
function spreadFleetHero(C) {
  const f = DATA.fleet || {}, g = C.gate || {};
  const pct = Math.max(0, Math.min(100, f.pct || 0));
  const esc9 = DATA.escalations || [];
  const dday = (typeof ddayLabel === 'function' && g.reviewDate) ? ddayLabel(g.reviewDate) : '';
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>호기별 양산 퀄 — 설치→SAT→축약 런</span><span class="pg-subh-note">기준 구성 동결 · ${esc((C.run || {}).criterion || '')} ${fmt((C.run || {}).target)}h</span></div>
    <div class="pg-hero">
      <div class="pg-hero-main">
        <div class="pg-num"><b>${f.qualified || 0}</b><span>/ ${f.total || 0} 호기 퀄 완료</span></div>
        <div class="pg-bar"><i style="width:${pct}%"></i></div>
        <div class="pg-remain">SAT 통과 <b>${f.satDone || 0}</b> · 잔여 <b>${Math.max(0, (f.total || 0) - (f.qualified || 0))}호기</b></div>
      </div>
      <div class="pg-donut"><svg viewBox="0 0 42 42"><circle class="trk" cx="21" cy="21" r="15.9"/><circle class="arc" cx="21" cy="21" r="15.9" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/></svg><div class="pg-donut-ctr"><b>${Math.round(pct)}%</b></div></div>
    </div>
    <div class="pg-stats">
      <div class="pg-stat"><span class="pg-stat-k">설계성 고장 (전 함대 리스크)</span><span class="pg-stat-v" style="color:${esc9.length ? 'var(--crit)' : 'var(--green)'}">${esc9.length}<small>건</small></span>
        <span class="pg-stat-s">${esc9.length ? '즉시 에스컬레이션 — 전 호기 전개 상태 아래 참조' : '없음 — 호기 국소 이슈만'}</span></div>
      ${devStatGate(C)}
    </div></div>`;
}

/* [트랙 A 차트 자리] 호기별 퀄 현황 표 — 설치→SAT→축약 런 진행 */
function spreadUnitPanel() {
  const rows = (DATA.units || []).map(u => {
    const pct = u.runTarget ? Math.min(100, Math.round(u.runH / u.runTarget * 100)) : 0;
    const sat = String(u.sat || '');
    const satBadge = sat.includes('PASS') ? 'b-ok' : sat.includes('진행') ? 'b-prog' : 'b-wait';
    const stBadge = String(u.status || '').includes('완료') ? 'b-ok' : String(u.status || '').includes('진행') ? 'b-prog' : 'b-wait';
    return `<tr><td><b>${esc(u.unit)}</b></td><td class="c">${esc(u.line || '')}</td><td class="c">${esc((u.installDate || '').slice(5))}</td>
      <td class="c"><span class="badge ${satBadge}">${esc(sat || '—')}</span></td>
      <td><div class="prog-bar"><i style="width:${pct}%;${pct >= 100 ? 'background:var(--green)' : ''}"></i></div><span class="mini">${fmt(u.runH)}/${fmt(u.runTarget)}h</span></td>
      <td class="c"><span class="badge ${stBadge}">${esc(u.status || '')}</span></td><td class="mini">${esc(u.notes || '')}</td></tr>`;
  }).join('');
  return `<div class="panel tight">
    <div class="ph"><h3>호기별 퀄 현황</h3><span class="ps">동일 컴포넌트·축약 파라미터 — 호기별 SAT 런 (사전 확정)</span></div>
    <div class="tbl-scroll" style="max-height:420px"><table><tr><th>호기</th><th class="c">라인</th><th class="c">설치</th><th class="c">SAT</th><th>축약 런</th><th class="c">상태</th><th>비고</th></tr>${rows}</table></div>
  </div>`;
}

/* [트랙 B 상단] 원인계층 보드 — 설계성 고장이 히어로 (0건 유지가 확산의 결론) */
function spreadLayerBoard() {
  const layers = DATA.causeLayer || [], st = DATA.issueStats || {};
  const by = {}; layers.forEach(l => { by[l.key] = l; });
  const des = by.design || { count: 0, label: '① 설계' };
  const ok = des.count === 0;
  const tile = (l, cls) => l ? `<div class="fwt ${cls}"><div class="t">${esc(l.label)}</div><div class="n">${l.count}<small>건</small></div><div class="m">종결 ${l.closed} · 진행 ${l.count - l.closed}</div></div>` : '';
  const SEG = { build: ['sg-build', '제작·조립'], install: ['sg-install', '설치·시공'], oper: ['sg-oper', '운영·환경'] };
  const segs = ['build', 'install', 'oper'].map(k => {
    const l = by[k]; if (!l || !l.count) return '';
    return `<div class="sg ${SEG[k][0]}" style="flex:${l.count}"><span>${SEG[k][1]} ${l.count}</span></div>`;
  }).join('');
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>고장 원인계층 (전수)</span><span class="pg-subh-note">${st.total || 0}건 · "설계의 병인가, 이 호기만의 병인가"</span></div>
    <div class="fw-board">
      <div class="fwt risk hero${ok ? '' : ' hero-bad'}">
        <div class="hero-n ${ok ? 'ok' : 'bad'}">${des.count}<small>건</small></div>
        <div class="hero-tx"><div class="t">${esc(des.label)} — 전 함대 리스크</div>
          <div class="m">${ok ? '설계성 고장 없음 — 잔여는 호기 국소 이슈' : '<b>⚠ 즉시 에스컬레이션</b> — 전 호기 개선 전개 · 완료까지 확산 게이트 보류'}</div></div>
        ${ok ? '<span class="fw-badge">확산의 성적표</span>' : ''}
      </div>
      ${tile(by.build, 'build')}${tile(by.install, 'install')}${tile(by.oper, 'oper')}
    </div>
    <div class="compo"><div class="sg sg-zero">설계 ${des.count}</div>${segs}</div>
    <div class="mini mt">설계성 고장은 <b>한 호기의 사건이 아니라 전 함대의 리스크</b> — 나머지 계층은 해당 호기·라인에서 국소 조치한다.</div>
  </div>`;
}

/* 호기별 층화 — 이슈가 특정 호기에 몰리는가 (설치·시공 병의 시그널) */
function spreadUnitDistPanel() {
  const rows = DATA.unitDist || [];
  const max = Math.max(...rows.map(r => r.count), 1);
  const tr = rows.map(r => `
    <tr><td><b>${esc(r.unit)}</b></td>
    <td style="width:110px"><div class="prog-bar"><i style="width:${Math.round(r.count / max * 100)}%"></i></div><span class="mini">${r.count}</span></td></tr>`).join('');
  return `<div class="panel">
    <div class="ph"><h3>호기별 층화</h3><span class="ps">특정 호기 집중 = 설치·시공/개체 병 · 고른 분포 = 설계·공통 병</span></div>
    <div class="tbl-scroll" style="max-height:300px"><table><tr><th>호기</th><th>이슈 건수</th></tr>${tr}</table></div>
  </div>`;
}

/* 확산 상세 탭 */
function spreadSteps(C) {
  const all = (DATA.issues || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const rows = all.map(i => {
    const idx = (DATA.issues || []).indexOf(i);
    const b = pocStBucket(i.status);
    const recur = i.recurOf ? `<span class="rlink">↺ ${esc(i.recurOf)}</span>` : '—';
    return `<tr><td><b>${esc(i.id)}</b></td><td class="c">${esc((i.date || '').slice(5))}</td><td>${esc(i.mode)}</td>
      <td class="c">${layerChip(i.cause4)}</td><td class="c"><span class="badge ${SEV_BADGE[i.severity] || 'b-minor'}">${esc(sevLabel(i.severity))}</span></td>
      <td class="c"><b>${esc(i.unit || '—')}</b></td><td class="c">${recur}</td>
      <td class="c"><span class="badge ${POC_ST_BADGE[b]}">${esc(i.status || '—')}</span></td>
      <td class="c">${esc(i.verify || '—')}</td><td class="c">${esc(i.closedDate || '—')}</td><td class="mini">${esc(i.detail || '')}</td>
      <td class="c"><button class="btn" style="padding:3px 8px" onclick="openIssueModal(${idx})">＋</button></td></tr>`;
  }).join('');
  return `<div class="pocv">
    <div class="sbox-h"><span class="tag">평가 상세</span><h2>평가 상세 내역 — 원본 기록</h2><span class="d">이슈로그(원인계층·호기 필수) + 호기퀄 — 공통 레코드 스키마</span></div>
    <section class="step" id="d1">
      ${stepHead(1, '이슈 대장 (전수)', '"설계의 병인가, 이 호기만의 병인가" — 원인계층 분류 + 호기별 층화', `${all.length}건`, 'prog')}
      <div class="step-body"><div class="panel">
        <div class="ph"><h3>공통 레코드 스키마 — 확산부터 호기/라인 필수</h3><span class="ps">설계성 고장 = 전 함대 리스크 (docs/RECORD_SCHEMA.md §3)</span></div>
        <div class="tbl-scroll" style="max-height:460px"><table><tr><th>ID</th><th class="c">발생</th><th>고장모드</th><th class="c">원인계층</th><th class="c">심각도</th><th class="c">호기</th><th class="c">재발</th><th class="c">상태</th><th class="c">무발생검증</th><th class="c">종결일</th><th>상세</th><th class="c">보기</th></tr>${rows}</table></div>
      </div></div>
    </section>
    <section class="step" id="d2">
      ${stepHead(2, '호기별 양산 퀄', '기준 구성 동결 상태에서 설치→SAT→축약 무고장 런 — 파라미터 사전 확정', devGateValue('auto:fleet'), 'prog')}
      <div class="step-body">${spreadUnitPanel()}</div>
    </section>
    <section class="step" id="d3">
      ${stepHead(3, '단계 진행 · 확산 완료 기준', '사전 확정된 잣대 — 데이터 이후 변경·재해석 금지', `리뷰 ${(C.gate || {}).reviewDate || '—'}`, 'prog')}
      <div class="step-body">${lifecycleStagePanel(C)}${devGatePanel(C)}</div>
    </section>
  </div>`;
}

/* ══════════ 운영/관제 렌즈 ══════════ */

/* [트랙 A 상단] 월간 RAM 히어로 — 이번 달 가동률 vs 목표 */
function opsRamHero(C) {
  const r = DATA.ram || {}, cur = r.current || {}, al = DATA.alarms || {};
  const target = r.availTarget || 98;
  const pct = Math.max(0, Math.min(100, target ? (cur.avail || 0) / target * 100 : 0));
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>가동률 — ${esc(String(cur.month || '이번 달'))}</span><span class="pg-subh-note">목표 ${target}% · 함대 ${esc((C.run || {}).env || '')}</span></div>
    <div class="pg-hero">
      <div class="pg-hero-main">
        <div class="pg-num"><b>${cur.avail != null ? cur.avail : '—'}</b><span>% / 목표 ${target}%</span></div>
        <div class="pg-bar"><i style="width:${pct}%;${(cur.avail || 0) >= target ? 'background:var(--green)' : ''}"></i></div>
        <div class="pg-remain">MTBF <b>${fmt(cur.mtbf)}h</b> · MTTR <b>${fmt(cur.mttr)}분</b> · 다운타임 <b>${fmt(cur.downtime)}h</b></div>
      </div>
      <div class="pg-donut"><svg viewBox="0 0 42 42"><circle class="trk" cx="21" cy="21" r="15.9"/><circle class="arc" cx="21" cy="21" r="15.9" style="stroke:${(cur.avail || 0) >= target ? 'var(--green)' : 'var(--sky)'}" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/></svg><div class="pg-donut-ctr"><b>${cur.avail != null ? cur.avail : '—'}%</b></div></div>
    </div>
    <div class="pg-stats">
      <div class="pg-stat"><span class="pg-stat-k">알람 → FRACAS 승격 (YTD)</span><span class="pg-stat-v">${fmt(al.promoted)}<small>/${fmt(al.total)} (${al.rate != null ? al.rate : '—'}%)</small></span>
        <div class="pg-mini"><i style="width:${Math.min(100, (al.rate || 0) * 10)}%;background:var(--sky)"></i></div>
        <span class="pg-stat-s">승격 기준 사전 확정 — 정지 유발 또는 반복 발생</span></div>
      ${devStatGate(C)}
    </div></div>`;
}

/* [트랙 A 차트] 월간 RAM 추이 — 가동률(단일 축) + 목표선 */
function opsRamTrendPanel(opt) {
  const ms = (DATA.ram || {}).months || [];
  if (!ms.length) return '';
  const target = (DATA.ram || {}).availTarget || 98;
  const top = 22, bot = 396, left = 56, right = 962, vbH = 448;
  const vals = ms.map(m => m.avail);
  const yMin = Math.floor(Math.min(...vals, target) - 1), yMax = Math.ceil(Math.max(...vals, target) + 0.5);
  const x = i => ms.length === 1 ? (left + right) / 2 : left + (right - left) * i / (ms.length - 1);
  const y = v => bot - (v - yMin) / (yMax - yMin || 1) * (bot - top);
  let axis = '';
  for (let k = 0; k <= 4; k++) {
    const v = yMin + (yMax - yMin) * (1 - k / 4), yy = y(v);
    axis += `<line x1="${left}" y1="${yy}" x2="${right}" y2="${yy}" stroke="${k === 4 ? '#C9DCEC' : '#EAF0F6'}"/>`;
    axis += `<text x="${left - 8}" y="${yy + 4}" font-size="11.5" fill="#8A99AC" text-anchor="end">${v.toFixed(1)}%</text>`;
  }
  const xaxis = ms.map((m, i) => `<text x="${x(i)}" y="${bot + 20}" font-size="12.5" fill="#5A6B7E" text-anchor="middle">${esc(String(m.month).slice(5))}월</text>`).join('');
  const pts = ms.map((m, i) => `${x(i)},${y(m.avail)}`).join(' ');
  const dots = ms.map((m, i) => `<circle cx="${x(i)}" cy="${y(m.avail)}" r="${i === ms.length - 1 ? 5.5 : 4}" fill="#2E89D6"${i === ms.length - 1 ? ' stroke="#fff" stroke-width="1.5"' : ''}><title>${esc(String(m.month))} · 가동률 ${m.avail}% · MTBF ${m.mtbf}h · MTTR ${m.mttr}분</title></circle>`).join('');
  const last = ms[ms.length - 1];
  return `<div class="panel tight ovchart"${opt && opt.zoom ? ` onclick="openDevChart('ram')" title="클릭하면 크게 보기"` : ''}>
    <div class="ph"><h3>월간 가동률 추이</h3><span class="ps">상시 RAM — 목표 ${target}% · MTBF/MTTR은 상세 탭${opt && opt.zoom ? ' ⤢' : ''}</span></div>
    <svg viewBox="0 0 1000 ${vbH}" style="width:100%;height:auto;display:block" role="img" aria-label="월별 가동률 추이">
      ${axis}
      <line x1="${left}" y1="${y(target)}" x2="${right}" y2="${y(target)}" stroke="#E08600" stroke-width="1.5" stroke-dasharray="5 4"/>
      <text x="${right - 4}" y="${y(target) - 7}" font-size="12.5" fill="#B36F0A" font-weight="700" text-anchor="end">목표 ${target}%</text>
      <line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/>
      <polyline fill="none" stroke="#2E89D6" stroke-width="2.2" points="${pts}"/>${dots}
      <text x="${x(ms.length - 1)}" y="${y(last.avail) - 13}" font-size="13.5" font-weight="800" fill="#0F2E54" text-anchor="middle">${last.avail}%</text>
      ${xaxis}</svg>
    <div class="clegend"><span><i style="background:#2E89D6"></i>월 가동률</span><span><i style="background:#E08600"></i>목표 (점선)</span></div>
  </div>`;
}

/* [트랙 B 상단] 다운타임 Pareto — "어떤 고장부터 없애는 게 경제적인가" */
function opsDownParetoBoard() {
  const rows = DATA.downPareto || [];
  const max = rows.length ? rows[0].minutes : 1;
  const tr = rows.map(r => `
    <tr><td>${esc(r.mode)}</td>
    <td style="width:130px"><div class="prog-bar"><i style="width:${Math.round(r.minutes / max * 100)}%;background:var(--major)"></i></div><span class="mini">${fmt(r.minutes)}분</span></td>
    <td class="r">${r.cumPct}%</td></tr>`).join('');
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>다운타임 Pareto</span><span class="pg-subh-note">건수가 아니라 손실 시간 순 — CIP 우선순위의 근거</span></div>
    <table><tr><th>고장모드</th><th>다운타임</th><th class="r">누적</th></tr>${tr}</table>
    <div class="mini mt">건수 Pareto(아래)와 순서가 다르면 — <b>드물지만 오래 세우는 고장</b>이 먼저다.</div>
  </div>`;
}

/* CIP 패널 — 다운타임 Pareto 상위 모드를 없애는 개선과제 */
function opsCipPanel() {
  const rows = (DATA.cip || []).map(c => {
    const stCls = String(c.status || '').includes('완료') ? 'b-ok' : String(c.status || '').includes('검증') ? 'b-prog' : 'b-wait';
    return `<tr><td><b>${esc(c.id)}</b></td><td>${esc(c.topic || '')}</td><td class="c">${esc(c.target || '')}</td>
      <td class="c"><span class="badge ${stCls}">${esc(c.status || '')}</span></td><td class="mini">${esc(c.effect || '')}</td></tr>`;
  }).join('');
  return `<div class="panel">
    <div class="ph"><h3>CIP (개선과제)</h3><span class="ps">Pareto 상위 모드 → 개선 → 효과 검증 · 필드 고장모드는 차기 FMEA로 환류</span></div>
    <div class="tbl-scroll" style="max-height:300px"><table><tr><th>ID</th><th>과제</th><th class="c">대상 모드</th><th class="c">상태</th><th>효과</th></tr>${rows}</table></div>
  </div>`;
}

/* 운영 상세 탭 */
function opsSteps(C) {
  const all = (DATA.issues || []).slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const rows = all.map(i => {
    const idx = (DATA.issues || []).indexOf(i);
    const b = pocStBucket(i.status);
    const recur = i.recurOf ? `<span class="rlink">↺ ${esc(i.recurOf)}</span>` : '—';
    return `<tr><td><b>${esc(i.id)}</b></td><td class="c">${esc((i.date || '').slice(5))}</td><td>${esc(i.mode)}</td>
      <td class="c">${layerChip(i.cause4)}</td><td class="c"><span class="badge ${SEV_BADGE[i.severity] || 'b-minor'}">${esc(sevLabel(i.severity))}</span></td>
      <td class="c"><b>${esc(i.unit || '—')}</b></td><td class="c">${fmt(i.downtime)}분</td><td class="c">${recur}</td>
      <td class="c"><span class="badge ${POC_ST_BADGE[b]}">${esc(i.status || '—')}</span></td>
      <td class="c">${esc(i.verify || '—')}</td><td class="mini">${esc(i.detail || '')}</td>
      <td class="c"><button class="btn" style="padding:3px 8px" onclick="openIssueModal(${idx})">＋</button></td></tr>`;
  }).join('');
  const mrows = ((DATA.ram || {}).months || []).map(m =>
    `<tr><td>${esc(String(m.month))}</td><td class="c"><b>${m.avail}%</b></td><td class="c">${fmt(m.mtbf)}</td><td class="c">${fmt(m.mttr)}</td><td class="c">${fmt(m.downtime)}</td><td class="c">${fmt(m.alarms)}</td><td class="c">${fmt(m.promoted)}</td></tr>`).join('');
  return `<div class="pocv">
    <div class="sbox-h"><span class="tag">평가 상세</span><h2>평가 상세 내역 — 원본 기록</h2><span class="d">필드 FRACAS(승격 건) + 월간 RAM + CIP — 공통 레코드 스키마</span></div>
    <section class="step" id="d1">
      ${stepHead(1, '필드 FRACAS 대장 (승격 건)', '알람 전수가 아니라 승격 기준(정지 유발·반복)을 넘은 건만 — 다운타임·호기 필수', `${all.length}건`, 'prog')}
      <div class="step-body"><div class="panel">
        <div class="ph"><h3>공통 레코드 스키마 — 운영 단계</h3><span class="ps">다운타임(분)이 비용 Pareto의 원천 (docs/PROCESS.md §3)</span></div>
        <div class="tbl-scroll" style="max-height:460px"><table><tr><th>ID</th><th class="c">발생</th><th>고장모드</th><th class="c">원인계층</th><th class="c">심각도</th><th class="c">호기</th><th class="c">다운타임</th><th class="c">재발</th><th class="c">상태</th><th class="c">무발생검증</th><th>상세</th><th class="c">보기</th></tr>${rows}</table></div>
      </div></div>
    </section>
    <section class="step" id="d2">
      ${stepHead(2, '월간 RAM 지표', '통합관제 산출 — 가동률·MTBF·MTTR·다운타임·알람/승격', `${((DATA.ram || {}).months || []).length}개월`, 'prog')}
      <div class="step-body"><div class="panel">
        <div class="ph"><h3>월간 지표</h3><span class="ps">월간 RAM 보고의 원천 데이터</span></div>
        <table><tr><th>월</th><th class="c">가동률</th><th class="c">MTBF(h)</th><th class="c">MTTR(분)</th><th class="c">다운타임(h)</th><th class="c">알람</th><th class="c">승격</th></tr>${mrows}</table>
      </div></div>
    </section>
    <section class="step" id="d3">
      ${stepHead(3, 'CIP · FMEA 환류', 'Pareto 상위 모드 개선 → 효과 검증 → 필드 고장모드를 차기 과제 FMEA로', `${(DATA.cip || []).length}건`, 'prog')}
      <div class="step-body">${opsCipPanel()}</div>
    </section>
    <section class="step" id="d4">
      ${stepHead(4, '운영 체계 · SLA 기준', '사전 확정된 잣대 — 월간 RAM 리뷰 고정 안건', `리뷰 ${(C.gate || {}).reviewDate || '—'}`, 'prog')}
      <div class="step-body">${lifecycleStagePanel(C)}${devGatePanel(C)}</div>
    </section>
  </div>`;
}

/* ══════════ 진입점 ══════════ */

function opsHead(stage, C) {
  const prj = C.project || {}, g = C.gate || {};
  return `
    <div class="ptitle">
      <span class="stagechip ${STAGE_CHIP[stage]}">${esc(STAGE_LABEL[stage])}</span>
      <span class="tmpl">템플릿 ③ 양산 적용 — ${stage === 'spread' ? '확산' : '운영/관제'} 모드</span>
      <span class="meta">PM <b>${esc((prj.team || '').split(',')[0] || '—')}</b> · 기간 <b>${esc(prj.startDate || '')} ~ ${esc(prj.endDate || '')}</b> · ${esc(g.label || '리뷰')} <b>${esc(g.reviewDate || '—')} ${esc(typeof ddayLabel === 'function' ? ddayLabel(g.reviewDate) : '')}</b></span>
    </div>`;
}

/* 확산 관제 — 케미컬 골격(devShell) + 확산 렌즈 */
function renderSpread(C) {
  $('s-overview').innerHTML = devShell('spread', C, {
    head: opsHead('spread', C),
    qbox: `이 단계의 질문: <b>“설계의 병인가, 이 호기만의 병인가?”</b> — 고장을 <b>원인계층(설계/제작·조립/설치·시공/운영·환경)</b>으로 분류하고 호기별로 층화한다. 설계성 고장은 한 호기의 사건이 아니라 <b>전 함대의 리스크</b> — 즉시 에스컬레이션.`,
    aTitle: '완주 진행 → 함대 퀄 · 연결된 지표',
    aHero: spreadFleetHero(C),
    aChart: spreadUnitPanel(),
    bTitle: '원인계층 → 전 함대 리스크 · 연결된 지표',
    bTop: spreadLayerBoard(),
    bCharts: [fracasLoopPanel(), spreadUnitDistPanel()],
    cTitle: '고장 분석 · 위험 매트릭스 · Pareto · 최근 알람',
    cPanels: [devMatrixPanel(), devParetoPanel(true), devPriorityPanel()],
  });
  $('s-steps').innerHTML = spreadSteps(C);
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
}

/* 운영/관제 — 케미컬 골격(devShell) + 운영 렌즈 */
function renderOpsMode(C) {
  $('s-overview').innerHTML = devShell('ops', C, {
    head: opsHead('ops', C),
    qbox: `이 단계의 질문: <b>“어떤 고장부터 없애는 게 경제적인가?”</b> — 알람은 자동 수집하고 <b>승격 기준을 넘은 건만 필드 FRACAS</b>로 관리. 우선순위는 건수가 아니라 <b>다운타임(비용) Pareto</b>가 정하고, 개선은 CIP로 닫고, 고장모드는 차기 과제 FMEA로 환류한다.`,
    aTitle: '운영 성과 → 월간 RAM · 연결된 지표',
    aHero: opsRamHero(C),
    aChart: opsRamTrendPanel({ zoom: true }),
    bTitle: '필드 FRACAS → 비용 우선순위 · 연결된 지표',
    bTop: opsDownParetoBoard(),
    bCharts: [fracasLoopPanel(), devMatrixPanel()],
    cTitle: '고장 분석 · Pareto(건수) · CIP · 최근 알람',
    cPanels: [devParetoPanel(true), opsCipPanel(), devPriorityPanel()],
  });
  $('s-steps').innerHTML = opsSteps(C);
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
}

function renderOps(stage) {
  const C = DATA.config || {};
  return stage === 'spread' ? renderSpread(C) : renderOpsMode(C);
}
