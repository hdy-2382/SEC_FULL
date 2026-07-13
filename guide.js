/* guide.js — 지표 핸드북 페이지 (#/guide). docs/METRICS.md의 웹 버전.
   원칙: 모든 지표를 "원형(업계 표준) vs 우리 응용(변형·간이화)"으로 구분해 설명한다.
   정적 콘텐츠 — 데이터 무관, 라우터(app.js)가 renderGuide()를 호출해 #s-guide에 렌더. */

function gdTag(kind, txt) {
  return `<span class="gd-tag ${kind}">${txt}</span>`;
}
const GD_ORIG = () => gdTag('orig', '원형');
const GD_OURS = () => gdTag('ours', '우리 응용');
const GD_WARN = () => gdTag('warn', '오용 경계');

function renderGuide() {
  $('s-guide').innerHTML = `<div class="guidev">

  <div class="ptitle">
    <span class="stagechip" style="background:#E5EFFA;color:#2E6DB0">핸드북</span>
    <span class="tmpl">지표 핸드북 — 원리 · 산식 · 적용법</span>
    <span class="meta">원문 <b>docs/METRICS.md</b> · 프로세스 <b>docs/PROCESS.md</b> · 잣대 <b>docs/CRITERIA.md</b> · 기록 <b>docs/RECORD_SCHEMA.md</b></span>
  </div>
  <div class="qbox">이 페이지는 화면의 각 지표가 <b>어디서 온 개념이고, 왜 그 단계에서 쓰며, 어떻게 읽고, 어떻게 오용되는지</b>를 정리한다.
  ${GD_ORIG()} = 업계 표준의 본래 모습 · ${GD_OURS()} = 우리 프로세스에 맞춘 변형 — <b>변형을 표준인 척하지 않기 위해 구분해 적는다.</b></div>

  <!-- ⓪ 전체 그림 — 흐름과 효과 -->
  <div class="sbox-h"><span class="tag">⓪</span><h2>전체 그림 — 프로세스는 이렇게 흐르고, 이런 효과가 난다</h2><span class="d">아래 ①~⑧의 모든 장치가 이 두 그림 위에 서 있다</span></div>

  <div class="panel">
    <div class="ph"><h3>그림 1 · 고장 한 건의 여정 — 폐루프 FRACAS</h3><span class="ps">모든 단계에서 동일 — 에러는 사건이 아니라 대장 위의 데이터가 된다</span></div>
    <div class="gd-flow">
      <div class="gf-box"><div class="t">에러 발생</div><div class="s">업체 데일리 리포트<br>그대로</div></div><span class="gf-ar">→</span>
      <div class="gf-box"><div class="t">기록</div><div class="s">공통 5필드부터<br>(ID·모드·심각도·분류·상태)</div></div><span class="gf-ar">→</span>
      <div class="gf-box"><div class="t">분류</div><div class="s">단계 축<br>(4분류→근본원인→계층)</div></div><span class="gf-ar">→</span>
      <div class="gf-box"><div class="t">조치</div><div class="s">원인 가설<br>+ 시정 적용</div></div><span class="gf-ar">→</span>
      <div class="gf-box hl"><div class="t">무발생 검증</div><div class="s">동일 모드 무발생<br>N Cy 감시</div></div><span class="gf-ar">→</span>
      <div class="gf-box ok"><div class="t">종결</div><div class="s">검증 통과 시에만</div></div>
    </div>
    <svg viewBox="0 0 1000 64" style="width:100%;height:auto;display:block" aria-hidden="true">
      <defs><marker id="gfarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#C0392B"/></marker></defs>
      <path d="M 915 6 C 915 44, 340 44, 340 10" fill="none" stroke="#C0392B" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#gfarr)"/>
      <text x="620" y="58" text-anchor="middle" font-size="12.5" font-weight="700" fill="#C0392B">↺ 재발 — 동일 고장모드 재출현(종결 여부 무관) = 근본원인 미해결 신호 → 재분석 의무</text>
    </svg>
    <div class="mini mt">이 루프가 돌기 때문에: 단발성 조치가 "했다"로 끝나지 않고 <b>"닫혔다"</b>가 되고, 같은 병의 재출현이 <b>자동으로 드러난다</b> — 위에서 보면 중구난방이 아니라 수렴으로 읽히는 이유.</div>
  </div>

  <div class="panel mt">
    <div class="ph"><h3>그림 2 · 배관은 하나, 계기판은 단계별</h3><span class="ps">같은 대장이 단계를 넘어 이어지고, 각 단계는 자기 질문에 맞는 렌즈만 올린다</span></div>
    <svg viewBox="0 0 1000 258" style="width:100%;height:auto;display:block" role="img" aria-label="공통 레코드 배관 위에 단계별 렌즈가 올라간 구조도">
      ${[
        { x: 16,  w: 128, c: '#5b7ea8', nm: '개발(제작)', q: '계획대로 되나', lens: '마일스톤 vs 일정' },
        { x: 158, w: 128, c: '#3F7CC4', nm: 'POC', q: '컨셉의 병인가', lens: '전수 4분류 · 72h 런' },
        { x: 300, w: 128, c: '#B36F0A', nm: 'Pilot', q: '수렴하는가', lens: 'MCBF 성장 · 재발 0' },
        { x: 442, w: 128, c: '#2F7A55', nm: '양산 시범', q: '계약 기준 이내인가', lens: '판정대장 · Error Budget' },
        { x: 584, w: 112, c: '#8a99ac', nm: '◆ 심의', q: '안고 갈 조건은', lens: 'KIR (오픈 건 처분)' },
        { x: 710, w: 128, c: '#7A4FB3', nm: '확산', q: '전 함대의 병인가', lens: '원인계층 · 호기 층화' },
        { x: 852, w: 132, c: '#5f6b7a', nm: '운영/관제', q: '무엇부터가 경제적인가', lens: '다운타임 Pareto · CIP' },
      ].map((s, i, arr) => `
        <g>
          <rect x="${s.x}" y="26" width="${s.w}" height="92" rx="10" fill="#fff" stroke="#DFEAF4"/>
          <rect x="${s.x}" y="26" width="${s.w}" height="5" rx="2.5" fill="${s.c}"/>
          <text x="${s.x + s.w / 2}" y="52" text-anchor="middle" font-size="13.5" font-weight="800" fill="${s.c}">${s.nm}</text>
          <text x="${s.x + s.w / 2}" y="72" text-anchor="middle" font-size="10" fill="#6E7D90">"${s.q}"</text>
          <text x="${s.x + s.w / 2}" y="97" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2E3D52">${s.lens}</text>
          <line x1="${s.x + s.w / 2}" y1="118" x2="${s.x + s.w / 2}" y2="168" stroke="#93aac6" stroke-width="1.6" stroke-dasharray="3 3"/>
          <circle cx="${s.x + s.w / 2}" cy="168" r="3.5" fill="#2E89D6"/>
          ${i < arr.length - 1 ? `<text x="${(s.x + s.w + arr[i + 1].x) / 2}" y="76" text-anchor="middle" font-size="13" font-weight="800" fill="#2E89D6">→</text>` : ''}
        </g>`).join('')}
      <rect x="16" y="172" width="968" height="46" rx="12" fill="url(#gdpipe)"/>
      <defs><linearGradient id="gdpipe" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#13335c"/><stop offset="1" stop-color="#0c1f3b"/></linearGradient></defs>
      <text x="500" y="192" text-anchor="middle" font-size="12.5" font-weight="800" fill="#fff">공통 레코드 스토어 (records) — 같은 형식 · 같은 폐루프 · 같은 재발 정의</text>
      <text x="500" y="209" text-anchor="middle" font-size="10.5" fill="#9fb6d4">대장은 단계를 넘어 그대로 이어진다 (이관 = 마이그레이션이 아니라 필수 필드 추가) · 게이트 잣대는 데이터 이전에 확정</text>
      <text x="500" y="245" text-anchor="middle" font-size="11" fill="#6E7D90">기간 = 증거 축적 → 게이트 = 사전 확정 잣대로 판정 → 통과하면 같은 대장을 들고 다음 단계로</text>
    </svg>
  </div>

  <div class="grid g3 mt">
    <div class="panel gd-fx"><div class="n">1</div><div class="ph"><h3>재발이 보인다</h3></div>
      <p><b>메커니즘</b>: 같은 고장모드 어휘 + 같은 레코드 형식 + 재발 링크(↺).</p>
      <p><b>효과</b>: "Pilot의 정지가 POC 때 그 에러"임이 자동으로 드러난다 — 땜질이 시스템에서 걸러지고, 근본원인 분석이 강제된다.</p></div>
    <div class="panel gd-fx"><div class="n">2</div><div class="ph"><h3>보고가 가볍고, 한 번만 배운다</h3></div>
      <p><b>메커니즘</b>: POC 필수 5필드(FRACAS-lite) — 업체 데일리 리포트를 그대로 옮겨 적는 수준.</p>
      <p><b>효과</b>: 초기 기록 누락이 없고, 업체는 전 단계·전 과제에서 같은 양식 하나만 배운다.</p></div>
    <div class="panel gd-fx"><div class="n">3</div><div class="ph"><h3>게이트에서 협상이 사라진다</h3></div>
      <p><b>메커니즘</b>: 잣대·리셋 규칙 사전 서면 확정(3원칙 ③) + 리셋을 숨기지 않는 화면.</p>
      <p><b>효과</b>: 리뷰의 질문이 "이걸 통과로 볼 수 있나"에서 <b>"남은 20h가 언제 끝나나"</b>로 바뀐다 — 위에서 보는 것은 수렴.</p></div>
    <div class="panel gd-fx"><div class="n">4</div><div class="ph"><h3>심의가 문서 작업이 아니게 된다</h3></div>
      <p><b>메커니즘</b>: 심의는 새 데이터를 만들지 않는다 — KIR은 대장의 오픈 건 필터 + 처분 조인.</p>
      <p><b>효과</b>: 이관 준비 = "미정 0건 + 기한·오너 서명"으로 수렴. 심의 자료 재작성 공수 0.</p></div>
    <div class="panel gd-fx"><div class="n">5</div><div class="ph"><h3>확산이 안전해진다</h3></div>
      <p><b>메커니즘</b>: 원인계층(설계/제작/설치/운영) + 호기별 층화.</p>
      <p><b>효과</b>: "이 호기만의 병"과 "전 함대의 병"이 즉시 갈라진다 — 설계성 고장은 자동 에스컬레이션, 나머지는 국소 조치.</p></div>
    <div class="panel gd-fx"><div class="n">6</div><div class="ph"><h3>경험이 자산이 된다</h3></div>
      <p><b>메커니즘</b>: 운영 필드 고장모드 → 차기 과제 FMEA 환류 + 과제 간 동일 형식 비교.</p>
      <p><b>효과</b>: 다음 과제의 POC는 선배 과제의 고장 어휘에서 출발한다 — 조직의 학습 곡선이 과제를 넘어 누적.</p></div>
  </div>

  <!-- ① 뼈대 프레임 -->
  <div class="sbox-h"><span class="tag">①</span><h2>뼈대 프레임 2개</h2><span class="d">모든 화면이 이 두 프레임 위에 서 있다</span></div>
  <div class="grid g2">
    <div class="panel">
      <div class="ph"><h3>FRACAS — 고장 보고·분석·시정 체계</h3></div>
      <p>${GD_ORIG()} Failure Reporting, Analysis & Corrective Action System — 미 국방 신뢰성 관리(MIL-HDBK-2155 계열).
      핵심 원리: <b>고장은 사건이 아니라 데이터</b>이며, 보고→분석→시정→<b>검증</b>의 루프가 닫혀야 신뢰성이 성장한다.</p>
      <p>${GD_OURS()} 공통 레코드 스토어(<code>records</code>)가 FRACAS 대장. 단계별로 강도만 다르다 —
      POC=<b>FRACAS-lite</b>(필수 5필드) · Pilot=<b>full</b>(버전·무발생검증 필수) · 운영=<b>필드 FRACAS</b>(알람 승격 기준).
      화면의 폐루프 패널(신규→조치중→검증중→종결)이 이 루프의 상태 기계다.</p>
      <p>${GD_WARN()} "조치 완료"로 끝나면 FRACAS가 아니다 — <b>무발생 검증 통과까지가 한 사이클</b>.
      재발 추적 없는 FRACAS는 조치 일지에 불과하다.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>Stage-Gate — 단계·게이트 프로세스</h3></div>
      <p>${GD_ORIG()} 신제품 개발 관리 표준(R.G. Cooper). 기간(단계)에는 데이터를 쌓고,
      게이트에서 <b>사전 확정된 EXIT CRITERIA</b>로 통과/보류를 판정한다.</p>
      <p>${GD_OURS()} POC→Pilot→양산 시범→[인증 심의]→확산→운영의 사다리.
      잣대 사전 확정·사후 변경 금지(3원칙 ③)가 게이트의 신뢰를 만든다.
      심의(이관·투자)는 기간이 아니라 <b>이벤트</b> — 새 데이터를 만들지 않고 기존 증거를 심사한다(체크리스트).</p>
      <p>${GD_WARN()} 데이터가 나온 뒤 잣대를 고치면 그 순간부터 모든 게이트가 협상 대상이 된다.</p>
    </div>
  </div>

  <!-- ② 정량 지표 -->
  <div class="sbox-h mt"><span class="tag">②</span><h2>시간·사이클 지표 (신뢰성 정량)</h2><span class="d">산식과 단계별 허용 범위</span></div>
  <div class="panel">
    <div class="tbl-scroll" style="max-height:none"><table>
      <tr><th>지표</th><th>산식</th><th>원리</th><th>우리 적용</th><th>주의</th></tr>
      <tr><td><b>MTBF / MCBF</b></td><td><code>누적 가동(h/Cy) ÷ 고장 수</code></td><td>지수분포 가정의 평균 고장 간격</td><td>Pilot부터(성장곡선) · 양산평가·운영 상시</td><td><b style="color:var(--crit)">POC 금지</b> — 표본 소수+설계 유동이면 평균은 소음 ("통계 금지"의 근거)</td></tr>
      <tr><td><b>MTTR</b></td><td><code>Σ복구시간 ÷ 건수</code></td><td>정비성(Maintainability)</td><td>첫 측정은 POC 비정상 평가(의도 주입) · 운영 SLA</td><td>복구의 정의(자동/수동) 사전 합의</td></tr>
      <tr><td><b>가동률(A)</b></td><td><code>가동시간÷계획시간 ≈ MTBF/(MTBF+MTTR)</code></td><td>Availability</td><td>운영 월간 RAM 헤드라인 (목표 98% 등)</td><td>계획 정지 제외 규칙 명문화 (CRITERIA §1)</td></tr>
      <tr><td><b>RAM</b></td><td>위 셋의 묶음</td><td>Reliability·Availability·Maintainability</td><td>운영/관제 월간 보고 프레임</td><td>—</td></tr>
      <tr><td><b>MCBF 성장곡선</b></td><td>주차 <code>누적 Cy ÷ 누적 고장</code></td><td>${GD_ORIG()} TAAF·Duane/Crow-AMSAA 성장 모델</td><td>${GD_OURS()} 간이형 — 보는 것은 절대값이 아니라 <b>기울기</b>(수렴하는가)</td><td>버전 배포 없이 오르는 곡선은 우연 — 버전 이력과 함께 읽기</td></tr>
    </table></div>
  </div>

  <!-- ③ 무고장 런 -->
  <div class="sbox-h mt"><span class="tag">③</span><h2>무고장 런과 신뢰수준 입증</h2><span class="d">실증 사다리의 수학적 근거</span></div>
  <div class="grid g3">
    <div class="panel">
      <div class="ph"><h3>연속 무고장 런</h3></div>
      <p>실증 사다리: 사외 <b>72h 무에러</b> → 사내 <b>300h 무정지</b> → 공정 연결 <b>1개월</b> → 호기별 <b>SAT 축약 런</b>.
      동일 컴포넌트, 파라미터만 단계별 상향.</p>
      <p><b>리셋 규칙</b>: 위반 시 0부터 재시작, 부분 인정 없음. <b>잣대의 설득력은 리셋에서 나온다</b> —
      그래서 화면은 리셋(↺)을 숨기지 않고 표기한다.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>신뢰수준 입증식</h3><span class="ps">success-run (무고장 시험)</span></div>
      <div class="gd-formula">C = 1 − e<sup>−n / MTBF<sub>목표</sub></sup></div>
      <p class="mini">무고장 n Cy가 입증하는 신뢰수준 C. 필요 사이클 역산: <code>n = MTBF목표 × (−ln(1−C))</code></p>
      <p>예: 목표 MTBF 100Cy를 <b>80% 신뢰수준</b>으로 입증하려면 <b>161Cy 연속 무고장</b>. (CRITERIA §6)
      과제 착수 시 사다리의 시간(72h/300h/1개월)이 목표 입증에 충분한지 역산해 명기한다.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>Error Budget</h3></div>
      <p>${GD_ORIG()} 용어는 SRE(사이트 신뢰성 공학)에서 차용 — 허용 실패 예산.</p>
      <p>${GD_OURS()} 실체는 <b>계약 파라미터 동결</b>(양산평가 M1) — "완주 중 에러 3회 한도"처럼
      수혜부서와 서면 합의한 뒤 사후 협상 금지. 화면의 블록 게이지(■■□)가 소진 현황.</p>
    </div>
  </div>

  <!-- ④ 우선순위 도구 -->
  <div class="sbox-h mt"><span class="tag">④</span><h2>우선순위 도구</h2><span class="d">무엇부터 고칠 것인가</span></div>
  <div class="grid g3">
    <div class="panel">
      <div class="ph"><h3>Pareto</h3></div>
      <p>${GD_ORIG()} 80/20 법칙 — 소수 고장모드가 다수 건을 만든다.</p>
      <p>${GD_OURS()} 개발 단계 = <b>건수순</b>(수정개발 우선순위) · 운영 단계 = <b>다운타임(손실 시간)순</b>.
      두 순서가 다르면 <b>"드물지만 오래 세우는 고장"</b>이 먼저다 — 비용 관점.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>S×O 위험 매트릭스</h3></div>
      <p>${GD_ORIG()} FMEA의 RPN(심각도S × 발생도O × 검출도D).</p>
      <p>${GD_OURS()} 검출도(D)를 뺀 <b>간이형</b> — 심각도(치명/중대/경미, 결과 기준) ×
      발생도 밴드(드묾 &lt;3 ≤ 보통 &lt;6 ≤ 빈발) → High/Medium/Low 조치 우선순위.
      전 템플릿 공통(공통 레코드 기반).</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>FMEA</h3></div>
      <p>${GD_ORIG()} 고장모드·영향 분석 — 설계 단계의 예방 도구.</p>
      <p>${GD_OURS()} POC P2에서 초판 — 이때 만든 <b>고장모드 어휘(코드마스터)가 전 단계 기록의 언어</b>가 된다.
      운영의 필드 고장모드는 차기 과제 FMEA로 환류(경험 자산화).</p>
    </div>
  </div>

  <!-- ⑤ 분류 축·재발 -->
  <div class="sbox-h mt"><span class="tag">⑤</span><h2>분류 축과 재발 — 단계별 질문의 구현</h2><span class="d">축은 교체가 아니라 세분화 (상위호환)</span></div>
  <div class="panel">
    <table>
      <tr><th>단계</th><th>분류 축</th><th>이 축이 답하는 질문</th></tr>
      <tr><td><b>POC</b></td><td>4분류: <span class="c4 c4-risk">컨셉 리스크</span> <span class="c4 c4-design">설계</span> <span class="c4 c4-sw">구현(SW)</span> <span class="c4 c4-env">시험환경</span></td><td>컨셉의 병인가, 고칠 수 있는 병인가 — <b>컨셉 리스크 0건 입증이 POC의 결론</b></td></tr>
      <tr><td><b>Pilot·양산</b></td><td>근본원인 6분류: 설계/부품/제작·조립/SW/시험환경·자재/운영·조작</td><td>어디를 고쳐야 하나 (4분류의 세분화)</td></tr>
      <tr><td><b>확산·운영</b></td><td>원인계층: 설계/제작·조립/설치·시공/운영·환경</td><td>전 함대의 병인가, 이 호기의 병인가 — <b>설계성 = 즉시 에스컬레이션</b></td></tr>
    </table>
    <div class="grid g2 mt">
      <div class="gd-note"><b>재발</b> — 동일 고장모드(표준분류)의 재출현, <b>종결 여부 무관</b> (CRITERIA §5).
        재발 = 근본원인 미해결 신호 → 재분석 의무. <b>재발률은 "땜질 vs 시스템"을 가르는 단 하나의 숫자.</b></div>
      <div class="gd-note"><b>무발생 검증</b> — 조치 후 동일 모드 무발생 N Cy(기본 <code>verifyCycle</code>) 경과 시에만 종결.
        ③의 success-run을 조치 단위로 축소 적용한 것 — "고쳤다"의 통계적 최소 근거.</div>
    </div>
  </div>

  <!-- ⑥ 판정·심의 -->
  <div class="sbox-h mt"><span class="tag">⑥</span><h2>판정·심의 도구</h2><span class="d">공정 연결 이후 — 원인보다 판정</span></div>
  <div class="grid g2">
    <div class="panel">
      <div class="ph"><h3>관련/비관련 합동판정 (판정대장)</h3></div>
      <p>${GD_ORIG()} 신뢰성 시험의 relevant/non-relevant failure 분류 (MIL-STD-781 계열).</p>
      <p>${GD_OURS()} 공정 연결 후엔 외생 원인(자재·시설·조작)이 섞이므로 준사법 절차로:
      ① 기준 사전 서면 합의 ② 증거 패키지 ③ 합동 리뷰 ④ <b>사후 재분류 금지</b>
      ⑤ 비관련 판정 건도 시정 오너 지정.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>Known Issues Register (처분대장)</h3></div>
      <p>${GD_ORIG()} 운영승인심의(ORR: Operational Readiness Review) 관행 — 이관 시 오픈 건 전건 처분.</p>
      <p>${GD_OURS()} 처분 3종: <span class="badge b-ok">종결예정</span> <span class="badge b-major">carry-over (조건부 이관)</span>
      <span class="badge b-prog">waiver (위험수용)</span> + 기한·오너 서명.
      구현은 별도 문서가 아니라 <b>공통 레코드의 오픈 건 필터 + 처분대장 조인</b> — 심의는 새 데이터를 만들지 않는다.</p>
    </div>
    <div class="panel">
      <div class="ph"><h3>CIP · 8D</h3></div>
      <p><b>CIP</b>(지속 개선): 운영 단계에서 다운타임 Pareto 상위 모드를 개선과제로 닫고 효과를 검증.</p>
      <p><b>8D</b>: 자동차 업계 표준 문제해결 절차 — 운영 만성(재발) 고장의 심층 분석에 적용.</p>
    </div>
    <div class="panel gd-hl">
      <div class="ph"><h3>TECOP — 원형과 우리 응용</h3><span class="ps">자주 묻는 것</span></div>
      <p>${GD_ORIG()} 대형 프로젝트·에너지 업계(Shell 계열)의 <b>리스크 분류 프레임</b> —
      Technical / Economic / Commercial / Organisational / <b>Political</b>.
      본래 용도는 리스크 레지스터의 태깅 축이지, 상태 신호등이 아니다.</p>
      <p>${GD_OURS()} ① 게이트 리뷰 <b>고정 안건 체크</b>로 전용 — 기술 지표만으로 게이트가 통과되는 것을 막는 장치
      ② P를 Political → <b>안전·인허가</b>로 재해석 — 사내 과제의 실질 리스크는 안전인증·법정 인허가 일정
      ③ 값은 자동 계산이 아니라 <b>PM의 판단</b>(양호/주의 + 비고).</p>
      <p>${GD_WARN()} TECOP은 지표가 아니라 <b>안건</b>이다 — 점수화·합산하지 않는다.
      '주의'는 비고(무엇이 왜)와 함께여야 의미가 있다.</p>
    </div>
  </div>

  <!-- ⑦ 한 장 요약 -->
  <div class="sbox-h mt"><span class="tag">⑦</span><h2>한 장 요약 — 단계 × 지표 매핑</h2><span class="d">온보딩은 이 표 하나로</span></div>
  <div class="panel">
    <div class="tbl-scroll" style="max-height:none"><table>
      <tr><th>단계</th><th>핵심 질문</th><th>주 지표 / 장치</th><th>금지 · 주의</th></tr>
      <tr><td><b>개발(제작)</b></td><td>계획대로 만들어지나</td><td>마일스톤 진척 vs 일정 경과 · 지연 건수</td><td>평가 지표 없음이 정상</td></tr>
      <tr><td><b>POC</b></td><td>컨셉의 병인가</td><td>전수 4분류 보드 · 72h 무에러 런 · 비정상 평가(MTTR 첫 측정) · 수렴 추이</td><td><b style="color:var(--crit)">통계(MTBF) 금지</b></td></tr>
      <tr><td><b>Pilot</b></td><td>수렴하는가</td><td>MCBF 성장곡선 · Pareto · 재발 0 · 시정조치 검증마감 · 버전 기록</td><td>설계 동결 전 런 무효</td></tr>
      <tr><td><b>양산 시범</b></td><td>계약 기준 이내인가</td><td>연속 Cy 완주 · Error Budget · 관련/비관련 판정대장 · 신뢰수준 입증</td><td>사후 재분류 금지</td></tr>
      <tr><td><b>인증(심의)</b></td><td>어떤 조건으로 안고 가나</td><td>Known Issues Register (종결예정/carry-over/waiver)</td><td>새 데이터 생성 금지</td></tr>
      <tr><td><b>확산</b></td><td>전 함대의 병인가</td><td>호기별 퀄(SAT+축약 런) · 원인계층 · 호기 층화 · 설계성 에스컬레이션</td><td>기준 구성 동결</td></tr>
      <tr><td><b>운영</b></td><td>어떤 고장부터가 경제적인가</td><td>월간 RAM · 알람→FRACAS 승격률 · 다운타임 Pareto · CIP · 8D</td><td>알람 전수 ≠ FRACAS</td></tr>
      <tr><td><b>전 단계 공통</b></td><td>—</td><td>공통 레코드 · 폐루프 · 재발 링크 · S×O 매트릭스 · TECOP</td><td>전사 합산 KPI 오독 주의</td></tr>
    </table></div>
  </div>

  <!-- ⑧ 데이터 출처 -->
  <div class="sbox-h mt"><span class="tag">⑧</span><h2>데이터 출처 맵</h2><span class="d">"이 숫자 어디서 왔어?"의 즉답</span></div>
  <div class="panel">
    <div class="tbl-scroll" style="max-height:none"><table>
      <tr><th>지표</th><th>원천 시트 / 필드</th><th>빌드 키</th></tr>
      <tr><td>무고장 런 · 리셋</td><td>런기록 · 일일평가 (에러수&gt;0 = 리셋)</td><td><code>run</code>, <code>metrics.progress</code></td></tr>
      <tr><td>4분류 / 원인계층</td><td>이슈로그·에러로그 「원인분류」</td><td><code>fourway</code>, <code>causeLayer</code></td></tr>
      <tr><td>폐루프 · 재발 · 무발생</td><td>「상태」·「무발생검증」· 동일 모드 선행 ID(자동)</td><td><code>statusDist</code>, <code>recurrence</code>, <code>records[].recurLink</code></td></tr>
      <tr><td>MCBF 성장</td><td>일일평가 (누적 Cy ÷ 누적 에러)</td><td><code>growth</code></td></tr>
      <tr><td>판정</td><td>REPORT.xlsx 「판정대장」</td><td><code>adjudication</code></td></tr>
      <tr><td>처분 (KIR)</td><td>REPORT.xlsx 「처분대장」</td><td><code>dispositions</code></td></tr>
      <tr><td>시정조치 검증</td><td>REPORT.xlsx 「조치검증」 (+<code>verifyCycle</code>)</td><td><code>actions</code>, <code>actionRate</code></td></tr>
      <tr><td>월간 RAM · 알람</td><td>「월간지표」</td><td><code>ram</code>, <code>alarms</code></td></tr>
      <tr><td>다운타임 Pareto</td><td>이슈로그 「다운타임(분)」</td><td><code>downPareto</code></td></tr>
      <tr><td>호기 퀄 · 층화</td><td>「호기퀄」· 이슈로그 「호기」</td><td><code>fleet</code>, <code>units</code>, <code>unitDist</code></td></tr>
      <tr><td>TECOP · 게이트 기준 · 마일스톤</td><td>config (<code>tecop</code>·<code>gate.criteria</code>·<code>devPlan</code>) — PM 수동 관리</td><td>빌드 무관 (새로고침 반영)</td></tr>
    </table></div>
    <div class="mini mt">원문: <b>docs/METRICS.md</b> (이 페이지와 동일 내용 · 인쇄/배포용) — 함께 보기: docs/PROCESS.md §3 (단계별 에러분석), docs/CRITERIA.md (잣대·리셋 규칙), docs/RECORD_SCHEMA.md (필드 정의)</div>
  </div>

  </div>`;
}
