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
public Channel::send(mixed $value, ?Completable $cancellationToken = null): void
```

채널에 값을 전송합니다. 이것은 블로킹 연산입니다 — 채널이 즉시 값을 받을 수 없으면
현재 코루틴이 일시 중단됩니다.

**랑데부 채널** (`capacity = 0`)의 경우, 송신자는 다른 코루틴이 `recv()`를 호출할 때까지 대기합니다.
**버퍼 채널**의 경우, 송신자는 버퍼가 가득 찼을 때만 대기합니다.

## 매개변수

**value**
: 전송할 값. 모든 타입이 가능합니다.

**cancellationToken**
: 취소 토큰(`Completable`)으로, 임의의 조건에 따라 대기를 중단할 수 있습니다.
  `null` — 무한 대기 (기본값).
  토큰이 완료되면 연산이 중단되고 `CancelledException`이 발생합니다.
  시간 제한이 필요한 경우 `Async\timeout()`을 사용할 수 있습니다.

## 오류

- 채널이 닫혀 있으면 `Async\ChannelException`을 발생시킵니다.
- 취소 토큰이 완료되면 `Async\CancelledException`을 발생시킵니다.

## 예제

### 예제 #1 채널에 값 전송

```php
<?php

use Async\Channel;

$channel = new Channel(1);

spawn(function() use ($channel) {
    $channel->send('첫 번째');  // 버퍼에 저장됨
    $channel->send('두 번째'); // 공간이 확보될 때까지 대기
    $channel->close();
});

spawn(function() use ($channel) {
    echo $channel->recv() . "\n"; // "첫 번째"
    echo $channel->recv() . "\n"; // "두 번째"
});
```

### 예제 #2 타임아웃을 지정한 전송

```php
<?php

use Async\Channel;

$channel = new Channel(0); // 랑데부

spawn(function() use ($channel) {
    try {
        $channel->send('데이터', Async\timeout(1000));
    } catch (\Async\CancelledException $e) {
        echo "타임아웃: 1초 내에 아무도 값을 수신하지 않았습니다\n";
    }
});
```

### 예제 #3 사용자 정의 취소 토큰을 사용한 전송

```php
<?php

use Async\Channel;
use Async\Future;

$channel = new Channel(0);
$cancel = new Future();

spawn(function() use ($channel, $cancel) {
    try {
        $channel->send('데이터', $cancel);
    } catch (\Async\CancelledException $e) {
        echo "전송이 취소되었습니다\n";
    }
});

// 다른 코루틴에서 연산 취소
spawn(function() use ($cancel) {
    Async\delay(500);
    $cancel->complete(null);
});
```

## 같이 보기

- [Channel::sendAsync](/ko/docs/reference/channel/send-async.html) — 비블로킹 전송
- [Channel::recv](/ko/docs/reference/channel/recv.html) — 채널에서 값 수신
- [Channel::isFull](/ko/docs/reference/channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [Channel::close](/ko/docs/reference/channel/close.html) — 채널 닫기
