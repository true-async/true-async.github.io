---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/count.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/count.html
page_title: "ThreadChannel::count()"
description: "스레드 채널에 현재 버퍼링된 값의 수를 가져옵니다."
---

# ThreadChannel::count

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::count(): int
```

채널 버퍼에 현재 보유된 값의 수를 반환합니다.

`ThreadChannel`은 `Countable` 인터페이스를 구현하므로, `count($channel)`을 사용할 수도 있습니다.

버퍼 없는 채널(`capacity = 0`)의 경우, 버퍼링 없이 스레드 간에 값이 직접 전달되므로 항상 `0`을 반환합니다.

카운트는 원자적으로 읽히며, 다른 스레드가 동시에 전송하거나 수신하더라도 호출 시점에 정확합니다.

## 반환값

버퍼에 현재 있는 값의 수 (`int`).

## 예제

### 예제 #1 버퍼 채움 수준 모니터링

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(10);

$channel->send('a');
$channel->send('b');
$channel->send('c');

echo $channel->count();   // 3
echo count($channel);     // 3 — Countable 인터페이스

$channel->recv();
echo $channel->count();   // 2
```

### 예제 #2 모니터 스레드에서 채널 부하 로깅

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $tasks = new ThreadChannel(100);

    // 모니터 스레드: 주기적으로 버퍼 사용량 로깅
    $monitor = spawn_thread(function() use ($tasks) {
        while (!$tasks->isClosed()) {
            $pct = $tasks->capacity() > 0
                ? round($tasks->count() / $tasks->capacity() * 100)
                : 0;
            echo "Buffer: {$tasks->count()}/{$tasks->capacity()} ({$pct}%)\n";
            // 실제 스레드에서는 여기서 sleep() 또는 세마포어를 사용합니다
        }
    });

    // ... 생산자와 소비자 스레드 ...

    $tasks->close();
    await($monitor);
});
```

## 참고

- [ThreadChannel::capacity](/ko/docs/reference/thread-channel/capacity.html) — 채널 용량
- [ThreadChannel::isEmpty](/ko/docs/reference/thread-channel/is-empty.html) — 버퍼가 비었는지 확인
- [ThreadChannel::isFull](/ko/docs/reference/thread-channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
