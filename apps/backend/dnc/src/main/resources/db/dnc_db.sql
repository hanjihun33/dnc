-- =========================================================
-- DNK DB Schema (FINAL - Optimized for Daily/Weekly/Monthly Reports)
-- - MySQL 8.x recommended
-- - One ACTIVE sensor per user (functional unique index)
-- =========================================================

-- ---------------------------------------------------------
-- 0. Database Setup
-- ---------------------------------------------------------
CREATE DATABASE IF NOT EXISTS dnc_db;
USE dnc_db;

-- ---------------------------------------------------------
-- 1. Drop tables (FK-safe order)
-- ---------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS meal_reactions;
DROP TABLE IF EXISTS weekly_reports;
DROP TABLE IF EXISTS monthly_reports;
DROP TABLE IF EXISTS daily_reports;
DROP TABLE IF EXISTS glucose_predictions;
DROP TABLE IF EXISTS food_analyses;
DROP TABLE IF EXISTS food_metadata;
DROP TABLE IF EXISTS food_records;
DROP TABLE IF EXISTS glucose_data;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS user_push_tokens;
DROP TABLE IF EXISTS user_alert_settings;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS social_accounts;
DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------

-- 2-1. users (사용자 기본 정보)
CREATE TABLE users (
    user_id           BIGINT        NOT NULL AUTO_INCREMENT,
    email             VARCHAR(255)  NOT NULL,
    password          VARCHAR(255)  NULL,
    nickname          VARCHAR(50)   NOT NULL,
    name              VARCHAR(100)  NOT NULL,
    birth_date        DATE          NOT NULL,
    diabetes_type     ENUM('TYPE1','TYPE2','PREDIABETES','OTHER') NULL,
    diagnosis_year    INT           NULL,
    diagnosis_month   INT           NULL,
    gender            VARCHAR(20)   NULL,
    height_cm         DECIMAL(5,2)  NULL,
    weight_kg         DECIMAL(5,2)  NULL,
    profile_image_url VARCHAR(500)  NULL,
    provider          VARCHAR(20)   NOT NULL DEFAULT 'local',
    provider_id       VARCHAR(255)  NULL,
    created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    dexcom_user_id    VARCHAR(255)  NULL,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_provider (provider, provider_id)
) ENGINE=InnoDB;

-- 2-x. social_accounts (소셜 로그인 계정 관리 - 1:N)
CREATE TABLE social_accounts (
    social_account_id   BIGINT NOT NULL AUTO_INCREMENT,
    user_id             BIGINT NOT NULL,
    provider            VARCHAR(20) NOT NULL COMMENT 'google, kakao, naver, apple 등',
    provider_user_id    VARCHAR(255) NOT NULL COMMENT '소셜 서비스의 유저 고유 ID',
    email               VARCHAR(255) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (social_account_id),
    UNIQUE KEY uk_social_accounts_provider_user (provider, provider_user_id),
    KEY idx_social_accounts_user (user_id),
    CONSTRAINT fk_social_accounts_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;


-- 2-2. user_settings (사용자 설정 - 1:1 관계)
CREATE TABLE user_settings (
    user_id             BIGINT    NOT NULL,
    target_min_glucose  INT       NULL DEFAULT 70,
    target_max_glucose  INT       NULL DEFAULT 140,
    is_alarm_on         BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
-- 2-2-1. user_alert_settings (1:N)
CREATE TABLE user_alert_settings (
    alert_setting_id  BIGINT   NOT NULL AUTO_INCREMENT,
    user_id           BIGINT   NOT NULL,
    alert_type        ENUM('HIGH','LOW','VERY_LOW','URGENT_LOW','RAPID_RISE') NOT NULL,
    threshold_value   INT      NULL,
    rate_threshold    DOUBLE   NULL,
    interval_minutes  INT      NOT NULL DEFAULT 15,
    enabled           BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (alert_setting_id),
    UNIQUE KEY uk_user_alert_type (user_id, alert_type),
    CONSTRAINT fk_user_alert_settings_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-2-2. user_push_tokens (1:N)
CREATE TABLE user_push_tokens (
    token_id          BIGINT   NOT NULL AUTO_INCREMENT,
    user_id           BIGINT   NOT NULL,
    platform          ENUM('ANDROID','IOS','WEB') NOT NULL,
    token             VARCHAR(512) NOT NULL,
    enabled           BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at      TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uk_user_token (user_id, token),
    UNIQUE KEY uk_token (token),
    CONSTRAINT fk_user_push_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-2-3. user_notifications (1:N)
CREATE TABLE user_notifications (
    notification_id  BIGINT   NOT NULL AUTO_INCREMENT,
    user_id          BIGINT   NOT NULL,
    notification_type VARCHAR(50) NULL,
    title            VARCHAR(120) NOT NULL,
    body             TEXT NOT NULL,
    read_at          TIMESTAMP NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (notification_id),
    KEY idx_notifications_user_time (user_id, created_at),
    CONSTRAINT fk_user_notifications_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-3. oauth_tokens (OAuth 인증 토큰 관리)
CREATE TABLE oauth_tokens (
    token_id      BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       BIGINT       NOT NULL,
    provider      VARCHAR(50)  NOT NULL,
    access_token  VARCHAR(2048) NOT NULL,
    refresh_token VARCHAR(2048) NULL,
    token_type    VARCHAR(50)  NULL,
    scope         VARCHAR(255) NULL,
    expires_at    TIMESTAMP    NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uk_oauth_tokens_user_provider (user_id, provider),
    CONSTRAINT fk_oauth_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-4. sensors (센서 이력 관리)
CREATE TABLE sensors (
    sensor_id    BIGINT NOT NULL AUTO_INCREMENT,
    user_id      BIGINT NOT NULL,
    device_id    VARCHAR(100) NULL,
    provider     VARCHAR(50)  NULL,
    status       ENUM('ACTIVE','INACTIVE','EXPIRED','PENDING') NOT NULL DEFAULT 'INACTIVE',
    started_at   TIMESTAMP NULL,
    ended_at     TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sensor_id),
    KEY idx_sensors_user_status (user_id, status),
    CONSTRAINT fk_sensors_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- [제약사항] 유저당 ACTIVE 센서는 단 1개만 존재 가능 (MySQL 8.0 functional index)
CREATE UNIQUE INDEX uk_sensors_one_active_per_user
ON sensors ((CASE WHEN status = 'ACTIVE' THEN user_id ELSE NULL END));

-- 2-5. glucose_data (혈당 원본 데이터 - 메인화면 일일 그래프용)
CREATE TABLE glucose_data (
    glucose_id        BIGINT NOT NULL AUTO_INCREMENT,
    user_id           BIGINT NOT NULL,
    sensor_id         BIGINT NULL,
    value             INT    NOT NULL,
    trend             VARCHAR(20)  NULL COMMENT 'flat, singleUp, doubleUp etc',
    trend_rate        FLOAT        NULL COMMENT '분당 변화율',
    dexcom_record_id  VARCHAR(100) NULL, 
    source            ENUM('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
    measured_at       TIMESTAMP NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (glucose_id),
    UNIQUE KEY uk_user_glucose_dexcom (user_id, dexcom_record_id),
    KEY idx_glucose_user_time (user_id, measured_at),
    CONSTRAINT fk_glucose_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_glucose_sensor
        FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2-6. food_records (식사 기록)
CREATE TABLE food_records (
    food_id      BIGINT NOT NULL AUTO_INCREMENT,
    user_id      BIGINT NOT NULL,
    food_name    VARCHAR(100) NULL,
    carbs_grams  FLOAT NULL,
    weight_grams FLOAT NULL,
    serving_count FLOAT NULL,
    peak_glucose INT NULL,
    image_url    VARCHAR(500) NULL,
    memo         TEXT NULL,
    meal_type    ENUM('BREAKFAST','LUNCH','DINNER','SNACK') NULL,
    eaten_at     TIMESTAMP NULL,
    ai_guide     TEXT NULL,
    recorded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (food_id),
    KEY idx_food_user_time (user_id, recorded_at),
    CONSTRAINT fk_food_records_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-7. food_metadata (음식 영양성분 마스터 데이터)
CREATE TABLE food_metadata (
    food_code        BIGINT NOT NULL AUTO_INCREMENT,
    food_name        VARCHAR(100) NOT NULL,
    base_weight      FLOAT NULL,
    cal_per_base      FLOAT NULL,
    carbs_per_base    FLOAT NULL,
    sugars_per_base   FLOAT NULL,
    fat_per_base      FLOAT NULL,
    protein_per_base  FLOAT NULL,
    sodium_per_base   FLOAT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (food_code)
) ENGINE=InnoDB;

-- 2-8. food_analyses (AI 음식 분석 결과)
CREATE TABLE food_analyses (
    analysis_id      BIGINT NOT NULL AUTO_INCREMENT,
    food_id          BIGINT NOT NULL,
    food_code        BIGINT NULL,
    estimated_weight FLOAT NULL,
    ai_confidence    FLOAT NULL,
    ai_comment       TEXT NULL,
    model_name       VARCHAR(50) NULL,
    model_version    VARCHAR(50) NULL,
    analyzed_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    raw_result_json  JSON NULL,
    PRIMARY KEY (analysis_id),
    KEY idx_food_analyses_food (food_id),
    CONSTRAINT fk_food_analyses_food
        FOREIGN KEY (food_id) REFERENCES food_records (food_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_food_analyses_metadata
        FOREIGN KEY (food_code) REFERENCES food_metadata (food_code)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2-9. glucose_predictions (AI 혈당 예측 결과)
CREATE TABLE glucose_predictions (
    pred_id          BIGINT NOT NULL AUTO_INCREMENT,
    food_id          BIGINT NOT NULL,
    user_id          BIGINT NOT NULL,
    predicted_value  INT NULL,
    target_time      TIMESTAMP NOT NULL,
    model_name       VARCHAR(50) NULL,
    model_version    VARCHAR(50) NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pred_id),
    KEY idx_predictions_user_time (user_id, target_time),
    KEY idx_predictions_food (food_id),
    CONSTRAINT fk_predictions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_predictions_food
        FOREIGN KEY (food_id) REFERENCES food_records (food_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. Reports Tables (리포트/그래프용 통계 데이터)
-- ---------------------------------------------------------

-- 3-1. daily_reports (주간/월간 꺾은선 그래프의 기본 소스)
-- 3-1. daily_report (AI Daily Report)
CREATE TABLE daily_report (
    daily_report_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    sensor_id       BIGINT,
    target_date     DATE NOT NULL,
    summary_text    TEXT,
    health_score    INT,
    report_type     VARCHAR(20),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
) ENGINE=InnoDB;

-- 3-2. weekly_reports (주 단위 요약 리포트)
CREATE TABLE weekly_reports (
    report_id          BIGINT NOT NULL AUTO_INCREMENT,
    user_id            BIGINT NOT NULL,
    week_start_date    DATE   NOT NULL,
    record_count       INT    NULL,
    average_glucose    INT    NULL,
    max_glucose        INT    NULL,
    min_glucose        INT    NULL,
    standard_deviation FLOAT  NULL,
    very_low_percent   FLOAT  NULL,
    low_percent        FLOAT  NULL,
    in_range_percent   FLOAT  NULL,
    high_percent       FLOAT  NULL,
    very_high_percent  FLOAT  NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    UNIQUE KEY uk_weekly_reports (user_id, week_start_date),
    CONSTRAINT fk_weekly_reports_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3-3. monthly_reports (월 단위 요약 리포트)
CREATE TABLE monthly_reports (
    report_id          BIGINT NOT NULL AUTO_INCREMENT,
    user_id            BIGINT NOT NULL,
    year               INT    NOT NULL,
    month              INT    NOT NULL,
    record_count       INT    NULL,
    average_glucose    INT    NULL,
    max_glucose        INT    NULL,
    min_glucose        INT    NULL,
    standard_deviation FLOAT  NULL,
    very_low_percent   FLOAT  NULL,
    low_percent        FLOAT  NULL,
    in_range_percent   FLOAT  NULL,
    high_percent       FLOAT  NULL,
    very_high_percent  FLOAT  NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    UNIQUE KEY uk_monthly_reports_user_month (user_id, year, month),
    CONSTRAINT fk_monthly_reports_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3-4. meal_reactions (특정 식사 후 혈당 반응 분석)
CREATE TABLE meal_reactions (
    reaction_id    BIGINT NOT NULL AUTO_INCREMENT,
    user_id        BIGINT NOT NULL,
    food_id        BIGINT NOT NULL,
    baseline_time  TIMESTAMP NULL,
    peak_time      TIMESTAMP NULL,
    baseline_value INT NULL,
    peak_value     INT NULL,
    glucose_delta  INT NULL,
    reaction_score INT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (reaction_id),
    UNIQUE KEY uk_meal_reactions_food (food_id),
    CONSTRAINT fk_meal_reactions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_meal_reactions_food
        FOREIGN KEY (food_id) REFERENCES food_records (food_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;
