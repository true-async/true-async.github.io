---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/close.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/close.html
page_title: "ThreadChannel::close()"
description: "스레드 채널을 닫아 더 이상 값이 전송되지 않음을 알립니다."
---

# ThreadChannel::close

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::close(): void
```

채널을 닫습니다. 닫힌 후:

- `send()`를 호출하면 `ChannelClosedException`이 던져집니다.
- `recv()`는 버퍼가 비워질 때까지 이미 버퍼에 있는 값을 계속 반환합니다.
  버퍼가 비워지면 `recv()`는 `ChannelClosedException`을 던집니다.
- 현재 `send()` 또는 `recv()`에서 차단된 스레드들은 차단 해제되고 `ChannelClosedException`을 받습니다.

이미 닫힌 채널에 `close()`를 호출하는 것은 아무 동작도 하지 않습니다 — 예외를 던지지 않습니다.

`close()`는 소비하는 측에 "스트림 종료"를 알리는 표준 방법입니다. 생산자는 모든 항목을 전송한 후 채널을 닫고; 소비자는 `ChannelClosedException`을 잡을 때까지 읽습니다.

`close()` 자체는 스레드 안전하며 어떤 스레드에서도 호출할 수 있습니다.

## 예제

### 예제 #1 생산자가 모든 항목 전송 후 닫기

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10);

    $producer = spawn_thread(function() use ($channel) {
        foreach (['alpha', 'beta', 'gamma'] as $item) {
            $channel->send($item);
        }
        $channel->close(); // 더 이상 데이터 없음을 알림
    });

    $consumer = spawn_thread(function() use ($channel) {
        try {
            while (true) {
                echo $channel->recv(), "\n";
            }
        } catch (\Async\ChannelClosedException) {
            echo "Stream ended\n";
        }
    });

    await($producer);
    await($consumer);
});
```

### 예제 #2 close가 대기 중인 수신자를 차단 해제

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // 버퍼 없음

    // 이 스레드는 값을 기다리며 recv()에서 차단됩니다
    $waiter = spawn_thread(function() use ($channel) {
        try {
            $channel->recv(); // 차단됨
        } catch (\Async\ChannelClosedException) {
            return "Unblocked by close()";
        }
    });

    // 다른 스레드에서 채널을 닫으면 — 대기자가 차단 해제됩니다
    spawn_thread(function() use ($channel) {
        $channel->close();
    });

    echo await($waiter), "\n";
});
```

### 예제 #3 close()를 두 번 호출해도 안전합니다

```php
<?php

use Async\ThreadChannel;

$channel = new ThreadChannel(5);
$channel->close();
$channel->close(); // 아무 동작 없음, 예외 던지지 않음

echo $channel->isClosed() ? "closed" : "open"; // "closed"
```

## 참고

- [ThreadChannel::isClosed](/ko/docs/reference/thread-channel/is-closed.html) — 채널이 닫혔는지 확인
- [ThreadChannel::recv](/ko/docs/reference/thread-channel/recv.html) — 닫힌 후 남은 값 수신
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
