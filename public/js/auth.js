// 鉴权服务模块
import { ref, nextTick } from './vue.esm-browser.js';

export const useAuth = (passwordInputRef) => {
    const showPasswordModal = ref(false);
    const passwordInput = ref('');
    const rememberPassword = ref(true);
    let pendingAction = null;

    /**
     * 执行需要鉴权的操作
     * @param {Function} action 需执行的函数，接收 password 参数
     */
    const performAuthorizedAction = (action) => {
        const savedPassword = localStorage.getItem('taskstation_password');
        if (savedPassword) {
            action(savedPassword).catch(() => {
                localStorage.removeItem('taskstation_password');
                promptPassword(action);
            });
        } else {
            promptPassword(action);
        }
    };

    /**
     * 弹出密码输入框
     */
    const promptPassword = (action) => {
        pendingAction = action;
        passwordInput.value = '';
        showPasswordModal.value = true;
        // 自动聚焦
        nextTick(() => {
            if (passwordInputRef.value) passwordInputRef.value.focus();
        });
    };

    /**
     * 确认密码
     */
    const confirmPassword = () => {
        const pwd = passwordInput.value;
        if (pwd) {
            if (rememberPassword.value) {
                localStorage.setItem('taskstation_password', pwd);
            }
            if (pendingAction) {
                pendingAction(pwd).catch((err) => {
                    alert('密码错误或操作失败');
                    if (err.status === 401) {
                         localStorage.removeItem('taskstation_password');
                    }
                });
            }
            closePasswordModal();
        }
    };

    /**
     * 关闭密码框
     */
    const closePasswordModal = () => {
        showPasswordModal.value = false;
        pendingAction = null;
    };

    return {
        showPasswordModal,
        passwordInput,
        rememberPassword,
        performAuthorizedAction,
        confirmPassword,
        closePasswordModal
    };
};

