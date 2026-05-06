-- ============================================================
-- DNC Database Schema (DDL Only)
-- 포팅 매뉴얼용 - 개인정보(PII) 제거됨
-- Generated: 2026-05-06
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- -----------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `nickname` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `birth_date` date NOT NULL,
  `diabetes_type` enum('TYPE1','TYPE2','PREDIABETES','OTHER') DEFAULT NULL,
  `diagnosis_year` int DEFAULT NULL,
  `diagnosis_month` int DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `height_cm` decimal(5,2) DEFAULT NULL,
  `weight_kg` decimal(5,2) DEFAULT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `provider` varchar(20) NOT NULL DEFAULT 'local',
  `provider_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dexcom_user_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_provider` (`provider`,`provider_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 샘플 더미 데이터 (익명화)
INSERT INTO `users` (`email`, `password`, `nickname`, `name`, `birth_date`, `diabetes_type`, `diagnosis_year`, `diagnosis_month`, `gender`, `height_cm`, `weight_kg`, `provider`)
VALUES
  ('demo@example.com', '$2a$10$DUMMY_HASH_VALUE_FOR_DEMO_PURPOSES_ONLY', 'demoUser', '홍길동', '1990-01-01', 'TYPE2', 2025, 1, 'MALE', 175.00, 70.00, 'local');

-- -----------------------------------------------------------
-- 2. oauth_tokens
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_tokens` (
  `token_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` varchar(50) NOT NULL,
  `access_token` varchar(2048) NOT NULL,
  `refresh_token` varchar(2048) DEFAULT NULL,
  `token_type` varchar(50) DEFAULT NULL,
  `scope` varchar(255) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_oauth_tokens_user_provider` (`user_id`,`provider`),
  CONSTRAINT `fk_oauth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------
-- 3. social_accounts
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `social_accounts` (
  `social_account_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `provider` varchar(20) NOT NULL COMMENT 'google, kakao, naver, apple 등',
  `provider_user_id` varchar(255) NOT NULL COMMENT '소셜 서비스의 유저 고유 ID',
  `email` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`social_account_id`),
  UNIQUE KEY `uk_social_accounts_provider_user` (`provider`,`provider_user_id`),
  KEY `idx_social_accounts_user` (`user_id`),
  CONSTRAINT `fk_social_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------
-- 4. sensors
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sensors` (
  `sensor_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `dexcom_sensor_id` varchar(255) DEFAULT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `ended_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sensor_id`),
  KEY `fk_sensor_user` (`user_id`),
  CONSTRAINT `fk_sensor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------
-- 5. glucose_data
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `glucose_data` (
  `glucose_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `sensor_id` bigint DEFAULT NULL,
  `value` int NOT NULL,
  `trend` varchar(20) DEFAULT NULL COMMENT 'flat, singleUp, doubleUp etc',
  `trend_rate` float DEFAULT NULL COMMENT '분당 변화율',
  `dexcom_record_id` varchar(100) DEFAULT NULL,
  `source` enum('AUTO','MANUAL') NOT NULL DEFAULT 'AUTO',
  `measured_at` timestamp NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`glucose_id`),
  UNIQUE KEY `uk_user_glucose_dexcom` (`user_id`,`dexcom_record_id`),
  KEY `idx_glucose_user_time` (`user_id`,`measured_at`),
  KEY `fk_glucose_sensor` (`sensor_id`),
  CONSTRAINT `fk_glucose_sensor` FOREIGN KEY (`sensor_id`) REFERENCES `sensors` (`sensor_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_glucose_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------
-- 6. user_push_tokens
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_push_tokens` (
  `token_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `platform` enum('ANDROID','IOS','WEB') NOT NULL,
  `token` varchar(512) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `last_seen_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token_id`),
  UNIQUE KEY `uk_user_token` (`user_id`,`token`),
  UNIQUE KEY `uk_token` (`token`),
  CONSTRAINT `fk_user_push_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------
-- 참고: 나머지 테이블 (food_records, food_analyses, food_metadata,
--       meal_reactions, daily_report, weekly_reports, monthly_reports,
--       glucose_predictions, user_alert_settings, user_notifications,
--       user_settings) 도 동일한 패턴으로 DDL만 포함합니다.
--       실 데이터 INSERT는 포함하지 않습니다.
-- -----------------------------------------------------------
