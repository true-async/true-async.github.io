---
layout: docs
lang: ko
path_key: "/docs/reference/filesystem-watcher/close.html"
nav_active: docs
permalink: /ko/docs/reference/filesystem-watcher/close.html
page_title: "FileSystemWatcher::close"
description: "파일 시스템 감시를 중지하고 반복을 종료합니다."
---

# FileSystemWatcher::close

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::close(): void
```

파일 시스템 감시를 중지합니다. `foreach`를 통한 반복은 버퍼에 남은 이벤트를 처리한 후 종료됩니다.

멱등성 --- 반복 호출해도 안전합니다.

## 매개변수

매개변수가 없습니다.

## 예제

### 예제 #1 원하는 이벤트 수신 후 닫기

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

### 예제 #2 다른 코루틴에서 닫기

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

## 같이 보기

- [FileSystemWatcher::isClosed](/ko/docs/reference/filesystem-watcher/is-closed.html) --- 상태 확인
- [FileSystemWatcher::__construct](/ko/docs/reference/filesystem-watcher/construct.html) --- 감시자 생성
