const fs = require("fs");
const path = require("path");
const config = require("../config");

// 封装初始化逻辑，方便复用
function initDataFile() {
    const dataDir = path.dirname(config.dataFile);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(config.dataFile)) {
        fs.writeFileSync(config.dataFile, JSON.stringify({}, null, 2));
    }
}

// 模块加载时运行一次
initDataFile();

/**
 * 读取所有任务
 */
function getTasks() {
    try {
        // 每次读取前检查文件是否存在，不存在则创建（防止手动删除）
        if (!fs.existsSync(config.dataFile)) {
            initDataFile();
        }
        const data = fs.readFileSync(config.dataFile, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error reading data file:", err);
        return {};
    }
}

/**
 * 保存所有任务
 */
function saveTasks(tasks) {
    try {
        // 确保目录存在
        const dataDir = path.dirname(config.dataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(config.dataFile, JSON.stringify(tasks, null, 2));
        return true;
    } catch (err) {
        console.error("Error writing data file:", err);
        return false;
    }
}

/**
 * 更新或创建任务
 * @param {string} name 任务名称
 * @param {number} total 总进度
 * @param {number} current 当前进度
 * @param {string} log 日志内容 (会被添加到日志数组中)
 * @param {string} state 任务状态和日志级别 (success, info, warning, error)
 */
function upsertTask(name, total, current, log, state) {
    const tasks = getTasks();
    const now = new Date().toISOString();

    // 默认状态
    const validStates = ["success", "info", "warning", "error"];
    const normalizeState = (s) => (validStates.includes(s) ? s : "info");
    const currentState = state ? normalizeState(state) : "info";

    if (!tasks[name]) {
        // 新建任务
        tasks[name] = {
            name: name,
            total: Number(total),
            current: Number(current),
            state: currentState, // 替换 hasError
            logs: [],
            createdAt: now,
            updatedAt: now
        };
    } else {
        // 更新任务
        tasks[name].total = Number(total);
        tasks[name].current = Number(current);
        // 如果传入了 state，则更新任务状态
        if (state !== undefined) {
            tasks[name].state = currentState;
        }

        tasks[name].updatedAt = now;
    }

    // 添加日志
    if (log) {
        tasks[name].logs.push({
            time: now,
            content: log,
            current: Number(current),
            total: Number(total),
            level: currentState // 使用任务状态作为日志级别
        });
    }

    saveTasks(tasks);
    return tasks[name];
}

/**
 * 获取指定任务
 */
function getTaskByName(name) {
    const tasks = getTasks();
    return tasks[name] || null;
}

/**
 * 删除指定任务
 */
function deleteTask(name) {
    const tasks = getTasks();
    if (tasks[name]) {
        delete tasks[name];
        saveTasks(tasks);
        return true;
    }
    return false;
}

/**
 * 删除所有任务
 */
function deleteAllTasks() {
    saveTasks({});
    return true;
}

module.exports = {
    getTasks,
    upsertTask,
    getTaskByName,
    deleteTask,
    deleteAllTasks
};
