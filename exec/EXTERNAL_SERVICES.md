# 외부 서비스 연동 정보 (EXTERNAL_SERVICES)

본 프로젝트에서 연동 중인 외부 서비스(SaaS/PaaS) 및 API 목록입니다.

## 1. 소셜 로그인 (Social Auth)
사용자 편의를 위해 다양한 OAuth Provider를 지원합니다.

| 서비스명 | 용도 | 필수 설정키 (Env) | 비고 |
| :--- | :--- | :--- | :--- |
| **Google** | 로그인/회원가입 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Scope: email, profile |
| **Kakao** | 로그인/회원가입 | `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` | Scope: profile_nickname, account_email |
| **Naver** | 로그인/회원가입 | `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | Scope: email, name, profile |

## 2. 헬스케어 데이터 연동
연속혈당측정기(CGM) 데이터 수집을 위한 연동입니다.

### Dexcom (Sandbox/Production)
- **용도**: 실시간 혈당 데이터 수집
- **설정키**:
    - `DEXCOM_CLIENT_ID`
    - `DEXCOM_CLIENT_SECRET`
    - `DEXCOM_REDIRECT_URI` (Callback URL)
- **통신 방식**: OAuth 2.0 Authorization Code Flow
- **API Base**: `https://sandbox-api.dexcom.com/v3` (개발환경)

### CareSense (선택)
- **용도**: 혈당 데이터 수집
- **설정키**: `CARESENSE_CLIENT_ID`, `CARESENSE_CLIENT_SECRET`

## 3. 클라우드 및 인프라 서비스

### AWS S3 (Simple Storage Service)
- **용도**: 사용자 프로필 이미지, 식단 이미지 저장
- **설정키**:
    - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
    - `S3_BUCKET`, `S3_REGION`
- **스토리지 정책**: `STORAGE_TYPE=s3` 설정 시 활성화. (기본값 `local`)

### Google Gemini API (GMS)
- **용도**: 식단 분석 결과(영양소)를 바탕으로 맞춤형 피드백(코칭) 생성
- **설정키**: `GMS_API_KEY`
- **모델**: `gemini-2.5-pro` (설정 가능)

### Firebase Cloud Messaging (FCM)
- **용도**: 앱 푸시 알림 (혈당 경고, 리포트 생성 알림)
- **설정키**: `FIREBASE_SERVICE_ACCOUNT` (JSON 포맷 문자열 또는 파일 경로)

## 4. 연동 시 주의사항
1. **Redirect URI 일치**: OAuth 서비스(Google, Kakao, Dexcom 등) 콘솔에 등록된 Redirect URI와 `application.yml`의 설정값이 정확히 일치해야 합니다.
2. **샌드박스 모드**: Dexcom은 개발 시 Sandbox 환경을 사용하며, 실제 데이터가 아닌 시뮬레이션 데이터가 수신될 수 있습니다.
3. **방화벽**: 외부 API 호출(Outbound)을 위해 컨테이너에서 443 포트(HTTPS) 접근이 허용되어야 합니다.
