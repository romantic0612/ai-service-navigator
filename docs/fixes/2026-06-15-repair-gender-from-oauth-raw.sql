-- 以统一身份认证返回的 oauth_raw.Gender 为准，修复 user_profiles.gender 历史错值。
-- 适用场景：oauth_raw 里的 Gender 是对的，但 gender 字段显示相反或不一致。

UPDATE user_profiles
SET gender = CASE
  WHEN JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender')) = '男' THEN '男'
  WHEN JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender')) = '女' THEN '女'
  WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender'))) = 'male' THEN '男'
  WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender'))) = 'female' THEN '女'
  WHEN JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender')) = '1' THEN '男'
  WHEN JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender')) = '2' THEN '女'
  ELSE gender
END
WHERE oauth_raw IS NOT NULL
  AND JSON_EXTRACT(oauth_raw, '$.Gender') IS NOT NULL;

SELECT
  user_id,
  name,
  JSON_UNQUOTE(JSON_EXTRACT(oauth_raw, '$.Gender')) AS oauth_gender,
  gender
FROM user_profiles
WHERE oauth_raw IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;
