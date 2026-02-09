# 포팅 매뉴얼 (Porting Manual)

**당낭콩 프로젝트**의 설치, 배포, 운영을 위한 통합 문서입니다.
아래 목차를 클릭하여 각 단계별 상세 가이드를 확인하세요.

---

## 1. [빌드 및 배포 가이드 (DEPLOY_GUIDE.md)](./DEPLOY_GUIDE.md)
*   **Backend**: Java 17, Spring Boot 빌드 및 실행.
*   **AI Server**: Docker 기반 환경 구축 및 모델 서빙.
*   **Frontend**: React Native Android APK 추출 및 배포.

## 2. [외부 서비스 정보 (EXTERNAL_SERVICES.md)](./EXTERNAL_SERVICES.md)
*   **Social Auth**: Google, Kakao, Naver 로그인 설정.
*   **Healthcare**: Dexcom, CareSense CGM 데이터 연동.
*   **Cloud & AI**: AWS S3, Google Gemini API 설정.

## 3. [DB 덤프 및 정보 (DB_DUMP_INFO.md)](./DB_DUMP_INFO.md)
*   **Schema**: 핵심 테이블(`users`, `glucose_data`) 및 ERD 구조 설명.
*   **Dump**: DB 초기화 및 데이터 복구를 위한 덤프 파일 활용법.

## 4. [시연 시나리오 (DEMO_SCENARIO.md)](./DEMO_SCENARIO.md)
*   **Flow**: 로그인 -> 식사 기록(AI 분석) -> 리포트 확인 -> 설정.
*   **Guide**: 시연 성공을 위한 사전 준비 및 체크포인트.

---
> **참고**: 본 문서는 프로젝트의 최신 상태(v1.0.2)를 기준으로 작성되었습니다.
