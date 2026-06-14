USE `aibs`;

INSERT INTO `service_item_assets` (
  `id`,
  `service_item_id`,
  `asset_type`,
  `title`,
  `url`,
  `alt_text`,
  `sort_order`
) VALUES
(
  'online-interview-booth-qrcode',
  'online-interview-booth-reservation',
  'qrcode',
  '预约智慧面试间微信小程序二维码',
  '/service-assets/online-interview-booth-qrcode.png',
  '预约智慧面试间微信小程序二维码和使用流程说明',
  1
)
ON DUPLICATE KEY UPDATE
  `service_item_id` = VALUES(`service_item_id`),
  `asset_type` = VALUES(`asset_type`),
  `title` = VALUES(`title`),
  `url` = VALUES(`url`),
  `alt_text` = VALUES(`alt_text`),
  `sort_order` = VALUES(`sort_order`);
