-- 保存每一轮 AI 办事问答：用户问了什么、系统答了什么、返回了哪些事项卡片。

CREATE TABLE IF NOT EXISTS `assistant_turns` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `query_text` TEXT NOT NULL,
  `response_text` TEXT NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `matched_service_ids` JSON NULL,
  `service_cards` JSON NULL,
  `used_dify` BOOLEAN NOT NULL DEFAULT FALSE,
  `intent` VARCHAR(191) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `assistant_turns_user_id_created_at_idx` (`user_id`, `created_at`),
  KEY `assistant_turns_action_created_at_idx` (`action`, `created_at`),
  CONSTRAINT `assistant_turns_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `user_profiles` (`user_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 查看最近问答明细。
SELECT
  t.created_at,
  p.name,
  p.role,
  t.query_text,
  t.response_text,
  t.action,
  JSON_LENGTH(t.matched_service_ids) AS matched_count
FROM assistant_turns t
LEFT JOIN user_profiles p ON p.user_id = t.user_id
ORDER BY t.created_at DESC
LIMIT 50;
