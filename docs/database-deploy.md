# 数据库部署建议

## 推荐放置

建议把 MySQL 放在独立空闲服务器：

```text
MySQL：114.213.146.102
API/H5/OAuth 入口：210.45.177.21
Dify：36.136.68.127
```

这样更好维护：

- API 服务器负责对外访问、OAuth 回调、H5 页面。
- MySQL 服务器只负责数据持久化。
- Dify 服务器只负责 AI 工作流。

这个项目当前阶段数据量不大，一台服务器也能跑。但拆开以后更清楚，后面排查问题也容易，不会出现“API、数据库、Dify 抢同一台机器资源”的情况。

## 数据库名称和账号

建议：

```text
数据库名：aibs
当前联调账号：root
端口：3306
字符集：utf8mb4
排序规则：utf8mb4_unicode_ci
```

建表 SQL：

```text
docs/mysql-schema.sql
```

导入第一批真实事项：

```text
docs/seed-service-items.sql
```

如果你已经手动建好六张表，可以不用再执行建表 SQL。后续只执行事项种子 SQL 即可。

如果要用 SQL 创建业务账号，执行前把 SQL 里的：

```text
CHANGE_ME_STRONG_PASSWORD
```

改成强密码。

## API 服务器 .env

API 服务器 `210.45.177.21` 上的 `.env` 用下面这种分字段格式即可：

```env
MYSQL_HOST=114.213.146.102
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=你的密码
MYSQL_DATABASE=aibs
```

后端会自动把这些字段拼成 Prisma 需要的 `DATABASE_URL`，你不用手写 `DATABASE_URL`。

应用可以先用 root 临时联调，但不建议长期使用 root。正式运行建议创建并使用 `navigator` 业务账号。

## Navicat 连接

```text
主机：114.213.146.102
端口：3306
数据库：aibs
用户名：root
密码：你设置的 root 密码
```

## 安全建议

不要把 MySQL 3306 完全开放给公网。至少做一个：

- 防火墙只允许 `210.45.177.21` 访问 3306。
- 如果你要用 Navicat，再额外允许你当前电脑公网 IP 访问 3306。
- 更安全的方式是通过 SSH 隧道连接 Navicat。

## Dify 地址

Dify 在：

```text
36.136.68.127
```

API 服务器 `.env` 中设置：

```env
DIFY_API_BASE_URL="http://36.136.68.127:端口/v1"
DIFY_INTENT_API_KEY="你的 Dify Workflow API Key"
```

如果 Dify 配了 HTTPS 和域名，就优先用 HTTPS 域名。
