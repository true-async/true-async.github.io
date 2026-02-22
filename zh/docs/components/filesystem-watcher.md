---
layout: docs
lang: zh
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /zh/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "TrueAsync 中的 FileSystemWatcher -- 持续文件系统观察者，支持 foreach 迭代、事件缓冲和两种存储模式。"
---

# FileSystemWatcher：文件系统监控

## 什么是 FileSystemWatcher

`Async\FileSystemWatcher` 是一个用于持续观察文件和目录变更的组件。
与一次性方式不同，FileSystemWatcher 持续运行并通过标准 `foreach` 迭代传递事件：

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

当缓冲区为空时，迭代会自动挂起协程，当新事件到达时恢复协程。

## FileSystemEvent

每个事件是一个 `Async\FileSystemEvent` 对象，包含四个只读属性：

| 属性       | 类型      | 描述                                                  |
|------------|-----------|-------------------------------------------------------|
| `path`     | `string`  | 传递给 `FileSystemWatcher` 构造函数的路径              |
| `filename` | `?string` | 触发事件的文件名（可能为 `null`）                      |
| `renamed`  | `bool`    | `true` -- 文件被创建、删除或重命名                     |
| `changed`  | `bool`    | `true` -- 文件内容被修改                               |

## 两种缓冲模式

### 合并模式（默认）

在合并模式下，事件按 `path/filename` 键分组。如果在迭代器处理之前文件发生了多次变更，缓冲区中只保留一个合并标志的事件：

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- 默认
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

这适用于典型场景：热重载、配置变更重建、同步。

### 原始模式

在原始模式下，来自操作系统的每个事件都作为单独的元素存储在环形缓冲区中：

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

适用于需要精确事件顺序和计数的场景 -- 审计、日志记录、复制。

## 构造函数

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- 文件或目录的路径。如果路径不存在，会抛出 `Error`。

**`recursive`** -- 如果为 `true`，嵌套目录也会被监控。

**`coalesce`** -- 缓冲模式：`true` -- 事件合并（HashTable），`false` -- 所有事件（环形缓冲区）。

监控在对象创建时立即开始。即使在迭代开始之前，事件就已被缓冲。

## 生命周期

### close()

停止监控。当前迭代在处理完缓冲区中剩余事件后结束。幂等操作 -- 重复调用是安全的。

```php
<?php
$watcher->close();
?>
```

### isClosed()

```php
<?php
$watcher->isClosed(); // bool
?>
```

### 自动关闭

如果 `FileSystemWatcher` 对象被销毁（超出作用域），监控自动停止。

## 示例

### 配置热重载

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/etc/myapp', recursive: true);

    foreach ($watcher as $event) {
        if (str_ends_with($event->filename ?? '', '.yml')) {
            echo "Config changed: {$event->filename}\n";
            reloadConfig();
        }
    }
});
?>
```

### 限时监控

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/uploads');

spawn(function() use ($watcher) {
    delay(30_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processUpload($event->filename);
}

echo "Monitoring finished\n";
?>
```

### 监控多个目录

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

$dirs = ['/var/log/app', '/var/log/nginx', '/var/log/postgres'];

foreach ($dirs as $dir) {
    spawn(function() use ($dir) {
        $watcher = new FileSystemWatcher($dir);

        foreach ($watcher as $event) {
            echo "[{$dir}] {$event->filename}\n";
        }
    });
}
?>
```

### 审计用原始模式

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;

spawn(function() {
    $watcher = new FileSystemWatcher('/secure/data', coalesce: false);

    foreach ($watcher as $event) {
        $type = $event->renamed ? 'RENAME' : 'CHANGE';
        auditLog("[{$type}] {$event->path}/{$event->filename}");
    }
});
?>
```

## 通过 Scope 取消

当作用域被取消时，FileSystemWatcher 会正确终止：

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/test');

    spawn(function() use ($watcher) {
        foreach ($watcher as $event) {
            echo "{$event->filename}\n";
        }
        echo "Iteration finished\n";
    });

    delay(5000);
    $watcher->close();
});
?>
```

## 另请参阅

- [协程](/zh/docs/components/coroutines.html) -- 基本并发单元
- [通道](/zh/docs/components/channels.html) -- 用于数据传输的 CSP 通道
- [取消机制](/zh/docs/components/cancellation.html) -- 取消机制
