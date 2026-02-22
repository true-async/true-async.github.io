---
layout: docs
lang: ko
path_key: "/docs/reference/channel/send-async.html"
nav_active: docs
permalink: /ko/docs/reference/channel/send-async.html
page_title: "Channel::sendAsync"
description: "채널에 비블로킹으로 값을 전송합니다."
---

# Channel::sendAsync

(PHP 8.6+, True Async 1.0)

```php
public Channel::sendAsync(mixed $value): bool
```

채널에 비블로킹으로 값 전송을 시도합니다.
`send()`와 달리 이 메서드는 **절대 코루틴을 일시 중단하지 않습니다**.

값이 성공적으로 전송되면 (버퍼에 저장되거나 대기 중인 수신자에게 전달되면)
`true`를 반환합니다. 버퍼가 가득 차 있거나 채널이 닫혀 있으면
`false`를 반환합니다.

## 매개변수

**value**
: 전송할 값. 모든 타입이 가능합니다.

## 반환값

`true` — 값이 성공적으로 전송됨.
`false` — 채널이 가득 차 있거나 닫혀 있어 값이 전송되지 않음.

## 예제

### 예제 #1 비블로킹 전송 시도

```php
<?php

use Async\Channel;

$channel = new Channel(2);

$channel->sendAsync('a'); // true — buffer is empty
$channel->sendAsync('b'); // true — space available
$result = $channel->sendAsync('c'); // false — buffer is full

echo $result ? "Sent" : "Channel full"; // "Channel full"
```

### 예제 #2 가용성 확인과 함께 전송

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $data = generateBatch();

    foreach ($data as $item) {
        if (!$channel->sendAsync($item)) {
            // Buffer is full — fall back to blocking send
            $channel->send($item);
        }
    }

    $channel->close();
});
```

## 같이 보기

- [Channel::send](/ko/docs/reference/channel/send.html) — 블로킹 전송
- [Channel::isFull](/ko/docs/reference/channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [Channel::isClosed](/ko/docs/reference/channel/is-closed.html) — 채널이 닫혔는지 확인
