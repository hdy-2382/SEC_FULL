# 로봇 개발 표준 보고 체계 — 멀티 과제 신뢰성 웹

부서 로봇 자동화 과제(인프라 현장 수작업 대체)를 **하나의 표준으로 관리·보고**하는 정적 웹.
사내 GitHub Enterprise Pages로 호스팅하고, 업체가 보내준 엑셀(.xlsx)을 과제 폴더에 두고 로컬에서 빌드 → push 하면 갱신된다.

- **표준 프로세스**: 개발(POC→Pilot) → 양산 시범 평가 → 인증(이관·투자심의) → 양산 적용(확산·운영/관제) — [docs/PROCESS.md](docs/PROCESS.md)
- **판정 잣대**(무에러/무정지/어시스트, 리셋 규칙, 관련/비관련 판정) — [docs/CRITERIA.md](docs/CRITERIA.md)
- **공통 고장 레코드**(전 과제·전 단계 동일 스키마, 단계별 필수 필드) — [docs/RECORD_SCHEMA.md](docs/RECORD_SCHEMA.md)

## 폴더 구조

```
├── index.html                       ← 셸 (사이드바·모달 슬롯)
├── styles.css                       ← 디자인
├── core.js                          ← 공용 유틸·차트(SVG)·모달
├── tpl-mass.js                      ← 템플릿② 실증 (양산 시범 평가)
├── tpl-dev.js                       ← 템플릿① 개발 (POC / Pilot 모드)
├── home.js                          ← 홈 (포트폴리오: 프로세스 스트립·과제 카드·전사 KPI)
├── app.js                           ← 셸·2차원 라우터(#/home · #/{과제}/{탭})·과제 로딩
├── docs/                            ← 표준 문서 3종 (프로세스·판정기준·레코드 명세)
├── data/
│   ├── projects.json                ← 과제 레지스트리 + 전사(홈) 설정
│   ├── portfolio.json               ← 홈 카드 요약 (빌드 산출)
│   ├── vendor_template*.xlsx        ← 업체 배포 양식 (mass / _poc / _pilot)
│   ├── mgmt_template.xlsx           ← PM 관리 양식 (코드마스터·조치검증·판정대장)
│   └── projects/<id>/               ← 과제별 데이터 세트
│       ├── config.json              ← stage(poc|pilot|mass)·run·gate·tecop·계약 파라미터·화면 문구(ui)
│       ├── dashboard.json           ← 빌드 산출
│       ├── REPORT.xlsx              ← PM 관리 데이터 (업체에 보내지 않음)
│       ├── raw/                     ← 업체 원본 엑셀 (최신 파일이 빌드 입력)
│       ├── errors/                  ← 에러 첨부 사진 (엑셀 '사진(파일명)'과 이름 일치)
│       └── assets/                  ← 라인 레이아웃 이미지 등
└── scripts/
    ├── build_dashboard_json.py      ← 과제별 xlsx → dashboard.json (+ portfolio.json)
    ├── generate_vendor_template.py  ← 업체 양식 생성 (--stage poc|pilot|mass)
    ├── generate_mgmt_template.py    ← PM 관리 양식 생성
    └── generate_demo_multi.py       ← 드럼(POC)·분류(Pilot) 가상 데모셋 생성
```

## 매일 운영 (데이터 갱신)

```bash
# 1) 업체 엑셀을 과제 폴더에 복사 (사진 zip은 errors/에 파일명 맞춰 배치)
cp 받은파일.xlsx data/projects/<과제id>/raw/

# 2) 빌드 (특정 과제만 또는 전체)
python3 scripts/build_dashboard_json.py --project <과제id>
python3 scripts/build_dashboard_json.py              # 전체 + portfolio.json

# 3) 커밋·푸시 → Pages 자동 갱신
git add data/ && git commit -m "data: <과제> MM-DD 반영" && git push
```

로컬 확인: `python3 -m http.server 8000` → http://localhost:8000 (fetch 때문에 파일 직접 열기 불가)

## 과제 추가 방법

1. `data/projects.json`의 `projects[]`에 `{id, name, abbr, order}` 등록
2. `data/projects/<id>/` 폴더 구성 — 기존 과제 config.json을 복사해 수정:
   - `stage`: poc | pilot | mass (템플릿·빌드 계산 선택)
   - `run`: 무고장 런 파라미터 (target·unit·criterion·env) — docs/CRITERIA.md §3의 단계 표
   - `gate`: 게이트 리뷰일·통과 기준 (value에 `auto:run`/`auto:growth`/`auto:actions` 쓰면 빌드값 자동 치환)
   - `tecop`: T/E/C/O/P 신호등 (수동 관리 — 게이트 리뷰 고정 안건)
3. 업체 양식 배포: `python3 scripts/generate_vendor_template.py --stage <단계>`
4. 엑셀 수령 후 위 "매일 운영" 사이클

## 단계별 업체 보고 양식 (docs/RECORD_SCHEMA.md 매핑)

| 단계 | 시트 | 비고 |
|---|---|---|
| POC | 이슈로그(필수 5필드) · 런기록 · 비정상평가 | 보고 부담 최소화 |
| Pilot~ | 일일평가(+가동시간) · 에러로그(+SW/HW버전) | 버전 = "구버전 고장" 입증 수단 |
| 양산 시범~ | 위와 동일 + PM이 REPORT.xlsx 판정대장 유지 | 관련/비관련 합동판정 |

## 초기 사내 GHE 셋업 (1회)

1. 사내 GHE → New repository (README/.gitignore 체크 해제, Private/Internal)
2. `git remote add origin https://<사내-GHE>/<팀>/<REPO>.git && git push -u origin main`
3. Settings → Pages → Deploy from a branch → `main` / `/ (root)` → Save

## DRM 엑셀 (사내 보안문서)

openpyxl이 `BadZipFile`로 실패하면 자동으로 xlwings(Excel 구동)로 폴백한다 — Windows + Excel 필요.
실패 시 수동 우회: 엑셀에서 열어 "다른 이름으로 저장"으로 일반 xlsx 생성 후 raw/에 배치.

## 데모 데이터

```bash
python3 scripts/generate_demo_multi.py     # 드럼(POC)·분류(Pilot) 가상 데이터셋
python3 scripts/build_dashboard_json.py
```
