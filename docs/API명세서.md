# API 명세서

기준일: 2026-02-11  

- `App 반영`: 모바일 앱에서 실제 호출 여부
- `Server 반영`: 서버(Backend 또는 AI Server)에 실제 구현 여부


| Domain | App 반영 | Server 반영 | 상태 | 기능 | Method | 최종 Endpoint | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | Yes | Yes | 완료 | 회원가입 | POST | `/api/v1/auth/signup` | - |
| Auth | Yes | Yes | 완료 | 로그인 | POST | `/api/v1/auth/login` | - |
| Auth | Yes | Yes | 완료 | 로그아웃 | POST | `/api/v1/auth/logout` | - |
| Auth | No | Yes | 완료 | JWT 토큰 재발급 | POST | `/api/v1/auth/reissue` | 앱 직접 호출 없음 |
| Auth | Yes | Yes | 완료 | 이메일 중복 확인 | GET | `/api/v1/auth/check-email` | - |
| Auth | Yes | Yes | 완료 | 닉네임 중복 확인 | GET | `/api/v1/auth/check-nickname` | - |
| Auth | No | Yes | 완료 | OAuth 토큰 재발급 | POST | `/api/v1/oauth/{provider}/refresh` | 경로 변경 (`/auth/refresh` -> `/oauth/{provider}/refresh`) |
| Auth | No | Yes | 완료 | OAuth 토큰 발급 | POST | `/api/v1/oauth/{provider}/token` | - |
| Auth | Yes | Yes | 완료 | 덱스콤 인가 페이지 호출 | GET | `/api/v1/oauth/{provider}/authorize-url` | 앱 연동 기준 경로로 변경 |
| Auth | No | Yes | 완료 | 덱스콤 콜백 | GET | `/api/v1/oauth/{provider}/callback` | 외부 OAuth 리다이렉트 |
| User | Yes | Yes | 완료 | 내 프로필 조회 | GET | `/api/v1/users/me` | - |
| User | Yes | Yes | 완료 | 회원정보 수정 | PATCH | `/api/v1/users/me/profile` | - |
| User | Yes | Yes | 완료 | 건강정보 수정 | PATCH | `/api/v1/users/me/health` | - |
| User | Yes | Yes | 완료 | 프로필 이미지 등록/변경 | PATCH | `/api/v1/users/me/profile-image` | - |
| User | No | Yes | 완료 | 프로필 이미지 삭제 | DELETE | `/api/v1/users/me/profile-image` | 서버 구현만 존재 |
| User | Yes | Yes | 완료 | 회원 탈퇴 | DELETE | `/api/v1/users/me` | - |
| Sensor | No | No | 폐기 | 센서 등록 | POST | - | 현재 모델에서 미사용 |
| Sensor | No | No | 폐기 | 센서 교체 | PATCH | - | 현재 모델에서 미사용 |
| Sensor | Yes | Yes | 완료 | 센서 해제 | POST | `/api/v1/oauth/{provider}/disconnect` | 기능이 OAuth 도메인으로 이동 |
| Sensor | No | Yes | 완료 | 센서 상태 조회 | GET | `/api/v1/sensors/active` | 경로 변경 (`/sensor/status` -> `/sensors/active`) |
| Sensor | No | No | 폐기 | 센서 상태 변경 | PATCH | - | 현재 모델에서 미사용 |
| Glucose | No | No | 폐기 | 혈당 수동 입력 | POST | - | 현재 모델에서 미사용 |
| Glucose | Yes | Yes | 완료 | 혈당 실시간 조회 | GET | `/api/v1/glucose/realtime` | 경로 변경 (`/glucose/latest` -> `/glucose/realtime`) |
| Glucose | No | No | 폐기 | 혈당 데이터 수정(수동 입력 정정) | PATCH | - | 현재 모델에서 미사용 |
| Glucose | Yes | Yes | 완료 | 일별 혈당 요약 조회 | GET | `/api/v1/reports/daily/latest` | 기능이 Report 도메인으로 이동 |
| Glucose | Yes | Yes | 완료 | 혈당 시계열 조회 | GET | `/api/v1/glucose/realtime` | 기능 통합 |
| Meal | Yes | Yes | 완료 | 음식 기록 생성 (사진) | POST | `/api/v1/meals` | - |
| Meal | Yes | Yes | 완료 | 음식 기록 삭제 | DELETE | `/api/v1/meals/{mealId}` | - |
| Meal | Yes | Yes | 완료 | 음식 기록 상세 조회 | GET | `/api/v1/meals/{mealId}` | - |
| Meal | Yes | Yes | 완료 | 음식 기록 목록 조회 | GET | `/api/v1/meals` | - |
| Meal | Yes | Yes | 완료 | 음식 기록 수정 | PATCH | `/api/v1/meals/{mealId}` | - |
| AI-Food | Yes | Yes | 완료 | 음식 AI 분석 요청 | POST | `/api/v1/ai/food/analyze` | - |
| AI-Food | Yes | Yes | 완료 | 음식 AI 분석 결과 조회 | GET | `/api/v1/ai/food/guides/{requestId}` | 경로 변경 (`/analyze/{requestId}` -> `/guides/{requestId}`) |
| AI-Food | Yes | Yes | 완료 | 음식 분석 결과 확정/편집 | PATCH | `/api/v1/meals/{mealId}` | 분석 후 식사 데이터 수정으로 구조 변경 |
| Prediction | No | Yes | 완료 | 혈당 예측 생성 | POST | `/api/v1/predictions` | AI 서버 내부 API |
| Prediction | No | No | 폐기 | 혈당 예측 상세 조회 | GET | - | 현재 모델에서 미사용 |
| Learning | No | Yes | 완료 | 학습 이벤트 생성 | POST | `/api/v1/model/update` | AI 서버 내부 API로 변경 |
| Learning | No | No | 폐기 | 음식별 반응 곡선 조회 | GET | - | 현재 모델에서 미사용 |
| Learning | No | No | 폐기 | 학습 결과 조회 | GET | - | 현재 모델에서 미사용 |
| Report | Yes | Yes | 완료 | 주간 리포트 조회 | GET | `/api/v1/reports/glucose` | 기간 파라미터 기반으로 통합 |
| Settings | No | No | 폐기 | 목표 혈당 범위 설정 | PATCH | - | 현재 모델에서 미사용 |
| Settings | Yes | Yes | 완료 | 알림 설정 변경 | PATCH | `/api/v1/users/me/alert-settings/{type}` | 경로 변경 (`/settings/alerts` -> `/users/me/alert-settings/{type}`) |
| Settings | Yes | Yes | 완료 | 알림 설정 목록 조회 | GET | `/api/v1/users/me/alert-settings` | 경로 확정 |
| AI-Coaching | Yes | Yes | 완료 | AI 코칭 생성 요청 | POST | `/api/v1/ai/food/analyze?aiGuide=true` | 음식 분석 API에 통합 |
| AI-Coaching | Yes | Yes | 완료 | AI 코칭 결과 조회 | GET | `/api/v1/ai/food/guides/{requestId}` | 가이드 상태 조회 API 사용 |

## 프로젝트 진행 중 추가된 API

| Domain | App 반영 | Server 반영 | 상태 | 기능 | Method | Endpoint |
| --- | --- | --- | --- | --- | --- | --- |
| OAuth | No | Yes | 완료 | OAuth 인가 리다이렉트 | GET | `/api/v1/oauth/{provider}/authorize` |
| OAuth | Yes | Yes | 완료 | OAuth 연동 데이터 범위 조회 | GET | `/api/v1/oauth/{provider}/data-range` |
| OAuth | No | Yes | 완료 | OAuth EGV 조회 | GET | `/api/v1/oauth/{provider}/egvs` |
| Social Login | Yes | Yes | 완료 | 소셜 로그인 인가 | GET | `/api/v1/login/{provider}/authorize` |
| Social Login | No | Yes | 완료 | 소셜 로그인 콜백 | GET | `/api/v1/login/{provider}/callback` |
| Glucose | No | Yes | 완료 | 혈당 과거 데이터 수집 | POST | `/api/v1/glucose/fetch-history` |
| Glucose | No | Yes | 완료 | 최신 혈당 데이터 수집 | GET | `/api/v1/glucose/fetch-latest-data/{userId}` |
| Sensor | Yes | Yes | 완료 | 센서 이력 조회 | GET | `/api/v1/sensors/history` |
| User | Yes | Yes | 완료 | 비밀번호 변경 | PATCH | `/api/v1/users/me/password` |
| Push | Yes | Yes | 완료 | 푸시 토큰 등록 | POST | `/api/v1/users/me/push-tokens` |
| Notification | Yes | Yes | 완료 | 알림 목록 조회 | GET | `/api/v1/users/me/notifications` |
| Notification | Yes | Yes | 완료 | 알림 읽음 처리 | PATCH | `/api/v1/users/me/notifications/{notificationId}/read` |
| Notification | Yes | Yes | 완료 | 알림 전체 읽음 처리 | PATCH | `/api/v1/users/me/notifications/read-all` |
| Report | Yes | Yes | 완료 | 센서별 최신 리포트 조회 | GET | `/api/v1/reports/daily/latest/{sensorId}` |
| Report | Yes | Yes | 완료 | 센서별 리포트 히스토리 조회 | GET | `/api/v1/reports/history/{sensorId}` |
| Report | No | Yes | 완료 | 리포트 수동 생성(테스트) | POST | `/api/v1/reports/test/generate` |

