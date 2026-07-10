# CLAUDE.md — 프로젝트 컨텍스트

부서 표준 **멀티 과제 로봇 개발·신뢰성 웹**. SEC 리포(케미컬 단일 과제 양산평가 대시보드)의 검증된 파이프라인을 이식해 2026-07-09 신설. SEC 리포는 케미컬 실데이터로 병행 운영 중이며 **두 리포는 의도적으로 분리 개발**한다 (합치지 말 것).

## 배경 (SEC 리포 대화에서 확정된 프레임)

- **표준 프로세스**: 개발(POC→Pilot) → 양산 시범 평가 → 인증(이관심의+투자심의) → 양산 적용(확산·운영/관제). 실증 사다리: 사외 72h 무에러 → 사내(공정연결 없이) 무정지 300h → 사내(공정연결) 무정지 1개월 → 라인별 SAT 런. 상세: [docs/PROCESS.md](docs/PROCESS.md)
- **3원칙**: ① 고장 레코드 스키마는 전 과제·전 단계 공통 ② 기간엔 단계 템플릿(개발/실증/운영)·심의엔 체크리스트 ③ 판정 잣대·리셋 규칙은 데이터 이전 확정 (사후 변경 금지)
- **단계별 에러분석**: POC=전수 4분류(통계 금지) / Pilot=추세(MCBF 성장·Pareto·재발0·버전 필수) / 양산시범=관련·비관련 합동판정(판정대장) / 인증=열린 건 처분(carry-over·waiver) / 확산=원인계층(설계vs제작·설치) / 운영=필드 FRACAS+CIP
- 잣대 정의(무에러/무정지/어시스트, 리셋 규칙): [docs/CRITERIA.md](docs/CRITERIA.md) · 레코드 필드: [docs/RECORD_SCHEMA.md](docs/RECORD_SCHEMA.md)

## 아키텍처

- **프론트 = 순수 바닐라 JS, 클래식 스크립트 5분할** (로드 순서 고정): `core.js`(유틸·SVG차트·모달) → `tpl-mass.js`(템플릿② 실증) → `tpl-dev.js`(템플릿① 개발 POC/Pilot 모드) → `home.js`(포트폴리오) → `app.js`(셸·라우터·과제 로딩)
  - **ES modules 금지** — 렌더 HTML에 인라인 `onclick="openModal(...)"` 전역 참조가 광범위함. 전역 공유가 전제.
  - 라우터: `#/home` · `#/{pid}` · `#/{pid}/{tab}` (레거시 `#s-overview` 등은 첫 과제로 리다이렉트). 과제 전환 시 `DATA/U/BASE` 스왑 + 월 스냅샷(FULL/CUR_MONTH) 초기화 필수.
- **데이터**: `data/projects.json`(레지스트리+전사 설정) · `data/projects/<id>/{config.json, dashboard.json, REPORT.xlsx, raw/, errors/, assets/}` · `data/portfolio.json`(빌드 산출, 홈 카드용)
- **빌드**: `python3 scripts/build_dashboard_json.py [--project <id>]` — config의 `stage`(poc|pilot|mass)로 분기. `_compute`(mass, SEC 원본)는 **무변경 유지**가 원칙, poc/pilot은 `_compute_poc`/`_compute_pilot`. 엑셀 파싱은 별칭 사전+헤더 자동탐지, DRM 시 xlwings 폴백(Windows+Excel).
- **config.json 계약 파라미터**(errorLimit, acceptance 등)는 임의 변경 금지 — 로직/문의로 해결. `gate.criteria[].value`에 `auto:run|growth|actions` 쓰면 빌드값 자동 치환.

## 현재 상태 (2026-07-10, 커밋 M0~M5)

| 과제 | stage | 데이터 |
|---|---|---|
| chem 케미컬 체결/반송 | mass | SEC 샘플 사본 (실데이터는 SEC 리포에 있음 — 주의) |
| drum 드럼 자동화 | poc | 가상 (52/72h 런·이슈18·컨셉리스크0) |
| sort 분류 자동화 | pilot | 가상 (MCBF 1,240/1,500·재발1) |

- **리모트**: https://github.com/hdy-2382/SEC_FULL (origin/main, **PUBLIC**) — SEC 리포와 분리 개발.
- **M5 (완료분)**: POC 관제형 템플릿(4분류 보드·폐루프·수렴 추이·이슈 대장 + `#/{pid}/all` 상세 탭),
  **공통 레코드 스토어 `records[]`**(3단계 모두 RECORD_SCHEMA 형식 병기 — 배관은 하나, 화면 렌즈만 단계별),
  단계별 필수 필드 검증(빌드 경고) + `--validate-stage` 이관 리허설, 폐루프 컴포넌트 POC·Pilot 공유(`.looppanel`).
- **잔여 작업(M6)**: 운영 템플릿(tpl-ops.js, 확산/운영 2모드), 공개 배포 스크립트(SEC의 publish_public.sh 방식) 멀티과제 대응, drum·sort 실데이터 교체, mass(chem) 화면에 records 렌즈 연결 검토.

## 검증 방법

```bash
python3 scripts/generate_demo_multi.py && python3 scripts/build_dashboard_json.py
python3 -m http.server 8000   # → #/home, #/chem, #/chem/all, #/drum, #/sort
```
headless 스크린샷으로 렌더 확인: `google-chrome --headless --disable-gpu --window-size=1560,1400 --virtual-time-budget=5000 --screenshot=/tmp/x.png "http://localhost:8000/index.html#/home"`

## 관례

- 커밋: 한글 Conventional Commits (`feat:`/`fix:`/`data:`/`refactor:`)
- 디자인: SEC/mockup_multi 계열 (navy/sky 라이트 테마). 새 CSS 클래스는 부모 스코프 필수 (`.tecop .tp` 등 — 기존 `.tp/.chip/.kpi`와 충돌 주의, 홈 KPI는 `.hkpi`)
- 화면 문구는 과제 config의 `ui` 블록 (재빌드 불필요), 전사 문구는 `projects.json`의 `org`
