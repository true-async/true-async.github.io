---
layout: docs
lang: ko
path_key: "/docs/reference/filesystem-watcher/get-iterator.html"
nav_active: docs
permalink: /ko/docs/reference/filesystem-watcher/get-iterator.html
page_title: "FileSystemWatcher::getIterator"
description: "파일 시스템 이벤트를 foreach로 순회하기 위한 비동기 이터레이터를 가져옵니다."
---

# FileSystemWatcher::getIterator

(PHP 8.6+, True Async 1.0)

```php
public FileSystemWatcher::getIterator(): Iterator
```

`foreach`에서 사용할 이터레이터를 반환합니다. `foreach ($watcher as $event)` 사용 시 자동으로 호출됩니다.

이터레이터는 `Async\FileSystemEvent` 객체를 산출합니다. 버퍼가 비어있으면 새로운 이벤트가 도착할 때까지 코루틴이 일시 중단됩니다. 감시자가 닫히고 버퍼가 소진되면 반복이 종료됩니다.

## 매개변수

매개변수가 없습니다.

## 반환값

`Iterator` --- `Async\FileSystemEvent` 객체를 산출하는 이터레이터.

## 오류/예외

- `Error` --- 이터레이터가 코루틴 외부에서 사용된 경우.

## 예제

### 예제 #1 foreach를 사용한 표준 사용법

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

### 예제 #2 break로 중단

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

## 같이 보기

- [FileSystemWatcher](/ko/docs/components/filesystem-watcher.html) --- 개념 개요
- [FileSystemWatcher::close](/ko/docs/reference/filesystem-watcher/close.html) --- 감시 중지
