<p align="center">
  <img src="public/icon.png" alt="NexusLink" width="128" height="128" style="border-radius: 24px;">
</p>

<h1 align="center">NexusLink</h1>
<p align="center">个人社交人脉管理系统 — 记录联系人、互动、生日，维护你的每一段关系。</p>

## 亮点功能

- **联系人档案**：MBTI、星座、性格特征、个人优点、备注等丰富信息
- **多条联系方式**：微信/邮箱等自由组合，独立存储
- **互动时间线**：支持多人互动记录，含心情追踪
- **线上浅社交打卡**：同一天同一联系人去重，支持补记近 7 天
- **生日提醒**：公历/农历可选，自动生成并滚动到下一年
- **数据仪表盘**：互动趋势、心情变化、城市分布、待维护关系等统计
- **标签与分类**：标签管理、联系人分类与互动类型可自定义排序
- **数据管理**：一键导出/导入 JSON 备份，支持清空
- **暗色赛博主题**：移动端适配，底部导航栏

## 技术栈

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express |
| Frontend | Vanilla JS, Tailwind CSS (CDN), Chart.js |
| Database | SQLite (better-sqlite3, WAL mode) |
| Calendar | lunar-javascript（农历/公历互转） |

## 快速开始

先决条件：安装 Node.js（建议 16+）。

本地运行：

```bash
npm install
npm start
```

默认在 `http://localhost:3000` 提供服务。服务入口为 `server/index.js`，`npm start` 等同于 `node server/index.js`。

首次启动会自动创建 `data/` 目录并在其中生成 SQLite 数据库（默认 `data/app.db`），并且会在空数据库时写入示例数据。

环境变量（可选）：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | `3000` | 服务端口 |
| DB_PATH | `data/app.db` | SQLite 数据库文件路径（可传绝对路径，例如 `/data/nexus.db`） |
| NODE_ENV | `(not set)` | 运行环境 |

健康检查：`GET /health`。

使用 Docker：

构建镜像：

```bash
docker build -t nexus-link:latest .
```

运行容器（并挂载宿主目录以持久化数据库）：

```bash
docker run -p 3000:3000 -v $(pwd)/data:/app/data -e PORT=3000 -e DB_PATH=/app/data/app.db nexus-link:latest
```

Windows 下示例：

PowerShell:

```powershell
docker run -p 3000:3000 -v ${PWD}/data:/app/data -e PORT=3000 -e DB_PATH=/app/data/app.db nexus-link:latest
```

CMD (Windows 命令提示符):

```bat
docker run -p 3000:3000 -v %cd%\\data:/app/data -e PORT=3000 -e DB_PATH=/app/data/app.db nexus-link:latest
```

注意：在 Windows 下使用卷挂载时，请确保 Docker Desktop 已启用对宿主路径的共享，否则映射可能失败。

在云平台（如 Railway）部署时，推荐将 `DB_PATH` 指向平台提供的持久化卷（例如 `/data/nexus.db`）。

## 注意事项与已知问题（当前可改进的三项）

- **Windows Docker 卷映射**：README 中已给出 Linux 示例，Windows 用户请使用上方 PowerShell 或 CMD 示例；在 CI/CD 或容器平台上优先使用平台卷路径（例如 `/data/nexus.db`）。
- **标签解析的分隔符风险**：后端在 [server/routes/contacts.js] 使用 `GROUP_CONCAT` 并以冒号拼接 `id:name:color`，若标签名包含冒号会破坏解析。建议后端改为返回 JSON 或使用不会出现在标签名的分隔符，短期建议避免在标签名中使用冒号。
- **错误信息与导入稳健性**：部分接口返回的错误信息中英文混用（例如 `Contact not found`），建议统一为中文或做 i18n；导入逻辑（[server/routes/settings.js]）使用首行字段推断列集合，若行结构不一致可能导致 NULL 值，建议在导入前做列校验与字段补齐。

如需我直接修复以上任一项（例如：加入 Windows 示例、修复标签解析或增强导入逻辑），我可以继续改代码并提交补丁。

## 数据结构概览

```
contacts             — 联系人主表
contact_methods      — 联系方式（微信/邮箱等，一对多）
tags                 — 标签
contact_tags         — 联系人-标签关联
interactions         — 互动记录
interaction_contacts — 互动-联系人关联（支持多人）
reminders            — 生日提醒（自动管理）
online_pings         — 线上互动打卡（日期+联系人去重）
contact_strengths    — 个人优点记录
settings             — 系统设置
```

## API 速览

| Resource | Methods | Path |
|----------|---------|------|
| Contacts | GET, POST, PUT, DELETE | `/api/contacts` |
| Contact Detail | GET | `/api/contacts/:id` |
| Contact Methods | (embedded in contact CRUD) | — |
| Contact Tags | POST | `/api/contacts/:id/tags` |
| Contact Strengths | GET, POST | `/api/contacts/:id/strengths` |
| Strengths | PUT, DELETE | `/api/strengths/:id` |
| Tags | GET, POST, PUT, DELETE | `/api/tags` |
| Interactions | GET, POST, DELETE | `/api/interactions` |
| Timeline | GET | `/api/interactions/timeline` |
| Reminders | GET, PUT, DELETE | `/api/reminders` |
| Upcoming Reminders | GET | `/api/reminders/upcoming` |
| Online Pings | GET, POST, DELETE | `/api/pings` |
| Stats | GET | `/api/stats/*` |
| Settings | GET | `/api/settings` |
| Settings Export/Import | GET, POST | `/api/settings/export`, `/api/settings/import` |
| Settings Clear All | DELETE | `/api/settings/clear-all` |
| Lunar Convert | GET | `/api/lunar/convert` |

## 项目结构

```
├── public/                  # Frontend
│   ├── index.html           # SPA entry point (includes app routing)
│   ├── icon.png             # App icon
│   ├── favicon.svg          # SVG favicon
│   ├── css/style.css        # Cyber-tech theme
│   └── js/
│       ├── contacts.js      # Contacts module (+ strengths CRUD)
│       ├── dashboard.js     # Dashboard (Chart.js)
│       ├── lunar.min.js     # Lunar calendar (UMD)
│       ├── reminders.js     # Birthday reminders
│       ├── settings.js      # Settings module
│       ├── timeline.js      # Timeline + online pings
│       └── utils.js         # API client + shared utilities
├── server/                  # Backend
│   ├── index.js             # Express server
│   ├── db.js                # Database schema & seeds
│   ├── utils/
│   │   └── lunar.js         # Lunar/solar calendar logic + conversion API
│   └── routes/
│       ├── contacts.js      # Contacts CRUD + strengths + tags + birthday sync
│       ├── interactions.js  # Multi-person interactions + online pings
│       ├── reminders.js     # Birthday auto-roll
│       ├── settings.js      # Settings + import/export/clear
│       └── stats.js         # Analytics queries
├── data/                    # SQLite DB (auto-created, gitignored)
├── Dockerfile               # Docker build config
├── railway.toml             # Railway deployment config
├── package.json
├── package-lock.json
└── LICENSE
```

## 部署（Railway）

1. Fork 或连接该仓库到 [Railway](https://railway.app)
2. Railway 使用 `Dockerfile` 构建镜像
3. 添加 **Volume**（挂载路径：`/data`）用于 SQLite 持久化
4. 配置环境变量：

| 变量 | 示例值 | 说明 |
|------|--------|------|
| `DB_PATH` | `/data/nexus.db` | 数据库文件路径（挂载卷内） |
| `NODE_ENV` | `production` | 生产模式 |

5. 在 **Settings → Networking** 生成域名，端口设置为 **3000**

## License

This project is licensed under the [MIT License](LICENSE).
