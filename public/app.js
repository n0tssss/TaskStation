import { createApp, ref, computed, onMounted } from "./js/vue.esm-browser.js";
import { ApiService } from "./js/api.js";
import { useAuth } from "./js/auth.js";
import {
    calculatePercent,
    smartTimeFormat,
    formatRelativeTime,
    showNotification,
    requestNotificationPermission,
    triggerConfetti
} from "./js/utils.js";

createApp({
    setup() {
        // 状态定义
        const tasks = ref([]);
        const config = ref({
            title: "TaskStation",
            subtitle: "实时任务进度追踪",
            autoRefresh: {
                enabled: true,
                interval: 1000
            }
        });
        const embedMode = ref(false);
        const currentYear = ref(new Date().getFullYear());

        // 弹窗控制状态
        const showDetailModal = ref(false);
        const showEditModal = ref(false);

        // 当前选中任务
        const currentTask = ref(null);
        
        // 分页状态
        const currentPage = ref(1);
        const pagination = ref({
            page: 1,
            pageSize: 100,
            total: 0,
            totalPages: 0
        });

        // 编辑表单
        const editForm = ref({
            name: "",
            total: 100,
            current: 0,
            log: "",
            state: "info"
        });

        // 密码输入框引用 (用于自动聚焦)
        const passwordInputRef = ref(null);

        // 引入鉴权逻辑
        const {
            showPasswordModal,
            passwordInput,
            rememberPassword,
            performAuthorizedAction,
            confirmPassword,
            closePasswordModal
        } = useAuth(passwordInputRef);

        // 本地持久化状态
        const pinnedTasks = ref([]);
        const subscribedTasks = ref([]);
        const lastTaskStates = ref({});
        const renderedTaskNames = ref(new Set());

        let updateInterval = null;

        // 计算属性：排序后的任务列表
        const sortedTasks = computed(() => {
            return [...tasks.value].sort((a, b) => {
                const aPinned = pinnedTasks.value.includes(a.name) ? 1 : 0;
                const bPinned = pinnedTasks.value.includes(b.name) ? 1 : 0;

                if (aPinned !== bPinned) return bPinned - aPinned; // 置顶优先
                return new Date(b.updatedAt) - new Date(a.updatedAt); // 按时间倒序
            });
        });

        // 计算属性：排序后的日志列表
        const sortedLogs = computed(() => {
            if (!currentTask.value || !currentTask.value.logs) return [];
            return [...currentTask.value.logs].sort((a, b) => new Date(b.time) - new Date(a.time));
        });

        // 生命周期钩子
        onMounted(async () => {
            // 检查嵌入模式
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("embed") === "true") {
                embedMode.value = true;
                document.body.classList.add("embed-mode");
            }

            loadUserData();
            await loadConfig();
            fetchTasks();

            if (config.value.autoRefresh.enabled) {
                startAutoRefresh();
            }
        });

        // 方法定义

        /**
         * 加载配置
         */
        const loadConfig = async () => {
            try {
                const data = await ApiService.loadConfig();
                config.value = { ...config.value, ...data };
                document.title = `${config.value.title} - 任务进度看板`;
            } catch (error) {
                console.error("加载配置失败:", error);
            }
        };

        /**
         * 加载用户本地数据 (置顶、订阅)
         */
        const loadUserData = () => {
            try {
                const pinned = localStorage.getItem("taskstation_pinned");
                if (pinned) pinnedTasks.value = JSON.parse(pinned);

                const subscribed = localStorage.getItem("taskstation_subscribed");
                if (subscribed) subscribedTasks.value = JSON.parse(subscribed);
            } catch (e) {
                console.error("加载本地数据失败", e);
            }
        };

        /**
         * 保存用户本地数据
         */
        const saveUserData = () => {
            localStorage.setItem("taskstation_pinned", JSON.stringify(pinnedTasks.value));
            localStorage.setItem("taskstation_subscribed", JSON.stringify(subscribedTasks.value));
        };

        /**
         * 获取任务列表（分页）
         * @param {number} page 可选，指定页码
         */
        const fetchTasks = async (page = currentPage.value) => {
            try {
                const result = await ApiService.getTasks(page, 100);
                const newTasks = result.data;
                pagination.value = result.pagination;
                currentPage.value = result.pagination.page;

                if (JSON.stringify(newTasks) !== JSON.stringify(tasks.value)) {
                    checkTaskUpdates(newTasks);
                    tasks.value = newTasks;

                    // 如果详情页打开中，实时更新当前任务数据
                    if (showDetailModal.value && currentTask.value) {
                        const updated = newTasks.find((t) => t.name === currentTask.value.name);
                        if (updated) currentTask.value = updated;
                    }
                }
            } catch (error) {
                console.error("获取任务失败:", error);
            }
        };
        
        /**
         * 跳转到指定页
         */
        const goToPage = (page) => {
            if (page >= 1 && page <= pagination.value.totalPages) {
                currentPage.value = page;
                fetchTasks(page);
            }
        };
        
        /**
         * 上一页
         */
        const prevPage = () => {
            if (currentPage.value > 1) {
                goToPage(currentPage.value - 1);
            }
        };
        
        /**
         * 下一页
         */
        const nextPage = () => {
            if (currentPage.value < pagination.value.totalPages) {
                goToPage(currentPage.value + 1);
            }
        };

        /**
         * 开启自动刷新
         */
        const startAutoRefresh = () => {
            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(fetchTasks, config.value.autoRefresh.interval || 1000);
        };

        /**
         * 停止自动刷新
         */
        const stopAutoRefresh = () => {
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        };

        /**
         * 切换自动刷新状态
         */
        const toggleAutoRefresh = () => {
            if (config.value.autoRefresh.enabled) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        };

        /**
         * 检查任务更新 (用于通知和特效)
         */
        const checkTaskUpdates = (newTasks) => {
            newTasks.forEach((task) => {
                const lastState = lastTaskStates.value[task.name];

                if (lastState) {
                    const isCompleted = task.current >= task.total;
                    const wasCompleted = lastState.current >= lastState.total;

                    if (isCompleted && !wasCompleted) {
                        triggerConfetti();
                        if (isSubscribed(task.name)) {
                            showNotification(
                                `任务完成！`,
                                `任务 "${task.name}" 已完成 (进度: ${task.current}/${task.total})`
                            );
                        }
                    } else if (isSubscribed(task.name) && task.current !== lastState.current) {
                        const percent = Math.round((task.current / task.total) * 100);
                        showNotification(`任务更新`, `任务 "${task.name}" 进度更新为 ${percent}%`);
                    }
                }

                lastTaskStates.value[task.name] = {
                    current: task.current,
                    total: task.total,
                    updatedAt: task.updatedAt
                };
            });
        };

        // UI 辅助函数
        const getStatusClass = (task) => {
            const percent = calculatePercent(task.current, task.total);
            if (task.state === "error" || task.hasError) return "status-error";
            if (percent === 0) return "status-pending";
            if (percent === 100) return "status-completed";
            return "status-active";
        };

        const isPinned = (name) => pinnedTasks.value.includes(name);
        const isSubscribed = (name) => subscribedTasks.value.includes(name);
        const isNew = (name) => {
            const isNewTask = !renderedTaskNames.value.has(name);
            if (isNewTask) renderedTaskNames.value.add(name);
            return isNewTask;
        };

        // 用户交互动作
        const togglePin = (name) => {
            if (isPinned(name)) {
                pinnedTasks.value = pinnedTasks.value.filter((t) => t !== name);
            } else {
                pinnedTasks.value.push(name);
            }
            saveUserData();
        };

        const toggleSubscribe = (name) => {
            requestNotificationPermission();
            if (isSubscribed(name)) {
                subscribedTasks.value = subscribedTasks.value.filter((t) => t !== name);
            } else {
                subscribedTasks.value.push(name);
            }
            saveUserData();
        };

        const deleteTask = (name) => {
            if (confirm(`确定要删除任务 "${name}" 吗？`)) {
                performAuthorizedAction(async (password) => {
                    await ApiService.deleteTask(name, password);
                    fetchTasks();
                    showNotification("操作成功", "任务已删除");
                });
            }
        };

        const deleteAllTasks = () => {
            if (confirm("确定要清空所有任务吗？此操作不可恢复。")) {
                performAuthorizedAction(async (password) => {
                    await ApiService.deleteAllTasks(password);
                    fetchTasks();
                    showNotification("操作成功", "所有任务已清空");
                });
            }
        };

        // 弹窗操作
        const openTaskDetail = (task) => {
            currentTask.value = task;
            showDetailModal.value = true;
        };

        const closeDetailModal = () => {
            showDetailModal.value = false;
            currentTask.value = null;
        };

        const openEditModal = () => {
            // 重置表单
            editForm.value = {
                name: "",
                total: 100,
                current: 0,
                log: "",
                state: "info"
            };
            showEditModal.value = true;
        };

        const closeEditModal = () => {
            showEditModal.value = false;
        };

        const onTaskNameInput = () => {
            const name = editForm.value.name;
            const existing = tasks.value.find((t) => t.name === name);
            if (existing) {
                editForm.value.total = existing.total;
                editForm.value.current = existing.current;
                // 保留原有状态或重置为 info
                // editForm.value.state = existing.state || 'info';
            }
        };

        const submitTask = () => {
            performAuthorizedAction(async (password) => {
                await ApiService.upsertTask(editForm.value, password);
                fetchTasks();
                closeEditModal();
                showNotification("操作成功", `任务 "${editForm.value.name}" 已更新`);
            });
        };

        const share = () => {
            const url = new URL(window.location.href);
            url.searchParams.set("embed", "true");
            const iframeCode = `<iframe src="${url.toString()}" width="100%" height="600" frameborder="0" style="border-radius: 12px; border: 1px solid #e0e0e0;"></iframe>`;

            navigator.clipboard
                .writeText(iframeCode)
                .then(() => {
                    const btn = document.getElementById("share-btn");
                    if (btn) {
                        const original = btn.innerHTML;
                        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
                        setTimeout(() => (btn.innerHTML = original), 2000);
                    } else {
                        alert("已复制嵌入代码");
                    }
                })
                .catch((err) => {
                    console.error(err);
                    alert("复制失败");
                });
        };

        return {
            // 状态
            config,
            embedMode,
            currentYear,
            tasks,
            sortedTasks,
            currentTask,
            sortedLogs,
            
            // 分页状态
            currentPage,
            pagination,

            // 弹窗状态
            showDetailModal,
            showEditModal,
            showPasswordModal,

            // 表单
            editForm,
            passwordInput,
            rememberPassword,
            passwordInputRef,

            // 工具方法
            calculatePercent,
            getStatusClass,
            isPinned,
            isSubscribed,
            isNew,
            smartTimeFormat,
            formatRelativeTime,

            // 动作
            togglePin,
            toggleSubscribe,
            deleteTask,
            deleteAllTasks,
            share,

            openTaskDetail,
            closeDetailModal,
            openEditModal,
            closeEditModal,
            onTaskNameInput,
            submitTask,

            confirmPassword,
            closePasswordModal,
            toggleAutoRefresh,
            
            // 分页动作
            goToPage,
            prevPage,
            nextPage
        };
    }
}).mount("#app");
