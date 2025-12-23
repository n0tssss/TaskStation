// 工具函数模块

/**
 * 计算百分比
 * @param {number} current 当前值
 * @param {number} total 总值
 * @returns {number} 百分比 (0-100)
 */
export const calculatePercent = (current, total) => {
    if (total <= 0) return 0;
    const p = (current / total) * 100;
    return Math.min(100, Math.max(0, Math.round(p)));
};

/**
 * 智能时间格式化
 * @param {string} isoString ISO 时间字符串
 * @param {boolean} brief 是否简略显示（超过一周只显示年月日）
 * @returns {string} 格式化后的时间
 */
export const smartTimeFormat = (isoString, brief = false) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const now = new Date();
    
    // 计算距今天数
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    // 如果是简略模式且超过7天，只显示年月日
    if (brief && diffDays >= 7) {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
                    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                        date.getMonth() === yesterday.getMonth() && 
                        date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString('zh-CN', { hour12: false });

    if (isToday) return `今天 ${timeStr}`;
    if (isYesterday) return `昨天 ${timeStr}`;
    
    // 超过一周但在简略模式下已处理，这里是非简略模式
    if (diffDays >= 7) {
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
    }
    
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const weekDay = weekDays[date.getDay()];
    const monthDay = `${date.getMonth() + 1}月${date.getDate()}日`;
    return `${weekDay} ${monthDay} ${timeStr}`;
};

/**
 * 格式化相对时间
 * @param {string} isoString ISO 时间字符串
 * @param {Date} currentTime 当前时间（可选，用于实时更新）
 * @returns {string} 相对时间描述
 */
export const formatRelativeTime = (isoString, currentTime = null) => {
    if (!isoString) return '从未更新';
    const date = new Date(isoString);
    const now = currentTime || new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 0) return '刚刚更新';
    if (diff < 60) return `${diff}秒前更新`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前更新`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前更新`;
    return `${smartTimeFormat(isoString)}更新`;
};

/**
 * 显示浏览器通知
 * @param {string} title 标题
 * @param {string} body 内容
 */
export const showNotification = (title, body) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'favicon.ico' });
    }
};

/**
 * 请求通知权限
 */
export const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
};

/**
 * 触发礼花特效
 */
export const triggerConfetti = () => {
    if (typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
        const random = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: random(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
};

