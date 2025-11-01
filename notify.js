/**
 * Notification.js
 * @version 3.0.0
 */

(function(global) {
    'use strict';
    
    // 防止重复加载
    if (global.NotificationSystem) {
        return;
    }

    // CSP兼容的样式注入
    const injectStyles = () => {
        if (document.querySelector('.notify-styles')) return;
        
        const style = document.createElement('style');
        style.className = 'notify-styles';
        style.textContent = `
            .notify-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            }

            .notify-notice {
                min-width: 280px;
                max-width: 320px;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 14px;
                display: flex;
                align-items: flex-start;
                opacity: 0;
                transform: translateX(120%) scale(0.95);
                transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                color: white;
                pointer-events: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            }

            .notify-notice.show {
                opacity: 1;
                transform: translateX(0) scale(1);
            }

            .notify-notice.hide {
                opacity: 0;
                transform: translateX(100%) scale(0.98);
                transition: all 0.45s cubic-bezier(0.32, 0, 0.67, 0);
            }

            .notify-icon {
                margin-right: 12px;
                font-size: 16px;
                margin-top: 2px;
                flex-shrink: 0;
            }

            .notify-message {
                flex: 1;
                padding-right: 12px;
                line-height: 1.5;
                word-break: break-word;
                white-space: normal;
                overflow-wrap: break-word;
            }

            .notify-close {
                background: transparent;
                border: none;
                color: rgba(255,255,255,0.8);
                cursor: pointer;
                padding: 2px;
                margin-left: 4px;
                margin-top: 0;
                font-size: 12px;
                transition: all 0.2s ease-out;
                -webkit-tap-highlight-color: transparent;
                flex-shrink: 0;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .notify-close:focus {
                outline: 2px solid rgba(255,255,255,0.5);
                outline-offset: 2px;
            }

            .notify-close i {
                line-height: 1;
            }

            .notify-close:hover {
                color: white;
                background: rgba(255,255,255,0.1);
            }

            .notify-notice.success { background: #34C759; }
            .notify-notice.error { background: #FF3B30; }
            .notify-notice.warning { background: #FF9500; }
            .notify-notice.info { background: #007AFF; }
        `;
        
        const head = document.head || document.getElementsByTagName('head')[0];
        head.appendChild(style);
    };

    // HTML转义函数
    const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };

    // 安全的HTML处理
    const processMessage = (message, allowHtml) => {
        if (allowHtml) {
            // 在生产环境中默认禁用HTML，除非明确允许
            console.warn('HTML content in notifications is disabled in production for security reasons');
            return escapeHtml(message);
        }
        const escaped = escapeHtml(message);
        return escaped.replace(/\n/g, '<br>');
    };

    class SecureNotification {
        constructor() {
            if (SecureNotification.instance) {
                return SecureNotification.instance;
            }
            SecureNotification.instance = this;
            
            this.notifications = [];
            this.activeNotices = new Map();
            this.pendingTimers = new Map();
            this.allow_html = false;
            this.initialized = false;
            
            this.init();
        }

        init() {
            if (this.initialized) return;
            
            injectStyles();
            this.createContainer();
            this.initialized = true;
        }

        createContainer() {
            let container = document.querySelector('.notify-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'notify-container';
                container.setAttribute('aria-live', 'polite');
                container.setAttribute('aria-atomic', 'true');
                document.body.appendChild(container);
            }
            return container;
        }

        add(message, type = 'info', duration = 3, closable = true) {
            // 参数验证
            if (typeof message !== 'string' || message.trim() === '') {
                console.error('Notification message must be a non-empty string');
                return;
            }

            if (!['success', 'error', 'warning', 'info'].includes(type)) {
                type = 'info';
            }

            if (typeof duration !== 'number' || duration < 0) {
                duration = 3;
            }

            const notification = {
                id: this.generateId(),
                message: message.trim(),
                type: type,
                duration: duration * 1000,
                closable: !!closable,
                timestamp: Date.now()
            };

            this.notifications.push(notification);
            this.render();
        }

        generateId() {
            return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        render() {
            if (this.notifications.length === 0) return;

            this.notifications.forEach((note, index) => {
                this.createNotice(note, index);
            });

            this.notifications = [];
        }

        createNotice(note, index) {
            const container = this.createContainer();
            const notice = document.createElement('div');
            notice.className = `notify-notice ${note.type}`;
            notice.setAttribute('role', 'alert');
            notice.setAttribute('aria-live', 'assertive');
            notice.dataset.noticeId = note.id;

            const message = processMessage(note.message, this.allow_html);
            const iconClass = this.getIconClass(note.type);

            notice.innerHTML = `
                <i class="notify-icon ${iconClass}" aria-hidden="true"></i>
                <div class="notify-message">${message}</div>
                ${note.closable ? '<button class="notify-close" aria-label="关闭通知" type="button"><i class="fas fa-times" aria-hidden="true"></i></button>' : ''}
            `;

            container.appendChild(notice);

            const timerId = setTimeout(() => {
                this.showNotice(notice, note);
                this.pendingTimers.delete(note.id);
            }, index * 150);

            this.pendingTimers.set(note.id, timerId);
        }

        getIconClass(type) {
            const icons = {
                'success': 'fa-solid fa-circle-check',
                'error': 'fa-solid fa-circle-xmark',
                'warning': 'fa-solid fa-triangle-exclamation',
                'info': 'fa-solid fa-circle-info'
            };
            return icons[type] || 'fa-solid fa-circle-info';
        }

        showNotice(notice, note) {
            notice.classList.add('show');
            
            this.activeNotices.set(note.id, {
                notice: notice,
                type: note.type,
                message: note.message,
                duration: note.duration
            });

            // 自动关闭
            if (note.duration > 0) {
                const timer = setTimeout(() => {
                    this.hideNotice(notice);
                    this.activeNotices.delete(note.id);
                }, note.duration);

                notice.addEventListener('mouseenter', () => clearTimeout(timer));
                notice.addEventListener('mouseleave', () => {
                    setTimeout(() => {
                        this.hideNotice(notice);
                        this.activeNotices.delete(note.id);
                    }, note.duration);
                });
            }

            // 关闭按钮事件
            const closeBtn = notice.querySelector('.notify-close');
            if (closeBtn && note.closable) {
                const closeHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideNotice(notice);
                    this.activeNotices.delete(note.id);
                    closeBtn.removeEventListener('click', closeHandler);
                };
                closeBtn.addEventListener('click', closeHandler);
            }
        }

        hideNotice(notice) {
            notice.classList.add('hide');
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 450);
        }

        closeByMessageImmediately(message) {
            // 取消待显示的通知
            this.notifications = this.notifications.filter(note => note.message !== message);
            
            // 取消待显示的计时器
            this.pendingTimers.forEach((timer, id) => {
                const note = this.getNoteById(id);
                if (note && note.message === message) {
                    clearTimeout(timer);
                    this.pendingTimers.delete(id);
                }
            });
            
            // 立即关闭正在显示的通知
            this.activeNotices.forEach((noticeData, id) => {
                if (noticeData.message === message) {
                    this.removeNoticeImmediately(noticeData.notice);
                    this.activeNotices.delete(id);
                }
            });
        }

        getNoteById(id) {
            for (let note of this.notifications) {
                if (note.id === id) return note;
            }
            return null;
        }

        removeNoticeImmediately(notice) {
            if (notice && notice.parentNode) {
                notice.parentNode.removeChild(notice);
            }
        }

        destroy() {
            // 清理所有资源
            this.pendingTimers.forEach(timer => clearTimeout(timer));
            this.pendingTimers.clear();
            this.activeNotices.clear();
            this.notifications = [];
            
            const container = document.querySelector('.notify-container');
            if (container) {
                container.remove();
            }
            
            const styles = document.querySelector('.notify-styles');
            if (styles) {
                styles.remove();
            }
            
            SecureNotification.instance = null;
        }
    }

    // 导出到全局对象
    global.NotificationSystem = SecureNotification;
    
    // 创建全局Notify对象
    global.Notify = {
        add: (message, type = 'info', duration = 3, closable = true) => {
            const instance = new SecureNotification();
            instance.add(message, type, duration, closable);
        },
        
        success: (message, duration = 3) => {
            const instance = new SecureNotification();
            instance.add(message, 'success', duration);
        },
        
        error: (message, duration = 5) => {
            const instance = new SecureNotification();
            instance.add(message, 'error', duration);
        },
        
        warning: (message, duration = 4) => {
            const instance = new SecureNotification();
            instance.add(message, 'warning', duration);
        },
        
        info: (message, duration = 3) => {
            const instance = new SecureNotification();
            instance.add(message, 'info', duration);
        },
        
        closeByMessageImmediately: (message) => {
            const instance = new SecureNotification();
            instance.closeByMessageImmediately(message);
        },
        
        destroy: () => {
            const instance = new SecureNotification();
            instance.destroy();
        }
    };

})(typeof window !== 'undefined' ? window : this);