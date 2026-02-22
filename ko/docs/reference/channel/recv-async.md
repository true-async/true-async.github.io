---
layout: docs
lang: ko
path_key: "/docs/reference/channel/recv-async.html"
nav_active: docs
permalink: /ko/docs/reference/channel/recv-async.html
page_title: "Channel::recvAsync"
description: "채널에서 비블로킹으로 값을 수신하고 Future를 반환합니다."
---

# Channel::recvAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::recvAsync(): Future
```

채널에서 비블로킹으로 값을 수신하고, 나중에 대기할 수 있는 `Future` 객체를
반환합니다.

`recv()`와 달리 이 메서드는 현재 코루틴을 즉시 **일시 중단하지 않습니다**.
대신 값이 사용 가능해지면 해결되는 `Future`가 반환됩니다.

## 반환값

채널에서 수신한 값으로 해결될 `Future` 객체.

## 예제

### 예제 #1 비블로킹 수신

```php
<?php

use Async\Channel;

$channel = new Channel(3);

spawn(function() use ($channel) {
    $channel->send('data A');
    $channel->send('data B');
    $channel->close();
});

spawn(function() use ($channel) {
    $futureA = $channel->recvAsync();
    $futureB = $channel->recvAsync();

    // Can perform other work while data is not yet needed
    doSomeWork();

    echo await($futureA) . "\n"; // "data A"
    echo await($futureB) . "\n"; // "data B"
});
```

### 예제 #2 여러 채널에서 병렬 수신

```php
<?php

use Async\Channel;

$orders = new Channel(10);
$notifications = new Channel(10);

spawn(function() use ($orders, $notifications) {
    $orderFuture = $orders->recvAsync();
    $notifFuture = $notifications->recvAsync();

    // Wait for the first available value from any channel
    [$result, $index] = awaitAnyOf($orderFuture, $notifFuture);

    echo "Received from channel #$index: $result\n";
});
```

## 같이 보기

- [Channel::recv](/ko/docs/reference/channel/recv.html) — 블로킹 수신
- [Channel::sendAsync](/ko/docs/reference/channel/send-async.html) — 비블로킹 전송
- [await](/ko/docs/reference/await.html) — Future 대기
