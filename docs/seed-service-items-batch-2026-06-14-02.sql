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
  'vpn-service',
  '虚拟专用网络（VPN）服务',
  '信息化服务',
  'VPN 用于实现用户在单位网络外部安全访问单位内部网络资源。通过该服务，我校师生及相关人员可以在校外访问校园网内部网络资源，包括各类图书馆数据库资源。',
  NULL,
  JSON_ARRAY('教职工', '本科生', '研究生'),
  'https://myvpn.ahau.edu.cn/enlink/#/client/app',
  '-',
  '刘老师（网络中心）',
  '0551-65786196',
  '工作日正常办公时间',
  '-',
  JSON_ARRAY('已激活的数智安农账号', '单位部门运维账号按需申请'),
  JSON_ARRAY(
    '师生（含学生校友）在数智安农账号激活时自动开通 VPN 账号',
    '数智安农已集成 WEBVPN，校外通过电脑版网页或移动端浏览器访问学校网站/数智安农并登录后即可访问校内资源',
    '移动端 APP、微信端、企业微信端已自动集成 VPN 组件，移动端访问数智安农时无需关注 VPN 具体用法',
    '单位部门运维账号由各部门根据工作需要在“安心办-部门运维账号申请”中按需申请',
    '各单位信息管理员或公司运维人员可用学校分配的运维账号登录 VPN 客户端，访问经授权的服务器、信息系统管理后台、数据库后台'
  ),
  '普通师生访问校内资源优先使用数智安农 WEBVPN；运维账号操作过程全程记录审计。',
  JSON_ARRAY('VPN', '虚拟专用网络', 'WEBVPN', '校外访问', '图书馆数据库', '数据库资源', '客户端下载', '数智安农', '网络中心'),
  JSON_ARRAY(
    JSON_OBJECT('question', '普通学生需要单独申请 VPN 吗？', 'answer', '一般不需要。数智安农账号激活时自动开通，且数智安农已集成 WEBVPN。'),
    JSON_OBJECT('question', '在哪里下载 VPN 客户端？', 'answer', '可通过相关链接中的“VPN客户端下载”进入下载页面。')
  ),
  'ENABLED',
  'https://myvpn.ahau.edu.cn/enlink/#/client/app',
  '2026-06-14 00:00:00.000'
),
(
  'electronic-signature-seal-service',
  '电子签章服务',
  '信息化服务',
  '面向校务服务流转使用的电子文档，提供在线签名和电子公章服务。',
  NULL,
  JSON_ARRAY('教职工', '本科生', '研究生'),
  'https://my.ahau.edu.cn/default/base/workflow/start.jsp?process=com.sudytech.work.xsyydjfw.xsyydjfw',
  '数据管理处（信息化办公室）',
  '教职工（签名人）、业务部门（盖章部门）',
  '-',
  '工作日正常办公时间',
  '关于印发《安徽农业大学电子印章管理办法（试行）》的通知',
  JSON_ARRAY('需要申请签章的电子文档，支持 WORD、PDF、JPG 上传'),
  JSON_ARRAY(
    '只选择“签名”：申请-签名受理人-结束',
    '本科生只选择“盖章”：申请-辅导员预审-所在单位领导审核-二级单位审核-二级单位领导审核-经办人盖章-结束',
    '研究生只选择“盖章”：申请-导师预审-所在单位领导审核-二级单位审核-二级单位领导审核-经办人盖章-结束',
    '教职工只选择“盖章”：申请-所在单位领导审核-二级单位审核-二级单位领导审核-经办人盖章-结束',
    '签字+盖章流程（含校领导签字）：按照当前纸质文件二级部门签字盖章完成后，由校领导签字的流程建立相应电子签章流程'
  ),
  '电子签章服务试运行范围以系统内提示和业务部门要求为准。',
  JSON_ARRAY('电子签章', '电子签名', '电子公章', '盖章', '签名', '用印', '签字盖章', 'WORD', 'PDF', 'JPG'),
  JSON_ARRAY(
    JSON_OBJECT('question', '可以上传哪些格式？', 'answer', '支持 WORD、PDF、JPG 上传。'),
    JSON_OBJECT('question', '本科生盖章需要经过哪些审核？', 'answer', '申请后需经辅导员预审、所在单位领导审核、二级单位审核、二级单位领导审核，再由经办人盖章。')
  ),
  'ENABLED',
  'https://my.ahau.edu.cn/default/base/workflow/start.jsp?process=com.sudytech.work.xsyydjfw.xsyydjfw',
  '2026-06-14 00:00:00.000'
),
(
  'introduced-talent-onboarding-info-supplement',
  '引进人才入职信息补录',
  '人事服务',
  '主要面向通过高层次人才引进入职的教职工，提供人事系统相关信息数据补录。',
  NULL,
  JSON_ARRAY('教职工', '本科生', '研究生', '校友', '访客(社会人员)'),
  'https://zp.ahau.edu.cn/w_selfservice/module/system/qrcard/mobilewrite/qrcardmain.jsp?qrid=1&dc=1741151826885',
  '党委教师工作部、人事处、人才办',
  '牛老师',
  '0551-65786065',
  '任何时间',
  '-',
  JSON_ARRAY('按页面要求补充的人事系统相关信息'),
  JSON_ARRAY('进入引进人才入职信息补录页面', '按页面提示填写或补充相关信息', '提交后等待相关部门处理'),
  '若有疑问，请联系牛老师：0551-65786065。',
  JSON_ARRAY('引进人才', '人才入职', '入职信息', '信息补录', '人事处', '人才办', '高层次人才'),
  JSON_ARRAY(),
  'ENABLED',
  'https://zp.ahau.edu.cn/w_selfservice/module/system/qrcard/mobilewrite/qrcardmain.jsp?qrid=1&dc=1741151826885',
  '2026-06-14 00:00:00.000'
),
(
  'student-leaving-campus-one-stop',
  '学生离校一件事',
  '毕业离校',
  '面向本科生和研究生，集中整合毕业离校可能需要办理或关注的事项提醒，包括组织关系转接、图书归还、水电网费退费、学费欠费清缴、一卡通余额与捐赠、车牌和户口迁移、毕业生快递、档案状态、退宿、研究生论文提交等。',
  NULL,
  JSON_ARRAY('本科生', '研究生'),
  'https://my.ahau.edu.cn/default/work/ahau/xslxxsfw/xslxxsfwLogin.jsp',
  '党委学生工作部、党委武装部、学生处（学生资管中心、大学生就业指导中心）',
  '本科生院、研究生院、各学院相关老师',
  '各单位部门电话',
  '即时办理',
  '-',
  JSON_ARRAY('校园统一身份认证账号', '毕业离校相关个人信息'),
  JSON_ARRAY(
    '进入学生离校一件事服务',
    '查看党/团组织关系转接提醒',
    '查看图书借阅实时数据并按需归还图书',
    '查看水电网费统一或零星退费方法',
    '查看学费欠费清缴提醒',
    '查看一卡通余额及状态，可按需使用余额捐赠功能',
    '查看电动自行车校园车牌、户口迁移办理事项',
    '查看毕业生快递服务、档案状态及转寄情况',
    '研究生可通过快捷入口提交毕业论文相关材料'
  ),
  '离校事项涉及多个部门，具体状态和办理要求以系统实时展示及各单位通知为准。',
  JSON_ARRAY('离校', '毕业离校', '离校一件事', '毕业生', '档案转寄', '图书归还', '一卡通余额', '退宿', '论文提交', '组织关系转接'),
  JSON_ARRAY(
    JSON_OBJECT('question', '这个服务适合谁？', 'answer', '主要面向本科生和研究生毕业离校使用。'),
    JSON_OBJECT('question', '能看到哪些离校事项？', 'answer', '可查看组织关系、图书借阅、退费、欠费、一卡通、档案、退宿、论文提交等离校相关提醒或入口。')
  ),
  'ENABLED',
  'https://my.ahau.edu.cn/default/work/ahau/xslxxsfw/xslxxsfwLogin.jsp',
  '2026-06-14 00:00:00.000'
),
(
  'library-digital-resources-access',
  '图书数字资源访问',
  '图书馆服务',
  '图书馆为师生校友提供图书数字资源访问服务。通过图书馆网站、数智安农、数据库导航或博采图书电子资源等入口，可访问中外文数据库资源。',
  NULL,
  JSON_ARRAY('研究生校友', '本科生校友', '教职工校友', '教职工', '本科生', '研究生'),
  'https://lib.ahau.edu.cn/',
  '图书馆、档案馆',
  '龚老师',
  '0551-65786335',
  '任何时间',
  '-',
  JSON_ARRAY('校园统一身份认证账号', '校友或师生身份信息'),
  JSON_ARRAY(
    '方式一：从学校主页右上角“电子资源”进入，依次点击图书馆网站-资源获取-数据库导航',
    '方式二：从学校主页“院系部门”进入，依次点击公共服务-图书馆、档案馆-图书馆-资源获取-数据库导航',
    '方式三：从学校主页右上角“数智安农”登录后，在底部找到“图书资源”-资源获取-数据库导航',
    '方式四：从学校主页右上角“数智安农”登录后，查找博采图书电子资源或通过相关链接直接访问',
    '通过方式一或方式二访问图书馆网站，可实现图书馆网站全站 VPN 代理',
    '校外用户访问中外文数据库资源时，系统会弹出数智安农登录界面并启动 WEBVPN'
  ),
  '通过方式一/二访问数据库资源网站时，浏览器地址栏网址中须始终含有“myvpn”文字；若关闭浏览器，需要重新按步骤操作才可再次访问数据库资源。',
  JSON_ARRAY('图书数字资源', '电子资源', '数据库导航', '图书馆数据库', 'WEBVPN', 'myvpn', '博采图书', '中外文数据库', '校外访问'),
  JSON_ARRAY(
    JSON_OBJECT('question', '校外能访问数据库资源吗？', 'answer', '可以。通过图书馆网站或数智安农访问时，系统会根据环境启动 WEBVPN。'),
    JSON_OBJECT('question', '访问时要注意什么？', 'answer', '通过图书馆网站访问时，浏览器地址栏网址中应始终含有“myvpn”文字。')
  ),
  'ENABLED',
  'https://lib.ahau.edu.cn/',
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
  'vpn-usage-guide',
  'vpn-service',
  'link',
  '使用 VPN 访问校内资源说明',
  'https://xxb.ahau.edu.cn/info/1181/4881.htm',
  '使用 VPN 访问校内资源说明',
  1
),
(
  'vpn-client-download',
  'vpn-service',
  'link',
  'VPN 客户端下载',
  'https://myvpn.ahau.edu.cn/enlink/static/download/index.html',
  'VPN 客户端下载页面',
  2
),
(
  'digital-resources-metaauth',
  'library-digital-resources-access',
  'link',
  '博采图书电子资源',
  'https://www.metaauth.com/370600/login.html?service=https%3A%2F%2Fahau.metaersp.com%2FpersonalIndex',
  '博采图书电子资源访问入口',
  1
),
(
  'digital-resources-school-home',
  'library-digital-resources-access',
  'link',
  '安徽农业大学主页',
  'https://www.ahau.edu.cn/',
  '安徽农业大学主页，可进入电子资源和数智安农',
  2
)
ON DUPLICATE KEY UPDATE
  `service_item_id` = VALUES(`service_item_id`),
  `asset_type` = VALUES(`asset_type`),
  `title` = VALUES(`title`),
  `url` = VALUES(`url`),
  `alt_text` = VALUES(`alt_text`),
  `sort_order` = VALUES(`sort_order`);
