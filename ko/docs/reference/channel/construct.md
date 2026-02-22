---
layout: docs
lang: ko
path_key: "/docs/reference/channel/construct.html"
nav_active: docs
permalink: /ko/docs/reference/channel/construct.html
page_title: "Channel::__construct"
description: "코루틴 간 데이터 교환을 위한 새로운 채널을 생성합니다."
---

# Channel::__construct

(PHP 8.6+, True Async 1.0)

```php
public Channel::__construct(int $capacity = 0)
```

코루틴 간 데이터 전달을 위한 새로운 채널을 생성합니다.

채널은 코루틴이 안전하게 데이터를 교환할 수 있게 하는 동기화 프리미티브입니다.
채널의 동작은 `$capacity` 매개변수에 따라 달라집니다:

- **`capacity = 0`** — 랑데부 채널 (버퍼 없음). `send()` 연산은 다른 코루틴이
  `recv()`를 호출할 때까지 송신자를 일시 중단합니다. 이는 동기식 데이터 전송을 보장합니다.
- **`capacity > 0`** — 버퍼 채널. `send()` 연산은 버퍼에 공간이 있는 한 블로킹되지 않습니다.
  버퍼가 가득 차면 공간이 확보될 때까지 송신자가 일시 중단됩니다.

## 매개변수

**capacity**
: 채널 내부 버퍼의 용량.
  `0` — 랑데부 채널 (기본값), send는 receive가 올 때까지 블로킹.
  양수 — 버퍼 크기.

## 예제

### 예제 #1 랑데부 채널 (버퍼 없음)

```php
<?php

use Async\Channel;

$channel = new Channel(); // capacity = 0

spawn(function() use ($channel) {
    $channel->send('hello'); // suspends until someone calls recv()
    echo "Sent\n";
});

spawn(function() use ($channel) {
    $value = $channel->recv(); // receives 'hello', unblocks the sender
    echo "Received: $value\n";
});
```

### 예제 #2 버퍼 채널

```php
<?php

use Async\Channel;

$channel = new Channel(3); // buffer for 3 elements

spawn(function() use ($channel) {
    $channel->send(1); // does not block — buffer is empty
    $channel->send(2); // does not block — space available
    $channel->send(3); // does not block — last slot
    $channel->send(4); // suspends — buffer is full
});
```

## 같이 보기

- [Channel::send](/ko/docs/reference/channel/send.html) — 채널에 값 전송
- [Channel::recv](/ko/docs/reference/channel/recv.html) — 채널에서 값 수신
- [Channel::capacity](/ko/docs/reference/channel/capacity.html) — 채널 용량 가져오기
- [Channel::close](/ko/docs/reference/channel/close.html) — 채널 닫기
