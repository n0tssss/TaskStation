const API_BASE = '/api';
const CONFIG_URL = 'site-config.json';

// DOM Elements
const taskListEl = document.getElementById('task-list');
const modal = document.getElementById('modal');
const closeModalBtn = document.querySelector('#close-detail-btn'); // Updated selector
const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
const siteTitleEl = document.getElementById('site-title');
const siteSubtitleEl = document.getElementById('site-subtitle');
const shareBtn = document.getElementById('share-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const addTaskBtn = document.getElementById('add-task-btn');
const currentYearEl = document.getElementById('current-year');

// Edit/Add Modal Elements
const editModal = document.getElementById('edit-modal');
const closeEditBtn = document.getElementById('close-edit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const taskForm = document.getElementById('task-form');
const taskNameInput = document.getElementById('task-name-input');
const taskTotalInput = document.getElementById('task-total-input');
const taskCurrentInput = document.getElementById('task-current-input');
const taskLogInput = document.getElementById('task-log-input');
const taskNamesList = document.getElementById('task-names-list');


// Password Modal Elements
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const rememberPasswordCheckbox = document.getElementById('remember-password');
const confirmPasswordBtn = document.getElementById('confirm-password-btn');
const cancelPasswordBtn = document.getElementById('cancel-password-btn');

// Modal Elements (Detail)
const modalTitle = document.getElementById('modal-title');
const modalStats = document.getElementById('modal-stats');
const modalPercent = document.getElementById('modal-percent');
const modalProgressBar = document.getElementById('modal-progress-bar');
const modalCreated = document.getElementById('modal-created');
const modalUpdated = document.getElementById('modal-updated');
const modalLogs = document.getElementById('modal-logs');

// State
let tasksData = [];
let updateInterval = null;
let config = {
    autoRefresh: {
        enabled: true,
        interval: 1000
    }
};
let pendingAction = null; // Store action to perform after password check

// Local Persistence State
let pinnedTasks = [];
let subscribedTasks = [];
let lastTaskStates = {}; // map: name -> { current, total, updatedAt }
let renderedTaskNames = new Set(); // for animation tracking

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Set Year
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // Check for embed mode
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('embed') === 'true') {
        document.body.classList.add('embed-mode');
    }

    loadUserData(); // Load pinned/subscribed from local storage
    await loadConfig();
    fetchTasks();
    
    if (config.autoRefresh.enabled) {
        startAutoRefresh();
    }
});

// Share Button (Copy Iframe Code)
if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        const url = new URL(window.location.href);
        url.searchParams.set('embed', 'true');
        
        const iframeCode = `<iframe src="${url.toString()}" width="100%" height="600" frameborder="0" style="border-radius: 12px; border: 1px solid #e0e0e0;"></iframe>`;
        
        navigator.clipboard.writeText(iframeCode).then(() => {
            // Visual feedback
            const originalContent = shareBtn.innerHTML;
            shareBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27ae60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            setTimeout(() => {
                shareBtn.innerHTML = originalContent;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('复制失败，请手动复制地址栏链接并添加 ?embed=true');
        });
    });
}

// Delete All Button
if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有任务吗？此操作不可恢复。')) {
            performAuthorizedAction(async (password) => {
                const response = await fetch(`${API_BASE}/tasks`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-password': password
                    }
                });
                if (response.ok) {
                    fetchTasks();
                    showNotification('操作成功', '所有任务已清空');
                } else {
                    throw new Error('鉴权失败');
                }
            });
        }
    });
}

// Add/Edit Task Logic
if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
        openEditModal();
    });
}

function openEditModal() {
    // Reset form
    taskForm.reset();
    
    // Populate datalist
    taskNamesList.innerHTML = tasksData.map(t => `<option value="${t.name}">`).join('');
    
    editModal.classList.remove('hidden');
    editModal.classList.add('show');
    taskNameInput.focus();
}

function closeEditModal() {
    editModal.classList.remove('show');
    setTimeout(() => editModal.classList.add('hidden'), 300);
}

closeEditBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Auto-fill existing task data
taskNameInput.addEventListener('input', (e) => {
    const name = e.target.value;
    const existingTask = tasksData.find(t => t.name === name);
    if (existingTask) {
        taskTotalInput.value = existingTask.total;
        taskCurrentInput.value = existingTask.current;
    }
});

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const taskData = {
        name: taskNameInput.value,
        total: parseInt(taskTotalInput.value, 10),
        current: parseInt(taskCurrentInput.value, 10),
        log: taskLogInput.value
    };

    performAuthorizedAction(async (password) => {
        const response = await fetch(`${API_BASE}/task`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...taskData, password })
        });

        if (response.ok) {
            fetchTasks();
            closeEditModal();
            showNotification('操作成功', `任务 "${taskData.name}" 已更新`);
        } else {
            const err = await response.json();
            if (response.status === 401) {
                 throw new Error('密码错误');
            } else {
                 alert('操作失败: ' + (err.error || '未知错误'));
            }
        }
    });
});


// Action Authorization Handler
function performAuthorizedAction(action) {
    const savedPassword = localStorage.getItem('taskstation_password');
    if (savedPassword) {
        // Try with saved password
        action(savedPassword).catch((err) => {
            console.log("Auth failed with saved password", err);
            // If failed (likely auth error), clear saved and prompt
            localStorage.removeItem('taskstation_password');
            promptPassword(action);
        });
    } else {
        promptPassword(action);
    }
}

function promptPassword(action) {
    pendingAction = action;
    passwordInput.value = '';
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('show');
    passwordInput.focus();
}

// Password Modal Events
confirmPasswordBtn.addEventListener('click', () => {
    const password = passwordInput.value;
    if (password) {
        if (rememberPasswordCheckbox.checked) {
            localStorage.setItem('taskstation_password', password);
        }
        
        if (pendingAction) {
            pendingAction(password).catch(() => {
                alert('密码错误或操作失败');
                localStorage.removeItem('taskstation_password'); // Clear invalid password
            });
        }
        
        closePasswordModal();
    }
});

cancelPasswordBtn.addEventListener('click', closePasswordModal);

function closePasswordModal() {
    passwordModal.classList.remove('show');
    setTimeout(() => passwordModal.classList.add('hidden'), 300);
    pendingAction = null;
}

// Load Config
async function loadConfig() {
    try {
        const response = await fetch(CONFIG_URL);
        const data = await response.json();
        config = { ...config, ...data }; // Merge defaults
        
        // Update UI with config
        if (siteTitleEl) siteTitleEl.textContent = config.title || 'TaskStation';
        if (siteSubtitleEl) siteSubtitleEl.textContent = config.subtitle || '实时任务进度追踪';
        if (autoRefreshToggle) autoRefreshToggle.checked = config.autoRefresh.enabled;
        
        // Update document title
        document.title = `${config.title || 'TaskStation'} - 任务进度看板`;
        
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// Local Storage Helpers
function loadUserData() {
    try {
        const pinned = localStorage.getItem('taskstation_pinned');
        if (pinned) pinnedTasks = JSON.parse(pinned);
        
        const subscribed = localStorage.getItem('taskstation_subscribed');
        if (subscribed) subscribedTasks = JSON.parse(subscribed);
    } catch (e) {
        console.error('Failed to load local data', e);
    }
}

function saveUserData() {
    localStorage.setItem('taskstation_pinned', JSON.stringify(pinnedTasks));
    localStorage.setItem('taskstation_subscribed', JSON.stringify(subscribedTasks));
}

// Toggle Auto Refresh
autoRefreshToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        startAutoRefresh();
    } else {
        stopAutoRefresh();
    }
});

function startAutoRefresh() {
    if (updateInterval) clearInterval(updateInterval);
    // Use interval from config
    const interval = config.autoRefresh.interval || 1000;
    updateInterval = setInterval(fetchTasks, interval);
}

function stopAutoRefresh() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

// Fetch Tasks
async function fetchTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        const tasks = await response.json();
        
        // Simple check to avoid re-rendering if data hasn't changed significantly
        if (JSON.stringify(tasks) !== JSON.stringify(tasksData)) {
            // Check for updates before overwriting data
            checkTaskUpdates(tasks);
            
            tasksData = tasks;
            renderTasks(tasks);
            
            // If modal is open, update its content if the viewed task has changed
            if (modal.classList.contains('show') && modalTitle.textContent) {
                updateModalContent(modalTitle.textContent);
            }
        } else {
             // Even if data is same, re-render to update relative times (e.g. "X mins ago")
             renderTasks(tasks);
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Check Updates for Notifications & Confetti
function checkTaskUpdates(newTasks) {
    newTasks.forEach(task => {
        const lastState = lastTaskStates[task.name];
        
        if (lastState) {
            // Check if completed (triggered only once when state changes to complete)
            const isCompleted = task.current >= task.total;
            const wasCompleted = lastState.current >= lastState.total;
            
            if (isCompleted && !wasCompleted) {
                triggerConfetti();
                if (subscribedTasks.includes(task.name)) {
                    showNotification(`任务完成！`, `任务 "${task.name}" 已完成 (进度: ${task.current}/${task.total})`);
                }
            } 
            // Check for progress update if subscribed
            else if (subscribedTasks.includes(task.name) && task.current !== lastState.current) {
                const percent = Math.round((task.current / task.total) * 100);
                showNotification(`任务更新`, `任务 "${task.name}" 进度更新为 ${percent}%`);
            }
        }
        
        // Update last state
        lastTaskStates[task.name] = {
            current: task.current,
            total: task.total,
            updatedAt: task.updatedAt
        };
    });
}

function triggerConfetti() {
    if (typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

        const random = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

function showNotification(title, body) {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'favicon.ico' });
    }
}

function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// Render Task Grid
function renderTasks(tasks) {
    if (tasks.length === 0) {
        taskListEl.innerHTML = '<div class="loading">暂无任务，请通过 API 添加任务</div>';
        return;
    }

    // Sort: Pinned first, then by updatedAt
    const sortedTasks = [...tasks].sort((a, b) => {
        const aPinned = pinnedTasks.includes(a.name) ? 1 : 0;
        const bPinned = pinnedTasks.includes(b.name) ? 1 : 0;
        
        if (aPinned !== bPinned) return bPinned - aPinned; // Pinned first
        return new Date(b.updatedAt) - new Date(a.updatedAt); // Then by time
    });

    taskListEl.innerHTML = sortedTasks.map(task => {
        const percent = calculatePercent(task.current, task.total);
        const isPinned = pinnedTasks.includes(task.name);
        const isSubscribed = subscribedTasks.includes(task.name);
        
        // Determine status class
        let statusClass = 'status-active'; // Default
        if (percent === 0) statusClass = 'status-pending';
        if (percent === 100) statusClass = 'status-completed';

        // Animation class for new tasks
        const isNew = !renderedTaskNames.has(task.name);
        const animationClass = isNew ? 'new-task' : '';
        if (isNew) renderedTaskNames.add(task.name);

        return `
            <div class="task-card ${statusClass} ${isPinned ? 'pinned' : ''} ${animationClass}" onclick="openTaskDetail('${task.name}')">
                <div class="task-actions" onclick="event.stopPropagation()">
                    <button class="action-btn ${isPinned ? 'active' : ''}" title="${isPinned ? '取消置顶' : '置顶任务'}" onclick="togglePin('${task.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                    </button>
                    <button class="action-btn ${isSubscribed ? 'active' : ''}" title="${isSubscribed ? '取消提醒' : '开启提醒'}" onclick="toggleSubscribe('${task.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" title="删除任务" onclick="deleteTask('${task.name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                </div>
                <div class="task-header">
                    <h3 class="task-title">${task.name}</h3>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
                <div class="task-stats">
                    <span>${task.current} / ${task.total}</span>
                    <span class="stats-percent">${percent}%</span>
                </div>
                <div class="task-times">
                     <span>创建于 ${smartTimeFormat(task.createdAt)}</span>
                     <span>${formatRelativeTime(task.updatedAt)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// User Actions
window.deleteTask = function(taskName) {
    if (confirm(`确定要删除任务 "${taskName}" 吗？`)) {
        performAuthorizedAction(async (password) => {
            const response = await fetch(`${API_BASE}/task/${encodeURIComponent(taskName)}`, {
                method: 'DELETE',
                headers: {
                    'x-password': password
                }
            });
            if (response.ok) {
                fetchTasks();
                showNotification('操作成功', '任务已删除');
            } else {
                throw new Error('操作失败');
            }
        });
    }
}

window.togglePin = function(taskName) {
    if (pinnedTasks.includes(taskName)) {
        pinnedTasks = pinnedTasks.filter(t => t !== taskName);
    } else {
        pinnedTasks.push(taskName);
    }
    saveUserData();
    renderTasks(tasksData); // Re-render immediately
}

window.toggleSubscribe = function(taskName) {
    requestNotificationPermission(); // Ask for permission on first interaction
    
    if (subscribedTasks.includes(taskName)) {
        subscribedTasks = subscribedTasks.filter(t => t !== taskName);
    } else {
        subscribedTasks.push(taskName);
    }
    saveUserData();
    renderTasks(tasksData); // Re-render immediately
}


// Open Modal
function openTaskDetail(taskName) {
    updateModalContent(taskName);
    modal.classList.add('show');
    modal.classList.remove('hidden');
}

function updateModalContent(taskName) {
    const task = tasksData.find(t => t.name === taskName);
    if (!task) return;

    const percent = calculatePercent(task.current, task.total);
    
    // Reset classes
    modal.className = 'modal show'; // Reset to base classes
    
    // Determine status class and apply to modal content wrapper or body
    let statusClass = 'status-active'; 
    if (percent === 0) statusClass = 'status-pending';
    if (percent === 100) statusClass = 'status-completed';
    
    // Add status class to modal-content for styling scoping if needed
    // But here we can also style the progress bar directly via class if we modify HTML structure
    // Let's update the modal-content to have this class for scoping css variables
    const modalContent = modal.querySelector('.modal-content');
    modalContent.classList.remove('status-pending', 'status-active', 'status-completed');
    modalContent.classList.add(statusClass);

    modalTitle.textContent = task.name;
    modalStats.textContent = `进度: ${task.current} / ${task.total}`;
    modalPercent.textContent = `${percent}%`;
    modalProgressBar.style.width = `${percent}%`;
    
    // Clean inline styles to allow CSS to take over
    modalProgressBar.style.background = ''; 

    modalCreated.textContent = smartTimeFormat(task.createdAt);
    modalUpdated.textContent = smartTimeFormat(task.updatedAt);

    // Render Logs (Reverse chronological)
    const sortedLogs = [...task.logs].sort((a, b) => new Date(b.time) - new Date(a.time));
    
    if (sortedLogs.length === 0) {
        modalLogs.innerHTML = '<p style="color:#999; text-align:center;">暂无日志</p>';
    } else {
        modalLogs.innerHTML = sortedLogs.map(log => {
            let progressInfo = '';
            if (log.current !== undefined && log.total !== undefined) {
                const percent = Math.round((log.current / log.total) * 100);
                progressInfo = `<span class="log-progress-badge" style="color: var(--accent-color); font-weight: bold; font-size: 0.85em; margin-left: 8px;">(进度: ${log.current}/${log.total} - ${percent}%)</span>`;
            }
            
            return `
            <div class="log-item">
                <div class="log-time">${smartTimeFormat(log.time)}</div>
                <div class="log-content">
                    ${log.content}
                    ${progressInfo}
                </div>
            </div>
        `;
        }).join('');
    }
}

// Close Modal
closeModalBtn.onclick = () => {
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.onclick = (event) => {
    if (event.target == modal) {
        modal.classList.remove('show');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
    if (event.target == editModal) {
        closeEditModal();
    }
};

// Helpers
function calculatePercent(current, total) {
    if (total <= 0) return 0;
    const p = (current / total) * 100;
    return Math.min(100, Math.max(0, Math.round(p))); // Clamp between 0-100
}

function smartTimeFormat(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
                    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                        date.getMonth() === yesterday.getMonth() && 
                        date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString('zh-CN', { hour12: false });

    if (isToday) {
        return `今天 ${timeStr}`;
    } else if (isYesterday) {
        return `昨天 ${timeStr}`;
    } else {
        // 获取周几
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const weekDay = weekDays[date.getDay()];
        const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
        return `${weekDay} ${monthDay} ${timeStr}`;
    }
}

function formatRelativeTime(isoString) {
    if (!isoString) return '从未更新';
    const date = new Date(isoString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // diff in seconds

    if (diff < 0) return '刚刚更新'; // 防止时间微小差异导致的负数
    
    if (diff < 60) {
        return `${diff}秒前更新`;
    }
    if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        return `${mins}分钟前更新`;
    }
    if (diff < 86400) { // 24小时内
        const hours = Math.floor(diff / 3600);
        return `${hours}小时前更新`;
    }
    
    // 超过24小时，使用具体时间
    return `${smartTimeFormat(isoString)}更新`;
}
