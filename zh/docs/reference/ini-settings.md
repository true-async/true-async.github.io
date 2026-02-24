---
layout: docs
lang: zh
path_key: "/docs/reference/ini-settings.html"
nav_active: docs
permalink: /zh/docs/reference/ini-settings.html
page_title: "INI 设置"
description: "TrueAsync 扩展的 php.ini 配置指令。"
---

# INI 设置

TrueAsync 扩展向 `php.ini` 添加以下指令。

## 指令列表

| 指令 | 默认值 | 作用域 | 描述 |
|------|-------|--------|------|
| `async.debug_deadlock` | `1` | `PHP_INI_ALL` | 启用死锁检测时的诊断报告输出 |

## async.debug_deadlock

**类型：** `bool`
**默认值：** `1`（启用）
**作用域：** `PHP_INI_ALL` — 可在 `php.ini`、`.htaccess`、`.user.ini` 中修改，也可通过 `ini_set()` 修改。

启用后，当调度器检测到死锁时，此指令会激活详细的诊断输出。
如果调度器发现所有协程都被阻塞且没有活跃事件，它会在抛出 `Async\DeadlockError` 之前输出报告。

### 报告内容

- 等待中的协程数量和活跃事件数量
- 所有被阻塞协程的列表，显示：
  - 创建（spawn）和挂起（suspend）位置
  - 每个协程正在等待的事件及其可读描述

### 输出示例

```
=== DEADLOCK REPORT START ===
Coroutines waiting: 2, active_events: 0

Coroutine 1
  spawn: /app/server.php:15
  suspend: /app/server.php:22
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

Coroutine 2
  spawn: /app/server.php:28
  suspend: /app/server.php:35
  waiting for:
    - Channel recv (capacity: 0, senders: 0, receivers: 1)

=== DEADLOCK REPORT END ===

Fatal error: Uncaught Async\DeadlockError: ...
```

### 示例

#### 通过 php.ini 禁用

```ini
async.debug_deadlock = 0
```

#### 通过 ini_set() 禁用

```php
<?php
// 在运行时禁用死锁诊断
ini_set('async.debug_deadlock', '0');
?>
```

#### 为测试禁用

```ini
; phpunit.xml 或 .phpt 文件
async.debug_deadlock=0
```

## 参见

- [异常](/zh/docs/components/exceptions.html) — `Async\DeadlockError`
