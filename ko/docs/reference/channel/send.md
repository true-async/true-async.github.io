---
layout: docs
lang: ko
path_key: "/docs/reference/channel/send.html"
nav_active: docs
permalink: /ko/docs/reference/channel/send.html
page_title: "Channel::send"
description: "채널에 값을 전송합니다 (블로킹 연산)."
---

# Channel::send

(PHP 8.6+, True Async 1.0)

```php
public Channel::send(mixed $value, int $timeoutMs = 0): void
```

채널에 값을 전송합니다. 이것은 블로킹 연산입니다 — 채널이 즉시 값을 받을 수 없으면
현재 코루틴이 일시 중단됩니다.

**랑데부 채널** (`capacity = 0`)의 경우, 송신자는 다른 코루틴이 `recv()`를 호출할 때까지 대기합니다.
**버퍼 채널**의 경우, 송신자는 버퍼가 가득 찼을 때만 대기합니다.

## 매개변수

**value**
: 전송할 값. 모든 타입이 가능합니다.

**timeoutMs**
: 최대 대기 시간 (밀리초).
  `0` — 무한 대기 (기본값).
  타임아웃이 초과되면 `TimeoutException`이 발생합니다.

## 오류

- 채널이 닫혀 있으면 `Async\ChannelException`을 발생시킵니다.
- 타임아웃이 만료되면 `Async\TimeoutException`을 발생시킵니다.

## 예제

### 예제 #1 채널에 값 전송

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('first');  // placed in the buffer
    $channel->send('second'); // waits for space to free up
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "first"
    echo $channel->recv() . "\n"; // "second"
});
```

### 예제 #2 타임아웃을 지정한 전송

```php
<?php

use Async\Channel;

$channel = new Channel(0); // rendezvous

spawn(function() use ($channel) {
    try {
        $channel->send('data', timeoutMs: 1000);
    } catch (\Async\TimeoutException $e) {
        echo "Timeout: no one accepted the value within 1 second\n";
    }
});
```

## 같이 보기

- [Channel::sendAsync](/ko/docs/reference/channel/send-async.html) — 비블로킹 전송
- [Channel::recv](/ko/docs/reference/channel/recv.html) — 채널에서 값 수신
- [Channel::isFull](/ko/docs/reference/channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [Channel::close](/ko/docs/reference/channel/close.html) — 채널 닫기
