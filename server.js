const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
const dataManager = require('./lib/dataManager');

const app = express();

// 中间件
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 鉴权中间件
const authMiddleware = (req, res, next) => {
    const providedPassword = req.body.password || req.query.password || req.headers['x-password'];
    if (providedPassword === config.password) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized: Incorrect password" });
    }
};

/**
 * API: 获取所有任务列表
 * 不需要密码，公开查询
 */
app.get('/api/tasks', (req, res) => {
    const tasks = dataManager.getTasks();
    // 转换为数组返回，方便前端处理
    const taskList = Object.values(tasks).sort((a, b) => {
        // 按更新时间倒序排列
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    res.json(taskList);
});

/**
 * API: 获取单个任务详情
 */
app.get('/api/task/:name', (req, res) => {
    const task = dataManager.getTaskByName(req.params.name);
    if (task) {
        res.json(task);
    } else {
        res.status(404).json({ error: "Task not found" });
    }
});

/**
 * API: 创建或更新任务
 * 需要 body 参数: name, total, current, log, password
 */
app.post('/api/task', authMiddleware, (req, res) => {
    const { name, total, current, log } = req.body;

    if (!name || total === undefined || current === undefined) {
        return res.status(400).json({ error: "Missing required fields: name, total, current" });
    }

    try {
        const updatedTask = dataManager.upsertTask(name, total, current, log);
        res.json({ success: true, task: updatedTask });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * API: 删除指定任务
 */
app.delete('/api/task/:name', authMiddleware, (req, res) => {
    const name = req.params.name;
    try {
        if (dataManager.deleteTask(name)) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: "Task not found" });
        }
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * API: 删除所有任务
 */
app.delete('/api/tasks', authMiddleware, (req, res) => {
    try {
        dataManager.deleteAllTasks();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// 启动服务
app.listen(config.port, () => {
    console.log(`TaskStation running at http://localhost:${config.port}`);
});

