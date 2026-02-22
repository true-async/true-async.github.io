---
layout: docs
lang: zh
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /zh/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "停止文件系统监视并结束迭代。"
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

停止文件系统监视。通过 `foreach` 进行的迭代将在处理完缓冲区中剩余的事件后结束。

幂等操作 --- 重复调用是安全的。

## 参数

无参数。

## 示例

### 示例 #1 收到目标事件后关闭

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/uploads');

foreach ($watcher as $event) {
    if ($event->filename === 'ready.flag') {
        $watcher->close();
    }
}

echo "Marker file detected\n";
?>
```

### 示例 #2 从另一个协程关闭

```php
<?php
use Async\FileSystemWatcher;
use function Async\spawn;
use function Async\delay;

$watcher = new FileSystemWatcher('/tmp/data');

spawn(function() use ($watcher) {
    delay(10_000);
    $watcher->close();
});

foreach ($watcher as $event) {
    processEvent($event);
}

echo "Watching ended by timeout\n";
?>
```

## 参见

- [FileSystemWatcher::isClosed](/zh/docs/reference/filesystem-watcher/is-closed.html) --- 检查状态
- [FileSystemWatcher::__construct](/zh/docs/reference/filesystem-watcher/construct.html) --- 创建监视器
