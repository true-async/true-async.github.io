---
layout: docs
lang: zh
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /zh/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "创建新的 FileSystemWatcher 并开始监视文件或目录。"
---

# FileSystemWatcher::__construct

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::__construct(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

创建监视器并立即开始跟踪变化。事件从创建时刻起就被缓冲，即使迭代尚未开始。

## 参数

**path**
: 要监视的文件或目录路径。
  如果路径不存在或无法访问，将抛出 `Error`。

**recursive**
: 如果为 `true`，嵌套目录也会被监视。
  默认为 `false`。

**coalesce**
: 事件缓冲模式。
  `true`（默认）--- 事件按 `path/filename` 键分组。
  对同一文件的重复更改通过 OR 运算合并 `renamed`/`changed` 标志。
  `false` --- 每个操作系统事件作为单独元素存储在环形缓冲区中。

## 错误/异常

- `Error` --- 路径不存在或无法进行监视。

## 示例

### 示例 #1 监视目录

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/mydir');

foreach ($watcher as $event) {
    echo "{$event->filename}\n";
    $watcher->close();
}
?>
```

### 示例 #2 以原始模式递归监视

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## 参见

- [FileSystemWatcher::close](/zh/docs/reference/filesystem-watcher/close.html) --- 停止监视
- [FileSystemWatcher](/zh/docs/components/filesystem-watcher.html) --- 概念概述
