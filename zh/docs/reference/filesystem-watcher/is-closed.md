---
layout: docs
lang: zh
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /zh/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "检查文件系统监视是否已停止。"
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

如果监视已停止，返回 `true` --- 可能是调用了 `close()`、作用域被取消或发生了错误。

## 参数

无参数。

## 返回值

`true` --- 监视器已关闭，`false` --- 监视器处于活跃状态。

## 示例

### 示例 #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## 参见

- [FileSystemWatcher::close](/zh/docs/reference/filesystem-watcher/close.html) --- 停止监视
