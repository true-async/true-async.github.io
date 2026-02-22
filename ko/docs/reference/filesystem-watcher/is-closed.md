---
layout: docs
lang: ko
path_key: "/docs/reference/filesystem-watcher/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/filesystem-watcher/is-closed.html
page_title: "FileSystemWatcher::isClosed"
description: "파일 시스템 감시가 중지되었는지 확인합니다."
---

# FileSystemWatcher::isClosed

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::isClosed(): bool
```

감시가 중지되었는지 여부를 반환합니다 --- `close()`가 호출되었거나, 스코프가 취소되었거나, 오류가 발생한 경우입니다.

## 매개변수

매개변수가 없습니다.

## 반환값

`true` --- 감시자가 닫힘, `false` --- 활성 상태.

## 예제

### 예제 #1

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir');

var_dump($watcher->isClosed()); // false

$watcher->close();

var_dump($watcher->isClosed()); // true
?>
```

## 같이 보기

- [FileSystemWatcher::close](/ko/docs/reference/filesystem-watcher/close.html) --- 감시 중지
