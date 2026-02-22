---
layout: docs
lang: ko
path_key: "/docs/reference/channel/is-empty.html"
nav_active: docs
permalink: /ko/docs/reference/channel/is-empty.html
page_title: "Channel::isEmpty"
description: "채널 버퍼가 비어있는지 확인합니다."
---

# Channel::isEmpty

(PHP 8.6+, True Async 1.0)

```php
public Channel::isEmpty(): bool
```

채널 버퍼가 비어있는지 (수신 가능한 값이 없는지) 확인합니다.

랑데부 채널 (`capacity = 0`)의 경우, 데이터가 버퍼링 없이 직접 전송되므로
항상 `true`를 반환합니다.

## 반환값

`true` — 버퍼가 비어있음.
`false` — 버퍼에 값이 있음.

## 예제

### 예제 #1 사용 가능한 데이터 확인

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isEmpty() ? "empty" : "has data"; // "empty"

$channel->send(42);

echo $channel->isEmpty() ? "empty" : "has data"; // "has data"
```

### 예제 #2 배치 데이터 처리

```php
<?php

use Async\Channel;

$channel = new Channel(100);

spawn(function() use ($channel) {
    while (!$channel->isClosed() || !$channel->isEmpty()) {
        if ($channel->isEmpty()) {
            delay(50); // wait for data to arrive
            continue;
        }

        $batch = [];
        while (!$channel->isEmpty() && count($batch) < 10) {
            $batch[] = $channel->recv();
        }

        processBatch($batch);
    }
});
```

## 같이 보기

- [Channel::isFull](/ko/docs/reference/channel/is-full.html) --- 버퍼가 가득 찼는지 확인
- [Channel::count](/ko/docs/reference/channel/count.html) --- 버퍼의 값 개수
- [Channel::recv](/ko/docs/reference/channel/recv.html) --- 값 수신
