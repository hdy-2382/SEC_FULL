/* home.js — 한눈에 보기(포트폴리오): 표준 프로세스 스트립 + 과제 카드 + 전사 KPI.
   입력: REG.org.process(사다리·원칙 문구) + PORTFOLIO.projects(빌드 산출 요약).
   렌더 대상: index.html의 #s-home 컨테이너. */

/* 게이트 리뷰 D-day: reviewDate 기준. 미래=D-n, 오늘=D-DAY, 과거=D+n */
function ddayLabel(dateStr) {
  if (!dateStr) return '';
  const d = parseYMD(dateStr), now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((d - now) / 86400000);
  return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${-diff}`;
}

function tecopRow(tecop) {
  const CLS = { ok: 'ok', warn: 'warn', risk: 'risk', bad: 'risk' };
  const LB = { ok: '양호', warn: '주의', risk: '리스크' };
  return `<div class="tecop">${(tecop || []).map(t =>
    `<span class="tp ${CLS[t.status] || 'ok'}" title="${esc(t.note || '')}">${esc(t.k)} ${esc(LB[CLS[t.status] || 'ok'])}</span>`).join('')}</div>`;
}

/* 과제 카드 — 단계별 헤드라인 kv 3개 + 진행 게이지 + 3트랙/TECOP */
function homeCard(e) {
  const chip = `<span class="stagechip ${STAGE_CHIP[e.stage] || 'st-none'}">${esc(STAGE_LABEL[e.stage] || '등록됨')}</span>`;
  const prj = e.project || {};
  const meta = [prj.team ? 'PM ' + prj.team.split(',')[0] : '', prj.startDate ? `${prj.startDate} ~` : ''].filter(Boolean).join(' · ');
  if (!e.hasData) {
    return `<div class="pcard pcard-empty" data-go="${esc(e.id)}">
      <div class="ph"><b>${esc(e.name)}</b>${chip}</div>
      <div class="psub">${meta ? esc(meta) + ' · ' : ''}${esc(orgT('cardEmptySub', '양식 배포 전 · 데이터 없음'))}</div>
      <div class="pcard-hint">${esc(orgT('cardEmptyHint', '업체 엑셀 수령 → 빌드 후 자동 표시됩니다'))}</div>
    </div>`;
  }
  const s = e.summary || {}, prog = s.progress || {};
  const run = e.run || {};
  const unit = run.unit || 'Cy';
  const kv = [];
  kv.push({ k: `무고장 런 (${esc(run.criterion || '무정지')})`, v: fmt(prog.cum), sub: `/${fmt(prog.target || run.target)}${esc(unit)}` });
  if (e.stage === 'mass') {
    const eb = s.errorBudget || {};
    kv.push({ k: '에러 (한도)', v: eb.used != null ? eb.used : '—', sub: `/${eb.limit != null ? eb.limit : '—'}`, warn: eb.limit && eb.used >= eb.limit - 1 });
    const mtbf = s.mtbf || {};
    kv.push({ k: 'MTBF', v: fmt(mtbf.current), sub: `/${fmt(mtbf.target)}${esc(unit)}` });
  } else if (e.stage === 'poc') {
    const st = s.issueStats || {};
    kv.push({ k: '발굴 이슈', v: st.total != null ? st.total : s.records, sub: `건 · 종결 ${st.closed != null ? st.closed : '—'}` });
    kv.push({ k: '컨셉 리스크', v: s.concept != null ? s.concept : '—', sub: '건', good: s.concept === 0, warn: s.concept > 0 });
  } else {
    kv.push({ k: '레코드', v: s.records != null ? s.records : '—', sub: '건' });
    kv.push({ k: '재발', v: s.recur != null ? s.recur : '—', sub: '건', warn: s.recur > 0 });
  }
  const kvHtml = kv.map(x => `<div><div class="k">${x.k}</div><div class="v"${x.warn ? ' style="color:var(--major)"' : x.good ? ' style="color:var(--green)"' : ''}>${x.v}<small>${x.sub}</small></div></div>`).join('');
  const pct = Math.max(0, Math.min(100, prog.pct != null ? prog.pct : 0));
  const gate = e.gate || {};
  const dd = ddayLabel(gate.reviewDate);
  return `<div class="pcard" data-go="${esc(e.id)}">
    <div class="ph"><b>${esc(e.name)}</b>${chip}</div>
    <div class="psub">${esc(meta)}${e.generatedAt ? ` · ${esc(orgT('cardUpdated', '갱신'))} ${esc(e.generatedAt.slice(0, 10))}` : ''}</div>
    <div class="kv">${kvHtml}</div>
    <div class="rgauge"><div class="track"><i style="width:${pct}%"></i></div></div>
    ${tecopRow(e.tecop)}
    <div class="pfoot"><span>${e.stage === 'poc'
      ? `진행 이슈 ${((s.issueStats || {}).open != null) ? s.issueStats.open : '—'}건`
      : (s.recur ? `재발 ${s.recur}건` : '재발 0건')}</span><span class="gate">${esc(gate.label || '게이트 리뷰')} ${esc(dd)}</span></div>
  </div>`;
}

function renderHome() {
  const proc = (REG && REG.org && REG.org.process) || {};
  const entries = (PORTFOLIO && PORTFOLIO.projects) || [];

  // ① 표준 프로세스 스트립 (기간 = 밝은 카드 · 심의 = 남색 카드)
  const ladder = (proc.ladder || []).map(r => r.gate
    ? `<div class="gt"><div class="stg">${r.stg}</div><div class="run">${r.run}</div><div class="env">${esc(r.env || '')}</div></div>`
    : `<div class="rung"><div class="stg" style="color:${esc(r.color || 'var(--muted)')}">${esc(r.stg)}</div><div class="run">${esc(r.run)}</div><div class="env">${esc(r.env || '')}</div></div>`
  ).join('<div class="ar">→</div>');
  const principles = (proc.principles || []).map(p => `<span>${p}</span>`).join('');
  const procBox = (proc.ladder && proc.ladder.length) ? `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('procTag', '표준 프로세스'))}</span><h2>${esc(orgT('procTitle', '전체 체인 — 기간(데이터 축적) + 심의 게이트(체크리스트)'))}</h2><span class="d">${esc(orgT('procDesc', '무고장 런은 동일 컴포넌트 · 파라미터만 단계별 상향 · docs/PROCESS.md'))}</span></div>
      <div class="ladder">${ladder}</div>
      ${principles ? `<div class="principles">${principles}</div>` : ''}
    </section>` : '';

  // ② 과제 카드
  const cards = entries.map(homeCard).join('');

  // ③ 전사 KPI
  const withData = entries.filter(e => e.hasData);
  const recSum = withData.reduce((a, e) => a + ((e.summary || {}).records || 0), 0);
  const recurSum = withData.reduce((a, e) => a + ((e.summary || {}).recur || 0), 0);
  const gates = entries.filter(e => e.gate && e.gate.reviewDate).map(e => ({ id: e.id, abbr: e.abbr, d: e.gate.reviewDate }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
  const nextGate = gates.find(g => ddayLabel(g.d).startsWith('D-')) || gates[0];
  const kpis = `
    <div class="hkpis">
      <div class="hkpi"><div class="k">${esc(orgT('kpiProjects', '등록 과제'))}</div><div class="v">${entries.length}<small>건</small></div><div class="sub">${esc(orgT('kpiProjectsSub', '데이터 보유'))} ${withData.length}</div></div>
      <div class="hkpi"><div class="k">${esc(orgT('kpiRecords', '누적 고장/이슈 레코드'))}</div><div class="v">${fmt(recSum)}<small>건</small></div><div class="sub">${withData.map(e => `${esc(e.abbr)} ${((e.summary || {}).records || 0)}`).join(' · ') || '—'}</div></div>
      <div class="hkpi"><div class="k">${esc(orgT('kpiRecur', '재발 (전 과제)'))}</div><div class="v"${recurSum ? ' style="color:var(--major)"' : ''}>${recurSum}<small>건</small></div><div class="sub">${esc(orgT('kpiRecurSub', '공통 KPI — 단계 불문'))}</div></div>
      <div class="hkpi"><div class="k">${esc(orgT('kpiGate', '다음 게이트 리뷰'))}</div><div class="v">${nextGate ? esc(ddayLabel(nextGate.d)) : '—'}</div><div class="sub">${nextGate ? esc(nextGate.abbr + ' · ' + nextGate.d) : '—'}</div></div>
    </div>`;

  $('s-home').innerHTML = procBox + `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('cardsTag', '과제 현황'))}</span><h2>${esc(orgT('cardsTitle', '진행 중 과제'))} ${entries.length}${esc(orgT('cardsUnit', '건'))}</h2><span class="d">${esc(orgT('cardsDesc', '카드 클릭 → 과제 페이지'))}</span></div>
      <div class="pcards">${cards}</div>
      ${kpis}
    </section>`;

  document.querySelectorAll('#s-home .pcard[data-go]').forEach(c =>
    c.addEventListener('click', () => { location.hash = '#/' + c.dataset.go; }));
}
