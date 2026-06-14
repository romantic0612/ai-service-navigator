# Dify Chatflow 接入约定

当前按 Dify Chat App / Chatflow 的接口接入：

```http
POST {DIFY_API_BASE_URL}/chat-messages
```

示例：

```bash
curl -X POST 'http://36.138.68.127:8001/v1/chat-messages' \
  --header 'Authorization: Bearer {api_key}' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "inputs": {
      "profile_summary": "{\"userId\":\"demo-user\",\"role\":\"本科生\",\"college\":\"人工智能学院\",\"tags\":[]}"
    },
    "query": "云盘怎么用",
    "response_mode": "streaming",
    "conversation_id": "",
    "user": "demo-user",
    "files": []
  }'
```

## 环境变量

```env
DIFY_API_BASE_URL="http://36.138.68.127:8001"
DIFY_INTENT_API_KEY="Dify Chat App API Key"
DIFY_APP_ID="可选，记录 Dify 应用 ID"
DIFY_TIMEOUT_MS=15000
```

如果暂时只填 `DIFY_API_KEY`，后端也会把它当作意图识别 Key 使用。

后端会自动把 `DIFY_API_BASE_URL` 规范成 `/v1` 接口地址，所以可以填：

```env
DIFY_API_BASE_URL="http://36.138.68.127:8001"
```

最终请求会发到：

```text
http://36.138.68.127:8001/v1/chat-messages
```

## Chatflow 怎么搭

建议先搭一个“只做意图识别”的 Chatflow，不让它直接回答学生，也不让它生成办理链接。

节点思路：

```text
开始节点
  输入：query
  输入：profile_summary
    ↓
LLM 节点：办事意图识别
    ↓
直接回复 JSON 文本
```

LLM 节点提示词建议：

```text
你是安徽农业大学 AI 办事助手的意图识别器。

你的任务不是回答用户问题，而是把用户问题转换成结构化 JSON，供后端检索数据库。

用户问题：
{{query}}

用户画像摘要：
{{profile_summary}}

只输出 JSON，不要输出 Markdown，不要解释，不要添加多余文字。

JSON 格式：
{
  "intent": "用户想办理或查询的事项名称，尽量短",
  "category": "可能分类，例如 信息化服务/校务服务/校园生活/档案服务/教务/后勤",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "confidence": 0.0,
  "profile_update_candidates": []
}

如果用户明确提到可长期用于推荐的偏好，例如考研、就业、竞赛、资助、图书馆、宿舍区，则把候选写入 profile_update_candidates。

profile_update_candidates 的格式：
{
  "key": "exam_plan 或 interest 或 dorm_area",
  "value": "考研/就业/竞赛/资助等",
  "confidence": 0.0,
  "sensitivity": "low 或 medium 或 high",
  "needConfirm": true,
  "reason": "为什么建议保存"
}

不要生成办理链接。
不要编造电话、部门、流程。
如果不确定，也要给出关键词，但 confidence 降低。
```

## Dify 返回要求

后端会使用 `response_mode=streaming` 调用 Dify，并从 SSE 事件里的 `answer` 片段拼接最终文本，再把它当 JSON 解析。

最终拼接出的 `answer` 必须是：

```json
{
  "intent": "云盘服务",
  "category": "信息化服务",
  "keywords": ["云盘", "文件存储", "数智安农"],
  "confidence": 0.92,
  "profile_update_candidates": []
}
```

即使 Dify 返回了 ```json 代码块，后端也会尝试自动剥离后解析，但最好让 Dify 只输出纯 JSON。

## 后端怎么用

后端会把：

```text
用户原始问题 + intent + category + keywords
```

拼成检索词，再查 MySQL 的 `service_items`。

最终办理链接、电话、部门、流程仍然只来自 MySQL，不来自 Dify。
