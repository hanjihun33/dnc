# 포팅 매뉴얼 (Porting Manual)

## 0. 개요 (Overview)
본 문서는 **당낭콩 프로젝트**의 소스 코드를 GitLab에서 클론 받은 후, 로컬 개발 환경 또는 배포 서버(운영 환경)에서 빌드 및 실행하는 과정을 상세히 기술합니다.

---

## 1. 사전 요구 사항 (Prerequisites)

아래 소프트웨어가 시스템에 설치되어 있어야 합니다.

### 공통 (Common)
*   **Git**: 소스 코드 클론용.

### Backend (Server)
*   **JDK 17**: Eclipse Temurin 17 (LTS) 권장.
    *   *설치 확인*: `java -version`
*   **MySQL 8.0**: 데이터베이스 서버.
*   **Redis**: 세션 및 캐시 저장소.

### AI Server
*   **Docker**: 컨테이너 기반 배포 권장.
*   **Python 3.11**: 직접 실행 시 필요. (Miniconda 또는 Venv 권장)

### Frontend (Mobile - Android)
*   **Node.js 18+ (LTS)**: JavaScript 런타임.
    *   *설치 확인*: `node -v`, `npm -v`
*   **Android Studio**: Android SDK 및 에뮬레이터 관리.
    *   **SDK Platform**: Android 14 (API 34) 이상 권장.
    *   **Build Tools**: 34.0.0 이상.
    *   *환경 변수*: `ANDROID_HOME` 설정 필수.

---

## 2. 프로젝트 클론 (Clone)

```bash
# 프로젝트 전체 클론
git clone [GITLAB_REPOSITORY_URL]
cd S14P11C105
```

---

## 3. Backend 빌드 및 배포

### 3.1 환경 변수 설정
`apps/backend/dnc/src/main/resources/application.yml` 파일을 확인하거나, 실제 운영 환경에서는 환경 변수로 주요설정을 주입해야 합니다.

*   **주요 환경 변수** (보안상 실제 값은 제외됨)
    *   `DB_URL`: JDBC 연결 주소 (예: `jdbc:mysql://localhost:3306/dnc_db?serverTimezone=Asia/Seoul`)
    *   `DB_USERNAME` / `DB_PASSWORD`: 데이터베이스 계정 정보.
    *   `JWT_SECRET`: JWT 토큰 서명 키.
    *   `STORAGE_TYPE`: `local` 또는 `s3`. (S3 사용 시 AWS 키 필요)

### 3.2 빌드 (Build)
Gradle Wrapper를 사용하여 실행 가능한 JAR 파일을 생성합니다.

```bash
# Backend 디렉토리로 이동
cd apps/backend/dnc

# 실행 권한 부여 (Linux/Mac)
chmod +x gradlew

# 빌드 실행 (테스트 제외권장 - 빠른 배포시)
./gradlew bootJar -x test
```
*   **결과물**: `build/libs/dnc-0.0.1-SNAPSHOT.jar`

### 3.3 실행 (Run)
```bash
# JAR 파일 실행 (Timezone 설정 포함)
java -Duser.timezone=Asia/Seoul -jar build/libs/dnc-0.0.1-SNAPSHOT.jar
```
*   **포트**: 기본값 `18080` (Dockerfile 기준)

---

## 4. AI Server 빌드 및 배포

### 4.1 Docker를 이용한 배포 (권장)
AI 서버는 `libgl1` 등 시스템 의존성이 있으므로 Docker 사용을 권장합니다.

```bash
# AI Server 디렉토리로 이동
cd apps/ai-server

# Docker 이미지 빌드
docker build -t dnc-ai-server .

# 컨테이너 실행 (포트 18000)
docker run -d -p 18000:18000 --name dnc-ai-server dnc-ai-server
```

### 4.2 수동 실행 (Python Venv)
```bash
cd apps/ai-server

# 가상환경 생성 및 실행
python -m venv venv
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt

# 시스템 라이브러리 설치 (Ubuntu 기준, 필요 시)
# sudo apt-get install libgl1 libglib2.0-0

# 서버 실행
uvicorn ai.main:app --host 0.0.0.0 --port 18000
```

---

## 5. Frontend (Mobile) 빌드 및 배포

### 5.1 환경 변수 설정
`apps/mobile/.env` 파일을 생성하거나 수정합니다.

```ini
# .env 예시
EXPO_PUBLIC_API_BASE_URL=http://[BACKEND_IP]:18080
```
> **주의**: 에뮬레이터 사용 시 `localhost` 대신 `10.0.2.2`를 사용하거나, 실기기 테스트 시 PC의 내부 IP 주소를 사용하세요.

### 5.2 의존성 설치
```bash
# Mobile 디렉토리로 이동
cd apps/mobile

# 패키지 설치
npm install
```

### 5.3 Android APK 추출 (Build APK)
React Native (Expo Prebuild) 프로젝트이므로, 네이티브 빌드를 수행합니다.

```bash
# Expo Prebuild (네이티브 폴더 생성)
npx expo prebuild --platform android

# Android 빌드 디렉토리로 이동
cd android

# 실행 권한 부여 (Linux/Mac)
chmod +x gradlew

# Release APK 생성
./gradlew assembleRelease
```
*   **결과물 위치**: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
*   **참고**: `.aab` (Bundle) 파일이 필요한 경우 `./gradlew bundleRelease` 실행.

### 5.4 서명 (Signing) 주의사항
현재 프로젝트 설정(`apps/mobile/android/app/build.gradle`) 상, **Release 빌드도 `debug.keystore`를 사용하도록 설정**되어 있습니다.
Google Play Store 배포를 위해서는 정식 서명 키(Keystore)를 생성하고 `build.gradle`의 `signingConfigs.release` 블록을 수정해야 합니다.

---

## 6. 배포 시 체크리스트

1.  **Backend**
    *   MySQL/Redis가 정상적으로 구동 중인가?
    *   `application.yml`의 DB 접속 정보가 운영 환경에 맞게 변경되었는가?
    *   서버 방화벽(Firewall)에서 18080 포트가 개방되었는가?

2.  **AI Server**
    *   컨테이너 또는 프로세스가 18000 포트에서 정상 리스닝 중인가? (`curl http://localhost:18000/`)
    *   Backend의 `AI_SERVER_BASE_URL`이 AI 서버 주소를 올바르게 가리키는가?

3.  **Frontend (Mobile)**
    *   `.env`의 `EXPO_PUBLIC_API_BASE_URL`이 외부에서 접근 가능한 Backend 주소인가? (`localhost` 불가)
    *   앱 권한(카메라, 저장소)이 AndroidManifest.xml에 정상적으로 명시되었는가? (Expo Config 확인)
