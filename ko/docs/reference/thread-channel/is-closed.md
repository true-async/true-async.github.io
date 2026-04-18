---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/is-closed.html
page_title: "ThreadChannel::isClosed()"
description: "스레드 채널이 닫혔는지 확인합니다."
---

# ThreadChannel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::isClosed(): bool
```

채널이 `close()`를 통해 닫혔으면 `true`를 반환합니다.

닫힌 채널은 `send()`를 통해 새 값을 받지 않지만, `recv()`는 버퍼가 비워질 때까지 버퍼에 남아 있는 값을 계속 반환합니다.

`isClosed()`는 스레드 안전하며 동기화 없이 어떤 스레드에서도 호출할 수 있습니다.

## 반환값

`true` — 채널이 닫혔습니다.
`false` — 채널이 열려 있습니다.

## 예제

### 예제 #1 메인 스레드에서 채널 상태 확인

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    echo $channel->isClosed() ? "closed" : "open"; // "open"

    $channel->send('data');
    $channel->close();

    echo $channel->isClosed() ? "closed" : "open"; // "closed"

    // 닫기 전 버퍼링된 값은 여전히 읽을 수 있습니다
    echo $channel->recv(), "\n"; // "data"
});
```

### 예제 #2 isClosed()로 보호된 소비자 루프

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 0; $i < 10; $i++) {
            $channel->send($i);
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        // 닫히고 버퍼가 빌 때까지 계속 읽기
        while (!$channel->isClosed() || !$channel->isEmpty()) {
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

- [ThreadChannel::close](/ko/docs/reference/thread-channel/close.html) — 채널 닫기
- [ThreadChannel::isEmpty](/ko/docs/reference/thread-channel/is-empty.html) — 버퍼가 비었는지 확인
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
