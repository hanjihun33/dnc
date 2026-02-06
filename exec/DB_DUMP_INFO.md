# DB 덤프 및 스키마 정보 (DB_DUMP_INFO)

## 1. ERD 요약 및 엔티티 구조
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

---

## 2. 데이터 덤프 및 복구 가이드

### 덤프 (Backup)
Docker 컨테이너 내부의 MySQL 데이터베이스를 덤프하는 명령어입니다.

```bash
# 전체 데이터베이스 덤프 (스키마 + 데이터)
docker exec djk-db mysqldump -u root -p${DB_ROOT_PASSWORD} dnc_db > backup_full_$(date +%Y%m%d).sql

# 스키마만 덤프 (테이블 구조 백업)
docker exec djk-db mysqldump -u root -p${DB_ROOT_PASSWORD} --no-data dnc_db > backup_schema.sql
```

### 복구 (Restore)
생성된 SQL 파일을 사용하여 데이터베이스를 복원합니다. **주의: 기존 데이터가 덮어씌워질 수 있습니다.**

```bash
# 데이터베이스 복원
cat backup_full_2024XXXX.sql | docker exec -i djk-db mysql -u root -p${DB_ROOT_PASSWORD} dnc_db
```

---

## 3. 데이터 관리 제언
1. **민감 정보 제외**: 백업 시 `users` 테이블의 `password` 컬럼이나 `oauth_token` 테이블의 토큰 정보는 제외하거나 마스킹하는 것이 보안상 권장됩니다.
2. **정기 백업**: `Jenkins` 또는 `Cron` 작업을 통해 매일 새벽 유휴 시간에 자동 백업을 수행하고 S3 등으로 이관하는 스크립트가 필요합니다.
3. **볼륨 영속성**: 현재 `docker-compose.yml` 상에 `./mysql_data:/var/lib/mysql`로 볼륨이 마운트되어 있어, 컨테이너가 삭제되어도 데이터는 호스트에 유지됩니다.
