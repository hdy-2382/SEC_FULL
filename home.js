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

/* TECOP 리스크 렌즈 — T기술 E경제 C계약 O조직 P안전 (게이트 리뷰 고정 안건).
   withLabel=true면 행 앞에 '리스크' 라벨 (홈 카드용 — 맥락 없이도 읽히게) */
const TECOP_KO = { T: '기술', E: '경제', C: '계약', O: '조직', P: '안전' };
function tecopRow(tecop, withLabel) {
  const CLS = { ok: 'ok', warn: 'warn', risk: 'risk', bad: 'risk' };
  const LB = { ok: '양호', warn: '주의', risk: '리스크' };
  const chips = (tecop || []).map(t => {
    const ko = TECOP_KO[t.k] || t.k;
    return `<span class="tp ${CLS[t.status] || 'ok'}" title="${esc(t.k)}(${esc(ko)}) — ${esc(t.note || '')}">${esc(ko)} ${esc(LB[CLS[t.status] || 'ok'])}</span>`;
  }).join('');
  return `<div class="tecop">${withLabel ? '<span class="tk" title="게이트 리뷰 고정 안건 — TECOP 리스크 렌즈">리스크</span>' : ''}${chips}</div>`;
}

/* 개발(제작) 단계 카드 — 평가 데이터가 아직 없는 과제: config devPlan(마일스톤·기간·평가 착수)으로
   "무엇을 언제까지 만들고, 지금 어디까지 왔나"를 보여준다. 평가 지표(런·폐루프)는 무의미하므로 대체. */
function homeBuildCard(e, chip, meta) {
  const dp = e.devPlan || {};
  const items = dp.items || [];
  const done = items.filter(it => (it.pct || 0) >= 100).length;
  const avg = items.length ? Math.round(items.reduce((a, it) => a + (it.pct || 0), 0) / items.length) : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = items.filter(it => (it.pct || 0) < 100 && it.due && parseYMD(it.due) < today).length;
  // 일정 경과율 (계획 기간 대비 오늘)
  let elapsed = null;
  if (dp.start && dp.end) {
    const s = parseYMD(dp.start), en = parseYMD(dp.end);
    elapsed = Math.max(0, Math.min(100, Math.round((today - s) / (en - s) * 100)));
  }
  const cur = items.find(it => (it.pct || 0) < 100);
  const sc = STAGE_COLOR[e.stage] || 'var(--line)';
  const evalDd = dp.evalStart ? ddayLabel(dp.evalStart) : '';
  // 진행이 일정보다 뒤지면 주의색
  const lag = elapsed != null && avg < elapsed - 10;
  return `<div class="pcard" data-go="${esc(e.id)}" style="border-top:3px solid ${esc(sc)}">
    <div class="ph"><b>${esc(e.name)}</b><span class="buildchip">개발 중</span>${chip}</div>
    <div class="psub">${esc(meta)}${dp.label ? ` · ${esc(dp.label)}` : ''}</div>
    <div class="kv">
      <div><div class="k">개발 진척 (계획 ${dp.end ? esc(dp.end.slice(5)) : '—'}까지)</div><div class="v"${lag ? ' style="color:var(--major)"' : ''}>${avg}<small>% · 일정 경과 ${elapsed != null ? elapsed : '—'}%</small></div></div>
      <div><div class="k">마일스톤</div><div class="v">${done}<small>/${items.length} 완료</small></div></div>
      <div><div class="k">지연</div><div class="v"${overdue ? ' style="color:var(--crit)"' : ' style="color:var(--green)"'}>${overdue}<small>건</small></div></div>
    </div>
    <div class="pgauge"><div class="track"><i style="width:${avg}%;background:${esc(sc)}"></i></div><span class="pc">${avg}%</span></div>
    ${cur ? `<div class="mrow"><span class="mk">진행</span><span class="mtx">${esc(cur.name)} <b>${cur.pct || 0}%</b>${cur.due ? ` · ~${esc(cur.due.slice(5))}` : ''}</span></div>` : ''}
    ${dp.evalStart ? `<div class="mrow"><span class="mk">다음</span><span class="mtx">평가 착수 <b>${esc(dp.evalStart)}</b> — ${esc(dp.evalLabel || (e.run || {}).criterion || '무고장 런')}</span></div>` : ''}
    ${tecopRow(e.tecop, true)}
    <div class="pfoot"><span>개발 단계 — 평가 데이터 없음 (착수 후 자동 전환)</span><span class="gate">${dp.evalStart ? `평가 착수 ${esc(evalDd)}` : '착수일 미정'}</span></div>
  </div>`;
}

/* 과제 카드 — 단계별 헤드라인 kv 3개 + 진행 게이지 + 3트랙/TECOP */
function homeCard(e) {
  const chip = `<span class="stagechip ${STAGE_CHIP[e.stage] || 'st-none'}">${esc(STAGE_LABEL[e.stage] || '등록됨')}</span>`;
  const prj = e.project || {};
  const meta = [prj.team ? 'PM ' + prj.team.split(',')[0] : '', prj.startDate ? `${prj.startDate} ~` : ''].filter(Boolean).join(' · ');
  if (!e.hasData && e.devPlan) return homeBuildCard(e, chip, meta);
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
    ${tecopRow(e.tecop, true)}
    <div class="pfoot"><span>${e.stage === 'poc'
      ? `진행 이슈 ${((s.issueStats || {}).open != null) ? s.issueStats.open : '—'}건`
      : (s.recur ? `재발 ${s.recur}건` : '재발 0건')}</span><span class="gate${ddCls}">${esc(gate.label || '게이트 리뷰')} ${esc(dd)}</span></div>
  </div>`;
}

function renderHome() {
  const proc = (REG && REG.org && REG.org.process) || {};
  const entries = (PORTFOLIO && PORTFOLIO.projects) || [];
  const withData = entries.filter(e => e.hasData);

  // 상단 요약 밴드는 두지 않는다 — 과제 5건 규모에선 카드가 곧 요약이고, 게이트 D-day·TECOP는
  // 카드 안에 이미 있다. 최소 신호(가장 임박한 게이트·기준 미달 수)만 과제 현황 헤더에 한 줄로.
  const gates = entries.filter(e => e.gate && e.gate.reviewDate)
    .map(e => ({ id: e.id, abbr: e.abbr, d: e.gate.reviewDate }))
    .sort((a, b) => a.d < b.d ? -1 : 1);
  const nextGate = gates.find(g => !ddayLabel(g.d).startsWith('D+')) || gates[0];
  const failN = entries.reduce((a, e) =>
    a + (((e.gate || {}).criteria || []).filter(c => c.status === 'fail').length), 0);
  const cardsNote = [
    nextGate ? `다음 게이트 <b>${esc(nextGate.abbr)} ${esc(ddayLabel(nextGate.d))}</b>` : '',
    failN ? `<b style="color:var(--crit)">기준 미달 ${failN}건</b>` : '',
    esc(orgT('cardsDesc', '카드 클릭 → 과제 페이지')),
  ].filter(Boolean).join(' · ');

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

  // ①-2 심각도 깔때기 — 이 체계의 목적 그 자체: 누적 대장 기반으로 크리티컬을 조기(상류)에
  //     소진해 뒤 단계를 싸게 만든다. 단계 순서대로 발굴 심각도 구성과 오픈 Critical을 본다.
  const ORDER9 = ['poc', 'pilot', 'mass', 'spread', 'ops'];
  const journey = withData.filter(e => (e.summary || {}).sevDist)
    .sort((a, b) => ORDER9.indexOf(a.stage) - ORDER9.indexOf(b.stage));
  let funnelBox = '';
  if (journey.length >= 2) {
    const maxTot = Math.max(...journey.map(e => {
      const d = e.summary.sevDist; return (d.Critical || 0) + (d.Major || 0) + (d.Minor || 0);
    }), 1);
    const seg = (n, col, label) => n ? `<i style="flex:${n};background:${col}" title="${label ? label + ' ' : ''}${n}건"></i>` : '';
    // 원인분류 팔레트 — 단계 페이지의 카테고리 색 1:1 고정과 동일 (styles.css). [key, 라벨, 색, 세그 글자색]
    const CAUSE_HOME = [
      ['concept', '컨셉', '#C0392B'], ['design', '설계', '#2E89D6'], ['parts', '부품', '#7A4FB3'],
      ['build', '제작·조립', '#B36F0A'], ['install', '설치·시공', '#0e7a8a'], ['sw', 'SW', '#E08600', '#4a3000'],
      ['env', '환경·자재', '#3E9B6E'], ['oper', '운영·조작', '#6E7D90'], ['etc', '기타', '#9aa9bb'],
    ];
    // 행 라벨 — 단계 + 과제명 (한 단계에 여러 과제가 있어도 구분되게)
    const fnStg = e => `<span class="fn-stg" title="${esc(e.name || '')} — ${esc(STAGE_LABEL[e.stage] || e.stage)}">
      <b style="color:${esc(STAGE_COLOR[e.stage] || '#666')}">${esc(STAGE_LABEL[e.stage] || e.stage)}</b><small>${esc(e.name || '')}</small></span>`;
    // 왼쪽 — 심각도 깔때기 (총량 비례 폭)
    const fRows = journey.map(e => {
      const d = e.summary.sevDist, oc = e.summary.openCritical || 0;
      const tot = (d.Critical || 0) + (d.Major || 0) + (d.Minor || 0);
      return `<div class="fn-row" data-go="${esc(e.id)}">
        ${fnStg(e)}
        <div class="fn-bar" style="width:${Math.round(tot / maxTot * 100)}%">${seg(d.Critical, '#C0392B', '치명')}${seg(d.Major, '#E08600', '중대')}${seg(d.Minor, '#3F7CC4', '경미')}</div>
        <span class="fn-tot">${tot}건</span>
        <span class="fn-crit${(d.Critical || 0) ? '' : ' zero'}">치명 ${d.Critical || 0}${oc ? ` <b>· 오픈 ${oc}</b>` : ''}</span>
      </div>`;
    }).join('');
    // 오른쪽 — 원인분류 구성 (전폭 구성비 · 세그 안에 라벨)
    const cRows = journey.map(e => {
      const cd = e.summary.causeDist || {};
      const tot = CAUSE_HOME.reduce((a, [k]) => a + (cd[k] || 0), 0);
      const segs = CAUSE_HOME.map(([k, lb, col, txt]) => {
        const n = cd[k]; if (!n) return '';
        return `<span class="fc-sg" style="flex:${n};background:${col}${txt ? `;color:${txt}` : ''}" title="${lb} ${n}건"><b>${lb} ${n}</b></span>`;
      }).join('');
      return `<div class="fn-row" data-go="${esc(e.id)}">
        ${fnStg(e)}
        <div class="fc-bar">${segs || '<span class="mini">기록 없음</span>'}</div>
      </div>`;
    }).join('');
    // 분류 레전드 — 여정에 실제 등장하는 분류만
    const usedCats = CAUSE_HOME.filter(([k]) => journey.some(e => ((e.summary.causeDist || {})[k] || 0) > 0));
    const catLegend = usedCats.map(([, lb, col]) => `<span><i style="background:${col}"></i>${lb}</span>`).join('');
    const upCrit = journey[0].summary.sevDist.Critical || 0;
    const downCrit = journey.slice(1).reduce((a, e) => a + (e.summary.sevDist.Critical || 0), 0);
    funnelBox = `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('funnelTag', '과제 여정'))}</span><h2>${esc(orgT('funnelTitle', '심각도는 상류에서 소진하고, 병의 종류는 단계마다 이동한다'))}</h2><span class="d">누적 대장(공통 어휘) 기준 · 치명 상류 ${upCrit}건 → 하류 ${downCrit}건</span></div>
      <div class="fn2">
        <div class="panel">
          <div class="fn-h">심각도 깔때기 <span>총량 비례 — 치명(빨강)이 상류에서 사라지는가</span></div>
          <div class="fnl">${fRows}</div>
          <div class="clegend"><span><i style="background:#C0392B"></i>치명</span><span><i style="background:#E08600"></i>중대</span><span><i style="background:#3F7CC4"></i>경미</span>
          <span class="mini" style="margin-left:auto">S×O 우선순위로 치명·빈발 조기 해결</span></div>
        </div>
        <div class="panel">
          <div class="fn-h">원인분류 구성 <span>구성비 — 단계 보드와 같은 색</span></div>
          <div class="fnl">${cRows}</div>
          <div class="clegend">${catLegend}
          <span class="mini" style="margin-left:auto">SW·설계(상류) → 부품·제작(실증) → 설치·운영(현장)</span></div>
        </div>
      </div>
    </section>`;
  }

  // ② 과제 카드
  const cards = entries.map(homeCard).join('');

  $('s-home').innerHTML = procBox + funnelBox + `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('cardsTag', '과제 현황'))}</span><h2>${esc(orgT('cardsTitle', '진행 중 과제'))} ${entries.length}${esc(orgT('cardsUnit', '건'))}</h2><span class="d">${cardsNote}</span></div>
      <div class="pcards">${cards}</div>
    </section>`;

  document.querySelectorAll('#s-home .pcard[data-go], #s-home .lp-chip[data-go], #s-home .fn-row[data-go]').forEach(c =>
    c.addEventListener('click', ev => { ev.stopPropagation(); location.hash = '#/' + c.dataset.go; }));
}
