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
public Channel::recv(?Completable $cancellationToken = null): mixed
```

채널에서 다음 값을 수신합니다. 이것은 블로킹 연산입니다 — 채널에 사용 가능한 값이
없으면 현재 코루틴이 일시 중단됩니다.

채널이 닫혀 있고 버퍼가 비어있으면 `ChannelException`이 발생합니다.
채널이 닫혀 있지만 버퍼에 값이 남아있으면 해당 값이 반환됩니다.

## 매개변수

**cancellationToken**
: 취소 토큰(`Completable`)으로, 임의의 조건에 따라 대기를 중단할 수 있습니다.
  `null` — 무한 대기 (기본값).
  토큰이 완료되면 연산이 중단되고 `CancelledException`이 발생합니다.
  시간 제한이 필요한 경우 `Async\timeout()`을 사용할 수 있습니다.

## 반환값

채널의 다음 값 (`mixed`).

## 오류

- 채널이 닫혀 있고 버퍼가 비어있으면 `Async\ChannelException`을 발생시킵니다.
- 취소 토큰이 완료되면 `Async\CancelledException`을 발생시킵니다.

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
            echo "수신됨: $value\n";
        }
    } catch (\Async\ChannelException) {
        echo "채널이 닫혔고 비어있습니다\n";
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
        $value = $channel->recv(Async\timeout(2000));
        echo "수신됨: $value\n";
    } catch (\Async\CancelledException) {
        echo "2초 내에 데이터가 도착하지 않았습니다\n";
    }
});
```

### 예제 #3 사용자 정의 취소 토큰을 사용한 수신

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel();
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $value = $channel->recv($cancel);
        echo "수신됨: $value\n";
    } catch (\Async\CancelledException) {
        echo "수신이 취소되었습니다\n";
    }
});

// 다른 코루틴에서 취소
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## 같이 보기

- [Channel::recvAsync](/ko/docs/reference/channel/recv-async.html) — 비블로킹 수신
- [Channel::send](/ko/docs/reference/channel/send.html) — 채널에 값 전송
- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) — 버퍼가 비어있는지 확인
- [Channel::getIterator](/ko/docs/reference/channel/get-iterator.html) — foreach로 채널 반복
