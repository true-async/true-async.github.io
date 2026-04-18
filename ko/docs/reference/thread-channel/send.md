---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/send.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/send.html
page_title: "ThreadChannel::send()"
description: "스레드 채널에 값을 전송합니다. 채널이 즉시 값을 받을 수 없으면 호출 스레드를 차단합니다."
---

# ThreadChannel::send

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::send(mixed $value): void
```

채널에 값을 전송합니다. 이것은 **차단** 작업입니다 — 채널이 값을 즉시 받을 수 없으면 호출 스레드가 차단됩니다.

- **버퍼 없는 채널**(`capacity = 0`)의 경우, 다른 스레드가 `recv()`를 호출할 때까지 스레드가 차단됩니다.
- **버퍼 있는 채널**의 경우, 버퍼가 가득 찬 경우에만 스레드가 차단되며, 수신자가 슬롯을 비우면 차단 해제됩니다.

코루틴을 일시 중단하는 `Channel::send()`와 달리, `ThreadChannel::send()`는 전체 OS 스레드를 차단합니다. 이에 따라 아키텍처를 설계하세요 — 예를 들어, 차단할 수 있도록 전송 스레드를 자유롭게 유지하거나, 경합을 줄이기 위해 버퍼 있는 채널을 사용하세요.

값은 채널에 넣기 전에 **깊은 복사**됩니다. 클로저, 리소스, 직렬화할 수 없는 객체는 `ThreadTransferException`을 발생시킵니다.

## 매개변수

**value**
: 전송할 값. 직렬화 가능한 모든 타입(스칼라, 배열, 또는 직렬화 가능한 객체)이 될 수 있습니다.

## 오류

- 채널이 이미 닫혀 있으면 `Async\ChannelClosedException`을 던집니다.
- 값이 크로스 스레드 전송을 위해 직렬화될 수 없으면 `Async\ThreadTransferException`을 던집니다.

## 예제

### 예제 #1 워커 스레드에서 결과 전송

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $result = $i * $i;
            $channel->send($result);
        }
        $channel->close();
    });

    await($worker);

    while (!$channel->isClosed() || !$channel->isEmpty()) {
        try {
            echo $channel->recv(), "\n";
        } catch (\Async\ChannelClosedException) {
            break;
        }
    }
});
```

### 예제 #2 스레드 간 버퍼 없는 핸드셰이크

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $requests  = new ThreadChannel(); // 버퍼 없음
    $responses = new ThreadChannel();

    $server = spawn_thread(function() use ($requests, $responses) {
        $req = $requests->recv();             // 요청이 올 때까지 차단
        $responses->send(strtoupper($req));   // 응답이 수락될 때까지 차단
    });

    $requests->send('hello');                 // 서버가 recv()를 호출할 때까지 차단
    $reply = $responses->recv();              // 서버가 send()를 호출할 때까지 차단
    await($server);

    echo $reply, "\n"; // "HELLO"
});
```

### 예제 #3 닫힌 채널 처리

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(1);
    $channel->close();

    $thread = spawn_thread(function() use ($channel) {
        try {
            $channel->send('too late');
        } catch (\Async\ChannelClosedException $e) {
            return "Send failed: " . $e->getMessage();
        }
    });

    echo await($thread), "\n";
});
```

## 참고

- [ThreadChannel::recv](/ko/docs/reference/thread-channel/recv.html) — 채널에서 값 수신
- [ThreadChannel::isFull](/ko/docs/reference/thread-channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [ThreadChannel::close](/ko/docs/reference/thread-channel/close.html) — 채널 닫기
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
