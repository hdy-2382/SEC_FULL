"""
generate_demo_multi.py
----------------------
드럼(POC)·분류(Pilot) 과제의 가상 데모 데이터셋을 생성한다.
  - data/projects/drum/ : config.json + raw/드럼POC_샘플.xlsx (이슈로그·런기록·비정상평가)
  - data/projects/sort/ : config.json + raw/분류Pilot_샘플.xlsx (일일평가·에러로그) + REPORT.xlsx

정합성 규칙: 일일 에러 합 = 에러로그 행수, 4분류 합 = 이슈 총수, 주차 MCBF는 누적 cycles/누적 errors.
실행: python3 scripts/generate_demo_multi.py  →  python3 scripts/build_dashboard_json.py
"""
from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

ROOT = Path(__file__).resolve().parent.parent
PROJECTS = ROOT / "data" / "projects"

HDR_FILL = PatternFill("solid", fgColor="1E4A7A")
HDR_FONT = Font(color="FFFFFF", bold=True)


def _sheet(wb, title, headers, rows):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for c in ws[1]:
        c.fill, c.font = HDR_FILL, HDR_FONT
    for r in rows:
        ws.append(r)
    for i, h in enumerate(headers, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = max(12, len(str(h)) * 2 + 4)
    return ws


def _write_config(pid: str, cfg: dict):
    p = PROJECTS / pid / "config.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


# ══════════════════════════ 드럼 자동화 (POC) ══════════════════════════
def gen_drum():
    pid = "drum"
    (PROJECTS / pid / "raw").mkdir(parents=True, exist_ok=True)
    (PROJECTS / pid / "errors").mkdir(exist_ok=True)

    # 이슈로그 18건 — 4분류: 컨셉 0 / 설계 6 / 구현 9 / 시험환경 3 · 종결 11 / 진행 7
    issues = [
        # (mode, severity, cause4, status)
        ("비전 오인식", "Major", "구현(SW)", "종결"), ("비전 오인식", "Major", "구현(SW)", "종결"),
        ("비전 오인식", "Minor", "시험환경", "종결"), ("비전 오인식", "Major", "시험환경", "검증중"),
        ("비전 오인식", "Major", "설계", "조치중"),
        ("체결 토크 이탈", "Major", "구현(SW)", "종결"), ("체결 토크 이탈", "Major", "구현(SW)", "종결"),
        ("체결 토크 이탈", "Critical", "설계", "검증중"), ("체결 토크 이탈", "Major", "설계", "조치중"),
        ("그리퍼 파지 실패", "Minor", "구현(SW)", "종결"), ("그리퍼 파지 실패", "Minor", "구현(SW)", "종결"),
        ("그리퍼 파지 실패", "Major", "설계", "조치중"),
        ("통신 지연", "Minor", "설계", "종결"), ("통신 지연", "Minor", "구현(SW)", "조치중"),
        ("전장 간섭", "Minor", "시험환경", "종결"),
        ("자재 급송 지연", "Minor", "설계", "종결"),
        ("소음 초과", "Minor", "구현(SW)", "검증중"),
        ("로그 유실", "Minor", "구현(SW)", "종결"),
    ]
    d0 = date(2026, 6, 8)
    issue_rows = [
        (f"ISS-{i + 1:03d}", m, sev, c4, st, (d0 + timedelta(days=i * 2 % 28)).isoformat(),
         f"{m} — 재현 조건·로그 기록", "")
        for i, (m, sev, c4, st) in enumerate(issues)
    ]

    # 런기록 — 1차 시도 31h 시점 에러 리셋 → 2차 52/72h 진행
    runs = [
        ("2026-06-29", 10, 0, "1차 시도 개시"), ("2026-06-30", 11, 0, ""),
        ("2026-07-01", 10, 1, "31h 시점 비전 오인식 → 조명 후드 개선 · 리셋"),
        ("2026-07-02", 12, 0, "2차 시도 개시"), ("2026-07-03", 11, 0, ""),
        ("2026-07-04", 10, 0, ""), ("2026-07-06", 9, 0, ""), ("2026-07-07", 10, 0, ""),
    ]
    abn = [
        ("비상정지 후 재기동", "45s", "PASS", ""), ("순간 정전 복구", "2.1m", "PASS", ""),
        ("자재 걸림 제거 후 재개", "1.4m", "PASS", ""),
        ("통신 두절 → 자동 재접속", "—", "FAIL", "재접속 로직 설계 변경 후 재시험"),
        ("도어 오픈 인터록", "30s", "PASS", ""), ("외란 조명 변화", "—", "PASS", ""),
        ("이종 자재 투입 감지", "50s", "PASS", ""), ("과부하 정지 복구", "—", "대기", "7/10 예정"),
    ]

    wb = Workbook(); wb.remove(wb.active)
    _sheet(wb, "안내", ["POC 이슈로그 — 필수 5필드(이슈ID·고장모드·심각도·원인분류·상태), 나머지 선택. docs/RECORD_SCHEMA.md 참조"], [])
    _sheet(wb, "이슈로그", ["이슈ID", "고장모드", "심각도", "원인분류", "상태", "발생일", "상세", "사진(파일명)"], issue_rows)
    _sheet(wb, "런기록", ["일자", "런시간(h)", "에러수", "비고"], runs)
    _sheet(wb, "비정상평가", ["시나리오", "복구시간", "판정", "비고"], abn)
    wb.save(PROJECTS / pid / "raw" / "드럼POC_샘플.xlsx")

    _write_config(pid, {
        "stage": "poc",
        "run": {"target": 72, "unit": "h", "criterion": "무에러", "env": "사외 랩"},
        "tecop": [
            {"k": "T", "status": "warn", "note": "72h 무에러 2차 진행 중"},
            {"k": "E", "status": "ok", "note": "타당성 분석 — 개략 사업성 확인"},
            {"k": "C", "status": "ok", "note": "해당 없음 (사내)"},
            {"k": "O", "status": "warn", "note": "수혜부서 후보 협의 전 — Pilot 지표 정의 참여 필요"},
            {"k": "P", "status": "ok", "note": "안전인증 컨셉 합의 완료"},
        ],
        "gate": {"reviewDate": "2026-07-15", "label": "게이트 리뷰(Pilot 이관)", "criteria": [
            {"label": "① 기성능 스펙", "value": "3/3", "status": "pass"},
            {"label": "② 72h 무에러", "value": "auto:run", "status": "prog"},
            {"label": "③ 비정상 시나리오", "value": "6/8 · 1 재시험", "status": "prog"},
            {"label": "④ 상위 심각도 미해결", "value": "0건", "status": "pass"},
            {"label": "⑤ FMEA 상위 리스크", "value": "조치계획 수립", "status": "pass"},
        ]},
        "project": {"name": "드럼 자동화 (POC)", "department": "인프라 기술팀", "team": "김OO, 박OO",
                    "startDate": "2026-06-05", "endDate": "2026-07-15"},
        "lifecycle": [
            {"stage": "P1 타당성·평가항목 정의", "status": "done", "note": "FMEA 초판 · 판정기준서 v1 · 예상 ROI 산출"},
            {"stage": "P2 안전인증 컨셉미팅", "status": "done", "note": "위험원 12건 식별 → 설계 반영 합의 (06-12)"},
            {"stage": "P3 기성능 평가/검증", "status": "done", "note": "택트·반복정밀도·체결성공률 3/3 충족"},
            {"stage": "P4 사외 72h 무에러 + 비정상 평가", "status": "current", "note": "2차 시도 진행 · 비정상 6/8 PASS"},
        ],
        "ui": {
            "app": {"title": "드럼 자동화 — POC", "brandLogo": "드", "brandName": "드럼 자동화<br>POC",
                    "evalDateLabel": "평가일", "printBtn": "PDF 리포트",
                    "footBrand": "FRACAS-lite · 전수 4분류", "updatedPrefix": "업데이트 "},
            "nav": {"overview": "한눈에 보기", "all": "평가 상세 내역"},
            "common": {"stDone": "완료", "stCurrent": "진행 중", "stTodo": "예정", "noteEmpty": "— 메모"},
            "overview": {"stageTitle": "POC 세부 단계", "stageCurrentPrefix": "현재: ",
                         "stageSub": "P1→P4 · 게이트 통과 시 Pilot 이관"},
            "modal": {"title": "상세"},
        },
    })
    print(f"[demo] drum(POC): 이슈 {len(issues)} · 런기록 {len(runs)}일 · 비정상 {len(abn)}건")


# ══════════════════════════ 분류 자동화 (Pilot) ══════════════════════════
def gen_sort():
    pid = "sort"
    (PROJECTS / pid / "raw").mkdir(parents=True, exist_ok=True)
    (PROJECTS / pid / "errors").mkdir(exist_ok=True)

    # 6주 일일평가 (월~토, 주 6일) — 주차 누적 MCBF 480→1240 성장
    # 주별 (cycles, error건수): w1 (2400,5) w2 (2480,2) w3 (1960,1) w4 (1440,0) w5 (1440,1) w6 (1440,0)
    weeks = [(2400, 5), (2480, 2), (1960, 1), (1440, 0), (1440, 1), (1440, 0)]
    start = date(2026, 5, 25)  # 월요일
    daily_rows, err_slots = [], []
    for wi, (cyc, errn) in enumerate(weeks):
        days = [start + timedelta(days=wi * 7 + d) for d in range(6)]  # 월~토
        per = [cyc // 6] * 6
        per[-1] += cyc - sum(per)
        # 에러를 주 초반 날짜에 배치
        errs_per_day = [0] * 6
        for k in range(errn):
            errs_per_day[k % 3] += 1
        for d, c, e in zip(days, per, errs_per_day):
            daily_rows.append((d.isoformat(), 2, "분류·이적재 반복 운전", c, e, 0, 11, ""))
            for _ in range(e):
                err_slots.append(d)

    # 에러로그 9건 — 재발은 '파지 실패' 1개 모드만 (4회)
    err_defs = [
        ("SRT-01", "파지 실패", "박스 모서리 파지 미끄러짐", "그리퍼 압력 프로파일 미흡", "파라미터 보정", "v0.9.1", "Rev B"),
        ("SRT-02", "정위치 이탈", "AMR 정지 위치 12mm 이탈", "오도메트리 드리프트", "보정 패치", "v0.9.1", "Rev B"),
        ("SRT-03", "컨베이어 I/F 타임아웃", "핸드셰이크 응답 지연", "타임아웃 설정 과소", "타임아웃 로직 변경", "v0.9.1", "Rev B"),
        ("SRT-04", "충전 도킹 실패", "도킹 마커 오염", "마커 청소 주기 부재", "청소 SOP 반영", "v0.9.1", "Rev B"),
        ("SRT-01", "파지 실패", "동일 모드 재발 — 코팅 편차", "그리퍼 코팅 로트 편차", "그리퍼 Rev C 교체", "v0.9.2", "Rev B"),
        ("SRT-05", "센서 오검지", "근접 센서 노이즈", "EMI 영향", "필터 추가", "v0.9.2", "Rev B"),
        ("SRT-06", "티칭 이탈", "적재 좌표 오차 누적", "티칭 기준점 관리 미흡", "기준점 재티칭 SOP", "v0.9.2", "Rev C"),
        ("SRT-01", "파지 실패", "재발 검증 중 재현", "Rev C 적용 전 잔존", "Rev C 전수 적용", "v0.9.3", "Rev C"),
        ("SRT-01", "파지 실패", "고속 모드 한정 재현", "속도 프로파일 한계", "v0.9.4 속도 보정", "v0.9.3", "Rev C"),
    ]
    error_rows = [
        (i + 1, err_slots[i].isoformat(), f"{9 + i % 8}:{10 + i * 5 % 50:02d}", 400 * (i + 1),
         code, mode, det, cause, act, "정상복귀", "이OO", "업체 김OO", sw, hw, "", "")
        for i, (code, mode, det, cause, act, sw, hw) in enumerate(err_defs)
    ]

    wb = Workbook(); wb.remove(wb.active)
    _sheet(wb, "안내", ["Pilot 보고 양식 — 일일평가에 가동시간(h), 에러로그에 SW/HW버전 필수. docs/RECORD_SCHEMA.md 참조"], [])
    _sheet(wb, "일일평가", ["평가일", "입실인원", "주평가내용", "일일평가", "일일에러", "연속성공", "가동시간(h)", "비고"], daily_rows)
    _sheet(wb, "에러로그", ["No", "발생일", "시각", "회차", "코드", "유형", "상세", "원인", "조치", "결과",
                          "삼성 담당자", "업체 담당자", "SW버전", "HW버전", "상세설명", "사진(파일명)"], error_rows)
    wb.save(PROJECTS / pid / "raw" / "분류Pilot_샘플.xlsx")

    # 관리 엑셀 (코드마스터 + 조치검증)
    wb2 = Workbook(); wb2.remove(wb2.active)
    _sheet(wb2, "코드마스터", ["코드", "유형", "등급", "설명"], [
        ("SRT-01", "파지 실패", "Major", "그리퍼 파지 실패/미끄러짐"),
        ("SRT-02", "정위치 이탈", "Major", "AMR 정위치 정지 실패"),
        ("SRT-03", "컨베이어 I/F 타임아웃", "Minor", "설비 인터페이스 응답 지연"),
        ("SRT-04", "충전 도킹 실패", "Minor", "자동충전 도킹 실패"),
        ("SRT-05", "센서 오검지", "Minor", "근접/영역 센서 오검지"),
        ("SRT-06", "티칭 이탈", "Major", "적재 좌표 티칭 이탈"),
    ])
    _sheet(wb2, "조치검증", ["조치ID", "대상코드", "조치내용", "담당", "목표일", "상태", "검증시작"], [
        ("A-001", "SRT-01", "그리퍼 Rev C 전수 적용 + v0.9.4 속도 보정", "김OO", "2026-07-08", "검증중", "2026-06-27"),
        ("A-002", "SRT-02", "오도메트리 보정 패치 (v0.9.2)", "이OO", "2026-06-10", "검증완료", "2026-06-03"),
        ("A-003", "SRT-03", "핸드셰이크 타임아웃 로직 변경", "이OO", "2026-06-12", "검증완료", "2026-06-05"),
        ("A-004", "SRT-04", "도킹 마커 청소 주기 SOP", "박OO", "2026-06-08", "검증완료", "2026-06-02"),
        ("A-005", "SRT-05", "EMI 필터 추가", "박OO", "2026-06-15", "검증완료", "2026-06-10"),
        ("A-006", "SRT-06", "기준점 재티칭 SOP + 주기 점검", "김OO", "2026-06-20", "검증완료", "2026-06-14"),
    ])
    wb2.save(PROJECTS / pid / "REPORT.xlsx")

    _write_config(pid, {
        "stage": "pilot",
        "run": {"target": 300, "unit": "h", "criterion": "무정지", "env": "사내 (공정 연결 없이)",
                "growthTarget": 1500},
        "tecop": [
            {"k": "T", "status": "ok", "note": "MCBF 성장곡선 순항"},
            {"k": "E", "status": "warn", "note": "양산 원가 절감안 검토 중 (그리퍼 단가)"},
            {"k": "C", "status": "ok", "note": "공급계약 초안 합의"},
            {"k": "O", "status": "ok", "note": "수혜부서 가동 지표 정의 참여 완료"},
            {"k": "P", "status": "ok", "note": "안전인증 심사 일정 정상"},
        ],
        "gate": {"reviewDate": "2026-07-29", "label": "게이트 리뷰(양산시범 이관)", "criteria": [
            {"label": "① MCBF 성장 목표", "value": "auto:growth", "status": "prog"},
            {"label": "② 만성(재발) 고장", "value": "1건 — 마감 필요", "status": "fail"},
            {"label": "③ 시정조치 검증마감", "value": "auto:actions", "status": "prog"},
            {"label": "④ 안전인증서", "value": "심사 중 (~07-20)", "status": "prog"},
            {"label": "⑤ 무정지 300h", "value": "설계 동결(07-25) 후", "status": "wait"},
        ]},
        "project": {"name": "분류 자동화 (Pilot)", "department": "인프라 기술팀", "team": "이OO, 김OO",
                    "startDate": "2026-05-25", "endDate": "2026-08-31"},
        "lifecycle": [
            {"stage": "L1 가동 지표 정의", "status": "done", "note": "MCBF/MTTR/가동률 산식 확정 — 양산시범과 동일 산식"},
            {"stage": "L2 신뢰성 평가/검증 (TAAF)", "status": "current", "note": "반복운전→FRACAS→재운전 · 성장 추적"},
            {"stage": "L3 신뢰성시험사양서 · 임시 사용 안전 승인", "status": "current", "note": "v0.9 협의 — 300h 판정·리셋 규칙 명문화"},
            {"stage": "L4 무정지 300h", "status": "todo", "note": "설계 동결(07-25 예정) 후 본 런 · 현재 예열 런"},
        ],
        "ui": {
            "app": {"title": "분류 자동화 — Pilot", "brandLogo": "분", "brandName": "분류 자동화<br>Pilot",
                    "evalDateLabel": "평가일", "printBtn": "PDF 리포트",
                    "footBrand": "FRACAS + MCBF 성장 추적", "updatedPrefix": "업데이트 "},
            "nav": {"overview": "한눈에 보기", "all": "평가 상세 내역"},
            "common": {"stDone": "완료", "stCurrent": "진행 중", "stTodo": "예정", "noteEmpty": "— 메모"},
            "overview": {"stageTitle": "Pilot 세부 단계", "stageCurrentPrefix": "현재: ",
                         "stageSub": "L1→L4 · 게이트 통과 시 양산 시범 평가 이관"},
            "modal": {"title": "상세"},
        },
    })
    n_err_daily = sum(r[4] for r in daily_rows)
    assert n_err_daily == len(error_rows), f"정합성 위반: 일일에러 합 {n_err_daily} ≠ 에러로그 {len(error_rows)}"
    print(f"[demo] sort(Pilot): daily {len(daily_rows)}일 · 에러 {len(error_rows)}건 · 조치 6건 (정합 확인)")


if __name__ == "__main__":
    gen_drum()
    gen_sort()
    print("[demo] 완료 — python3 scripts/build_dashboard_json.py 로 빌드하세요")
