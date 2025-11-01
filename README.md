# JavaScript Notfiy
这是一个非常简单 网页内弹窗通知

# 使用方法
将文件放置于网页目录中并在您的HTML网页中使用此js
```
<script src="/assets/js/libs/notify.js"></script>
```

示例:
```
<button 输入="button" onclick="Notify.add('Test Error', 'error', 3, 'false')">
```

```
Notify.add(message, type, duration, closable)
@param {string} message - 通知内容
@param {string} type - 通知类型: 'success', 'error', 'warning', 'info'
@param {number} duration - 显示时长（秒），0 表示不自动关闭
@param {boolean} closable - 是否显示关闭按钮
```

```
Notify.addHtml(message, type, duration, closable)
@param {string} message - 通知内容(支持HTML)
@param {string} type - 通知类型: 'success', 'error', 'warning', 'info'
@param {number} duration - 显示时长（秒），0 表示不自动关闭
@param {boolean} closable - 是否显示关闭按钮
```
