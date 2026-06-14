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
API/H5/OAuth 入口：210.45.177.21
MySQL：114.213.146.102
Dify：36.136.68.127
```

数据库默认：

```text
MYSQL_DATABASE=aibs
MYSQL_USER=navigator
```

数据库建表 SQL：

```text
docs/mysql-schema.sql
```

真实办事事项种子数据：

```text
docs/seed-service-items.sql
```

## 启动后端

当前是在你电脑本地开发，不是在服务器上执行。

```bash
npm install
npm run prisma:generate
npm run build:api
npm run dev:api
```

如果要连接真实 MySQL 或 Dify，请先复制环境变量文件：

```bash
copy apps\api\.env.example apps\api\.env
```

然后修改 `apps/api/.env` 中的数据库地址和 Dify 配置。

## 启动 H5

先启动后端 API，再启动 H5：

```bash
npm run dev:api
npm run dev:web
```

本地访问：

```text
http://localhost:5173
```

H5 开发环境默认请求：

```text
http://localhost:3100
```

生产环境默认使用同域名请求后端，可通过 `VITE_API_BASE_URL` 覆盖。

## 初始化数据库

如果只想先跑接口 demo，可以暂时不启动 MySQL，接口会使用内置 mock 数据兜底。

如果要在你电脑本地启动 MySQL：

```bash
copy .env.example .env
docker compose up -d mysql redis
```

然后执行：

```bash
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate -- --name init
npm --workspace apps/api run db:seed
```

服务器生产环境以后再使用：

```bash
npm --workspace apps/api run prisma:deploy
npm --workspace apps/api run db:seed
```

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

### 保存用户确认的画像记忆

```http
POST /profiles/demo-user/memories
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
- 已搭建 Vue3 + Vite + Vant H5 手机端首页
- 已设计 OAuth 画像、用户偏好、用户记忆、办事事项、推荐规则等数据模型
- 已实现 AI 办事接口，支持 Dify 意图识别配置；未配置 Dify 时使用本地检索兜底
- 已实现用户确认画像记忆保存接口
- 已记录安徽农业大学 OAuth 返回字段样例
- 已加入第一条真实办事事项：书记校长信箱
- 已验证 `npm run build:api` 可以通过
- 已用 `http://localhost:3100/assistant/message` 跑通一次办事卡片返回

## 下一步

1. 启动 MySQL 并执行 Prisma 迁移和 seed。
2. 在 Dify 建办事意图识别 Workflow，并配置 `DIFY_INTENT_API_KEY`。
3. 支持从 Excel / CSV / 飞书表格导入第一批事项。
4. 接真实 OAuth 后在服务器联调登录闭环。
