# GitHub 与服务器同步

## 仓库信息

仓库名：

```text
ai-service-navigator
```

GitHub 地址：

```text
https://github.com/romantic0612/ai-service-navigator
```

## 本地首次提交

```bash
git init
git add .
git commit -m "初始化 AI 办事导航项目"
git branch -M main
git remote add origin https://github.com/romantic0612/ai-service-navigator.git
git push -u origin main
```

不要提交 `.env`。当前 `.gitignore` 已排除 `.env` 和 `.env.*`。

## 服务器拉取

服务器上建议目录：

```text
/opt/ai-service-navigator
```

```bash
git clone https://github.com/romantic0612/ai-service-navigator.git /opt/ai-service-navigator
cd /opt/ai-service-navigator
cp .env.example .env
```

然后只在服务器 `.env` 中填写真实密码和 OAuth secret。
