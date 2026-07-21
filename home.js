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

/* TECOP 리스크 렌즈 — T기술 E경제(투자·효과) C계약(잣대·업체) O조직(부서 안) P이해·안전(부서 밖+안전).
   사내 정의·판정 트리거: docs/CRITERIA.md §7 (게이트 리뷰 고정 안건 · worst-of · 근거 필수).
   withLabel=true면 행 앞에 '리스크' 라벨 (홈 카드용 — 맥락 없이도 읽히게) */
const TECOP_KO = { T: '기술', E: '경제', C: '계약', O: '조직', P: '이해·안전' };
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
  const seg = (n, col, lb) => n ? `<i style="flex:${n};background:${col}" title="${lb} ${n}건"></i>` : '';
  // 폐루프 상태 색은 라벨과 함께 표기 — 막대만으로는 의미 전달 불가
  const LOOP_ST = [['closed', '종결', 'var(--green)'], ['verifying', '검증', 'var(--sky)'], ['acting', '조치', 'var(--major)'], ['new', '신규', 'var(--crit)']];
  const loopCnt = sd ? LOOP_ST.filter(([k]) => sd[k]).map(([k, lb, col]) => `<i class="lpdot" style="background:${col}"></i>${lb} ${sd[k]}`).join(' · ') : '';
  const loopRow = sdTotal ? `<div class="mrow"><span class="mk">폐루프</span>
      <div class="mbar">${LOOP_ST.map(([k, lb, col]) => seg(sd[k], col, lb)).join('')}</div>
      <span class="mv">${loopCnt}</span></div>` : '';
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

/* 포트폴리오 파이프라인 — 부서의 여러 과제를 표준 프로세스 단계별 열에 배치.
   각 과제는 서로 독립 (같은 단계에 여러 과제 가능). "어느 과제가 어느 단계에, 얼마나 건강한가" */
function renderHomePortfolio(withData, entries, proc) {
  const UNIT = { poc: 'h', pilot: 'h', mass: 'Cy', spread: '호기', ops: '%' };
  const ddNum = d => { const m = /^D-(\d+)$/.exec(ddayLabel(d) || ''); return m ? +m[1] : (String(ddayLabel(d)).startsWith('D+') ? 999 : 0); };
  const stages = (proc.ladder || []).filter(r => r.key);

  // 과제 건강도: 오픈 치명 > 기준 미달 > 게이트 임박 > 정상
  const health = e => {
    const oc = (e.summary || {}).openCritical || 0;
    const failN = ((e.gate || {}).criteria || []).filter(c => c.status === 'fail').length;
    const dd = (e.gate || {}).reviewDate ? ddNum(e.gate.reviewDate) : 999;
    if (oc) return { cls: 'crit', tag: `치명 오픈 ${oc}` };
    if (failN) return { cls: 'warn', tag: `기준 미달 ${failN}` };
    if (dd <= 7) return { cls: 'soon', tag: `게이트 임박` };
    return { cls: 'ok', tag: '정상' };
  };

  // KPI
  const N = withData.length;
  const soonN = withData.filter(e => (e.gate || {}).reviewDate && ddNum(e.gate.reviewDate) <= 7).length;
  const critN = withData.reduce((a, e) => a + ((e.summary || {}).openCritical || 0), 0);
  const failN = withData.reduce((a, e) => a + (((e.gate || {}).criteria || []).filter(c => c.status === 'fail').length), 0);
  const kchip = (k, v, cls) => `<span class="jk ${cls || ''}"><em>${esc(k)}</em><b>${v}</b></span>`;

  const card = e => {
    const s = e.summary || {}, prog = s.progress || {}, g = e.gate || {};
    const col = STAGE_COLOR[e.stage] || '#888';
    const pct = Math.max(0, Math.min(100, prog.pct || 0));
    const h = health(e);
    const dd = g.reviewDate ? ddayLabel(g.reviewDate) : '';
    const nm = (e.name || '').replace(/\s*\(.*\)$/, '');
    return `<div class="ppc h-${h.cls}" data-go="${esc(e.id)}" style="--sc:${esc(col)}">
      <div class="ppc-h"><b>${esc(nm)}</b><span class="ppc-dd">${esc(dd)}</span></div>
      <div class="ppc-bar"><i style="width:${pct}%;background:${esc(col)}"></i></div>
      <div class="ppc-f"><span class="ppc-g">${fmt(prog.cum)}/${fmt(prog.target)}${UNIT[e.stage] || ''} · ${Math.round(pct)}%</span>
        <span class="ppc-hl">${esc(h.tag)}</span></div>
    </div>`;
  };

  const cols = stages.map(r => {
    const list = withData.filter(e => e.stage === r.key);
    const nm9 = String(r.stg || '').replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
    return `<div class="ppcol" style="--sc:${esc(r.color || '#8a99ac')}">
      <div class="ppcol-h"><span class="ppcol-t">${esc(nm9)}</span><span class="ppcol-n">${list.length || '·'}</span></div>
      <div class="ppcol-b">${list.map(card).join('') || '<div class="ppcol-e">진행 과제 없음</div>'}</div>
    </div>`;
  }).join('');

  const html = `
    <section class="jhero">
      <div class="jhero-l">
        <div class="jh-eyebrow">부서 표준 프로세스 · 다과제 포트폴리오</div>
        <h1 class="jh-title">과제 포트폴리오</h1>
      </div>
      <div class="jhero-k">
        ${kchip('진행 과제', `${N}건`)}
        ${kchip('게이트 임박', `${soonN}`, soonN ? 'hl' : '')}
        ${kchip('오픈 치명', `${critN}`, critN ? 'bad' : 'ok')}
        ${kchip('기준 미달', `${failN}`, failN ? 'bad' : 'ok')}
      </div>
    </section>
    <section class="sbox jsec">
      <div class="sbox-h"><span class="tag">파이프라인</span><h2>단계별 진행 과제 — 표준 프로세스 위 위치</h2>
        <span class="d">각 과제는 독립 · 카드 색 = 건강도(빨강 치명·주황 미달·정상) · 클릭 → 과제 페이지</span></div>
      <div class="ppipe">${cols}</div>
    </section>`;

  $('s-home').innerHTML = html;
  document.querySelectorAll('#s-home .ppc[data-go]').forEach(c =>
    c.addEventListener('click', () => { location.hash = '#/' + c.dataset.go; }));
}

/* 한눈에 보기 — 드럼 자동화 1개 과제의 표준 프로세스 여정을 한 장으로.
   ① 헤더 밴드(정체성 + 핵심 KPI)  ② 여정 스테이션(단계별 성적 + 치명 소진 스토리) */
function renderHome() {
  const proc = (REG && REG.org && REG.org.process) || {};
  const entries = (PORTFOLIO && PORTFOLIO.projects) || [];
  const withData = entries.filter(e => e.hasData);
  if (withData.length >= 1 && (proc.ladder || []).some(r => r.key))
    return renderHomePortfolio(withData, entries, proc);
  // 폴백(등록 과제 없음): 기존 상세 뷰 유지

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
      <div class="sbox-h"><span class="tag">${esc(orgT('procTag', '표준 프로세스'))}</span><h2>${esc(orgT('procTitle', '전체 체인'))}</h2><span class="d">${esc(orgT('procDesc', ''))}</span></div>
      <div class="ladder">${ladder}</div>
      ${gatecards ? `<div class="gatecards">${gatecards}</div>` : ''}
      ${principles ? `<div class="principles">${principles}</div>` : ''}
    </section>` : '';

  // ② 과제 카드 (폴백 — 여정 데이터가 없을 때)
  const cards = entries.map(homeCard).join('');

  $('s-home').innerHTML = procBox + `
    <section class="sbox">
      <div class="sbox-h"><span class="tag">${esc(orgT('cardsTag', '과제 현황'))}</span><h2>${esc(orgT('cardsTitle', '진행 중 과제'))} ${entries.length}${esc(orgT('cardsUnit', '건'))}</h2><span class="d">${cardsNote}</span></div>
      <div class="pcards">${cards}</div>
    </section>`;

  document.querySelectorAll('#s-home .pcard[data-go], #s-home .lp-chip[data-go], #s-home .fn-row[data-go]').forEach(c =>
    c.addEventListener('click', ev => { ev.stopPropagation(); location.hash = '#/' + c.dataset.go; }));
}
