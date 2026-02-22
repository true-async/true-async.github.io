---
layout: docs
lang: ko
path_key: "/docs/reference/channel/close.html"
nav_active: docs
permalink: /ko/docs/reference/channel/close.html
page_title: "Channel::close"
description: "추가 데이터 전송을 위해 채널을 닫습니다."
---

# Channel::close

(PHP 8.6+, True Async 1.0)

```php
public Channel::close(): void
```

채널을 닫습니다. 닫은 후:

- `send()` 호출 시 `ChannelException`이 발생합니다.
- `recv()` 호출 시 버퍼가 비어질 때까지 값을 계속 반환합니다.
  그 이후에 `recv()`는 `ChannelException`을 발생시킵니다.
- `send()` 또는 `recv()`에서 대기 중인 모든 코루틴은 `ChannelException`을 받습니다.
- `foreach`를 통한 반복은 버퍼가 비어지면 종료됩니다.

이미 닫힌 채널에 대해 `close()`를 다시 호출해도 오류가 발생하지 않습니다.

## 예제

### 예제 #1 데이터 전송 후 채널 닫기

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    for ($i = 0; $i < 5; $i++) {
        $channel->send($i);
    }
    $channel->close(); // signal to the receiver that no more data will come
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    // foreach terminates after closing and draining the buffer
    echo "Channel exhausted\n";
});
```

### 예제 #2 대기 중인 코루틴의 닫기 처리

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $channel->send('data'); // waiting for a receiver
    } catch (\Async\ChannelException $e) {
        echo "Channel closed: {$e->getMessage()}\n";
    }
});

spawn(function() use ($channel) {
    delay(100); // short delay
    $channel->close(); // unblocks the sender with an exception
});
```

## 같이 보기

- [Channel::isClosed](/ko/docs/reference/channel/is-closed.html) — 채널이 닫혔는지 확인
- [Channel::recv](/ko/docs/reference/channel/recv.html) — 값 수신 (버퍼 소비)
- [Channel::getIterator](/ko/docs/reference/channel/get-iterator.html) — 닫힐 때까지 반복
