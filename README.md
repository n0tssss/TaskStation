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

### 获取任务

*   **GET** `/api/tasks`：获取所有任务列表。
*   **GET** `/api/task/:name`：获取指定名称的任务详情。

### 管理任务 (需要鉴权)

所有管理接口需要在 Body 或 Header 中携带 `password`。

*   **POST** `/api/task`：创建或更新任务。
    *   Body: `{ "name": "任务名", "total": 100, "current": 50, "log": "日志内容", "password": "..." }`
*   **DELETE** `/api/task/:name`：删除指定任务。
    *   Header: `x-password: ...`
*   **DELETE** `/api/tasks`：清空所有任务。
    *   Header: `x-password: ...`

## 🛠️ 嵌入模式

在 URL 后添加 `?embed=true` 参数即可进入嵌入模式。在此模式下，Header 中的标题、分享按钮等元素将被隐藏，只保留自动刷新开关，适合嵌入到 iframe 中使用。

示例 URL: `http://localhost:3000/?embed=true`
