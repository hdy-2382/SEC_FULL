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
  const ddDays = dd.startsWith('D-') ? parseInt(dd.slice(2), 10) : (dd === 'D-DAY' ? 0 : -1);
  const ddCls = ddDays >= 0 && ddDays <= 7 ? ' gate-soon' : '';
  const sc = STAGE_COLOR[e.stage] || 'var(--line)';
  // 개발 진행(세부 단계·SW 완성도) + 에러 진행(폐루프 종결률) — 최종 목표 게이지와 별도로 명시
  const lc = e.lifecycle || null;
  const devRow = lc ? `<div class="mrow"><span class="mk">개발</span>
      <span class="mtx">단계 <b>${lc.pos}/${lc.total}</b> · ${esc(lc.current || '—')}</span>
      ${e.swAvg != null ? `<span class="mv">SW ${e.swAvg}%</span>` : ''}</div>` : '';
  const sd = s.statusDist || null;
  const sdTotal = sd ? (sd.new || 0) + (sd.acting || 0) + (sd.verifying || 0) + (sd.closed || 0) : 0;
  const seg = (n, col) => n ? `<i style="flex:${n};background:${col}"></i>` : '';
  const loopRow = sdTotal ? `<div class="mrow"><span class="mk">폐루프</span>
      <div class="mbar" title="종결 ${sd.closed} · 검증중 ${sd.verifying} · 조치중 ${sd.acting} · 신규 ${sd.new}">
        ${seg(sd.closed, 'var(--green)')}${seg(sd.verifying, 'var(--sky)')}${seg(sd.acting, 'var(--major)')}${seg(sd.new, 'var(--crit)')}</div>
      <span class="mv">종결 ${sd.closed}/${sdTotal}</span></div>` : '';
  return `<div class="pcard" data-go="${esc(e.id)}" style="border-top:3px solid ${esc(sc)}">
    <div class="ph"><b>${esc(e.name)}</b>${chip}</div>
    <div class="psub">${esc(meta)}${e.generatedAt ? ` · ${esc(orgT('cardUpdated', '갱신'))} ${esc(e.generatedAt.slice(0, 10))}` : ''}</div>
    <div class="kv">${kvHtml}</div>
    <div class="pgauge"><div class="track"><i style="width:${pct}%;background:${esc(sc)}"></i></div><span class="pc">${pct}%</span></div>
    ${devRow}${loopRow}
    ${tecopRow(e.tecop)}
    <div class="pfoot"><span>${e.stage === 'poc'
      ? `진행 이슈 ${((s.issueStats || {}).open != null) ? s.issueStats.open : '—'}건`
      : (s.recur ? `재발 ${s.recur}건` : '재발 0건')}</span><span class="gate${ddCls}">${esc(gate.label || '게이트 리뷰')} ${esc(dd)}</span></div>
  </div>`;
}

function renderHome() {
  const proc = (REG && REG.org && REG.org.process) || {};
  const entries = (PORTFOLIO && PORTFOLIO.projects) || [];
  const withData = entries.filter(e => e.hasData);

  // ⓪ 히어로 — 합산 KPI는 두지 않는다: 단계마다 숫자의 의미가 달라(POC 이슈=발굴 성과 vs 운영 이슈=손실)
  //    전사로 의미 있는 두 가지만 — 게이트 리뷰 일정(순수 일정)과 주의 신호(기준 미달·TECOP 주의).
  const gates = entries.filter(e => e.gate && e.gate.reviewDate)
    .map(e => ({ id: e.id, abbr: e.abbr, name: e.name, d: e.gate.reviewDate, label: (e.gate.label || '게이트 리뷰') }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
  const gateRows = gates.slice(0, 5).map(g => {
    const dd = ddayLabel(g.d);
    const days = dd.startsWith('D-') ? parseInt(dd.slice(2), 10) : (dd === 'D-DAY' ? 0 : -1);
    return `<div class="hg-row${days >= 0 && days <= 7 ? ' soon' : ''}" data-go="${esc(g.id)}">
      <span class="d">${esc(dd)}</span><span class="nm">${esc(g.abbr)} ${esc(g.name)}</span><span class="dt">${esc(g.label)} · ${esc(g.d.slice(5))}</span></div>`;
  }).join('');
  const alerts = [];
  entries.forEach(e => {
    ((e.gate || {}).criteria || []).forEach(c => {
      if (c.status !== 'fail') return;
      const nm = (c.label || '').replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
      const val = c.value && !String(c.value).startsWith('auto:') ? ` — ${c.value}` : '';
      alerts.push({ id: e.id, abbr: e.abbr, t: `${nm}${val} (기준 미달)`, cls: 'bad' });
    });
    (e.tecop || []).forEach(t => {
      if (t.status === 'warn' || t.status === 'risk') alerts.push({ id: e.id, abbr: e.abbr, t: `${t.k} — ${t.note || '주의'}`, cls: 'warn' });
    });
  });
  const alertChips = alerts.slice(0, 8).map(a =>
    `<span class="al-chip ${a.cls}" data-go="${esc(a.id)}" title="${esc(a.t)}"><b>${esc(a.abbr)}</b>${esc(a.t.length > 22 ? a.t.slice(0, 21) + '…' : a.t)}</span>`).join('');
  const hero = `
    <div class="home-hero">
      <div class="hh-tx">
        <div class="hh-eyebrow">${esc(orgT('procTag', '표준 프로세스'))} · ${esc(orgT('footNote', ''))}</div>
        <h2>${esc(orgT('heroTitle', '배관은 하나, 질문은 단계별'))}</h2>
        <p>${orgT('heroSub', '고장 레코드 <b>형식</b>은 전 과제·전 단계 공통(추적성) — 판단 잣대와 화면은 단계별 질문에 맞춥니다. 전사 합산 숫자 대신 <b>일정과 주의 신호</b>만 모아 봅니다.')}</p>
      </div>
      <div class="hh-right">
        <div class="hh-box"><div class="k">${esc(orgT('heroGates', '게이트 리뷰 일정'))} — ${gates.length}건</div>${gateRows || '<div class="hg-row"><span class="nm">예정 없음</span></div>'}</div>
        <div class="hh-box"><div class="k">${esc(orgT('heroAlerts', '주의 신호'))} — 기준 미달 ${alerts.filter(a => a.cls === 'bad').length} · TECOP 주의 ${alerts.filter(a => a.cls === 'warn').length}</div>
          <div class="hh-alert-chips">${alertChips || '<span class="al-chip">주의 신호 없음</span>'}</div></div>
      </div>
    </div>`;

  // ① 표준 프로세스 스트립 — 각 단계 아래에 현재 그 단계에 있는 과제 배지 (살아있는 지도)
  const chipsOf = key => entries.filter(e => e.stage === key).map(e =>
    `<span class="lp-chip" data-go="${esc(e.id)}" style="--pc:${esc(STAGE_COLOR[key] || '#888')}" title="${esc(e.name)}">${esc(e.abbr)} ${esc(e.name.length > 9 ? e.name.slice(0, 8) + '…' : e.name)}</span>`).join('');
  const ladder = (proc.ladder || []).map(r => {
    if (r.gate) return `<div class="gt"><div class="stg">${r.stg}</div><div class="run">${r.run}</div><div class="env">${esc(r.env || '')}</div></div>`;
    const chips = r.key ? chipsOf(r.key) : '';
    return `<div class="rung${chips ? ' has-prj' : ''}" style="--rc:${esc(r.color || '#8a99ac')}">
      <div class="stg" style="color:${esc(r.color || 'var(--muted)')}">${esc(r.stg)}</div>
      <div class="run">${esc(r.run)}</div><div class="env">${esc(r.env || '')}</div>
      <div class="lchips">${chips || `<span class="lp-none">${esc(orgT('ladderEmpty', '진행 과제 없음'))}</span>`}</div>
    </div>`;
  }).join('<div class="ar">→</div>');
  const principles = (proc.principles || []).map(p => `<span>${p}</span>`).join('');
  const gatecards = (proc.gates || []).map(g => `
    <div class="gatecard">
      <h4><span class="gd">◆</span>${esc(g.title)}</h4>
      <div class="gsub">${esc(g.sub || '')}</div>
      <div class="items">${(g.items || []).map(it => typeof it === 'string'
        ? `<span>${esc(it)}</span>` : `<span${it.hl ? ' class="hl"' : ''}>${esc(it.t)}</span>`).join('')}</div>
    </div>`).join('');
  const procBox = (proc.ladder && proc.ladder.length) ? `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('procTag', '표준 프로세스'))}</span><h2>${esc(orgT('procTitle', '전체 체인 — 기간(데이터 축적) + 심의 게이트(체크리스트)'))}</h2><span class="d">${esc(orgT('procDesc', '무고장 런은 동일 컴포넌트 · 파라미터만 단계별 상향 · docs/PROCESS.md'))}</span></div>
      <div class="ladder">${ladder}</div>
      ${gatecards ? `<div class="gatecards">${gatecards}</div>` : ''}
      ${principles ? `<div class="principles">${principles}</div>` : ''}
    </section>` : '';

  // ② 과제 카드
  const cards = entries.map(homeCard).join('');

  $('s-home').innerHTML = hero + procBox + `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('cardsTag', '과제 현황'))}</span><h2>${esc(orgT('cardsTitle', '진행 중 과제'))} ${entries.length}${esc(orgT('cardsUnit', '건'))}</h2><span class="d">${esc(orgT('cardsDesc', '카드 클릭 → 과제 페이지'))}</span></div>
      <div class="pcards">${cards}</div>
    </section>`;

  document.querySelectorAll('#s-home .pcard[data-go], #s-home .lp-chip[data-go], #s-home .hg-row[data-go], #s-home .al-chip[data-go]').forEach(c =>
    c.addEventListener('click', ev => { ev.stopPropagation(); location.hash = '#/' + c.dataset.go; }));
}
