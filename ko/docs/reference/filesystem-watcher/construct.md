---
layout: docs
lang: ko
path_key: "/docs/reference/filesystem-watcher/construct.html"
nav_active: docs
permalink: /ko/docs/reference/filesystem-watcher/construct.html
page_title: "FileSystemWatcher::__construct"
description: "새로운 FileSystemWatcher를 생성하고 파일 또는 디렉토리 감시를 시작합니다."
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

감시자를 생성하고 즉시 변경 사항 추적을 시작합니다. 이벤트는 생성 시점부터 버퍼링되며, 반복이 아직 시작되지 않았더라도 마찬가지입니다.

## 매개변수

**path**
: 감시할 파일 또는 디렉토리 경로.
  경로가 존재하지 않거나 접근할 수 없으면 `Error`가 발생합니다.

**recursive**
: `true`이면 중첩된 디렉토리도 모니터링합니다.
  기본값은 `false`입니다.

**coalesce**
: 이벤트 버퍼링 모드.
  `true` (기본값) --- 이벤트가 `path/filename` 키로 그룹화됩니다.
  동일한 파일에 대한 반복 변경은 `renamed`/`changed` 플래그를 OR 연산으로 병합합니다.
  `false` --- 각 OS 이벤트가 순환 버퍼에 별도의 요소로 저장됩니다.

## 오류/예외

- `Error` --- 경로가 존재하지 않거나 감시할 수 없습니다.

## 예제

### 예제 #1 디렉토리 감시

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

### 예제 #2 원시 모드에서 재귀적 감시

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/var/log', recursive: true, coalesce: false);

foreach ($watcher as $event) {
    echo "[{$event->path}] {$event->filename}\n";
}
?>
```

## 같이 보기

- [FileSystemWatcher::close](/ko/docs/reference/filesystem-watcher/close.html) --- 감시 중지
- [FileSystemWatcher](/ko/docs/components/filesystem-watcher.html) --- 개념 개요
