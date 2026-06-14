# 服务器部署思路

服务器系统：欧拉系统，已安装 Docker。

当前信息：

```text
API/H5/OAuth 入口服务器 IP：210.45.177.21
MySQL 服务器 IP：114.213.146.102
Dify 服务器 IP：36.136.68.127
正式域名：https://xgaigc.ahau.edu.cn
移动端形式：H5
建议服务器目录：/opt/ai-service-navigator
```

## 推荐部署结构

```text
GitHub 仓库
    ↓ git pull
/opt/ai-service-navigator on 210.45.177.21
    ↓ docker compose
API + Web + Redis
    ↓ Nginx 反向代理
https://xgaigc.ahau.edu.cn
    ↓
MySQL：114.213.146.102
    ↓
Dify：36.136.68.127
```

## 原则

1. 代码以 GitHub 为准，服务器只拉取和运行。
2. OAuth 真实链路只在白名单域名服务器上测试。
3. MySQL 数据卷持久化，不能随着容器删除而丢失。
4. Dify API Key、OAuth client_secret、数据库密码只放服务器 `.env`，不要提交到 GitHub。

## 服务器 `.env` 必需项

```env
MYSQL_ROOT_PASSWORD="请在服务器填写强密码"
MYSQL_DATABASE="ai_service_navigator"
MYSQL_USER="navigator"
MYSQL_PASSWORD="请在服务器填写强密码"
MYSQL_PUBLIC_PORT=3306
REDIS_PUBLIC_PORT=6379
API_PUBLIC_PORT=3000

DIFY_API_BASE_URL="https://api.dify.ai/v1"
DIFY_API_KEY=""
DIFY_INTENT_API_KEY=""

OAUTH_AUTH_SERVER="https://ids.ahau.edu.cn/cas/oauth2.0"
OAUTH_CLIENT_ID="xgaigc"
OAUTH_CLIENT_SECRET="请在服务器填写"
OAUTH_REDIRECT_URI="https://xgaigc.ahau.edu.cn/callback"
OAUTH_SCOPE="cas_get_userInfo"
```

如果 MySQL 放在 114.213.146.102，API 服务器上建议直接配置：

```env
DATABASE_URL="mysql://navigator:密码@114.213.146.102:3306/ai_service_navigator"
```

## MySQL 与 Navicat

如果 MySQL 放在独立服务器 `114.213.146.102`：

Navicat 连接信息：

```text
主机：114.213.146.102
端口：3306
数据库：ai_service_navigator
用户名：navigator
密码：MySQL 服务器设置的 navigator 密码
```

更安全的方式是服务器防火墙只允许你的校园网 IP 访问 `3306`，或者后续改成 SSH 隧道连接。

## Nginx

如果服务器已有 Nginx，可把域名反代到 API：

```nginx
server {
    server_name xgaigc.ahau.edu.cn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

如果服务器没有 Nginx，第一阶段可以先访问：

```text
http://210.45.177.21:3000/auth/oauth/login-url
```

但 OAuth 正式回调是：

```text
https://xgaigc.ahau.edu.cn/callback
```

所以正式联调仍建议配置 Nginx + HTTPS。

## 第一阶段服务器目标

- 域名可以访问 API
- API 可以连接 MySQL
- OAuth 回调可以进入后端
- 登录成功后写入 `user_profiles`
- 手机端 H5 可以通过域名访问

## 数据库初始化

下面命令是服务器部署阶段才执行，不是在当前本地电脑执行。

首次部署后，在服务器项目目录执行：

```bash
docker compose up -d mysql redis
npm install
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate -- --name init
npm --workspace apps/api run db:seed
docker compose up -d api
```

如果后续已经有迁移文件，生产环境可用：

```bash
npm --workspace apps/api run prisma:deploy
npm --workspace apps/api run db:seed
docker compose up -d api
```
