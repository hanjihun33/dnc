# DB 덤프 및 스키마 정보 (DB_DUMP_INFO)

## ERD 요약 및 엔티티 구조
현재 `com.djjko.dnc.*.entity` 패키지 분석 결과, 주요 테이블 구조는 다음과 같습니다.

### 핵심 테이블 (Core Domain)
- **`users` (`User`)**: 사용자 기본 정보 (이메일, 닉네임, 당뇨 유형, 신체 정보).
    - 주요 컬럼: `user_id`, `email`, `nickname`, `diabetes_type`, `dexcom_user_id`
    - 연관 관계: 모든 데이터의 주체 (1:N 관계의 부모)

- **`glucose_data` (`GlucoseData`)**: 시계열 혈당 데이터.
    - 주요 컬럼: `glucose_id`, `value` (혈당값), `measured_at` (측정 시간), `trend` (추세), `dexcom_record_id` (중복 방지 키)
    - 인덱스: `idx_glucose_user_time` (사용자별 시간순 조회 최적화)
    - 특이사항: 대용량 데이터가 적재되는 테이블로 파티셔닝 고려 대상

- **`sensor` (`Sensor`)**: 연결된 센서(Dexcom 등) 장치 정보.
    - 주요 컬럼: `sensor_id`, `transmitter_id`, `started_at`, `ended_at`

### 리포트 및 분석 (Analytics)
- **`daily_report`, `test_report`**: 일일 혈당 분석 결과 (평균 혈당, 변동성, TIR 등).
- **`food_analyses`**: Vision AI(YOLO/ResNet) 분석 결과 (음식량, 신뢰도 등)
- **`glucose_predictions`**: SciPy 시뮬레이션 모델이 예측한 혈당 데이터 (미래 2시간)
- **`food_records`**: 사용자 식사 기록 + **Gemini AI 코칭 메시지(`ai_guide` 컬럼)**
- **`weekly_report`, `monthly_report`**: (준비중) 주간/월간 리포트 요약 통계고도화된 주간/월간 분석 기능을 제공하기 위해 미리 생성된 테이블입니다.

### 인증 및 기타 (Auth & Etc)
- **`social_account`, `oauth_token`**: 소셜 로그인 연동 정보 및 토큰 관리.
- **`user_alert_setting`, `push_token`**: 알림 설정 및 FCM 토큰.
