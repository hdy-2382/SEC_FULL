/* tpl-mass.js — 템플릿② 실증(양산 시범 평가): 기존 SEC 대시보드 렌더러 (renderOverview·renderSteps).
   renderMass()가 이 템플릿의 진입점 — app.js의 renderData()가 stage에 따라 호출한다. */
/* ── 섹션 렌더러 ── */

/* 양산 합격기준 리스트 — config.json ui.acceptance.criteria 로 순서·라벨·표시여부 관리(재빌드 불필요).
   각 config 항목 { id, label? }:
     · id 가 계산된 기준(complete/mtbf/openCritical/recur/verifyClose)과 매칭되면 값·판정 자동 사용,
       label 을 적으면 그 문구로 대체(생략 시 자동 문구).
     · id 없이 { label, value?, status? } 로 적으면 사용자가 직접 관리하는 수동 항목.
   config 목록이 없으면 빌드 계산 순서(DATA.acceptance.criteria) 그대로 사용(하위호환). */
function acceptanceCriteria() {
  const computed = {};
  ((DATA.acceptance && DATA.acceptance.criteria) || []).forEach(c => { if (c.id) computed[c.id] = c; });
  const defs = T('acceptance.criteria');
  if (!Array.isArray(defs) || !defs.length) return (DATA.acceptance && DATA.acceptance.criteria) || [];
  return defs.map(d => {
    const base = (d.id && computed[d.id]) ? computed[d.id] : {};
    return {
      id: d.id || '',
      key: d.label != null ? d.label : (base.key || ''),
      value: d.value != null ? d.value : (base.value != null ? base.value : ''),
      status: d.status != null ? d.status : (base.status || 'prog'),
    };
  });
}

/* 상단 타이틀바용 개발단계 스텝퍼 (한눈에 보기 탭 전용) — 박스형·컬러 강조·진행카운트·커넥터. */
function buildTopbarLc(C) {
  const arr = (C && C.lifecycle) || [];
  if (!arr.length) return '';
  const curIdx = arr.findIndex(s => s.status === 'current');
  const doneN = arr.filter(s => s.status === 'done').length;
  const prog = curIdx >= 0 ? curIdx + 1 : doneN;               // 현재 단계 번호
  const steps = arr.map((s, i) => {
    const cls = s.status === 'done' ? 'done' : s.status === 'current' ? 'cur' : 'todo';
    const mark = s.status === 'done' ? '✓' : (i + 1);
    return `<span class="tb-step ${cls}"><i class="tb-dot">${mark}</i>${esc(s.stage)}</span>`;
  }).join('<span class="tb-sep"></span>');
  return `<button class="tb-lc-more" onclick="openStagePopup()" title="${esc(T('overview.lcMore', '개발 진행 단계 상세'))}">🔍</button><span class="tb-lc-cap">${esc(T('overview.lcTitle', '개발 단계'))} <b>${prog}/${arr.length}</b></span>${steps}`;
}

/* 협의 및 논의 필요 항목 — config.json ui.overview.discussItems (자유 편집, 재빌드 불필요).
   각 항목 { topic, detail?, tag?, group? }. tag → 색상(긴급/검토/협의/완료/보류) 자동 매핑. */
function discussModel() {
  const DTAG = { '긴급': 't-urgent', '검토': 't-review', '협의': 't-discuss', '진행': 't-review', '완료': 't-done', '보류': 't-hold' };
  const arr = Array.isArray(T('overview.discussItems')) ? T('overview.discussItems') : [];
  const items = arr.map(it => {
    const topic = esc(it.topic || it.title || '');
    const tag = it.tag ? `<span class="disc-tag ${DTAG[it.tag] || 't-discuss'}">${esc(it.tag)}</span>` : '';
    return `<li class="ovd-it">${tag}<span class="ovd-t">${topic}</span></li>`;
  }).join('') || `<li class="ovd-empty">${esc(T('overview.discussEmpty', '논의 필요 항목 없음'))}</li>`;
  return { count: arr.length, items };
}

/* 설비 평가 진행(라인 레이아웃) 패널 — 사이드바(#side-line) 표시 · 클릭 시 openLineLayout() 모달 확대 */
function lineLayoutFigure(C, m) {
  const img = (C.line && C.line.layoutImage) || (BASE + 'assets/line_layout.png');
  const Lh = T('overview.lineImageHeight', 300);
  const Lfit = T('overview.lineImageFit', 'contain');
  // 캡션: config에서 자유 편집(overview.lineCaption). {cum}/{target}은 자동 진행값, <b>..</b> 강조 태그 사용 가능.
  const prog = (m && m.progress) || {};
  const cap = TT('overview.lineCaption',
    { cum: prog.cum != null ? prog.cum : '', target: prog.target != null ? prog.target : '' },
    '현재 평가 <b>설비 3 (적재) · {cum}/{target}</b> · 설비 1·설비 2 통과 · 설비 4 대기');
  return `
      <div class="panel">
        <div class="ph"><h3>${esc(T('overview.lineTitle'))}</h3></div>
        <div class="psub">${esc(T('overview.lineSub'))}</div>
        <div class="layout-figure">
          <div class="layout-img zoomable" style="height:${Lh}px" onclick="openLineLayout()" title="${esc(T('overview.lineZoomHint', '클릭하면 크게 보기'))}"><img src="${esc(img)}" alt="${esc(T('overview.lineTitle'))}" style="object-fit:${esc(Lfit)}" onerror="this.style.opacity=.25"></div>
          <div class="layout-cap">${cap}</div>
        </div>
      </div>`;
}

/* 개발 진행 단계 패널 — 상단바 🔍(openStagePopup) 팝업 본문 */
function lifecycleStagePanel(C) {
  const lc = (C.lifecycle || []).map((s, i) => {
    const cls = s.status === 'done' ? 'done' : s.status === 'current' ? 'cur' : 'todo';
    const dot = s.status === 'done' ? '✓' : s.status === 'current' ? '●' : (i + 1);
    const stt = s.status === 'done' ? T('common.stDone') : s.status === 'current' ? T('common.stCurrent') : T('common.stTodo');
    const note = s.note ? `<div class="note">${esc(s.note)}</div>` : `<div class="note empty">${esc(T('common.noteEmpty'))}</div>`;
    return `<div class="lc ${cls}"><div class="dot">${dot}</div><div class="nm">${esc(s.stage)}</div><div class="stt">${esc(stt)}</div>${note}</div>`;
  }).join('');
  const cur = (C.lifecycle || []).find(s => s.status === 'current');
  return `
    <div class="panel" style="margin-bottom:14px">
      <div class="ph"><h3>${esc(T('overview.stageTitle'))}</h3><span class="vlabel" style="margin-left:auto">${esc(T('overview.stageCurrentPrefix'))}${esc(cur ? cur.stage : '—')}</span></div>
      <div class="psub">${esc(TT('overview.stageSub', { n: (C.lifecycle || []).length }))}</div>
      <div class="lifecycle">${lc}</div>
    </div>`;
}

function stepHead(no, title, q, chip, cls) {
  return `<div class="step-h"><div class="step-no">${no}</div><div class="tt"><h2>${esc(title)}</h2><div class="q">${esc(q)}</div></div><span class="chip ${cls}">${esc(chip)}</span></div>`;
}

/* 판정 대장 (관련/비관련 합동판정) — REPORT.xlsx 「판정대장」 시트. docs/CRITERIA.md §4.
   양산 시범 평가의 에러분석은 무게중심이 '원인'에서 '판정'으로 이동한다 — 사후 재분류 금지. */
function adjudicationPanel() {
  const rows = DATA.adjudication || [];
  if (!rows.length) return '';
  const VB = { '관련': 'b-crit', '비관련': 'b-ok', '판정중': 'b-prog' };
  const rel = rows.filter(r => r.verdict === '관련').length;
  const pending = rows.filter(r => r.verdict === '판정중').length;
  const limit = ((DATA.config || {}).acceptance || {}).errorLimit;
  const tr = rows.map(r => `
    <tr><td><b>${esc(r.id)}</b></td><td class="c">${esc(r.target)}</td>
    <td class="c"><span class="badge ${VB[r.verdict] || 'b-wait'}">${esc(r.verdict)}</span></td>
    <td>${esc(r.attribution || '—')}</td><td class="mini">${esc(r.evidence || '')}</td>
    <td class="c">${esc(r.agreed || '')}</td><td class="c">${esc(r.date || '')}</td></tr>`).join('');
  return `
        <div class="panel mt">
          <div class="ph"><h3>판정 대장 (관련/비관련 합동판정)</h3><span class="ps">사전 합의 규칙 · 증거 첨부 · 사후 재분류 금지 — docs/CRITERIA.md §4</span></div>
          <div class="tbl-scroll"><table><tr><th>사건</th><th class="c">대상 에러</th><th class="c">판정</th><th>귀책 분류</th><th>증거</th><th class="c">합의</th><th class="c">판정일</th></tr>${tr}</table></div>
          <div class="mini" style="margin-top:8px">관련 고장 <b style="color:var(--major)">${rel}건</b>${limit ? ` / 한도 ${limit}` : ''}${pending ? ` · 판정중 ${pending}건` : ''} · 비관련 판정 건도 시정 오너를 지정한다 (외생 요인 재발 방지)</div>
        </div>`;
}

/* Known Issues Register — 인증(이관·투자심의) 준비: 오픈 건 전건 처분 (docs/PROCESS.md §2.4).
   공통 레코드 스토어(records)의 미종결 건 필터 + 처분대장(REPORT.xlsx 「처분대장」) 조인.
   심의는 새 데이터를 만들지 않는다 — 이 대장이 그대로 이관 안건이 된다. */
function kirPanel() {
  const recs = (DATA.records || []).filter(r => pocStBucket(r.status) !== 'closed');
  const dispos = DATA.dispositions || [];
  const norm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const dOf = r => dispos.find(d => {
    const t = norm(d.target);
    return t && (t === norm(r.id) || (r.modeCode && t === norm(r.modeCode)));
  });
  const dcls = s => {
    s = String(s || '').toLowerCase();
    return s.includes('carry') || s.includes('이관') ? 'b-major'
      : s.includes('waiver') || s.includes('수용') ? 'b-prog'
      : s.includes('종결') ? 'b-ok' : 'b-wait';
  };
  let assigned = 0;
  const rows = recs.map(r => {
    const d = dOf(r);
    if (d) assigned++;
    return `<tr><td><b>${esc(r.id)}</b></td><td>${r.modeCode ? esc(r.modeCode) + ' · ' : ''}${esc(r.mode)}</td>
      <td class="c"><span class="badge ${SEV_BADGE[r.severity] || 'b-minor'}">${esc(sevLabel(r.severity))}</span></td>
      <td class="c"><span class="badge ${POC_ST_BADGE[pocStBucket(r.status)]}">${esc(r.status || '—')}</span></td>
      <td class="c">${esc(r.verify || '—')}</td>
      <td class="c">${esc(r.verdict || '—')}</td>
      <td class="c">${d ? `<span class="badge ${dcls(d.dispo)}">${esc(d.dispo)}</span>` : '<span class="badge b-crit">처분 미정</span>'}</td>
      <td class="mini">${d ? esc(d.reason || '') : ''}</td>
      <td class="c">${d ? esc(d.due || '—') : '—'}</td><td class="c">${d ? esc(d.owner || '—') : '—'}</td><td class="c">${d ? esc(d.agreed || '—') : '—'}</td></tr>`;
  }).join('');
  const pending = recs.length - assigned;
  return {
    open: recs.length, pending,
    html: `
    <div class="panel">
      <div class="ph"><h3>Known Issues Register (단일본)</h3><span class="ps">공통 레코드의 오픈 건 필터 + 처분대장 조인 — 별도 문서를 만들지 않는다</span></div>
      <div class="tbl-scroll" style="max-height:340px"><table><tr><th>ID</th><th>고장모드</th><th class="c">심각도</th><th class="c">상태</th><th class="c">무발생</th><th class="c">판정</th><th class="c">처분</th><th>사유·조건</th><th class="c">기한</th><th class="c">오너</th><th class="c">합의</th></tr>${rows || '<tr><td colspan="11" class="mini c">오픈 건 없음 — 전건 종결</td></tr>'}</table></div>
      <div class="mini" style="margin-top:8px">오픈 <b>${recs.length}건</b> · 처분 확정 <b style="color:var(--green)">${assigned}</b> (종결예정/carry-over/waiver) · 처분 미정 <b style="color:${pending ? 'var(--crit)' : 'var(--green)'}">${pending}</b> — 미정 0건 + 기한·오너 서명 완비가 이관심의 상정 조건</div>
    </div>`,
  };
}

function renderSteps(C, m, f, acc, op) {
  const verifyCy = (C.acceptance || {}).verifyCycle || 200;
  const fracasH = T('steps.fracasH', []);
  const fracas = DATA.actions.map(a => `
    <tr><td><b>${esc(a.code)}</b></td><td>${esc(a.type || '')}</td><td>${esc(a.action)}</td>
    <td class="c"><div class="prog-bar" style="width:90px;display:inline-block"><i style="width:${a.verifyProgress}%;${a.verifyResult === '검증완료' ? 'background:var(--green)' : ''}"></i></div>${a.noFailCycles ? `<div class="mini">${a.noFailCycles}/${a.verifyTarget}</div>` : ''}</td>
    <td class="c"><span class="badge ${RES_BADGE[a.verifyResult] || 'b-wait'}">${esc(a.verifyResult)}</span></td></tr>`).join('');
  const maxTop = f.top5ByCode[0] ? f.top5ByCode[0].count : 1;
  const top5 = f.top5ByCode.map(t =>
    `<tr><td><b>${esc(t.code)}</b></td><td>${esc(t.type) || '<span class="mini">(미분류)</span>'}${t.recur ? ' <span style="color:var(--crit)">↺</span>' : ''}</td><td class="c"><b>${t.count}</b></td><td style="width:54px"><div class="prog-bar"><i style="width:${Math.round(t.count / maxTop * 100)}%;background:${SEV_BAR[t.severity]}"></i></div></td><td class="c"><span class="badge ${SEV_BADGE[t.severity]}">${esc(sevLabel(t.severity))}</span></td></tr>`).join('');
  const rows = ['Critical', 'Major', 'Minor'], cols = ['드묾', '보통', '빈발'], cell = {};
  f.matrix.forEach((it, i) => { (cell[it.severity + '|' + it.occ] = cell[it.severity + '|' + it.occ] || []).push(i + 1); });
  const mcls = { High: 'm-h', Medium: 'm-m', Low: 'm-l' };
  let grid = `<div class="lab"></div>` + cols.map(c => `<div class="lab">${c}</div>`).join('');
  rows.forEach(rk => {
    grid += `<div class="lab" style="color:${SEV_BAR[rk] || 'var(--muted)'}">${esc(sevLabel(rk))}</div>`;
    cols.forEach(ck => {
      const p = PRIO[rk + '|' + ck], dots = (cell[rk + '|' + ck] || []).map(n => `<span class="pt">${n}</span>`).join('');
      grid += `<div class="cell ${mcls[p]}">${dots}</div>`;
    });
  });
  const legend = f.matrix.map((it, i) => `<span><b>${i + 1}</b>${esc(it.type || it.code)}</span>`).join('');
  const openActions = DATA.actions.filter(a => a.verifyResult !== '검증완료').length;
  const s5ActH = T('steps.s5ActH', []);
  const actTable = DATA.actions.map(a => `
    <tr><td>${esc(a.id)}</td><td>${esc(a.action)}</td><td>${esc(a.code)}</td><td class="c">${esc(a.owner)}</td><td class="c">${esc(a.due)}</td>
    <td class="c"><span class="badge ${a.status === '완료' ? 'b-ok' : 'b-prog'}">${esc(a.status)}</span></td>
    <td class="c"><span class="badge ${RES_BADGE[a.verifyResult] || 'b-wait'}">${esc(a.verifyResult)}</span></td>
    <td><div class="prog-bar"><i style="width:${a.verifyProgress}%;${a.verifyResult === '검증완료' ? 'background:var(--green)' : ''}"></i></div></td></tr>`).join('');
  const dailyH = T('steps.dailyH', []);
  const daily = DATA.daily.map(d => `<tr><td>${esc(d.date.slice(5))}</td><td class="c">${d.total}</td><td class="c">${d.errors}</td><td class="c">${d.streak}</td><td class="mini">${esc(d.notes)}</td></tr>`).join('');
  const errlogH = T('steps.errlogH', []);
  const errlog = DATA.errors.map((e, i) => `<tr><td><b>${esc(e.code)}</b></td><td>${esc(e.type)}<br><span class="mini">${esc((e.cause || '').slice(0, 30))}</span></td><td class="c">${esc(e.owner_sec || e.owner || '')}</td><td class="c"><button class="btn" style="padding:4px 9px" onclick="openModal(${i})">${esc(T('steps.errlogBtn'))}</button></td></tr>`).join('');
  const flow = T('steps.flow', []);
  const flowHtml = flow.map((s, i) => `<span class="b${i === flow.length - 1 ? ' last' : ''}">${esc(s)}</span>`).join('<span class="ar">→</span>');
  const kir = kirPanel();   // 인증 준비 — 공통 레코드 오픈 건 + 처분대장

  return `
    <div class="sbox-h"><span class="tag">${esc(T('steps.tag'))}</span><h2>${esc(T('steps.title'))}</h2><span class="d">${esc(T('steps.desc'))}</span></div>

    <section class="step" id="s2">
      ${stepHead(2, T('steps.s2Title'), T('steps.s2Q'), T('steps.s2Chip'), 'prog')}
      <div class="step-body">
        <div class="panel">
          <div class="flow">${flowHtml}</div>
          <div class="tbl-scroll"><table><tr><th>${esc(fracasH[0] || '')}</th><th>${esc(fracasH[1] || '')}</th><th>${esc(fracasH[2] || '')}</th><th class="c" style="width:150px">${esc(tpl(fracasH[3] || '', { verify: verifyCy }))}</th><th class="c">${esc(fracasH[4] || '')}</th></tr>${fracas}</table></div>
        </div>
        <div class="grid g3 mt">
          <div class="panel"><div class="ph"><h3>${esc(T('steps.top5Title'))}</h3><span class="ps">${esc(T('steps.top5Sub'))}</span></div><table><tr>${(T('steps.top5H', [])).map((h, i) => i === 2 || i === 4 ? `<th class="c">${esc(h)}</th>` : `<th>${esc(h)}</th>`).join('')}</tr>${top5}</table></div>
          <div class="panel"><div class="ph"><h3>${esc(T('steps.matrixTitle'))}</h3><span class="ps">${esc(T('steps.matrixSub'))}</span></div><div class="matrix">${grid}</div><div class="legend-row">${legend}</div></div>
          <div class="panel"><div class="ph"><h3>${esc(T('steps.recurTitle'))}</h3><span class="ps">${esc(T('steps.recurSub'))}</span></div><div class="stat-big"><b>${DATA.recurrence.count}</b><span>${esc(TT('steps.recurUnit', { rate: DATA.recurrence.rate }))}</span></div><div class="mini">${DATA.recurrence.items.map(it => esc(it.code) + '(' + it.count + ')').join(', ') || esc(T('steps.recurNone'))}</div>${(DATA.recurrence.cleared || []).length ? `<div class="mini" style="margin-top:6px;color:var(--green)">✅ ${esc(TT('steps.recurCleared', { list: DATA.recurrence.cleared.map(it => it.code).join(', ') }, '검증완료로 해제: {list}'))}</div>` : ''}<div class="mini" style="margin-top:6px">${esc(T('steps.recurWarn'))}</div></div>
        </div>
        ${adjudicationPanel()}
      </div>
    </section>

    <section class="step" id="s5">
      ${stepHead(5, T('steps.s5Title'), T('steps.s5Q'), TT('steps.s5Chip', { open: openActions, crit: op.openCritical }), op.openCritical ? 'fail' : 'prog')}
      <div class="step-body">
        <div class="grid g3">
          <div class="panel"><div class="ph"><h3>${esc(T('steps.s5OpenCritTitle'))}</h3><span class="ps">${esc(T('steps.s5OpenCritSub'))}</span></div><div class="big-num" style="color:${op.openCritical ? 'var(--crit)' : 'var(--green)'}">${op.openCritical}<span style="font-size:13px;color:var(--muted)"> 건</span></div><div class="mini">${esc(op.openCritical ? T('steps.s5OpenCritUnmet') : T('steps.s5OpenCritMet'))}</div></div>
          <div class="panel"><div class="ph"><h3>${esc(T('steps.s5OpenActTitle'))}</h3><span class="ps">${esc(T('steps.s5OpenActSub'))}</span></div><div class="big-num" style="color:var(--major)">${openActions}<span style="font-size:13px;color:var(--muted)"> / ${DATA.actions.length}</span></div></div>
          <div class="panel"><div class="ph"><h3>${esc(T('steps.s5ClosedTitle'))}</h3><span class="ps">${esc(T('steps.s5ClosedSub'))}</span></div><div class="big-num" style="color:var(--navy-deep)">${op.verifyClosedRate}<span style="font-size:13px;color:var(--muted)">%</span></div><div class="prog-bar" style="margin-top:8px"><i style="width:${op.verifyClosedRate}%;background:var(--green)"></i></div></div>
        </div>
        <div class="panel mt">
          <div class="ph"><h3>${esc(T('steps.s5ActTitle'))}</h3><span class="vlabel" style="margin-left:8px">${esc(T('steps.s5ActBadge'))}</span></div>
          <div class="psub">${esc(T('steps.s5ActSub'))}</div>
          <div class="tbl-scroll"><table><tr>${s5ActH.map((h, i) => i === 0 ? `<th>${esc(h)}</th>` : i === 1 ? `<th>${esc(h)}</th>` : i === 7 ? `<th style="width:96px">${esc(h)}</th>` : `<th class="c">${esc(h)}</th>`).join('')}</tr>${actTable}</table></div>
        </div>
      </div>
    </section>

    <section class="step" id="s6">
      ${stepHead(6, T('steps.s6Title'), T('steps.s6Q'), T('steps.s6Chip'), 'pass')}
      <div class="step-body">
        <div class="op-rel" style="margin-bottom:14px">${T('steps.s6Integrity')} <span class="mini" style="margin-left:auto">${esc(TT('steps.s6Source', { source: DATA.source }))}</span></div>
        <div class="grid g2">
          <div class="panel"><div class="ph"><h3>${esc(T('steps.dailyTitle'))}</h3><span class="ps">${esc(T('steps.dailySub'))}</span></div><div class="tbl-scroll"><table><tr>${dailyH.map((h, i) => i === 0 || i === 4 ? `<th>${esc(h)}</th>` : `<th class="c">${esc(h)}</th>`).join('')}</tr>${daily}</table></div></div>
          <div class="panel"><div class="ph"><h3>${esc(T('steps.errlogTitle'))}</h3><span class="badge b-prog" style="margin-left:8px">${esc(T('steps.errlogBadge'))}</span></div><div class="psub">${esc(T('steps.errlogSub'))}</div><div class="tbl-scroll"><table><tr>${errlogH.map((h, i) => i === 0 || i === 1 ? `<th>${esc(h)}</th>` : `<th class="c">${esc(h)}</th>`).join('')}</tr>${errlog}</table></div></div>
        </div>
      </div>
    </section>

    <section class="step" id="s7">
      ${stepHead(7, '인증 준비 — Known Issues Register', '남은 결점을 어떤 조건으로 안고 가는가 — 심의는 새 데이터가 아니라 기존 증거를 심사하는 이벤트', `오픈 ${kir.open}건 · 미정 ${kir.pending}`, kir.pending ? 'prog' : 'pass')}
      <div class="step-body">${kir.html}</div>
    </section>`;
}

/* ── 한눈에 보기(관제) : 같은 데이터로 한 화면 밀집 요약 ── */
function renderOverview(C, m, f, acc, op) {
  const prog = m.progress || {}, mtbf = m.mtbf || {}, conf = m.confidence || {}, rw = m.recentWindow || {};
  const rec = DATA.recurrence || {}, accept = C.acceptance || {};
  const errTgt = m.errRateTarget || accept.errRateTargetPct || 5;
  const recentRate = rw.rate != null ? rw.rate : (m.errRateCur || 0);
  const succ = m.successRate || 0, recurN = rec.count || 0;
  const succGo = accept.successRateTargetPct != null ? accept.successRateTargetPct : 95;
  const succWarn = accept.successRateWarnPct != null ? accept.successRateWarnPct : 85;
  const confPct = conf.currentPct != null ? conf.currentPct : 0, confLv = Math.round((conf.level || 0.8) * 100);
  const accCs = acceptanceCriteria();
  const passed = accCs.filter(c => c.status === 'pass').length, total = accCs.length, grade = op.grade || '—';
  const gradeCls = grade === '양호' ? 'go' : grade === '주의' ? 'warn' : 'bad';

  const O = (k, fb) => T('overview.' + k, fb);           // 한눈에 보기 글자 = config.json ui.overview
  const OT = (k, vars, fb) => TT('overview.' + k, vars, fb);

  // 6개 KPI 기술자(값 + 목표대비 달성률 pct). 에러율·재발은 lower-better → '목표 대비 여유'로 환산.
  const SC = { 'k-info': 'var(--sky)', 'k-go': 'var(--green)', 'k-warn': 'var(--major)', 'k-bad': 'var(--crit)' };
  // 도넛 색 경계(목표의 몇 배) — config.json ui.overview.donutBands 로 조절(새로고침만). 없으면 기본값.
  const _bands = O('donutBands') || {};
  const band = (id, key, def) => { const v = _bands[id] && _bands[id][key]; return typeof v === 'number' ? v : def; };
  const errBad = band('errRate', 'badMult', 3);      // 에러율: 목표×이 값 초과 → 빨강
  const mtbfWarn = band('mtbf', 'warnMult', 0.5);    // MTBF: 목표×이 값 미만 → 빨강
  const confWarn = band('conf', 'warnMult', 0.6);    // 신뢰수준: 목표×이 값 미만 → 빨강
  const K = [
    { cls: 'k-info', label: O('kpiProgress'), disp: (prog.pct != null ? prog.pct : 0), unit: '%', sub: OT('kpiProgressSub', { cum: fmt(prog.cum), target: fmt(prog.target) }), tag: O('kpiProgressTag'), pct: (prog.pct != null ? prog.pct : 0) },
    { cls: succ >= succGo ? 'k-go' : succ >= succWarn ? 'k-warn' : 'k-bad', label: O('kpiSuccess'), disp: succ.toFixed(1), unit: '%', sub: OT('kpiSuccessSub', { success: fmt(m.success), errors: fmt(m.errorsTotal) }), tag: succ >= succGo ? O('kpiSuccessTagGo') : O('kpiSuccessTagWarn'), pct: succ },
    { cls: recentRate <= errTgt ? 'k-go' : recentRate <= errTgt * errBad ? 'k-warn' : 'k-bad', label: O('kpiErrRate'), disp: recentRate, unit: '%', sub: OT('kpiErrRateSub', { tgt: errTgt, errors: fmt(rw.errors), cycles: fmt(rw.cycles) }), tag: recentRate <= errTgt ? O('kpiErrRateTagGo') : O('kpiErrRateTagBad'), pct: recentRate <= 0 ? 100 : Math.min(100, errTgt / recentRate * 100) },
    { cls: recurN <= (accept.recurrenceLimit != null ? accept.recurrenceLimit : 0) ? 'k-go' : 'k-bad', label: O('kpiRecur'), disp: recurN, unit: '건', sub: OT('kpiRecurSub', { rate: rec.rate != null ? rec.rate : 0 }), tag: recurN <= 0 ? O('kpiRecurTagGo') : O('kpiRecurTagBad'), pct: Math.max(0, 100 - (rec.rate != null ? rec.rate : 0)) },
    { cls: mtbf.current >= mtbf.target ? 'k-go' : mtbf.current >= mtbf.target * mtbfWarn ? 'k-warn' : 'k-bad', label: O('kpiMtbf'), disp: fmt(mtbf.current), unit: `/${fmt(mtbf.target)}`, sub: O('kpiMtbfSub'), tag: mtbf.current >= mtbf.target ? O('kpiMtbfTagGo') : O('kpiMtbfTagWarn'), pct: mtbf.target ? Math.min(100, mtbf.current / mtbf.target * 100) : 0 },
    { cls: confPct >= confLv ? 'k-go' : confPct >= confLv * confWarn ? 'k-warn' : 'k-bad', label: O('kpiConf'), disp: confPct, unit: '%', sub: OT('kpiConfSub', { lv: confLv, cyc: fmt(conf.currentCycles) }), tag: confPct >= confLv ? O('kpiConfTagGo') : O('kpiConfTagProg'), pct: confLv ? Math.min(100, confPct / confLv * 100) : 0 },
  ];
  const GRP = [
    { icon: '🎯', title: O('kgProgress', '평가 진행 · 성공'), a: K[0], b: K[1] },
    { icon: '⚠️', title: O('kgQuality', '에러 · 재발'), a: K[2], b: K[3] },
    { icon: '🛡', title: O('kgReliability', '신뢰성 입증 (MTBF·신뢰수준)'), a: K[4], b: K[5] },
  ];

  // 위험 매트릭스 (renderSteps 와 동일 구조). 데이터 키는 고정, 표시 라벨만 config.
  const occL = [O('occRare', '드묾'), O('occMid', '보통'), O('occHigh', '빈발')];
  const mrows = ['Critical', 'Major', 'Minor'], mcols = ['드묾', '보통', '빈발'], mcell = {};
  (f.matrix || []).forEach((it, i) => { (mcell[it.severity + '|' + it.occ] = mcell[it.severity + '|' + it.occ] || []).push(i + 1); });
  const mcls = { High: 'm-h', Medium: 'm-m', Low: 'm-l' };
  let mx = `<div class="lab"></div>` + mcols.map((c, ci) => `<div class="lab">${esc(occL[ci])}</div>`).join('');
  mrows.forEach(rk => {
    mx += `<div class="lab" style="color:${SEV_BAR[rk] || 'var(--muted)'}">${esc(sevLabel(rk))}</div>`;
    mcols.forEach(ck => {
      const p = PRIO[rk + '|' + ck], dots = (mcell[rk + '|' + ck] || []).map(n => `<span class="pt">${n}</span>`).join('');
      mx += `<div class="cell ${mcls[p]}">${dots}</div>`;
    });
  });
  const mlegend = (f.matrix || []).map((it, i) => `<span><b>${i + 1}</b>${esc(it.type || it.code)}</span>`).join('');

  // Top5 — 코드별 조치 현황(actions.verifyResult)을 현황 컬럼에 표시(상세 보기 STEP5 조치와 동일 데이터)
  const actByCode = {}; (DATA.actions || []).forEach(a => { if (a.code && !actByCode[a.code]) actByCode[a.code] = a; });
  const top5 = (f.top5ByCode || []).map(t => {
    const a = actByCode[t.code];
    const statusCell = a && a.verifyResult ? `<span class="badge ${RES_BADGE[a.verifyResult] || 'b-wait'}">${esc(a.verifyResult)}</span>` : '—';
    return `<tr><td><b>${esc(t.code)}</b></td><td>${esc(t.type || '-')}</td><td class="c">${t.count}</td>
      <td class="c"><span class="badge ${SEV_BADGE[t.severity] || ''}">${esc(sevLabel(t.severity))}</span></td>
      <td class="c">${t.recur ? `<span class="badge b-crit">${esc(O('recurBadge', '재발'))}</span>` : '—'}</td>
      <td class="c">${statusCell}</td></tr>`;
  }).join('');

  // 양산평가 합격 기준(계약 게이트) — 연속 {target} Cycle 완주 + 에러버짓
  const errLimit = accept.errorLimit || 3;
  const eb = m.errorBudget || { used: m.errorsTotal, limit: errLimit, resets: 0, lifetimeErrors: m.errorsTotal };
  const remain = Math.max(0, prog.target - prog.cum);
  const goalCrit = ((DATA.acceptance && DATA.acceptance.criteria) || []).find(c => c.id === 'complete') || (acc.criteria || [])[0] || { status: 'prog' };
  const ebudNote = eb.resets ? TT('overview.ebudReset', { n: eb.resets, total: eb.lifetimeErrors }) : TT('overview.ebudNoReset', { total: eb.lifetimeErrors });
  const ebBlocks = Array.from({ length: eb.limit }, (_, i) => `<i class="${i < eb.used ? 'used' : 'free'}"></i>`).join('');

  // 진행·성공 박스 = 진행률 히어로 도넛 + 성공률·에러버짓 보조 스탯 + 게이트.
  const progPct = prog.pct != null ? prog.pct : 0;
  const succClr = SC[GRP[0].b.cls];
  // 진행률 도넛 색: 진행 레벨(%)에 따라 빨강→주황→초록. 경계는 config donutBands.progress 로 조절.
  const pgGo = band('progress', 'goAt', 66), pgWarn = band('progress', 'warnAt', 33);
  const progCls = progPct >= pgGo ? 'k-go' : progPct >= pgWarn ? 'k-warn' : 'k-bad';
  const progDonut = `<div class="pg-donut"><svg viewBox="0 0 42 42"><circle class="trk" cx="21" cy="21" r="15.9"/><circle class="arc" cx="21" cy="21" r="15.9" style="stroke:${SC[progCls]}" stroke-dasharray="${Math.min(100, progPct)} ${100 - Math.min(100, progPct)}" stroke-dashoffset="25"/></svg><div class="pg-donut-ctr"><b>${progPct}%</b></div></div>`;
  const kProgBox = `<div class="kgroup kg-prog"><div class="pg-subh"><span>${esc(GRP[0].a.label)}</span><span class="pg-subh-note">${esc(OT('gateShort', { target: fmt(prog.target), limit: errLimit }, '계약 · 연속 {target}Cy · 에러 {limit}회'))}</span></div>
    <div class="pg-hero">
      <div class="pg-hero-main">
        <div class="pg-num"><b>${fmt(prog.cum)}</b><span>/ ${fmt(prog.target)} Cy</span></div>
        <div class="pg-bar"><i style="width:${Math.min(100, progPct)}%;background:${SC[progCls]}"></i></div>
        <div class="pg-remain">${OT('gateRemain', { n: fmt(remain) })}</div>
      </div>
      ${progDonut}
    </div>
    <div class="pg-stats">
      <div class="pg-stat"><span class="pg-stat-k">${esc(GRP[0].b.label)}</span><span class="pg-stat-v">${GRP[0].b.disp}<small>%</small></span>
        <div class="pg-mini"><i style="width:${Math.min(100, succ)}%;background:${succClr}"></i></div><span class="pg-stat-s">${esc(GRP[0].b.sub)}</span></div>
      <div class="pg-stat"><span class="pg-stat-k">${esc(O('gateBudget', 'Error Budget'))} <b>${eb.used}/${eb.limit}</b></span>
        <div class="blocks" style="margin:9px 0 6px">${ebBlocks}</div><span class="pg-stat-s">${esc(ebudNote)}</span></div>
    </div></div>`;

  // 심각도 분포
  const sd = f.severityDist || { total: 0 };

  // 최근 알람 피드
  const codeSev = {};
  (DATA.codes || []).forEach(c => { codeSev[c.code] = c.severity; });
  const feed = (DATA.errors || []).slice().reverse().map(e => {
    const sevCls = SEV_BADGE[codeSev[e.code]] || 'b-minor';
    return `<div class="it"><span class="badge ${sevCls}">${esc(e.code)}</span>
      <div class="tp"><div class="t1">${esc(e.type || '-')}</div><div class="t2">${esc(e.detail || e.cause || '')}</div></div>
      <span class="dt">${esc(e.date || '')}<br>${esc(e.result || '')}</span></div>`;
  }).join('');

  // 신뢰수준 입증 표
  const ctable = (conf.table || []).map(t =>
    `<tr class="${t.c === confLv ? 'now' : ''}"><td>${t.c}%</td><td class="c">${t.required}</td>
      <td class="c">${(conf.currentCycles || 0) >= t.required ? '<span class="badge b-ok">달성</span>' : '+' + (t.required - (conf.currentCycles || 0))}</td></tr>`).join('');

  // 왼쪽 통합 트랙에 들어갈 성장추이 패널 (span 없이 트랙 폭 전체)
  const pGrowth = `<div class="panel tight ovchart" onclick="openChart('weekly')" title="클릭하면 크게 보기"><div class="ph"><h3>${esc(O('growthTitle'))}</h3><span class="ps">${esc(OT('growthSub', { target: fmt(prog.target) }))} ⤢</span></div>${weeklyChart(m.weekly || [], prog.target, { bot: 420, vbH: 470 })}
    <div class="clegend"><span><i style="background:#C0392B"></i>${esc(O('growthLgCum', '누적 연속'))}</span><span style="color:#8B2E1F">✕ ${esc(O('growthLgReset', '리셋'))}</span><span><span style="display:inline-block;width:16px;border-top:2px dashed #1565C0;vertical-align:middle"></span> ${esc(O('growthLgTarget', '목표'))}</span></div></div>`;
  const pMatrix =`<div class="panel tight ovmx"><div class="ph"><h3>${esc(O('matrixTitle'))}</h3><span class="ps">${esc(O('matrixSub'))}</span></div>
    <div class="ovmx-row" style="display:flex;gap:12px;align-items:center">
      <div style="flex:1;min-width:0"><div class="matrix">${mx}</div><div class="legend-row">${mlegend}</div></div>
      <div class="ovmx-side" style="flex:none;display:flex;flex-direction:column;align-items:center;gap:9px;border-left:1px solid var(--line-soft);padding-left:14px">
        <div style="position:relative;flex:none;width:104px;height:104px">${sevDonut(sd)}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><b style="font-size:22px;font-weight:800;color:var(--navy-deep)">${sd.total || 0}</b><span style="font-size:9.5px;color:var(--muted)">${esc(O('matrixTotal', '총 고장'))}</span></div></div>
        <div class="legend" style="width:100%">
          <div class="li"><span class="sw" style="background:#C0392B"></span>${esc(sevLabel('Critical'))}<b>${sd.Critical || 0}</b></div>
          <div class="li"><span class="sw" style="background:#E08600"></span>${esc(sevLabel('Major'))}<b>${sd.Major || 0}</b></div>
          <div class="li"><span class="sw" style="background:#3F7CC4"></span>${esc(sevLabel('Minor'))}<b>${sd.Minor || 0}</b></div></div></div></div></div>`;
  const pTop5 = `<div class="panel tight"><div class="ph"><h3>${esc(O('top5Title'))}</h3><span class="ps">${esc(O('top5Sub'))}</span></div>
    <table><tr>${(O('top5H', ['코드', '유형', '건수', '등급', '재발', '현황'])).map((h, i) => i >= 2 ? `<th class="c">${esc(h)}</th>` : `<th>${esc(h)}</th>`).join('')}</tr>${top5}</table></div>`;
  const pFeed = `<div class="panel tight"><div class="ph"><h3>${esc(O('feedTitle'))}</h3><span class="ps">${esc(O('feedSub'))}</span></div><div class="feed">${feed || `<div class="mini">${esc(O('feedEmpty', '기록 없음'))}</div>`}</div></div>`;
  const pStab = `<div class="panel tight ovchart" onclick="openChart('stab')" title="클릭하면 크게 보기"><div class="ph"><h3>${esc(O('stabTitle'))}</h3><span class="ps">${esc(O('stabSub'))} ⤢</span></div>${stabChart(m.weekly || [], { bot: 186, vbH: 212 })}
    <div class="clegend"><span><i style="background:#8B2E1F"></i>${esc(O('stabLgErr', '에러율(좌%)'))}</span><span><i style="background:#2E89D6"></i>${esc(O('stabLgMtbf', 'MTBF(우)'))}</span></div></div>`;
  const pErr = `<div class="panel tight ovchart" onclick="openChart('errrate')" title="클릭하면 크게 보기"><div class="ph"><h3>${esc(O('errTitle'))}</h3><span class="ps">${esc(O('errSub'))} ⤢</span></div>${errRateChart(m.errRate || [], { bot: 420, vbH: 470 })}
    <div class="clegend"><span><i style="background:#E08600"></i>${esc(O('errLgRate', '기간 에러율'))}</span><span><i style="background:#8B2E1F"></i>${esc(O('errLgAvg', '누적 평균'))}</span></div></div>`;

  // 신뢰성 입증 통합 박스 — 에러·재발·신뢰성 KPI 4도넛 + 합격판정 칩(미해결Crit·검증종결) + 운용등급.
  // (에러·재발·신뢰성·운용신뢰도·양산사양합격 박스를 하나로 통합, 중복 지표 제거)
  const pfCls = c => c === 'k-go' ? 'pf-go' : c === 'k-bad' ? 'pf-bad' : 'pf-prog';
  const pfLabel = cls => cls === 'pf-go' ? O('stSuffice', '충족') : cls === 'pf-bad' ? O('stUnmet', '미달') : O('stProg', '진행');
  const relDonut = k => { const p = pfCls(k.cls); return `<div class="rel-cell">${miniDonut(k.pct, SC[k.cls], k.disp + (k.unit === '%' ? '%' : ''), k.label, k.sub, 90)}<span class="pf ${p}">${esc(pfLabel(p))}</span></div>`; };
  // 0이 목표라 게이지를 점진적으로 채울 수 없는 지표(에러율·재발·미해결) → 단계(신호등) 도넛:
  //   링을 상태색으로 꽉 채워 초록/주황/빨강 단계만 표시, 중앙=실제값.
  const relStage = k => { const p = pfCls(k.cls); const fill = k.cls === 'k-bad' ? 33 : k.cls === 'k-warn' ? 67 : 100; return `<div class="rel-cell">${miniDonut(fill, SC[k.cls], k.disp + (k.unit === '%' ? '%' : ''), k.label, k.sub, 90)}<span class="pf ${p}">${esc(pfLabel(p))}</span></div>`; };
  const critC = accCs.find(c => c.id === 'openCritical') || {};
  // 미해결 Critical 도넛 (0 목표 · 낮을수록 좋음 → 달성률 환산)
  const openC = op.openCritical || 0, critLimit = accept.criticalOpenLimit != null ? accept.criticalOpenLimit : 0;
  const kOpen = { cls: critC.status === 'pass' ? 'k-go' : critC.status === 'fail' ? 'k-bad' : 'k-warn',
    label: O('kpiOpenCrit', '미해결 Critical'), disp: fmt(openC), unit: '건',
    pct: op.verifyClosedRate != null ? op.verifyClosedRate : 100, sub: OT('kpiOpenCritSub', { rate: op.verifyClosedRate || 0 }, '종결률 {rate}% · 목표 0') };
  const opBadge = gradeCls === 'go' ? 'b-ok' : gradeCls === 'warn' ? 'b-major' : 'b-crit';
  const kRelBox = `<div class="kgroup rel-box"><div class="rel-groups">
      <div class="rel-grp"><div class="rel-grp-h">${esc(O('relGrpQuality', '결함 · 품질'))}</div><div class="rel-donuts g3">${relStage(K[2])}${relStage(K[3])}${relStage(kOpen)}</div></div>
      <div class="rel-grp"><div class="rel-grp-h">${esc(O('relGrpReliab', '신뢰성 입증'))}</div><div class="rel-donuts g2">${relDonut(K[4])}${relDonut(K[5])}</div></div>
    </div></div>`;

  // 공통 FRACAS 트랙 (전 단계 동일 템플릿) — 분류 보드 + 폐루프
  const fracasWide = (typeof devClassBoard === 'function' && (DATA.records || []).length) ? `
    <div class="prog-track track-wide tk-b"><div class="pt-h">${esc(O('trkFracasLabel', '발굴 이슈 분류 → 폐루프 — 공통 FRACAS 트랙 (전 단계 동일 템플릿)'))}</div>
      <div class="rel-charts">${devClassBoard('mass')}${fracasLoopPanel({ recurZeroGate: true })}</div></div>` : '';

  // 셸은 전 단계 공통(devShell) — 양산 고유 렌즈(진행률 히어로·성장 차트·신뢰성 도넛·매트릭스)만 슬롯 주입
  const prj = C.project || {}, gate9 = C.gate || {};
  const head = `
    <div class="ptitle">
      <span class="stagechip st-mass">${esc(STAGE_LABEL.mass || '양산평가')}</span>
      <span class="tmpl">템플릿 ② 실증 — 양산 시범 평가</span>
      <span class="meta">PM <b>${esc((prj.team || '').split(',')[0] || '—')}</b> · 기간 <b>${esc(prj.startDate || '')} ~ ${esc(prj.endDate || '')}</b> · ${esc(gate9.label || '게이트 리뷰')} <b>${esc(gate9.reviewDate || '—')} ${esc(typeof ddayLabel === 'function' ? ddayLabel(gate9.reviewDate) : '')}</b></span>
    </div>`;
  return devShell('mass', C, {
    head,
    qbox: `이 단계의 질문: <b>“잔여 고장률이 계약 기준 이내인가?”</b> — 성공 기준은 서면 동결(연속 ${fmt(prog.target)}Cy · 에러 한도 ${errLimit}회, 사후 변경 불가), 공정 연결 후엔 원인보다 <b>판정(관련/비관련 합동)</b>이 쟁점. 모든 사건은 증거와 함께 대장에.`,
    clear: { title: `${esc(O('trkExecLabel', '종합 클리어'))} — 양산 합격 기준(계약)`,
             criteria: accCs.map(c => ({ label: c.key, value: c.value, status: c.status })) },
    aTitle: `${esc(O('trkProgLabel', '완주 진행 → 성장 · 연결된 지표'))}<span class="badge ${goalCrit.status === 'pass' ? 'b-ok' : 'b-prog'}" style="margin-left:auto">${esc(goalCrit.status === 'pass' ? O('gateDone', '달성') : O('gateProg', '진행 중'))}</span>`,
    aHero: kProgBox,
    aChart: pGrowth,
    bTitle: `${esc(O('trkRelLabel', '신뢰성 입증 → 안정화 추세 · 연결된 지표'))}<span class="badge ${opBadge}" style="margin-left:auto">${esc(O('opTitle', '운용 신뢰도'))} ${esc(grade)}</span>`,
    bTop: kRelBox,
    bCharts: [pErr, pStab],
    cTitle: esc(O('trkFaultLabel', '고장 분석 · 위험 매트릭스 · 빈발 · 최근 알람')),
    cPanels: [pMatrix, pTop5, devPriorityPanel()],
    extraWide: fracasWide,
  });
}

/* '업무 목표' 데이터 모델 — config.json ui.goals 의 자유 텍스트 + 날짜 자동 태그.
   빌드 불필요: config.json 만 고치고 새로고침하면 반영된다.
   날짜(이번 달=M월 / 이번 주=M/D–M/D)는 평가일(generatedAt) 기준으로 자동 계산. */
function goalsModel() {
  const ref = (DATA && DATA.generatedAt) ? parseYMD(DATA.generatedAt.slice(0, 10)) : new Date();
  const mon = new Date(ref); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));   // 그 주의 월요일
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);                          // 일요일
  return {
    title: T('overview.goalsTitle', '업무 목표'),
    monthLabel: T('overview.goalsMonthLabel', '이번 달'), monthTag: `${ref.getMonth() + 1}월`, month: T('overview.goalsMonth'),
    weekLabel: T('overview.goalsWeekLabel', '이번 주'), weekTag: `${fmtMD(mon)}–${fmtMD(sun)}`, week: T('overview.goalsWeek'),
  };
}
const goalsNl = s => esc(s).replace(/\n/g, '<br>');   // 줄바꿈(\n) → <br>

/* 좌측 사이드바 '업무 목표' 카드 (세로 나열). month/week 둘 다 비면 카드 숨김. */
function buildSideGoals() {
  const g = goalsModel();
  const row = (label, tag, txt) => txt
    ? `<div class="sg-item"><span class="sg-lbl">${esc(label)} <span class="sg-date">(${esc(tag)})</span></span><p>${goalsNl(txt)}</p></div>` : '';
  const rows = row(g.monthLabel, g.monthTag, g.month) + row(g.weekLabel, g.weekTag, g.week);
  return rows ? `<div class="sg-title">${esc(g.title)}</div>${rows}` : '';
}

/* ── 마운트 ── */
/* ── 월 선택(누적 스냅샷) ── */
let CUR_MONTH = null;   // null = 전체(최신)
let FULL = null;        // 전체 계산 블록 백업(전체 복원용)
const SNAP_KEYS = ['metrics', 'failure', 'actions', 'recurrence', 'acceptance', 'opReliability', 'daily', 'errors'];

// 선택 월의 스냅샷(처음~그 달 말)을 DATA에 적용. null=전체(FULL 복원).
function applyMonth(mo) {
  const S = (mo && DATA.snapshots && DATA.snapshots[mo]) ? DATA.snapshots[mo] : FULL;
  if (S) SNAP_KEYS.forEach(k => { if (S[k] !== undefined) DATA[k] = S[k]; });
}

// 사이드바 하단 월 선택 박스(데이터에 존재하는 월만 + 전체)
function buildMonthSelector() {
  const months = DATA.months || [];
  if (!months.length) return '';
  const btn = (val, txt, on) => `<button class="mo-btn${on ? ' active' : ''}" onclick="selectMonth(${val === null ? 'null' : `'${val}'`})">${esc(txt)}</button>`;
  const mLabel = mo => parseInt(mo.slice(5), 10) + '월';
  let h = `<div class="mo-title">${esc(T('overview.monthTitle', '기준 월 (누적)'))}</div><div class="mo-grid">`;
  h += btn(null, T('overview.monthAll', '전체'), CUR_MONTH === null);
  months.forEach(mo => { h += btn(mo, mLabel(mo), CUR_MONTH === mo); });
  return h + `</div>`;
}

// 데이터-의존 영역만 재렌더(월 전환 시 재호출) — nav/핸들러는 유지
function renderMass() {
  const C = DATA.config || {}, m = DATA.metrics, f = DATA.failure, acc = DATA.acceptance, op = DATA.opReliability;
  { const el = $('side-line'); if (el) el.innerHTML = lineLayoutFigure(C, m); }
  { const el = $('side-months'); if (el) el.innerHTML = buildMonthSelector(); }
  $('s-overview').innerHTML = renderOverview(C, m, f, acc, op);
  $('s-steps').innerHTML = renderSteps(C, m, f, acc, op);
}

function selectMonth(mo) {
  CUR_MONTH = mo;
  applyMonth(mo);
  renderData();
  scrollTo(0, 0);
}
