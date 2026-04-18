---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/is-full.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/is-full.html
page_title: "ThreadChannel::isFull()"
description: "스레드 채널 버퍼가 최대 용량까지 채워졌는지 확인합니다."
---

# ThreadChannel::isFull

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isFull(): bool
```

채널 버퍼가 최대 용량에 도달했으면 `true`를 반환합니다.

버퍼가 없어 모든 `send()`가 일치하는 `recv()`를 기다려야 하므로, 버퍼 없는 채널(`capacity = 0`)의 경우 항상 `true`를 반환합니다.

`isFull()`은 스레드 안전합니다. 결과는 호출 시점의 상태를 반영하며; 다른 스레드가 곧바로 슬롯을 비울 수 있습니다.

## 반환값

`true` — 버퍼가 용량에 도달했습니다(또는 버퍼 없는 채널입니다).
`false` — 버퍼에 적어도 하나의 빈 슬롯이 있습니다.

## 예제

### 예제 #1 전송 전 버퍼 가득 참 확인

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(3);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('x');
$channel->send('y');
$channel->send('z');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### 예제 #2 생산자 스레드에서 백프레셔 모니터링

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        $items = range(1, 30);
        foreach ($items as $item) {
            if ($channel->isFull()) {
                // 버퍼가 현재 가득 참 — send()가 차단됩니다;
                // 관찰 가능성을 위해 백프레셔를 로깅합니다
                error_log("ThreadChannel back-pressure: buffer full");
            }
            $channel->send($item); // 공간이 생길 때까지 차단
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                // 느린 소비자 시뮬레이션
                $val = $channel->recv();
                // $val 처리 ...
            }
        } catch (\Async\ChannelClosedException) {
            echo "Done\n";
        }
    });

    await($producer);
    await($consumer);
});
```

## 참고

- [ThreadChannel::isEmpty](/ko/docs/reference/thread-channel/is-empty.html) — 버퍼가 비었는지 확인
- [ThreadChannel::capacity](/ko/docs/reference/thread-channel/capacity.html) — 채널 용량
- [ThreadChannel::count](/ko/docs/reference/thread-channel/count.html) — 버퍼의 값 수
- [ThreadChannel::send](/ko/docs/reference/thread-channel/send.html) — 값 전송 (가득 찬 경우 차단)
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
