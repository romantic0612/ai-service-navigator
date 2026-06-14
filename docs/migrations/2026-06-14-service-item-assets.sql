USE `aibs`;

CREATE TABLE IF NOT EXISTS `service_item_assets` (
  `id` VARCHAR(191) NOT NULL,
  `service_item_id` VARCHAR(191) NOT NULL,
  `asset_type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NULL,
  `url` TEXT NOT NULL,
  `alt_text` VARCHAR(500) NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `service_item_assets_service_item_id_sort_order_idx` (`service_item_id`, `sort_order`),
  CONSTRAINT `service_item_assets_service_item_id_fkey`
    FOREIGN KEY (`service_item_id`) REFERENCES `service_items` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
