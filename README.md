# AI 办事导航

仓库名：`ai-service-navigator`

面向学生的 AI 办事导航与个性化服务推荐平台。

第一阶段目标不是“自动代办”，而是通过 AI 对话帮助学生找到可靠入口、看懂办理流程，并基于 OAuth 画像和用户确认记忆做个性化推荐。

## 当前技术栈

- 后端 API：NestJS
- 数据库：MySQL，使用 Prisma 管理数据模型
- 缓存：Redis，预留给会话缓存和推荐缓存
- AI 工作流：Dify，后续接入
- 手机端：uni-app + Vue 3，后续接入

## 部署目标

正式部署域名：

```text
https://xgaigc.ahau.edu.cn
```

学校 OAuth 对 IP 和域名有白名单要求，因此真实登录需要在服务器上测试。本地开发阶段先使用 mock 用户。

当前服务器 IP：

```text
210.45.177.21
```

数据库默认：

```text
MYSQL_DATABASE=ai_service_navigator
MYSQL_USER=navigator
```

## 启动后端

```bash
npm install
npm run build:api
npm run dev:api
```

如果要连接真实 MySQL 或 Dify，请先复制环境变量文件：

```bash
copy apps\api\.env.example apps\api\.env
```

然后修改 `apps/api/.env` 中的数据库地址和 Dify 配置。

## 第一版接口

### AI 办事助手

```http
POST /assistant/message
Content-Type: application/json
```

请求示例：

```json
{
  "userId": "demo-user",
  "message": "我准备考研，想打印成绩单"
}
```

返回内容包括：

- `message`：AI 对话回复
- `serviceCards`：可靠的办事事项卡片
- `profileUpdateCandidates`：可保存的画像记忆候选，需要用户确认后再保存

### 搜索办事事项

```http
GET /service-items/search?q=成绩单
```

### 获取用户画像摘要

```http
GET /profiles/demo-user/summary
```

### 获取统一认证登录地址

```http
GET /auth/oauth/login-url
```

### 健康检查

```http
GET /health
```

### 统一认证回调占位

```http
GET /callback?code=xxx&state=xxx
```

当前先接住学校回调。确认 CAS OAuth2 的 token 地址和用户信息接口后，会在这里完成换 token、拉取用户信息、写入数据库。

现在已按学校 CAS OAuth2 文档实现：

```text
code -> accessToken -> profile -> 标准化用户画像
```

MySQL 接通后，会把标准化用户画像写入 `user_profiles`。

## 产品原则

1. OAuth 负责告诉系统“学生是谁”。
2. 办事事项库负责提供可靠入口和办理流程。
3. AI 负责理解学生当前想办什么。
4. 用户确认决定哪些长期记忆可以保存。
5. 最终办理链接必须来自数据库，不能由大模型临时生成。

## 当前进度

- 已搭建 NestJS 后端骨架
- 已设计 OAuth 画像、用户偏好、用户记忆、办事事项、推荐规则等数据模型
- 已实现 mock 版 AI 办事接口
- 已记录安徽农业大学 OAuth 返回字段样例
- 已加入第一条真实办事事项：书记校长信箱
- 已验证 `npm run build:api` 可以通过
- 已用 `http://localhost:3100/assistant/message` 跑通一次办事卡片返回

## 下一步

1. 接入真实 MySQL，把 mock 办事事项替换成数据库数据。
2. 支持从 Excel / CSV / 飞书表格导入第一批事项。
3. 接入 Dify 工作流做意图识别和画像候选提取。
4. 开始做手机端 AI 对话首页。
