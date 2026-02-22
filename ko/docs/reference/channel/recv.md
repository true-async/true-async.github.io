---
layout: docs
lang: ko
path_key: "/docs/reference/channel/recv.html"
nav_active: docs
permalink: /ko/docs/reference/channel/recv.html
page_title: "Channel::recv"
description: "채널에서 값을 수신합니다 (블로킹 연산)."
---

# Channel::recv

(PHP 8.6+, True Async 1.0)

```php
public Channel::recv(int $timeoutMs = 0): mixed
```

채널에서 다음 값을 수신합니다. 이것은 블로킹 연산입니다 — 채널에 사용 가능한 값이
없으면 현재 코루틴이 일시 중단됩니다.

채널이 닫혀 있고 버퍼가 비어있으면 `ChannelException`이 발생합니다.
채널이 닫혀 있지만 버퍼에 값이 남아있으면 해당 값이 반환됩니다.

## 매개변수

**timeoutMs**
: 최대 대기 시간 (밀리초).
  `0` — 무한 대기 (기본값).
  타임아웃이 초과되면 `TimeoutException`이 발생합니다.

## 반환값

채널의 다음 값 (`mixed`).

## 오류

- 채널이 닫혀 있고 버퍼가 비어있으면 `Async\ChannelException`을 발생시킵니다.
- 타임아웃이 만료되면 `Async\TimeoutException`을 발생시킵니다.

## 예제

### 예제 #1 채널에서 값 수신

```php
<?php

use Async\Channel;

$channel = new Channel(5);

spawn(function() use ($channel) {
    for ($i = 1; $i <= 5; $i++) {
        $channel->send($i);
    }
    $channel->close();
});

spawn(function() use ($channel) {
    try {
        while (true) {
            $value = $channel->recv();
            echo "Received: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "Channel closed and empty\n";
    }
});
```

### 예제 #2 타임아웃을 지정한 수신

```php
<?php

use Async\Channel;

$channel = new Channel();

spawn(function() use ($channel) {
    try {
        $value = $channel->recv(timeoutMs: 2000);
        echo "Received: $value\n";
    } catch (\Async\TimeoutException) {
        echo "No data received within 2 seconds\n";
    }
});
```

## 같이 보기

- [Channel::recvAsync](/ko/docs/reference/channel/recv-async.html) — 비블로킹 수신
- [Channel::send](/ko/docs/reference/channel/send.html) — 채널에 값 전송
- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) — 버퍼가 비어있는지 확인
- [Channel::getIterator](/ko/docs/reference/channel/get-iterator.html) — foreach로 채널 반복
