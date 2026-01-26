-- =========================================================
-- DNK DB Schema (FINAL)
-- - MySQL 8.x recommended
-- - No health_events
-- - One ACTIVE sensor per user (functional unique index)
-- =========================================================

-- ---------------------------------------------------------
-- 0. Database
-- ---------------------------------------------------------
CREATE DATABASE IF NOT EXISTS dnc_db;
USE dnc_db;

-- ---------------------------------------------------------
-- 1. Drop tables (FK-safe order)
-- ---------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS meal_reactions;
DROP TABLE IF EXISTS weekly_reports;
DROP TABLE IF EXISTS glucose_predictions;
DROP TABLE IF EXISTS food_analyses;
DROP TABLE IF EXISTS food_metadata;
DROP TABLE IF EXISTS food_records;
DROP TABLE IF EXISTS glucose_data;
DROP TABLE IF EXISTS sensors;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS oauth_tokens;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------

-- 2-1. users
CREATE TABLE users (
    user_id            BIGINT       NOT NULL AUTO_INCREMENT,
    email              VARCHAR(255)  NOT NULL,
    password           VARCHAR(255)  NULL,
    nickname           VARCHAR(50)   NOT NULL,
    name               VARCHAR(100)  NOT NULL,
    birth_date         DATE          NOT NULL,
    diabetes_type      ENUM('TYPE1','TYPE2','PREDIABETES','OTHER') NULL,
    diagnosis_year     SMALLINT     NULL,
    diagnosis_month    TINYINT      NULL,
    gender             VARCHAR(20)   NULL,
    height_cm          DECIMAL(5,2)  NULL,
    weight_kg          DECIMAL(5,2)  NULL,
    profile_image_url  VARCHAR(500)  NULL,
    provider           VARCHAR(20)   NOT NULL DEFAULT 'local',
    provider_id        VARCHAR(255)  NULL,
    created_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_provider (provider, provider_id)
) ENGINE=InnoDB;

-- 2-2. user_settings (1:1)
CREATE TABLE user_settings (
    user_id             BIGINT   NOT NULL,
    target_min_glucose  INT      NULL DEFAULT 70,
    target_max_glucose  INT      NULL DEFAULT 140,
    is_alarm_on         BOOLEAN  NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_user_settings_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-2. oauth_tokens (1:N)
CREATE TABLE oauth_tokens (
    token_id      BIGINT      NOT NULL AUTO_INCREMENT,
    user_id       BIGINT      NOT NULL,
    provider      VARCHAR(50) NOT NULL,
    access_token  VARCHAR(2048) NOT NULL,
    refresh_token VARCHAR(2048) NULL,
    token_type    VARCHAR(50) NULL,
    scope         VARCHAR(255) NULL,
    expires_at    TIMESTAMP NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (token_id),
    UNIQUE KEY uk_oauth_tokens_user_provider (user_id, provider),
    CONSTRAINT fk_oauth_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-3. sensors (history table)
CREATE TABLE sensors (
    sensor_id    BIGINT NOT NULL AUTO_INCREMENT,
    user_id      BIGINT NOT NULL,
    device_id    VARCHAR(100) NULL,
    provider     VARCHAR(50)  NULL,
    status       ENUM('ACTIVE','INACTIVE','EXPIRED')
                 NOT NULL DEFAULT 'INACTIVE',
    started_at   TIMESTAMP NULL,
    ended_at     TIMESTAMP NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (sensor_id),
    KEY idx_sensors_user_status (user_id, status),
    CONSTRAINT fk_sensors_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 유저당 ACTIVE 센서 1개 제한 (MySQL 8+)
-- ※ MySQL 5.7 사용 시 이 줄은 주석 처리
CREATE UNIQUE INDEX uk_sensors_one_active_per_user
ON sensors ((CASE WHEN status = 'ACTIVE' THEN user_id ELSE NULL END));

-- 2-4. glucose_data
CREATE TABLE glucose_data (
    glucose_id        BIGINT NOT NULL AUTO_INCREMENT,
    user_id           BIGINT NOT NULL,
    sensor_id         BIGINT NULL,
    -- [기존] 값
    value             INT    NOT NULL,
    -- [추가됨 1] 알림용 추세 정보
    trend             VARCHAR(20) NULL COMMENT 'flat, singleUp, doubleUp etc',
    trend_rate        FLOAT       NULL COMMENT '분당 변화율',
    -- [추가됨 2] 중복 방지용 덱스콤 ID (유니크 인덱스 필수!)
    dexcom_record_id  VARCHAR(100) NULL, 
    source            ENUM('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
    measured_at       TIMESTAMP NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (glucose_id),
    -- [중요] 중복 데이터 방지 (같은 덱스콤 ID는 두 번 저장 안 됨)
    UNIQUE KEY uk_glucose_dexcom_id (dexcom_record_id),
    
    KEY idx_glucose_user_time (user_id, measured_at),
    
    CONSTRAINT fk_glucose_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_glucose_sensor
        FOREIGN KEY (sensor_id) REFERENCES sensors (sensor_id)
        ON DELETE SET NULL
) ENGINE=InnoDB;

-- 2-5. food_records
CREATE TABLE food_records (
    food_id      BIGINT NOT NULL AUTO_INCREMENT,
    user_id      BIGINT NOT NULL,
    image_url    VARCHAR(500) NULL,
    memo         TEXT NULL,
    meal_type    ENUM('BREAKFAST','LUNCH','DINNER','SNACK') NULL,
    eaten_at     TIMESTAMP NULL,
    recorded_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (food_id),
    KEY idx_food_user_time (user_id, recorded_at),
    CONSTRAINT fk_food_records_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-6. food_metadata
CREATE TABLE food_metadata (
    food_code        VARCHAR(20)  NOT NULL,
    food_name        VARCHAR(100) NOT NULL,
    base_weight      FLOAT NULL,
    cal_per_base     FLOAT NULL,
    carbs_per_base   FLOAT NULL,
    sugars_per_base  FLOAT NULL,
    fat_per_base     FLOAT NULL,
    protein_per_base FLOAT NULL,
    sodium_per_base  FLOAT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (food_code)
) ENGINE=InnoDB;

-- 2-7. food_analyses (AI 분석 결과)
CREATE TABLE food_analyses (
    analysis_id      BIGINT NOT NULL AUTO_INCREMENT,
    food_id          BIGINT NOT NULL,
    food_code        VARCHAR(20) NULL,
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

-- 2-8. glucose_predictions
CREATE TABLE glucose_predictions (
    pred_id          BIGINT NOT NULL AUTO_INCREMENT,
    user_id          BIGINT NOT NULL,
    predicted_value  INT NULL,
    target_time      TIMESTAMP NOT NULL,
    model_name       VARCHAR(50) NULL,
    model_version    VARCHAR(50) NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (pred_id),
    KEY idx_predictions_user_time (user_id, target_time),
    CONSTRAINT fk_predictions_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-9. weekly_reports
CREATE TABLE weekly_reports (
    report_id       BIGINT NOT NULL AUTO_INCREMENT,
    user_id         BIGINT NOT NULL,
    week_start_date DATE   NOT NULL,
    avg_glucose     FLOAT NULL,
    in_range_ratio  FLOAT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id),
    UNIQUE KEY uk_weekly_reports (user_id, week_start_date),
    CONSTRAINT fk_weekly_reports_user
        FOREIGN KEY (user_id) REFERENCES users (user_id)
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- 2-10. meal_reactions (식사 반응 학습)
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
