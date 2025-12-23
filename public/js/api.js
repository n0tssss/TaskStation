// API 服务模块

const API_BASE = '/api';
const CONFIG_URL = 'site-config.json';

export const ApiService = {
    /**
     * 加载站点配置
     */
    async loadConfig() {
        const response = await fetch(CONFIG_URL);
        return await response.json();
    },

    /**
     * 获取任务列表（分页）
     * @param {number} page 页码（默认1）
     * @param {number} pageSize 每页数量（默认100）
     * @returns {Promise<{data: Array, pagination: {page, pageSize, total, totalPages}}>}
     */
    async getTasks(page = 1, pageSize = 100) {
        const response = await fetch(`${API_BASE}/tasks?page=${page}&pageSize=${pageSize}`);
        return await response.json();
    },

    /**
     * 创建或更新任务
     * @param {Object} taskData 任务数据
     * @param {string} password 管理员密码
     */
    async upsertTask(taskData, password) {
        const response = await fetch(`${API_BASE}/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...taskData, password })
        });

        if (!response.ok) {
            const err = await response.json();
            const error = new Error(err.error || '未知错误');
            error.status = response.status;
            throw error;
        }
        return await response.json();
    },

    /**
     * 删除任务
     * @param {string} taskName 任务名称
     * @param {string} password 管理员密码
     */
    async deleteTask(taskName, password) {
        const response = await fetch(`${API_BASE}/task/${encodeURIComponent(taskName)}`, {
            method: 'DELETE',
            headers: { 'x-password': password }
        });

        if (!response.ok) {
            throw new Error('操作失败');
        }
        return true;
    },

    /**
     * 删除所有任务
     * @param {string} password 管理员密码
     */
    async deleteAllTasks(password) {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                'x-password': password 
            }
        });

        if (!response.ok) {
            throw new Error('鉴权失败');
        }
        return true;
    }
};

