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
  if (v === 'auto:abnormal') {
    const abn = DATA.abnormal || [];
    const pass = abn.filter(a => (a.verdict || '').includes('PASS')).length;
    const fail = abn.filter(a => (a.verdict || '').includes('FAIL')).length;
    return `${pass}/${abn.length} PASS${fail ? ` · ${fail} 재시험` : ''}`;
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

/* ── POC 전용 (관제형 — 케미컬 tpl-mass의 '한눈에 보기' 구성을 따름) ──
   프레임: ① 게이트까지의 거리(합의된 종점) ② 전수 4분류(컨셉 리스크 0 입증)
   ③ 폐루프 FRACAS(조치는 '닫혔다') ④ 수렴 추이(누적 발견 vs 종결) ⑤ 이슈 대장. */

/* 폐루프 상태 버킷 (빌드 _status_bucket과 동일 규칙) */
function pocStBucket(st) {
  st = st || '';
  if (/종결|완료/.test(st)) return 'closed';
  if (st.includes('검증')) return 'verifying';
  if (/조치|분석|진행/.test(st)) return 'acting';
  return 'new';
}
const POC_ST_BADGE = { closed: 'b-ok', verifying: 'b-prog', acting: 'b-wait', new: 'b-crit' };

/* 4분류 → 칩 클래스 (FOURWAY_MAP 키워드와 동일 규칙) */
function c4Key(c) {
  const s = String(c || '').toLowerCase();
  if (s.includes('컨셉')) return 'risk';
  if (s.includes('설계')) return 'design';
  if (s.includes('구현') || s.includes('sw') || s.includes('버그')) return 'sw';
  if (s.includes('환경') || s.includes('시험')) return 'env';
  return '';
}
function c4Chip(c) {
  const k = c4Key(c);
  return k ? `<span class="c4 c4-${k}">${esc(c)}</span>` : esc(c || '—');
}

/* 무고장 런 히어로 (kg-prog 스타일) + 비정상 시나리오·게이트 리뷰 D-day 보조 스탯 */
function pocRunHero(C) {
  const run = DATA.run || {}, rc = C.run || {}, g = C.gate || {};
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
  const abn = DATA.abnormal || [];
  const abnPass = abn.filter(a => (a.verdict || '').includes('PASS')).length;
  const abnFail = abn.filter(a => (a.verdict || '').includes('FAIL')).length;
  const dday = (typeof ddayLabel === 'function' && g.reviewDate) ? ddayLabel(g.reviewDate) : '';
  return `<div class="kgroup kg-prog">
    <div class="pg-subh"><span>무고장 런 — ${esc(rc.criterion || '무에러')} ${fmt(run.target)}${esc(rc.unit || 'h')}</span><span class="pg-subh-note">환경 ${esc(rc.env || '—')} · 리셋 규칙 사전 확정</span></div>
    <div class="pg-hero">
      <div class="pg-hero-main">
        <div class="pg-num"><b>${fmt(run.cum)}</b><span>/ ${fmt(run.target)}${esc(rc.unit || 'h')}${run.attempt > 1 ? ` · ${run.attempt}차 시도` : ''}</span></div>
        <div class="pg-bar pg-bar-mk"><i style="width:${pct}%"></i>${mark}</div>
        <div class="pg-remain">남은 <b>${fmt(remain)}${esc(rc.unit || 'h')}</b> · 리셋 <b>${resets.length}회</b> · 누적 가동 ${fmt(run.totalHours)}h</div>
      </div>
      <div class="pg-donut"><svg viewBox="0 0 42 42"><circle class="trk" cx="21" cy="21" r="15.9"/><circle class="arc" cx="21" cy="21" r="15.9" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="25"/></svg><div class="pg-donut-ctr"><b>${Math.round(pct)}%</b></div></div>
    </div>
    <div class="pg-stats">
      <div class="pg-stat"><span class="pg-stat-k">비정상 시나리오 (Fault Injection)</span><span class="pg-stat-v">${abnPass}<small>/${abn.length} PASS</small></span>
        <div class="pg-mini"><i style="width:${abn.length ? Math.round(abnPass / abn.length * 100) : 0}%;background:var(--sky)"></i></div>
        <span class="pg-stat-s">${abnFail ? `FAIL ${abnFail}건 — 개선 후 재시험` : '미통과 없음 · 잔여는 일정 확정'}</span></div>
      <div class="pg-stat"><span class="pg-stat-k">${esc(g.label || '게이트 리뷰')}</span><span class="pg-stat-v">${esc(dday || '—')}</span>
        <span class="pg-stat-s">${esc(g.reviewDate || '—')} · 리셋은 실패가 아니라 <b>잣대가 지켜진다는 증거</b></span></div>
    </div></div>`;
}

/* 전수 4분류 보드 — 컨셉 리스크 0이 히어로. "건수가 아니라 분류가 결론" */
function pocFourwayBoard() {
  const fw = DATA.fourway || [], st = DATA.issueStats || {};
  const by = {}; fw.forEach(f => { by[f.key] = f; });
  const con = by.concept || { count: 0, label: '① 컨셉 리스크' };
  const ok = con.count === 0;
  const tile = (f, cls) => f ? `<div class="fwt ${cls}"><div class="t">${esc(f.label)}</div><div class="n">${f.count}<small>건</small></div><div class="m">종결 ${f.closed} · 진행 ${f.count - f.closed}</div></div>` : '';
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
        <div class="hero-tx"><div class="t">${esc(con.label)}</div>
          <div class="m">${ok ? '이 아키텍처로 해결 불가한 병 — <b>0건 유지가 POC의 결론</b>' : '<b>⚠ 컨셉 재검토 필요</b> — 즉시 게이트 보류'}</div></div>
        ${ok ? '<span class="fw-badge">POC의 성적표</span>' : ''}
      </div>
      ${tile(by.design, 'design')}${tile(by.impl, 'sw')}${tile(by.env, 'env')}
    </div>
    <div class="compo"><div class="sg sg-zero">컨셉 ${con.count}</div>${segs}</div>
    <div class="mini mt">"에러가 많이 났다"가 아니라 <b>"아키텍처를 죽이는 에러는 없었다"</b>로 읽는다 — 랩에서 찾은 에러는 싸고, 라인에서 찾은 에러는 비싸다. 정직한 분류가 이 보고의 신뢰도를 결정.</div>
  </div>`;
}

/* 폐루프 FRACAS — 신규→조치중→검증중(무발생 감시)→종결 + 재발 시그널.
   POC·Pilot 공용 컴포넌트 (배관은 전 단계 하나, 렌즈만 단계별 — 공통 레코드 스토어 DATA.records 기반) */
function fracasLoopPanel(opts) {
  opts = opts || {};
  const sd = DATA.statusDist || {}, rec = DATA.recurrence || {};
  const box = (k, label, sub) => `<div class="lp lp-${k}"><div class="n">${sd[k] || 0}</div><div class="t">${label}</div><div class="s">${sub}</div></div>`;
  const verifying = (DATA.records || []).filter(r => pocStBucket(r.status) === 'verifying' && r.verify);
  const vlist = verifying.map(r => `<b>${esc(r.id)}</b> ${esc(r.verify)}`).join(' · ');
  const recItems = (rec.items || []).map(it => `${esc(it.mode)}(${it.count})`).join(', ');
  const recNote = opts.recurZeroGate
    ? `↺ 재발(만성) 모드 <b>${rec.count || 0}개</b> — 게이트 전 마감 필수(재발 0)${recItems ? ` · ${recItems}` : ''}`
    : `↺ 재발 모드 <b>${rec.count || 0}개</b> — 동일 고장모드 재출현 = 근본원인 미해결 신호 → 재분석 의무${recItems ? ` · ${recItems}` : ''}`;
  return `<div class="panel looppanel${opts.mt ? ' mt' : ''}">
    <div class="ph"><h3>폐루프 FRACAS — 조치는 "했다"가 아니라 "닫혔다"</h3><span class="ps">종결 조건 = 조치 후 동일 모드 무발생 (docs/CRITERIA.md §5) · 전 단계 공통 배관</span></div>
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

/* 수렴 추이 — 누적 발견 vs 누적 종결. 두 선의 간격(오픈)이 좁혀지는 것이 '수렴하고 있다'의 그림 */
function pocTrendPanel() {
  const tr = DATA.trend || [];
  if (!tr.length) return '';
  const top = 18, bot = 158, left = 40, right = 388, vbH = 196;
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
  const xaxis = tr.map((t, i) => `<text x="${x(i)}" y="${bot + 17}" font-size="11.5" fill="#5A6B7E" text-anchor="middle">${t.week}주차</text>`).join('');
  const pf = tr.map((t, i) => `${x(i)},${y(t.found)}`).join(' ');
  const pc = tr.map((t, i) => `${x(i)},${y(t.closed)}`).join(' ');
  const area = pf + ' ' + tr.slice().reverse().map((t, i) => `${x(n - 1 - i)},${y(t.closed)}`).join(' ');
  const dots = tr.map((t, i) => `<circle cx="${x(i)}" cy="${y(t.found)}" r="3" fill="#2E89D6"><title>${t.week}주차 · 발견 ${t.found} · 종결 ${t.closed} · 오픈 ${t.found - t.closed}</title></circle>`
    + `<circle cx="${x(i)}" cy="${y(t.closed)}" r="3" fill="#3E9B6E"><title>${t.week}주차 · 종결 ${t.closed}</title></circle>`).join('');
  const last = tr[n - 1], open = last.found - last.closed;
  return `<div class="panel">
    <div class="ph"><h3>수렴 추이 — 누적 발견 vs 종결</h3><span class="ps">간격 = 오픈 ${open}건 · 좁혀지는가</span></div>
    <svg viewBox="0 0 420 ${vbH}" style="width:100%;height:auto;display:block" role="img" aria-label="주차별 누적 발견 대 누적 종결">
      ${axis}<line x1="${left}" y1="${top}" x2="${left}" y2="${bot}" stroke="#C9DCEC"/>
      <polygon points="${area}" fill="#2E89D6" opacity="0.07"/>
      <polyline fill="none" stroke="#2E89D6" stroke-width="2.2" points="${pf}"/>
      <polyline fill="none" stroke="#3E9B6E" stroke-width="2.2" points="${pc}"/>${dots}
      <text x="${x(n - 1) + 7}" y="${y(last.found) + 4}" font-size="12" font-weight="800" fill="#0F2E54">${last.found}</text>
      <text x="${x(n - 1) + 7}" y="${y(last.closed) + 4}" font-size="12" font-weight="800" fill="#2f7a52">${last.closed}</text>
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
      <table><tr><th>시나리오</th><th class="c">복구시간</th><th class="c">판정</th><th>비고</th></tr>${rows}</table>
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

function pocLedgerPanel() {
  const all = (DATA.issues || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const recent = all.slice(0, 7);
  return `<div class="panel">
    <div class="ph"><h3>이슈 대장 (FRACAS-lite · 필수 5필드)</h3><span class="ps">최근 ${recent.length}건 — 원인을 모르는 건도 상태로 존재한다</span>
      <a class="more" href="#/${esc(CUR_PID || '')}/all">전체 ${all.length}건 → 평가 상세 내역</a></div>
    <table><tr><th>ID</th><th class="c">발생</th><th>고장모드 (표준분류)</th><th class="c">4분류</th><th class="c">심각도</th><th class="c">재발</th><th class="c">상태</th><th class="c">상세</th></tr>${pocLedgerRows(recent, false)}</table>
  </div>`;
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
    ${e.recurOf ? `<span><b>재발</b> ↺ ${esc(e.recurOf)} 동일 모드 — 재분석 의무</span>` : ''}</div>
    <div class="ed-block"><div class="ed-lbl">상세</div><div class="ed-txt">${esc(e.detail) || '—'}</div></div>
    ${imgs ? `<div class="ed-block"><div class="ed-lbl">사진</div><div class="ed-imgs">${imgs}</div></div>` : ''}`;
  $('modal-back').classList.add('open');
}

/* 상세 탭 (s-steps) — 원본 기록 전체: 이슈 대장 전수 · 런 기록 · 비정상 평가 */
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
      <div class="tbl-scroll"><table><tr><th>코드</th><th>고장모드</th><th class="c">원인분류</th><th>근본원인</th><th class="c">SW버전</th><th class="c">재발</th><th class="c">상태</th><th class="c">발생일</th><th class="c">상세</th></tr>${rows}</table></div>
    </div>`;
}

/* ── 진입점 ── */
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

/* POC 관제 — 케미컬(한눈에 보기)형 트랙 구성. 상세 기록은 pocSteps()가 '평가 상세 내역' 탭에 렌더 */
function renderPoc(C) {
  const qbox = `이 단계의 질문: <b>“이 고장모드는 컨셉의 병인가, 고칠 수 있는 병인가?”</b> — 표본이 작고 설계가 유동적이므로 통계(MTBF) 대신 <b>전수 4분류</b>로 보고. 단발성 조치의 연속이 아니라 <b>대장 위의 수렴</b>으로 읽히게 한다.`;
  $('s-overview').innerHTML = `
    ${devHead('poc', C)}
    <div class="pocv">
      <div class="qbox">${qbox}</div>
      <div class="poc-2col">
        <div class="prog-track tk-a"><div class="pt-h">게이트까지의 거리 — 사전에 합의된 종점</div>${pocRunHero(C)}${devGatePanel(C)}</div>
        <div class="prog-track tk-b"><div class="pt-h">전수 4분류 — 컨셉 리스크 0 입증</div>${pocFourwayBoard()}${fracasLoopPanel()}</div>
      </div>
      <div class="prog-track track-wide tk-c"><div class="pt-h">수렴의 증거 — 추이 · Pareto · 비정상 평가</div>
        <div class="fault-grid">${pocTrendPanel()}${devParetoPanel(true)}${pocAbnormalPanel()}</div></div>
      <div class="prog-track track-wide tk-d"><div class="pt-h">이슈 대장 — 사건이 아니라 누적으로</div>${pocLedgerPanel()}</div>
    </div>`;
  $('s-steps').innerHTML = pocSteps(C);
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
}

function renderDev(stage) {
  const C = DATA.config || {};
  if (stage === 'poc') return renderPoc(C);

  const qbox = `이 단계의 질문: <b>“우리는 수렴하고 있는가?”</b> — 증거는 세 가지: <b>성장곡선의 기울기 · 줄어드는 Pareto · 재발 0</b>. 모든 수정에 검증 런, 모든 기록에 버전.`;
  $('s-overview').innerHTML = `
    ${devHead(stage, C)}
    <div class="sbox-h"><span class="tag">단계 진행</span><h2>${esc(T('overview.stageTitle', '세부 단계'))}</h2><span class="d">${esc(T('overview.stageSub', ''))}</span></div>
    ${lifecycleStagePanel(C)}
    ${devGatePanel(C)}
    <div class="sbox-h mt"><span class="tag">신뢰성 트랙</span><h2>에러 분석 — Pilot 방식</h2><span class="d">개별 사건이 아니라 추세로 보고</span></div>
    <div class="qbox">${qbox}</div>
    <div class="grid g23">${pilotGrowthPanel()}${devParetoPanel(true)}</div>
    <div class="grid g3 mt">${devRunPanel(C)}${pilotDisciplinePanels(C)}</div>
    ${fracasLoopPanel({ mt: true, recurZeroGate: true })}
    <div class="sbox-h mt"><span class="tag">기록</span><h2>레코드 (공통 스키마)</h2><span class="d">전 과제·전 단계 동일 컬럼 구조 — POC 대장이 그대로 이어진다</span></div>
    ${pilotRecordsPanel()}`;

  // 개발 템플릿(Pilot)에는 라인 레이아웃·월 스냅샷·상세 탭이 없음 — 이전 과제 잔상 제거
  { const el = $('side-line'); if (el) el.innerHTML = ''; }
  { const el = $('side-months'); if (el) el.innerHTML = ''; }
  $('s-steps').innerHTML = '';
}
