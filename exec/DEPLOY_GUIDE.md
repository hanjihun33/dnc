# 1. 빌드 및 배포 가이드 (DEPLOY_GUIDE.md)

## 1) 환경 상세 스펙

### Backend
*   **Language & JDK**: Java 17 (Eclipse Temurin 17-jdk-focal)
*   **Framework (WAS)**: Spring Boot 3.5.9 (Embedded Tomcat)
*   **Build Tool**: Gradle (Wrapper 8.x)
*   **IDE**: IntelliJ IDEA (Recommended, project contains `.idea` configurations)
*   **Database**: MySQL 8.0 (Dialect: `MySQL8Dialect`)
*   **In-Memory DB**: Redis (Session & Data)

### AI Server
*   **Language**: Python 3.11 (Slim)
*   **Framework**: FastAPI 0.128.0 + Uvicorn
*   **Key Libraries**:
    *   **Computer Vision**: OpenCV (`opencv-python`), Ultralytics (YOLOv8), Torch/Torchvision.
    *   **Data Processing**: NumPy, Pandas, SciPy.
*   **Container**: Docker (Base: `python:3.11-slim` with `libgl1`)
*   **Models**:
    *   YOLOv8 ([best1to40.pt](file:///c:/dnc/S14P11C105/apps/ai-server/ai/models/best1to40.pt))
    *   ResNet Custom ([new_opencv_ckpt_b84_e200.pth](file:///c:/dnc/S14P11C105/apps/ai-server/ai/models/new_opencv_ckpt_b84_e200.pth))

### Frontend (Mobile - Android)
*   **Framework**: React Native 0.81.5 (with Expo SDK 54)
*   **Runtime**: Node.js 18+ (LTS Version)
*   **Build Language**: Kotlin (Gradle Plugin)
*   **Android Build Environment**:
    *   **JDK**: JDK 17 (Required for Gradle 8.14.3)
    *   **Android SDK**: Managed by Expo SDK 54 (Target SDK 34/35 recommended)
    *   **Gradle**: 8.14.3
*   **IDE**: Android Studio / VS Code

---

## 2) 빌드 환경 변수

### Backend ([apps/backend/dnc/.env](file:///c:/dnc/S14P11C105/apps/backend/dnc/.env) or System Environment)
> **Note**: 보안상 민감한 값은 실제 값 대신 역할만 기술합니다.

| Key | Description |
| :--- | :--- |
| **Storage & S3** | |
| `STORAGE_TYPE` | 파일 저장소 유형 (`local` or `s3`) |
| `S3_BUCKET` | AWS S3 버킷 이름 |
| `S3_REGION` | AWS S3 리전 (e.g., `ap-northeast-2`) |
| `S3_PUBLIC_URL` | S3 파일 접근을 위한 Public URL Prefix |
| `AWS_ACCESS_KEY_ID` | AWS 액세스 키 |
| `AWS_SECRET_ACCESS_KEY` | AWS 시크릿 키 |
| **Database & Redis** | |
| `DB_URL` | JDBC URL (예: `jdbc:mysql://localhost:3306/dnc_db...`) |
| `DB_USERNAME` | DB 사용자명 |
| `DB_PASSWORD` | DB 비밀번호 |
| **Security (JWT)** | |
| `JWT_SECRET` | JWT 서명용 시크릿 키 (Base64) |
| `JWT_EXPIRATION_TIME` | Access Token 만료 시간 (ms) |
| `JWT_REFRESH_EXPIRATION_TIME` | Refresh Token 만료 시간 (ms) |
| **OAuth (Social Login)** | |
| `*_CLIENT_ID` | Google, Kakao, Naver, Dexcom, Caresense Client ID |
| `*_CLIENT_SECRET` | Google, Kakao, Naver, Dexcom, Caresense Client Secret |
| `*_REDIRECT_URI` | OAuth 인증 후 리다이렉트 될 URI |
| **AI & External APIs** | |
| `AI_SERVER_BASE_URL` | AI 서버(FastAPI 등) 주소 (e.g., `http://localhost:18000`) |
| `GMS_API_KEY` | Google AI Studio / Gemini API Key |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK용 서비스 계정 JSON 내용 |

### AI Server ([apps/ai-server/Dockerfile](file:///c:/dnc/S14P11C105/apps/ai-server/Dockerfile) & Source)

| Key | Description |
| :--- | :--- |
| `YOLO_MODEL_PATH` | YOLOv8 모델 파일 절대 경로 (Default: [ai/models/best1to40.pt](file:///c:/dnc/S14P11C105/apps/ai-server/ai/models/best1to40.pt)) |
| `RESNET_MODEL_PATH` | ResNet 모델 파일 절대 경로 (Default: [ai/models/new_opencv_ckpt_b84_e200.pth](file:///c:/dnc/S14P11C105/apps/ai-server/ai/models/new_opencv_ckpt_b84_e200.pth)) |
| `PYTHONPATH` | Python 모듈 경로 (Docker 내 설정: `/app/ai-server:/app/ai-server/ai`) |

### Frontend ([apps/mobile/.env](file:///c:/dnc/S14P11C105/apps/mobile/.env))

| Key | Description |
| :--- | :--- |
| `EXPO_PUBLIC_API_BASE_URL` | Backend API 서버 기본 주소 (e.g., `https://i14c105.p.ssafy.io`) |

---

## 3) 배포 시 특이사항

### Backend
1.  **TimeZone 설정**: Dockerfile 및 JVM 옵션에 `-Duser.timezone=Asia/Seoul`이 설정되어야 합니다.
2.  **프로파일 분리**: 운영(Production) 배포 시 `application-prod.yml` 등을 사용하거나 환경 변수로 DB 접속 정보를 덮어써야 합니다.
3.  **Logs**: [application.yml](file:///c:/dnc/S14P11C105/apps/backend/dnc/src/main/resources/application.yml)에 SQL 로그 (`org.hibernate.SQL`) 및 HikariCP 로그가 ERROR 레벨로 설정되어 있어 디버깅 시 이를 조정해야 할 수 있습니다.

### AI Server
1.  **모델 파일 경로**: [ai/services/food_detection.py](file:///c:/dnc/S14P11C105/apps/ai-server/ai/services/food_detection.py) 내에 하드코딩된 로컬 경로가 주석으로 남아있으나, 실제 코드는 환경 변수(`YOLO_MODEL_PATH`) 또는 상대 경로(Default)를 사용하도록 구현되어 있습니다. 배포 시 모델 파일이 누락되지 않도록 주의하세요 (Docker `COPY . .` 포함됨).
2.  **시스템 의존성**: `cv2` 실행을 위해 `libgl1`, `libglib2.0-0` 설치가 필수입니다 (Dockerfile에 포함됨).
3.  **포트**: 기본 포트는 `18000`입니다. Backend의 `AI_SERVER_BASE_URL` 설정과 일치시켜야 합니다.

### Frontend (Mobile - Android APK)
1.  **빌드 명령**:
    *   프로젝트 루트(`apps/mobile`)에서 `npm install` 수행.
    *   `android` 폴더로 이동 후: `./gradlew assembleRelease` (APK 생성) 또는 `./gradlew bundleRelease` (AAB 생성).
2.  **APK 서명 (Signing)**:
    *   현재 `build.gradle`에는 **Release 빌드도 `debug.keystore`를 사용하도록 설정**되어 있습니다. (개발 편의성 목적)
    *   **주의**: 실제 스토어 배포 시에는 `android/app/build.gradle`의 `signingConfigs.release` 블록을 수정하여 정식 Keystore 파일을 참조하도록 변경해야 합니다.
3.  **에뮬레이터/실기기 테스트**:
    *   `.env`의 `EXPO_PUBLIC_API_BASE_URL`이 `localhost`인 경우, Android 에뮬레이터에서는 `http://10.0.2.2:8080`을 사용해야 합니다.
    *   실기기 테스트 시 PC와 동일한 Wi-Fi 네트워크에서 PC의 IP 주소를 입력해야 합니다.

---

## 4) 주요 계정 및 프로퍼티 정의 파일 목록

### Backend
*   **메인 설정 파일**: `apps/backend/dnc/src/main/resources/application.yml`
    *   DB Connection (`spring.datasource`), JPA, JWT, OAuth, S3 설정 포함.
*   **빌드 설정**: `apps/backend/dnc/build.gradle`
    *   의존성 및 Spring Boot 버전 관리.

### Frontend (Mobile)
*   **앱 설정 및 권한**: `apps/mobile/app.json`
    *   패키지명(`com.djjko.dnc`), 버전, 권한(Camera, Storage), 딥링크 Scheme 정의.
*   **환경 변수**: `apps/mobile/.env`
    *   API Base URL 정의.
*   **Android 빌드 설정**: `apps/mobile/android/app/build.gradle`
    *   Application ID, Version Code/Name, Signing Configs.
