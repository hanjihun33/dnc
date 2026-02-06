# 당낭콩 프로젝트 문서 모음 (Exec)

이 폴더는 당낭콩 서비스의 배포, 운영, 시연을 위한 핵심 문서를 포함하고 있습니다.
문서는 아래 순서대로 확인하시는 것을 권장합니다.

## 📁 문서 목록

### 1. [배포 및 빌드 가이드 (DEPLOY_GUIDE.md)](./DEPLOY_GUIDE.md)
- **목적**: 깃랩 소스 클론 이후 빌드 및 배포 가이드.
- **내용**: 전체 기술 스택(Java, Python, React Native) 및 라이브러리 버전 정보.
- **핵심**: Docker Compose 기반의 전체 서비스 배포 및 빌드 명령어, Nginx/Jenkins 인프라 설정.

### 2. [외부 서비스 연동 정보 (EXTERNAL_SERVICES.md)](./EXTERNAL_SERVICES.md)
- **목적**: 프로젝트에서 사용하는 외부 서비스 정보 정리.
- **내용**: Google/Kakao/Naver 소셜 로그인, Dexcom CGM, AWS S3, Google Gemini API 설정 값 및 용도.

### 3. [DB 덤프 및 스키마 정보 (DB_DUMP_INFO.md)](./DB_DUMP_INFO.md)
- **목적**: DB 덤프 파일 생성/복구 가이드 및 테이블 정보.
- **내용**: AI 분석 결과(`food_analyses`), 혈당 예측(`glucose_predictions`), 코칭(`food_records`) 테이블 구조 및 Docker 환경에서의 덤프 명령어. (**최신 덤프 파일 생성 방법 포함**)

### 4. [시연 시나리오 (DEMO_SCENARIO.md)](./DEMO_SCENARIO.md)
- **목적**: 프로젝트 런칭 및 발표를 위한 시연 시나리오.
- **내용**: 앱의 주요 기능(로그인, 홈, 식단 기록, 리포트, 설정) 시연을 위한 단계별 가이드.
- **핵심**: AI 식단 분석 및 혈당 예측의 3단계 프로세스(Vision AI -> Generative AI -> Simulation) 흐름.

---
> **참고**: 모든 문서는 프로젝트의 최신 상태(AI 모델 구조 및 데이터 파이프라인)를 반영하여 업데이트되었습니다.
