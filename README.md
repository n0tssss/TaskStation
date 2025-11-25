# TaskStation 任务进度看板

TaskStation 是一个轻量级、现代化的实时任务进度追踪系统。它提供了一个简约大气的 Web 界面，用于展示、更新和管理任务进度。支持 API 写入数据，适合作为个人或团队的任务监控中心。

![TaskStation Screenshot](https://via.placeholder.com/800x400?text=TaskStation+Screenshot)

## ✨ 功能特性

*   **实时看板**：直观展示任务进度，支持自动刷新（可配置）。
*   **交互式管理**：
    *   ➕ **新增/编辑任务**：支持网页直接创建或更新任务，提供任务名称自动补全。
    *   🗑️ **删除任务**：支持删除单个任务或一键清空所有任务。
    *   🔒 **安全鉴权**：关键操作（增删改）受密码保护，支持浏览器端记住密码。
*   **个性化体验**：
    *   📌 **任务置顶**：重要的任务一键置顶。
    *   🔔 **任务订阅**：订阅特定任务，进度更新或完成时接收浏览器通知。
    *   📱 **响应式设计**：完美适配桌面端和移动端。
    *   🎨 **动态主题**：根据任务状态（未开始、进行中、已完成）自动改变卡片颜色。
*   **视觉增强**：
    *   丝滑的进度条动画和“旋转灯箱”效果。
    *   任务添加时的“从天而降”入场动画。
    *   🎉 任务完成时的礼花庆祝特效。
*   **嵌入支持**：
    *   提供 `iframe` 嵌入模式（`?embed=true`），自动隐藏头部多余信息，仅保留核心看板，方便集成到其他系统（如 Notion, Obsidian, 个人博客等）。
    *   一键复制嵌入代码。
*   **数据持久化**：基于本地 JSON 文件存储，无需安装复杂数据库，数据迁移和备份极简。

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

前端配置位于 `public/site-config.json`：

```json
{
    "title": "TaskStation",           // 网站标题
    "subtitle": "实时任务进度追踪",    // 网站副标题
    "autoRefresh": {
        "enabled": true,              // 是否开启自动刷新
        "interval": 3000              // 刷新间隔 (毫秒)
    }
}
```

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

## 📂 目录结构

*   `server.js`: Node.js 后端入口。
*   `lib/dataManager.js`: JSON 数据读写逻辑。
*   `config.js`: 后端配置文件。
*   `public/`: 前端静态资源。
    *   `index.html`: 页面结构。
    *   `style.css`: 样式表。
    *   `app.js`: 前端逻辑。
    *   `site-config.json`: 前端配置。
*   `data/`: 数据存储目录 (自动生成)。

## 📄 版权信息

© 2025 N0ts. Licensed under the MIT License.

GitHub Repository: [https://github.com/n0tssss/TaskStation](https://github.com/n0tssss/TaskStation)
