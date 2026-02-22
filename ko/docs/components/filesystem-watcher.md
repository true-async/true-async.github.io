---
layout: docs
lang: ko
path_key: "/docs/components/filesystem-watcher.html"
nav_active: docs
permalink: /ko/docs/components/filesystem-watcher.html
page_title: "FileSystemWatcher"
description: "TrueAsync의 FileSystemWatcher -- foreach 반복 지원, 이벤트 버퍼링, 두 가지 저장 모드를 갖춘 영구적 파일 시스템 관찰자."
---

# FileSystemWatcher: 파일 시스템 모니터링

## FileSystemWatcher란

`Async\FileSystemWatcher`는 파일 및 디렉토리 변경 사항에 대한 영구적인 관찰자입니다.
일회성 접근 방식과 달리, FileSystemWatcher는 지속적으로 실행되며 표준 `foreach` 반복을 통해 이벤트를 전달합니다:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/path/to/dir');

foreach ($watcher as $event) {
    echo "{$event->filename}: renamed={$event->renamed}, changed={$event->changed}\n";
}
?>
```

반복은 버퍼가 비어 있을 때 자동으로 코루틴을 일시 중단하고 새 이벤트가 도착하면 재개합니다.

## FileSystemEvent

각 이벤트는 네 개의 readonly 속성을 가진 `Async\FileSystemEvent` 객체입니다:

| 속성       | 타입      | 설명                                                    |
|------------|-----------|--------------------------------------------------------|
| `path`     | `string`  | `FileSystemWatcher` 생성자에 전달된 경로                  |
| `filename` | `?string` | 이벤트를 발생시킨 파일 이름 (`null`일 수 있음)             |
| `renamed`  | `bool`    | `true` -- 파일이 생성, 삭제 또는 이름 변경됨               |
| `changed`  | `bool`    | `true` -- 파일 내용이 수정됨                              |

## 두 가지 버퍼링 모드

### Coalesce (기본값)

coalesce 모드에서는 `path/filename` 키로 이벤트가 그룹화됩니다. 반복자가 처리하기 전에 파일이 여러 번 변경된 경우, 버퍼에는 병합된 플래그를 가진 하나의 이벤트만 남습니다:

```php
<?php
use Async\FileSystemWatcher;

// coalesce: true -- 기본값
$watcher = new FileSystemWatcher('/tmp/dir');
?>
```

이는 일반적인 시나리오에 최적입니다: 핫 리로드, 설정 변경 재빌드, 동기화.

### Raw

raw 모드에서는 OS의 각 이벤트가 순환 버퍼에 별도의 요소로 저장됩니다:

```php
<?php
use Async\FileSystemWatcher;

$watcher = new FileSystemWatcher('/tmp/dir', coalesce: false);
?>
```

정확한 순서와 이벤트 수가 중요한 경우에 적합합니다 -- 감사, 로깅, 복제.

## 생성자

```php
new FileSystemWatcher(
    string $path,
    bool $recursive = false,
    bool $coalesce = true
)
```

**`path`** -- 파일 또는 디렉토리 경로. 경로가 존재하지 않으면 `Error`가 발생합니다.

**`recursive`** -- `true`이면 중첩 디렉토리도 모니터링됩니다.

**`coalesce`** -- 버퍼링 모드: `true` -- 이벤트 병합 (HashTable), `false` -- 모든 이벤트 (순환 버퍼).

모니터링은 객체 생성 즉시 시작됩니다. 이벤트는 반복이 시작되기 전에도 버퍼링됩니다.

## 수명 주기

### close()

모니터링을 중지합니다. 현재 반복은 버퍼에 남아 있는 이벤트를 처리한 후 종료됩니다. 멱등성 -- 반복 호출이 안전합니다.

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

### 자동 닫기

`FileSystemWatcher` 객체가 파괴되면(스코프를 벗어남) 모니터링이 자동으로 중지됩니다.

## 예제

### 핫 리로드 설정

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

### 시간 제한 모니터링

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

### 여러 디렉토리 모니터링

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

### 감사를 위한 Raw 모드

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

## Scope를 통한 취소

FileSystemWatcher는 스코프가 취소되면 올바르게 종료됩니다:

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

## 참고

- [코루틴](/ko/docs/components/coroutines.html) -- 동시성의 기본 단위
- [Channel](/ko/docs/components/channels.html) -- 데이터 전송을 위한 CSP 채널
- [취소](/ko/docs/components/cancellation.html) -- 취소 메커니즘
