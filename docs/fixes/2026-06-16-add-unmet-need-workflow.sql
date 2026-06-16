USE `aibs`;

CREATE TABLE IF NOT EXISTS `unmet_need_reviews` (
  `need_key` VARCHAR(120) NOT NULL,
  `manual_priority` VARCHAR(20) NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  `admin_note` TEXT NULL,
  `resolved_title` VARCHAR(255) NULL,
  `resolved_message` TEXT NULL,
  `resolved_service_id` VARCHAR(191) NULL,
  `resolved_by` VARCHAR(191) NULL,
  `resolved_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`need_key`),
  KEY `unmet_need_reviews_status_idx` (`status`),
  KEY `unmet_need_reviews_manual_priority_idx` (`manual_priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_notifications` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `need_key` VARCHAR(120) NULL,
  `service_item_id` VARCHAR(191) NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `read_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_notifications_user_id_need_key_key` (`user_id`, `need_key`),
  KEY `user_notifications_user_id_status_created_at_idx` (`user_id`, `status`, `created_at`),
  KEY `user_notifications_need_key_idx` (`need_key`),
  CONSTRAINT `user_notifications_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user_profiles` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
