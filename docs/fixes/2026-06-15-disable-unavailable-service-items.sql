USE `aibs`;

-- 这些事项当前存在学生端/教师端不可访问、权限异常或入口暂不可用的问题。
-- 先从 AI 办事导航中下线展示，不删除数据；后续学校修复入口后再改回 ENABLED。
UPDATE `service_items`
SET
  `status` = 'DISABLED',
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `title` IN (
  '引进人才入职信息补录',
  '党员政治生日短信服务',
  '网络账号充值',
  '学生迎新一件事',
  '本科生假期去向登记',
  '临时困难补助申请',
  '资产建账',
  '统一预约一类事',
  '校内勤工助学工资报送',
  '教职工校外兼职创新创业申请',
  '信息系统备案',
  '校内勤工助学岗位申报',
  '短信平台管理员申请',
  '特殊网络账号申请',
  '服务器托管服务'
);

-- 如果后续确认某个事项恢复可用，可单独执行类似语句：
-- UPDATE `service_items` SET `status` = 'ENABLED', `updated_at` = CURRENT_TIMESTAMP(3) WHERE `title` = '事项名称';
