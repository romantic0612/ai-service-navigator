USE `aibs`;

INSERT INTO `service_items` (
  `id`,
  `title`,
  `category`,
  `description`,
  `handler_count`,
  `target_roles`,
  `entry_url`,
  `department`,
  `contact_person`,
  `contact_phone`,
  `service_time`,
  `basis`,
  `materials`,
  `process_steps`,
  `notice`,
  `keywords`,
  `faq`,
  `status`,
  `source_url`,
  `last_verified_at`
) VALUES
(
  'genuine-software-service',
  '正版软件服务',
  '信息化服务',
  '学校正版化软件平台主要面向在校师生提供微软公司出品的正版 Windows 11/10/8.1/8 系列操作系统、Office 2024/2021/2019/2016 系列、Office for Mac 2024/2021/2019 标准版办公软件服务。',
  NULL,
  JSON_ARRAY('教职工', '本科生', '研究生'),
  'https://ms.ahau.edu.cn/',
  '数据管理处（信息化办公室）',
  '康老师',
  '0551-65786196',
  '工作日正常办公时间',
  '关于面向全校师生提供正版软件服务的通知',
  JSON_ARRAY('数智安农统一身份认证账号', '需要下载的 Windows 镜像或 Office 安装包', '激活客户端'),
  JSON_ARRAY('使用数智安农统一身份认证账号登录正版化软件平台', '下载 Windows 镜像或者 Office 安装包安装', '下载并安装激活客户端', '按照正版化平台使用操作流程完成激活或续约'),
  '在连接校园网的情况下，系统会自动每 7 天续约一次；在校外最长 180 天后需要连接校园网续约，教职工在校外可通过 VPN 续约。',
  JSON_ARRAY('正版软件', '软件正版化', 'Windows 下载', 'Office 下载', 'Office for Mac', '激活客户端', '软件激活', '正版化平台'),
  JSON_ARRAY(
    '激活时报错可先查看“软件正版化平台”左侧导航栏的报错内容和解决方法；仍无法解决时，建议下载对应软件重装。',
    '实施软件正版化不一定必须重装 Windows 或 Office；可先直接尝试激活，激活失败时再考虑下载官方版本重装。',
    '采购时随机附带正版 Windows 的计算机，在没有改变原厂系统的情况下可继续使用，无需再次正版化。',
    '下载 Windows 和 Office 前请确认当前系统是 32 位还是 64 位；32 位 Windows 只能安装 32 位 Office，64 位 Windows 可安装 32 位或 64 位 Office。',
    '连接校园网时系统自动续约失败，可能与网络故障、杀毒软件阻止等有关，可安装激活客户端手动续约。',
    '通过学校正版化服务平台下载安装的 Mac Office 免激活。'
  ),
  'ENABLED',
  'https://ms.ahau.edu.cn/',
  '2026-06-14 00:00:00.000'
),
(
  'campus-network-account-service',
  '校园网账号服务',
  '信息化服务',
  '师生在使用校园网账号进行上网认证登录时，如果发现账号停机或需要账号充值等情形，可通过线上流程自助办理。',
  NULL,
  JSON_ARRAY('教职工', '本科生', '研究生'),
  'https://ss.ahau.edu.cn/Self/dashboard',
  '数据管理处（信息化办公室）',
  '康琳琳',
  '0551-65786196',
  '任何时间',
  '关于印发《安徽农业大学网络服务收费办法》的通知（校财字[2021] 13号）',
  JSON_ARRAY('数智安农账号', '校园网账号相关信息', '充值金额或账号复通信息'),
  JSON_ARRAY('用户登录智慧安农', '账号复通可搜索点击“网络计费”图标，点击“服务”选项卡，单机“账号复通”功能，再点击“立即复通”', '账号充值可搜索点击“一卡通”图标，点击“网费转账”选项卡，填写缴费金额并提交'),
  '账号复通和账号充值均可通过线上流程自助办理。',
  JSON_ARRAY('校园网账号', '网络账号', '账号复通', '账号充值', '网费转账', '网络计费', '一卡通', '上网认证'),
  JSON_ARRAY(),
  'ENABLED',
  'https://ss.ahau.edu.cn/Self/dashboard',
  '2026-06-14 00:00:00.000'
)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `category` = VALUES(`category`),
  `description` = VALUES(`description`),
  `handler_count` = VALUES(`handler_count`),
  `target_roles` = VALUES(`target_roles`),
  `entry_url` = VALUES(`entry_url`),
  `department` = VALUES(`department`),
  `contact_person` = VALUES(`contact_person`),
  `contact_phone` = VALUES(`contact_phone`),
  `service_time` = VALUES(`service_time`),
  `basis` = VALUES(`basis`),
  `materials` = VALUES(`materials`),
  `process_steps` = VALUES(`process_steps`),
  `notice` = VALUES(`notice`),
  `keywords` = VALUES(`keywords`),
  `faq` = VALUES(`faq`),
  `status` = VALUES(`status`),
  `source_url` = VALUES(`source_url`),
  `last_verified_at` = VALUES(`last_verified_at`);

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
  'genuine-software-windows-download',
  'genuine-software-service',
  'image',
  'Windows 下载页面',
  '/service-assets/genuine-software-windows-download.png',
  '正版软件管理与服务平台 Windows 下载页面截图',
  1
),
(
  'genuine-software-office-download',
  'genuine-software-service',
  'image',
  'Office 下载页面',
  '/service-assets/genuine-software-office-download.png',
  '正版软件管理与服务平台 Office 下载页面截图',
  2
),
(
  'genuine-software-office-mac-download',
  'genuine-software-service',
  'image',
  'Office for Mac 下载页面',
  '/service-assets/genuine-software-office-mac-download.png',
  '正版软件管理与服务平台 Office for Mac 下载页面截图',
  3
),
(
  'genuine-software-login-header',
  'genuine-software-service',
  'image',
  '正版化平台登录后页面',
  '/service-assets/genuine-software-login-header.png',
  '正版软件管理与服务平台登录后页面截图',
  4
),
(
  'genuine-software-activation-client',
  'genuine-software-service',
  'image',
  '激活客户端下载说明',
  '/service-assets/genuine-software-activation-client.png',
  '激活客户端下载说明截图',
  5
),
(
  'genuine-software-operation-guide',
  'genuine-software-service',
  'link',
  '正版化平台使用操作流程 PDF',
  'https://i.ahau.edu.cn/ywtbapi/rhmhUpload/serviceAttachments/1e35ccd4b8af06a613ab38095d9d91c2e57a01db3b38dceabeccdeaec73e1e3d.pdf',
  '正版化平台使用操作流程 PDF',
  6
),
(
  'genuine-software-activation-faq',
  'genuine-software-service',
  'link',
  '激活 Windows 及 Office 系列产品常见问题',
  'https://xxb.ahau.edu.cn/info/1181/4701.htm',
  '激活 Windows 及 Office 系列产品常见问题',
  7
),
(
  'campus-network-account-service-flow',
  'campus-network-account-service',
  'image',
  '校园网账号服务办理流程',
  '/service-assets/campus-network-account-service-flow.png',
  '校园网账号复通和账号充值线上流程图',
  1
)
ON DUPLICATE KEY UPDATE
  `service_item_id` = VALUES(`service_item_id`),
  `asset_type` = VALUES(`asset_type`),
  `title` = VALUES(`title`),
  `url` = VALUES(`url`),
  `alt_text` = VALUES(`alt_text`),
  `sort_order` = VALUES(`sort_order`);
