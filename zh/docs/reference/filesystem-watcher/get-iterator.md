---
layout: docs
lang: zh
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /zh/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "获取异步迭代器，使用 foreach 遍历文件系统事件。"
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

返回用于 `foreach` 的迭代器。使用 `foreach ($watcher as $event)` 时会自动调用。

迭代器产生 `Async\FileSystemEvent` 对象。当缓冲区为空时，协程将挂起直到新事件到达。当监视器关闭且缓冲区耗尽时，迭代结束。

## 参数

无参数。

## 返回值

`Iterator` --- 产生 `Async\FileSystemEvent` 对象的迭代器。

## 错误/异常

- `Error` --- 如果在协程外部使用迭代器。

## 示例

### 示例 #1 使用 foreach 的标准用法

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

spawn(function() {
    $watcher = new FileSystemWatcher('/tmp/dir');

    spawn(function() use ($watcher) {
        delay(5000);
        $watcher->close();
    });

    foreach ($watcher as $event) {
        echo "Event: {$event->filename}";
        echo " renamed={$event->renamed}";
        echo " changed={$event->changed}\n";
    }

    echo "Iteration completed\n";
});
?>
```

### 示例 #2 使用 break 中断

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

foreach ($watcher as $event) {
    if ($event->filename === 'stop.flag') {
        break;
    }
    processEvent($event);
}

$watcher->close();
?>
```

## 参见

- [FileSystemWatcher](/zh/docs/components/filesystem-watcher.html) --- 概念概述
- [FileSystemWatcher::close](/zh/docs/reference/filesystem-watcher/close.html) --- 停止监视
