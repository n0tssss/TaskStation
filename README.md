# TaskStation 任务进度看板

TaskStation 是一个轻量级、现代化的实时任务进度追踪系统。它提供了一个简约大气的 Web 界面，用于展示、更新和管理任务进度。支持 API 写入数据，适合作为个人或团队的任务监控中心。

## ✨ 项目特色

*   **API 驱动与管理**：支持通过 RESTful API 或网页界面增删改任务，关键操作具备密码鉴权保护。
*   **个性化交互**：支持重要任务置顶、进度更新浏览器通知订阅，以及任务完成时的礼花庆祝特效。
*   **嵌入式集成**：提供专属嵌入模式（`?embed=true`），自动隐藏多余 UI，可无缝集成至 Notion、Obsidian 或其他网页中。
*   **极致轻量**：基于 Node.js + 本地 JSON 文件存储，无需数据库，零维护成本，数据迁移极简。
*   **视觉增强**：配备丝滑的进度条动画、“旋转灯箱”效果及动态状态主题色。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置

项目根目录下的 `config.js` 包含后端配置：

```javascript
module.exports = {
    password: "secure_task_password", // [重要] 设置管理密码，用于写入和删除操作
    port: 3000,                       // 服务运行端口
    dataFile: "./data/tasks.json"     // 数据存储路径
};
```

前端配置位于 `public/site-config.json`，可修改网站标题和自动刷新间隔。

### 3. 启动服务

```bash
npm start
```

访问 `http://localhost:3000` 即可看到任务看板。

## 🔗 API 文档

TaskStation 提供了一套简单的 RESTful API，你可以通过脚本或其他程序调用 API 来更新任务进度。

### 任务状态说明

每个任务都有一个 `state` 字段，表示任务的当前状态。对接时请根据业务场景设置正确的状态：

| 状态值 | 含义 | 适用场景 | 前端表现 |
|--------|------|----------|----------|
| `info` | 正常运行 | 任务按预期进行中，没有异常 | 蓝色进度条，默认状态 |
| `success` | 已完成 | 任务顺利结束，当前进度达到总量 | 绿色进度条 + 礼花特效 |
| `warning` | 警告 | 任务出现了值得关注但不致命的问题 | 黄色进度条 + 标题旁黄色"警告"标签 |
| `error` | 异常 | 任务发生错误，需要人工介入处理 | 红色脉冲边框 + 标题旁红色"异常"标签 |

**异常判定逻辑**：对于下游对接方，如果你需要标记一个任务发生异常，在调用创建/更新接口时将 `state` 设为 `"error"`，前端会自动高亮显示该任务卡片，提醒相关人员关注。

### 日志级别

日志记录 (`logs` 数组中的每条记录) 也有 `level` 字段，与任务状态对应：

- `info` — 普通日志，蓝色左边框
- `success` — 成功日志，绿色左边框
- `warning` — 警告日志，黄色左边框
- `error` — 错误日志，红色左边框，字体加粗

> **建议**：当任务异常时，将任务的 `state` 设为 `error`，同时写入一条 `level` 为 `error` 的日志描述具体错误原因。

### 获取任务

*   **GET** `/api/tasks`：获取所有任务列表。
    *   响应：`[{ name, total, current, state, logs, createdAt, updatedAt, totalLogs }, ...]`
    *   注意：`logs` 字段只返回最近 10 条，完整日志通过分页接口获取

*   **GET** `/api/task/:name`：获取指定名称的任务详情。
    *   响应：`{ name, total, current, state, logs, createdAt, updatedAt }`

*   **GET** `/api/task/:name/logs?page=1&pageSize=100`：获取任务日志（分页）。
    *   响应：`{ data: [...], pagination: { page, pageSize, total, totalPages } }`
    *   日志按时间倒序（最新的在前），pageSize 最大 500

### 管理任务 (需要鉴权)

所有管理接口需要在 Body 或 Header 中携带 `password`。

*   **POST** `/api/task`：创建或更新任务。
    *   Body：
        ```json
        {
          "name": "任务名",
          "total": 100,
          "current": 50,
          "state": "info",
          "log": "日志内容",
          "password": "..."
        }
        ```
    *   | 字段 | 必填 | 说明 |
        |------|------|------|
        | `name` | 是 | 任务名称，唯一标识 |
        | `total` | 新任务时必填 | 总进度数量。已有任务可传入以修改总量 |
        | `current` | 否 | 当前进度。不传则自动 +1 |
        | `state` | 否 | 任务状态：`info`(默认) / `success` / `warning` / `error` |
        | `log` | 否 | 本次更新的日志内容 |
        | `password` | 是 | 管理员密码（也可放在 Header: `x-password`） |

*   **DELETE** `/api/task/:name`：删除指定任务。
    *   Header: `x-password: ...`

*   **DELETE** `/api/tasks`：清空所有任务。
    *   Header: `x-password: ...`

### 对接示例

**Python 对接**：
```python
import requests

BASE = "http://localhost:3000/api"
PASSWORD = "secure_task_password"

# 创建新任务
requests.post(f"{BASE}/task", json={
    "name": "数据同步",
    "total": 1000,
    "current": 0,
    "state": "info",
    "log": "开始同步",
    "password": PASSWORD
})

# 更新进度（自动 +1）
requests.post(f"{BASE}/task", json={
    "name": "数据同步",
    "password": PASSWORD
})

# 标记异常
requests.post(f"{BASE}/task", json={
    "name": "数据同步",
    "state": "error",
    "log": "数据库连接超时，同步中断",
    "password": PASSWORD
})

# 恢复正常
requests.post(f"{BASE}/task", json={
    "name": "数据同步",
    "state": "info",
    "log": "数据库重连成功，恢复同步",
    "password": PASSWORD
})

# 修改总数量（如需求变更）
requests.post(f"{BASE}/task", json={
    "name": "数据同步",
    "total": 1500,
    "password": PASSWORD
})
```

**Shell 对接**：
```bash
PASSWORD="secure_task_password"
BASE="http://localhost:3000/api"

# 自动推进进度 +1
curl -X POST "$BASE/task" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"数据同步\",\"password\":\"$PASSWORD\"}"

# 标记异常
curl -X POST "$BASE/task" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"数据同步\",\"state\":\"error\",\"log\":\"处理失败\",\"password\":\"$PASSWORD\"}"

# 修改总数量
curl -X POST "$BASE/task" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"数据同步\",\"total\":2000,\"password\":\"$PASSWORD\"}"
```

## 🛠️ 嵌入模式

在 URL 后添加 `?embed=true` 参数即可进入嵌入模式。在此模式下，Header 中的标题、分享按钮等元素将被隐藏，只保留自动刷新开关，适合嵌入到 iframe 中使用。

示例 URL: `http://localhost:3000/?embed=true`
