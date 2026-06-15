# 服务事项批量导入说明（v1）

我们后面每次新增/修改大量办事，统一按这版走，避免逐条点后台。

## 1）字段清单

请按这个 JSON 数组填：

- `id`：事项唯一ID（英文短横线，建议语义化，如 `faculty-resignation-application`）
- `title`：中文标题
- `category`：分类（如 `教务管理`、`信息化服务`）
- `description`：办事描述
- `handlerCount`：办理人次（可选，数字）
- `targetRoles`：数组，示例 `["教职工","本科生","研究生","校友","访客"]`
- `entryUrl`：办理入口链接（完整 URL）
- `department`：办理机构
- `contactPerson`：联系人（可多个用 `；` 分隔）
- `contactPhone`：联系方式（可多个用 `；` 分隔）
- `serviceTime`：办理时间
- `basis`：办理依据（如无填 `-`）
- `materials`：数组，办理材料（无则空数组）
- `processSteps`：数组，办理流程步骤
- `notice`：注意事项
- `keywords`：数组，检索关键词
- `faq`：数组，常见问题（可空）
- `status`：`ENABLED`
- `sourceUrl`：来源链接（可填入口或公告页）
- `lastVerifiedAt`：验证日期，建议 `YYYY-MM-DD`
- `assets`：数组，图片/附件
  - `id`：资源 ID
  - `assetType`：`image|link`
  - `title`：标题
  - `url`：图片路径或链接
  - `altText`：文字说明
  - `sortOrder`：展示顺序，数字

示例：

```json
{
  "id": "example-service",
  "title": "示例事项",
  "category": "示例分类",
  "description": "这是示例",
  "handlerCount": 0,
  "targetRoles": ["本科生","研究生"],
  "entryUrl": "https://example.edu.cn/service",
  "department": "信息化办公室",
  "contactPerson": "张老师",
  "contactPhone": "0551-00000000",
  "serviceTime": "工作日",
  "basis": "-",
  "materials": ["学生证复印件"],
  "processSteps": ["登录系统", "上传材料", "等待审批"],
  "notice": "请在工作日 9:00-17:00 提交",
  "keywords": ["示例", "测试事项"],
  "faq": ["示例问答1", "示例问答2"],
  "status": "ENABLED",
  "sourceUrl": "https://example.edu.cn/source",
  "lastVerifiedAt": "2026-06-15",
  "assets": [
    {
      "id": "example-img-1",
      "assetType": "image",
      "title": "示例流程图",
      "url": "/service-assets/example.png",
      "altText": "示例流程图",
      "sortOrder": 1
    }
  ]
}
```

---

## 2）为什么这样做

- 数据稳定：每次新增都可回滚、比对、覆盖更新。
- 便于你们老师维护：`id` 固定后可重复导入，不会重复建记录。
- 支持附件：图片放 `/root/aibs/static/service-assets/`，入口用 `/service-assets/文件名`。

---

## 3）本地导入命令（在项目根）

```bash
# 先进入项目根
cd /root/aibs

# 连接到数据库导入单个 SQL 批次文件
mysql -h 114.213.146.102 -P 3306 -u root -p aibs < docs/seed-service-items-batch-2026-06-15-xx.sql
```

> 说明：你的服务器是 Linux 上端口 7997/3000，不是 MySQL。MySQL 是 114.213.146.102:3306。

---

## 4）后续操作

你先照这个格式把我前 60 个整理成 JSON，发我：
1) 纯 JSON 数组（推荐）
2) 或按条目自然语言（我可以直接接着转 SQL）

我会直接帮你产出下一个批次 `docs/seed-service-items-batch-2026-06-15-XX.sql`，你服务器上跑完就上线。
