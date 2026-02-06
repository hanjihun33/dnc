# 배포 및 빌드 가이드 (DEPLOY_GUIDE)

## 1. 기술 스택 및 환경

### Backend
- **Language**: Java 17
- **Framework**: Spring Boot 3.5.9
- **Build Tool**: Gradle 8.x
- **Key Libraries**: Spring Security, Spring Data JPA, Spring Data Redis, DJL/AI (inference), Firebase Admin

### AI Server
- **Language**: Python 3.9+
- **Framework**: FastAPI
- **Libraries**: PyTorch (YOLO, ResNet), SciPy (Glucose Simulation), Uvicorn

### Frontend (Mobile/Web)
- **Framework**: React Native (Expo)
- **Routing**: Expo Router (File-based routing)
- **Platform**: Web (React Native for Web) & Mobile (Android/iOS)

### Infrastructure & Database
- **Database**: MySQL 8.0
- **Cache**: Redis (Alpine image)
- **Reverse Proxy**: Nginx (Latency handling & SSL termination)
- **Containerization**: Docker & Docker Compose

---

## 2. 빌드 및 배포

### 사전 요구사항
- JDK 17 이상 설치
- Docker & Docker Compose 설치
- Node.js & npm (Frontend 빌드 시)

### 백엔드 빌드
```bash
# apps/backend/dnc 디렉토리에서 실행
./gradlew clean build -x test
```
* 결과물: `apps/backend/dnc/build/libs/dnc-0.0.1-SNAPSHOT.jar`

### 프론트엔드 빌드 (Web)
```bash
# apps/mobile 디렉토리에서 실행
npm install
npx expo export -p web
```
* 결과물: `dist` 디렉토리 생성 (Docker 빌드 시 자동으로 처리됨)

### 전체 서비스 배포 (Docker Compose)
프로젝트 루트(`infra` 디렉토리 상위)에서 실행 권장하지만, 현재 `docker-compose.yml`은 `infra` 폴더 내에 위치함.

```bash
cd infra
docker-compose up -d --build
```

---

## 3. 핵심 환경 변수 (Environment Variables)

배포 시 `.env` 파일 또는 Docker Environment로 주입해야 하는 필수 변수들입니다.

### Database & Cache
- `DB_URL`: JDBC URL (예: `jdbc:mysql://djk-db:13306/dnc_db?serverTimezone=Asia/Seoul`)
- `DB_USER`: DB 사용자명
- `DB_PASSWORD`: DB 비밀번호
- `DB_ROOT_PASSWORD`: DB Root 비밀번호
- `MYSQL_DATABASE`: 생성할 초기 DB명 (dnc_db)

### Security & Auth
- `JWT_SECRET`: JWT 토큰 서명 키
- `JWT_EXPIRATION_TIME`: 액세스 토큰 만료 시간 (ms)
- `JWT_REFRESH_EXPIRATION_TIME`: 리프레시 토큰 만료 시간 (ms)

### External Services (OAuth)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `KAKAO_CLIENT_ID` / `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`
- `DEXCOM_CLIENT_ID` / `DEXCOM_CLIENT_SECRET` (CGM 데이터 연동)

### AWS & Storage
- `STORAGE_TYPE`: `s3` 또는 `local`
- `AWS_ACCESS_KEY_ID`: AWS 액세스 키
- `AWS_SECRET_ACCESS_KEY`: AWS 시크릿 키
- `S3_BUCKET`: S3 버킷명
- `S3_REGION`: 리전 (예: `ap-northeast-2`)

### AI & API
- `AI_SERVER_BASE_URL`: AI 서버 내부 통신 URL (예: `http://djk-ai:18000`)
- `GMS_API_KEY`: Google Gemini Service API Key
- `FIREBASE_SERVICE_ACCOUNT`: Firebase Admin SDK JSON 설정

---

## 4. 로깅 및 모니터링
- 모든 컨테이너는 `json-file` 드라이버로 로깅 설정됨 (`max-size: 10m`, `max-file: 3`).
- **Nginx Access Log**: 웹 서버 요청 트래픽 모니터링
- **Spring Boot Log**: `logs/` 디렉토리 또는 `docker logs djk-backend` 확인
- **FastAPI Log**: `docker logs djk-ai` 확인

---

## 5. 인프라 상세 설정 (Infrastructure Setup)

### Nginx (Reverse Proxy)
- **설정 파일**: `infra/nginx/conf.d/default.conf`
- **도메인**: `i14c105.p.ssafy.io`
- **역할**:
  - 80 -> 443 HTTPS 리다이렉트
  - `/api`, `/swagger-ui`, `/v3/api-docs` -> Backend (18080)
  - `/ai/` -> AI Server (18000) (Basic Auth: `Team Dujjokko Only`)
  - `/jenkins/` -> Jenkins (8080)
  - `/` -> Frontend (180)
- **SSL**: Let's Encrypt (`/etc/letsencrypt` 마운트)
- **설정 특징**:
  - `client_max_body_size 20M` (이미지 업로드)
  - `proxy_read_timeout 300` (AI 분석 대기)

### Jenkins (CI/CD)
- **설정 파일**: `infra/docker-compose.jenkins.yml`
- **접속**: `https://i14c105.p.ssafy.io/jenkins/`
- **포트**: 외부 18088 매핑 (Nginx가 8080으로 프록시)
- **Docker-in-Docker**: 호스트의 `/var/run/docker.sock` 공유
- **워크스페이스**: `/home/ubuntu/dang-nang-kong` 마운트

### Docker Network
- **이름**: `dang-nang-kong_network` (External)
