/* library.js — 부서 고장모드 라이브러리 (#/library[/{modeKey}]).
   전 과제 records를 고장모드 단위로 통합한 data/library.json(빌드 산출)을 렌더.
   유스케이스: 신규 과제에서 동일 모드 발생 시 기존 원인·대책·검증치 즉시 조회 (조치 재사용).
   진입점 renderLibrary(modeKey) — app.js showLibrary()가 호출. LIB는 app.js 부트스트랩이 주입. */

'use strict';

let LIB = null;            // data/library.json (app.js 부트스트랩 주입)
let LIB_Q = '';            // 검색어
let LIB_CAT = '';          // 카테고리 필터 (정준 키)
let LIB_ROWS = [];         // 현재 필터·정렬 결과 (모달 인덱스와 동기)

/* 카테고리 팔레트 — 단계 보드·홈과 동일 1:1 (key, 라벨, 색, fwt 클래스) */
const LIB_CATS = [
  ['concept', '컨셉', '#C0392B', 'risk'], ['design', '설계', '#2E89D6', 'design'],
  ['parts', '부품', '#7A4FB3', 'parts'], ['build', '제작·조립', '#B36F0A', 'build'],
  ['install', '설치·시공', '#0e7a8a', 'install'], ['sw', '구현(SW)', '#E08600', 'sw'],
  ['env', '환경·자재', '#3E9B6E', 'env'], ['oper', '운영·조작', '#6E7D90', 'oper'],
  ['etc', '기타', '#9aa9bb', ''],
];

/* 발생도 밴드 + S×O 우선순위 — devPriorityPanel과 동일 규칙 (드묾<3 ≤보통<6 ≤빈발) */
function libBand(n) { return n >= 6 ? '빈발' : n >= 3 ? '보통' : '드묾'; }
function libPrio(m) { return PRIO[(m.severity || 'Minor') + '|' + libBand(m.counts.total)] || 'Low'; }

function libOpenN(m) { return m.counts.new + m.counts.acting + m.counts.verifying; }

/* 필터·정렬 결과 재계산 — 테이블과 LIB_ROWS를 항상 같은 곳에서 생성 (모달 인덱스 동기) */
function libRows() {
  const q = _norm9(LIB_Q);
  const rows = ((LIB && LIB.modes) || []).filter(m => {
    if (LIB_CAT && m.category !== LIB_CAT) return false;
    if (!q) return true;
    const hay = _norm9([m.code, m.mode, m.categoryLabel, m.desc,
      ...m.occurrences.map(o => o.causeText + ' ' + o.action + ' ' + o.detail)].join(' '));
    return hay.includes(q);
  });
  const rank = { High: 0, Medium: 1, Low: 2 };
  rows.sort((a, b) => (rank[libPrio(a)] - rank[libPrio(b)])
    || (b.counts.total - a.counts.total) || String(a.key).localeCompare(String(b.key)));
  return rows;
}
function _norm9(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }

/* ══════════ 렌더 ══════════ */

function renderLibrary(modeKey) {
  const el = $('s-library'); if (!el) return;
  if (!LIB || !(LIB.modes || []).length) {
    el.innerHTML = `<div class="banner" style="margin:16px 2px">고장모드 라이브러리 데이터가 없습니다 — <b>python3 scripts/build_dashboard_json.py</b> 실행 후 새로고침 (data/library.json)</div>`;
    return;
  }
  const t = LIB.totals || {};
  const std = ((REG || {}).org || {}).standards || {};
  el.innerHTML = `<div class="pocv libv">
    <div class="ptitle">
      <span class="stagechip" style="background:#EFE9F8;color:#6a41a3">라이브러리</span>
      <span class="tmpl">부서 고장모드 라이브러리 — 전 과제 통합</span>
      <span class="meta">과제 <b>${t.projects || 0}</b> · 모드 <b>${t.modes || 0}</b> · 레코드 <b>${t.records || 0}</b> (오픈 ${t.open || 0}) · 생성 <b>${esc((LIB.generatedAt || '').slice(0, 10))}</b></span>
    </div>
    <div class="lib-grid">
      <div>
        <div class="pt-h9">발굴 이슈 분류 — 카테고리별 모드/건수 <span class="mini">타일 클릭 = 필터</span></div>
        <div class="cat-board" id="lib-cats">${libCatTiles()}</div>
      </div>
      <div class="panel lib-std">
        <div class="ph"><h3>부서 표준</h3><span class="ps">docs/CRITERIA.md</span></div>
        <div class="std-row"><span class="std-k">공통 어휘</span><span>${esc(std.vocab || 'DRM-01~08')} <b>${esc(std.vocabVersion || '')}</b> — 전 과제·전 단계 공통</span></div>
        <div class="std-row"><span class="std-k">조치 검증</span><span>무발생 <b>${std.verifyCycle != null ? std.verifyCycle : 200}Cy</b> 경과 시에만 검증완료 → 종결 (§5)</span></div>
        <div class="std-row"><span class="std-k">재발</span><span>동일 고장모드 재출현 = 재발 → 재분석 의무 (종결 여부 무관)</span></div>
        <div class="std-row"><span class="std-k">우선순위</span><span>S×O — 심각도 × 발생도(드묾&lt;3 ≤보통&lt;6 ≤빈발)</span></div>
      </div>
    </div>
    <div class="lib-bar">
      <input class="lib-q" id="lib-q" type="search" placeholder="모드명 · 코드 · 원인 · 대책 검색" value="${esc(LIB_Q)}" oninput="libSearch(this.value)">
      <span class="lib-n" id="lib-n"></span>
      <button class="btn" id="lib-clear" onclick="libClear()" style="display:none">필터 해제</button>
    </div>
    <div id="lib-table-wrap">${libTable()}</div>
  </div>`;
  libSyncUi();
  if (modeKey) openLibModalByKey(modeKey);
}

function libCatTiles() {
  const byCat = {}; ((LIB && LIB.categories) || []).forEach(c => { byCat[c.key] = c; });
  return LIB_CATS.map(([k, lb, , fwtCls]) => {
    const c = byCat[k]; if (!c) return '';
    const on = LIB_CAT === k;
    return `<div class="fwt ${fwtCls}${on ? ' on' : ''}" onclick="libCat('${k}')" title="${esc(lb)} — 모드 ${c.modes} · ${c.records}건">
      <div class="t">${esc(lb)}</div>
      <div class="n">${c.modes}<small>모드 · ${c.records}건</small></div>
      <div class="m">${c.open ? `오픈 <b style="color:var(--crit)">${c.open}</b>` : '오픈 0'} · 종결 ${c.records - c.open}</div>
    </div>`;
  }).join('');
}

function libTable() {
  LIB_ROWS = libRows();
  const PB = { High: 'b-crit', Medium: 'b-major', Low: 'b-minor' };
  const rows = LIB_ROWS.map((m, i) => {
    const openN = libOpenN(m);
    const pjs = m.projects.map(p =>
      `<span class="pj" style="--pc:${esc(STAGE_COLOR[p.stage] || '#666')}" title="${esc(p.name)} — ${esc(STAGE_LABEL[p.stage] || p.stage)}">${esc(p.abbr || '?')}</span>`).join('');
    const last = m.occurrences[m.occurrences.length - 1] || {};
    const act = last.action || last.detail || '—';
    return `<tr onclick="openLibModal(${i})" style="cursor:pointer" title="클릭 = 발생 이력·대책 전체">
      <td class="c"><span class="badge ${PB[libPrio(m)]}">${libPrio(m)}</span></td>
      <td class="c">${m.code ? `<b>${esc(m.code)}</b>` : '<span class="badge b-wait" title="코드마스터 미등재 — 어휘 개정 후보">미등재</span>'}</td>
      <td><b>${esc(m.mode)}</b>${m.desc ? `<div class="mini">${esc(m.desc)}</div>` : ''}</td>
      <td class="c">${c4Chip(m.categoryLabel || '—')}</td>
      <td class="c"><span class="badge ${SEV_BADGE[m.severity] || 'b-minor'}">${esc(sevLabel(m.severity))}</span></td>
      <td class="c">${pjs}</td>
      <td class="c"><b>${m.counts.total}</b>${m.recurCount ? ` <span class="rlink" title="재출현 ${m.recurCount}회">↺${m.recurCount}</span>` : ''}</td>
      <td class="c">${openN ? `<b style="color:var(--crit)">오픈 ${openN}</b>` : `<span style="color:var(--green);font-weight:700">종결 ${m.counts.closed}</span>`}</td>
      <td class="lib-act">${esc(act)}</td>
      <td class="c"><button class="btn" style="padding:3px 8px" onclick="event.stopPropagation();openLibModal(${i})">＋</button></td>
    </tr>`;
  }).join('');
  return `<div class="panel tight">
    <div class="ph"><h3>고장모드 대장</h3><span class="ps">S×O 우선순위 정렬 · 최고 심각도 기준</span></div>
    <div class="tbl-scroll"><table>
      <tr><th class="c">우선</th><th class="c">코드</th><th>고장모드</th><th class="c">분류</th><th class="c">심각도</th><th class="c">발생 과제</th><th class="c">건수</th><th class="c">상태</th><th>최근 대책</th><th class="c"></th></tr>
      ${rows || '<tr><td colspan="10" class="mini c">검색·필터 결과 없음</td></tr>'}</table></div>
  </div>`;
}

/* ── 필터·검색 (테이블 wrap만 갱신 — 검색 입력 포커스 유지) ── */
function libSearch(v) { LIB_Q = v || ''; libRefresh(); }
function libCat(k) {
  LIB_CAT = (LIB_CAT === k) ? '' : k;
  const cats = $('lib-cats'); if (cats) cats.innerHTML = libCatTiles();
  libRefresh();
}
function libClear() {
  LIB_Q = ''; LIB_CAT = '';
  const q = $('lib-q'); if (q) q.value = '';
  const cats = $('lib-cats'); if (cats) cats.innerHTML = libCatTiles();
  libRefresh();
}
function libRefresh() {
  const wrap = $('lib-table-wrap'); if (wrap) wrap.innerHTML = libTable();
  libSyncUi();
}
function libSyncUi() {
  const n = $('lib-n'); if (n) n.textContent = `${LIB_ROWS.length}개 모드`;
  const clr = $('lib-clear'); if (clr) clr.style.display = (LIB_Q || LIB_CAT) ? '' : 'none';
}

/* ── 모드 상세 모달 — 발생 이력 타임라인 (최신순: 재발 시 최신 대책 먼저) ── */
function openLibModal(i) {
  const m = LIB_ROWS[i]; if (!m) return;
  $('modal-title').textContent = `${m.code ? m.code + ' · ' : ''}${m.mode}`;
  const openN = libOpenN(m);
  const items = m.occurrences.slice().reverse().map(o => {
    const b = pocStBucket(o.status);
    const imgs = (o.images || []).map(fn => {
      const src = `data/projects/${o.project}/errors/${fn}`;
      return `<img src="${esc(src)}" alt="${esc(fn)}" onclick="lightbox('${esc(src)}')" onerror="this.remove()">`;
    }).join('');
    return `<div class="tl-it">
      <div class="tl-h">
        <span class="pj" style="--pc:${esc(STAGE_COLOR[o.stage] || '#666')}">${esc(o.abbr || '?')}</span>
        <b>${esc(STAGE_LABEL[o.stage] || o.stage)}</b> · ${esc(o.projectName)} · <b>${esc(o.id)}</b>
        <span class="tl-dt">${esc(o.date || '—')}${o.closedDate ? ` → 종결 ${esc(o.closedDate)}` : ''}</span>
      </div>
      <div class="tl-meta">
        <span class="badge ${SEV_BADGE[o.severity] || 'b-minor'}">${esc(sevLabel(o.severity))}</span>
        <span class="badge ${POC_ST_BADGE[b]}">${esc(o.status || '—')}</span>
        ${c4Chip(o.cause || '—')}
        ${o.verdict ? `<span class="badge ${o.verdict === '관련' ? 'b-crit' : 'b-ok'}">${esc(o.verdict)}</span>` : ''}
        ${o.recurLink ? `<span class="rlink" title="선행 레코드 — 재발">↺ ${esc(o.recurLink)}</span>` : ''}
        ${o.unit ? `<span class="mini">${esc(o.unit)}</span>` : ''}
      </div>
      ${o.causeText ? `<div class="tl-tx"><b>근본원인</b> ${esc(o.causeText)}</div>` : ''}
      ${o.detail ? `<div class="tl-tx">${esc(o.detail)}</div>` : ''}
      ${o.action ? `<div class="tl-act"><b>대책</b> ${esc(o.action)}${o.verify ? ` <span class="mini">· 무발생 검증 ${esc(o.verify)}</span>` : ''}</div>`
      : (o.verify ? `<div class="tl-act"><span class="mini">무발생 검증 ${esc(o.verify)}</span></div>` : '')}
      ${imgs ? `<div class="ed-imgs">${imgs}</div>` : ''}
    </div>`;
  }).join('');
  $('modal-body').innerHTML = `<div class="libm">
    <div class="ed-meta">
      <span><b>분류</b> ${c4Chip(m.categoryLabel || '—')}</span>
      <span><b>최고 심각도</b> ${esc(sevLabel(m.severity))}</span>
      <span><b>발생 과제</b> ${m.projects.length}개</span>
      <span><b>총</b> ${m.counts.total}건 · <b>오픈</b> ${openN}</span>
      <span><b>기간</b> ${esc(m.firstDate || '—')} ~ ${esc(m.lastDate || '—')}</span>
      ${m.recurCount ? `<span><b>재출현</b> ↺ ${m.recurCount}회</span>` : ''}
    </div>
    ${m.desc ? `<div class="mini" style="margin:2px 0 8px">${esc(m.desc)}</div>` : ''}
    <div class="tl">${items}</div>
  </div>`;
  const modal = document.querySelector('#modal-back .modal'); if (modal) modal.classList.add('wide');
  $('modal-back').classList.add('open');
}

function openLibModalByKey(key) {
  const i = LIB_ROWS.findIndex(m => m.key === key || m.code === key);
  if (i >= 0) openLibModal(i);
}
