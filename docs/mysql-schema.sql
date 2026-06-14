CREATE DATABASE IF NOT EXISTS `aibs`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'navigator'@'%' IDENTIFIED BY 'CHANGE_ME_STRONG_PASSWORD';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON `aibs`.* TO 'navigator'@'%';
FLUSH PRIVILEGES;

USE `aibs`;

CREATE TABLE IF NOT EXISTS `user_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `gender` VARCHAR(191) NULL,
  `role` VARCHAR(191) NULL,
  `group_name` VARCHAR(191) NULL,
  `college` VARCHAR(191) NULL,
  `major` VARCHAR(191) NULL,
  `grade` VARCHAR(191) NULL,
  `campus` VARCHAR(191) NULL,
  `class_name` VARCHAR(191) NULL,
  `birth_date` DATETIME(3) NULL,
  `student_status` VARCHAR(191) NULL,
  `oauth_raw` JSON NULL,
  `source` VARCHAR(191) NOT NULL DEFAULT 'oauth',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_profiles_user_id_key` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_preference_profiles` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `dorm_area` VARCHAR(191) NULL,
  `interests` JSON NULL,
  `exam_plan` JSON NULL,
  `employment_status` VARCHAR(191) NULL,
  `financial_aid_need` BOOLEAN NULL,
  `library_usage` BOOLEAN NULL,
  `custom_tags` JSON NULL,
  `updated_by` VARCHAR(191) NOT NULL DEFAULT 'user',
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_preference_profiles_user_id_key` (`user_id`),
  CONSTRAINT `user_preference_profiles_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user_profiles` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_memories` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `memory_type` VARCHAR(191) NOT NULL,
  `memory_key` VARCHAR(191) NOT NULL,
  `memory_value` VARCHAR(191) NOT NULL,
  `confidence` DOUBLE NOT NULL DEFAULT 1,
  `source` ENUM('OAUTH', 'USER_CONFIRMED', 'INFERRED_FROM_CHAT', 'BEHAVIOR') NOT NULL,
  `sensitivity` ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'LOW',
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_memories_user_id_memory_key_memory_value_key` (`user_id`, `memory_key`, `memory_value`),
  KEY `user_memories_user_id_memory_type_idx` (`user_id`, `memory_type`),
  KEY `user_memories_user_id_memory_key_idx` (`user_id`, `memory_key`),
  CONSTRAINT `user_memories_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user_profiles` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `service_items` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `category` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `handler_count` INT NULL,
  `target_roles` JSON NULL,
  `target_grades` JSON NULL,
  `target_colleges` JSON NULL,
  `target_campuses` JSON NULL,
  `entry_url` TEXT NOT NULL,
  `department` VARCHAR(191) NULL,
  `contact_person` VARCHAR(191) NULL,
  `contact_phone` VARCHAR(191) NULL,
  `service_time` VARCHAR(191) NULL,
  `basis` TEXT NULL,
  `materials` JSON NULL,
  `process_steps` JSON NULL,
  `notice` TEXT NULL,
  `keywords` JSON NULL,
  `faq` JSON NULL,
  `status` ENUM('DRAFT', 'ENABLED', 'DISABLED') NOT NULL DEFAULT 'DRAFT',
  `source_url` TEXT NULL,
  `last_verified_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `service_items_category_idx` (`category`),
  KEY `service_items_status_idx` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_events` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `event_type` VARCHAR(191) NOT NULL,
  `service_item_id` VARCHAR(191) NULL,
  `query_text` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_events_user_id_event_type_idx` (`user_id`, `event_type`),
  KEY `user_events_service_item_id_idx` (`service_item_id`),
  CONSTRAINT `user_events_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user_profiles` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `user_events_service_item_id_fkey`
    FOREIGN KEY (`service_item_id`) REFERENCES `service_items` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recommend_rules` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `conditions` JSON NOT NULL,
  `service_item_ids` JSON NOT NULL,
  `priority` INT NOT NULL DEFAULT 0,
  `start_time` DATETIME(3) NULL,
  `end_time` DATETIME(3) NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `recommend_rules_enabled_priority_idx` (`enabled`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
