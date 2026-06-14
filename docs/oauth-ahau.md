# 安徽农业大学 OAuth 接入记录

## 当前部署域名

正式接入学校统一认证时使用：

```text
https://xgaigc.ahau.edu.cn
```

学校 OAuth 对访问 IP 和域名有白名单要求，因此真实登录链路需要在服务器上测试。本地开发阶段使用 mock 用户。

## 环境变量

真实值只放服务器或本机的 `apps/api/.env`，不要提交到 GitHub。

```env
OAUTH_AUTH_SERVER="https://ids.ahau.edu.cn/cas/oauth2.0"
OAUTH_CLIENT_ID="..."
OAUTH_CLIENT_SECRET="..."
OAUTH_REDIRECT_URI="https://xgaigc.ahau.edu.cn/callback"
OAUTH_SCOPE="cas_get_userInfo"
```

移动端或前端可以通过后端接口获取登录地址：

```http
GET /auth/oauth/login-url
```

接口返回：

```json
{
  "loginUrl": "https://ids.ahau.edu.cn/cas/oauth2.0/authorize?...",
  "state": "server-generated-state"
}
```

后端会短期保存 `state`。统一认证回调到 `/callback` 时，后端会校验 `state`，防止 CSRF。

## CAS OAuth2 三步流程

### 1. 获取 Authorization Code

```http
GET {OAUTH_AUTH_SERVER}/authorize
```

参数：

- `response_type=code`
- `client_id={OAUTH_CLIENT_ID}`
- `redirect_uri={OAUTH_REDIRECT_URI}`
- `state={服务端生成的 state}`
- `scope={OAUTH_SCOPE}`

成功后统一认证会回调：

```text
https://xgaigc.ahau.edu.cn/callback?code=xxx&state=xxx&scope=cas_get_userInfo
```

文档说明 `code` 约 100 秒内有效。

### 2. 用 Authorization Code 换 Access Token

```http
GET {OAUTH_AUTH_SERVER}/accessToken
```

参数：

- `code`
- `client_id`
- `client_secret`
- `grant_type=authorization_code`
- `redirect_uri`

返回示例：

```json
{
  "access_token": "...",
  "expires_in": 2591966
}
```

### 3. 获取人员信息

```http
GET {OAUTH_AUTH_SERVER}/profile?access_token=xxx
```

返回示例：

```json
{
  "id": "admin",
  "attributes": [
    { "Name": "系统管理员" },
    { "Email": "" }
  ]
}
```

## 学生信息返回样例

```json
{
  "id": "24112339",
  "attributes": [
    { "GroupName": "本科生,数据管理处-数据中心" },
    { "Email": "411548704@qq.com" },
    { "Speciality": "计算机科学与技术" },
    { "OrgName": "人工智能学院" },
    { "Gender": "女" },
    { "NickName": "" },
    { "Name": "方文韬" },
    { "ContactTel": "" },
    { "Phone": "17730236678" },
    { "Field6": "201" },
    { "PolityFace": "群众" },
    { "Field7": "2" },
    { "Clazz": "24223801" },
    { "BirthDate": "2006-06-12" }
  ]
}
```

注意：当前观察到 `Gender` 可能存在反向或异常，需要以后用多名测试账号核验后再用于展示或推荐。
当前后端已按已知情况做反向修正：统一认证返回 `男` 时存 `女`，返回 `女` 时存 `男`。

## 字段映射建议

| OAuth 字段 | 数据库字段 | 说明 |
| --- | --- | --- |
| `id` | `userId` | 学号或统一身份 ID |
| `Name` | `name` | 姓名 |
| `Email` | `email` | 邮箱，不传给 Dify |
| `Phone` | `phone` | 手机号，不传给 Dify |
| `Gender` | `gender` | 暂存，不作为强规则使用 |
| `GroupName` | `groupName` / `role` | 可解析出本科生、研究生、教职工等身份 |
| `Speciality` | `major` | 专业 |
| `OrgName` | `college` | 学院或组织 |
| `Clazz` | `className` | 班级 |
| `BirthDate` | `birthDate` | 出生日期，不传给 Dify |
| `Field6` | `oauthRaw` | 含义待确认 |
| `Field7` | `oauthRaw` | 含义待确认 |
| `PolityFace` | `oauthRaw` | 政治面貌，默认不用于推荐 |

## 传给 Dify 的安全画像摘要

Dify 只需要最小必要信息：

```json
{
  "userId": "24112339",
  "role": "本科生",
  "college": "人工智能学院",
  "major": "计算机科学与技术",
  "className": "24223801",
  "tags": [],
  "recentIntents": []
}
```

不要传：

- 姓名
- 手机号
- 邮箱
- 出生日期
- 完整 OAuth 原始响应
- 其他敏感或暂未确认含义的字段

## 当前实现状态

- 已实现 `/auth/oauth/login-url`
- 已实现 `/callback`
- 已实现 `code -> access_token -> profile`
- 已实现 profile 标准化为系统用户画像
- 待接入 MySQL 后，将在 `/callback` 中把用户画像写入 `user_profiles`
