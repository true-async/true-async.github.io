---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/is-empty.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/is-empty.html
page_title: "ThreadChannel::isEmpty()"
description: "스레드 채널 버퍼에 현재 값이 없는지 확인합니다."
---

# ThreadChannel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isEmpty(): bool
```

채널 버퍼에 값이 없으면 `true`를 반환합니다.

버퍼링 없이 스레드 간에 데이터가 직접 전달되므로, 버퍼 없는 채널(`capacity = 0`)의 경우 항상 `true`를 반환합니다.

`isEmpty()`는 스레드 안전합니다. 결과는 호출 시점의 상태를 반영하며; 다른 스레드가 곧바로 채널에 값을 넣을 수 있습니다.

## 반환값

`true` — 버퍼가 비어 있습니다(사용 가능한 값 없음).
`false` — 버퍼에 적어도 하나의 값이 있습니다.

## 예제

### 예제 #1 수신 전 버퍼에 데이터가 있는지 확인

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"

$channel->recv();

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"
```

### 예제 #2 닫힌 채널을 비우는 소비자

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(50);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 20; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // 읽을 것이 있거나 채널이 닫힐 때까지 기다림
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            if ($channel->isEmpty()) {
                // 버퍼가 잠시 비어 있음 — 양보하고 재시도
                continue;
            }
            try {
                echo $channel->recv(), "\n";
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
    });

    await($producer);
    await($consumer);
});
```

## 참고

- [ThreadChannel::isFull](/ko/docs/reference/thread-channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [ThreadChannel::count](/ko/docs/reference/thread-channel/count.html) — 버퍼의 값 수
- [ThreadChannel::recv](/ko/docs/reference/thread-channel/recv.html) — 값 수신
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
