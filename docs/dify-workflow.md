# Dify 工作流接入约定

第一阶段只接一个 Dify Workflow：办事意图识别。

## 环境变量

```env
DIFY_API_BASE_URL="https://api.dify.ai/v1"
DIFY_INTENT_API_KEY="Dify Workflow API Key"
```

如果暂时只填 `DIFY_API_KEY`，后端也会把它当作意图识别 Key 使用。

## 后端传给 Dify 的输入

```json
{
  "query": "用户原始问题",
  "profile_summary": "{\"userId\":\"demo-user\",\"role\":\"本科生\",\"college\":\"人工智能学院\",\"tags\":[]}"
}
```

`profile_summary` 是 JSON 字符串。不要传手机号、邮箱、生日、完整 OAuth 原始数据。

## Dify 建议输出

Workflow 的最终输出变量建议为：

```json
{
  "intent": "云盘服务",
  "category": "信息化服务",
  "keywords": ["云盘", "文件存储", "数智安农"],
  "confidence": 0.92,
  "profile_update_candidates": [
    {
      "key": "interest",
      "value": "考研",
      "confidence": 0.86,
      "sensitivity": "medium",
      "needConfirm": true,
      "reason": "用户提到正在准备考研，可用于后续推荐成绩单、档案、复试材料等事项。"
    }
  ]
}
```

后端会用 `intent/category/keywords` 拼成检索词，再从数据库查事项。最终办理链接仍然只来自 MySQL，不来自 Dify。

## Dify 负责什么

- 理解用户自然语言
- 输出标准意图和关键词
- 提取可保存画像候选

## Dify 不负责什么

- 不直接生成办理链接
- 不作为权威数据源
- 不保存用户敏感信息
