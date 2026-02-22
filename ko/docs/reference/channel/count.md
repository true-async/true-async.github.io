---
layout: docs
lang: ko
path_key: "/docs/reference/channel/count.html"
nav_active: docs
permalink: /ko/docs/reference/channel/count.html
page_title: "Channel::count"
description: "채널 버퍼의 값 개수를 가져옵니다."
---

# Channel::count

(PHP 8.6+, True Async 1.0)

```php
public Channel::count(): int
```

채널 버퍼에 현재 저장된 값의 개수를 반환합니다.

Channel은 `Countable` 인터페이스를 구현하므로 `count($channel)`을 사용할 수 있습니다.

랑데부 채널 (`capacity = 0`)의 경우 항상 `0`을 반환합니다.

## 반환값

버퍼의 값 개수 (`int`).

## 예제

### 예제 #1 버퍼 채움 수준 모니터링

```php
<?php

use Async\Channel;

$channel = new Channel(5);

$channel->send(1);
$channel->send(2);
$channel->send(3);

echo count($channel);        // 3
echo $channel->count();      // 3

$channel->recv();
echo count($channel);        // 2
```

### 예제 #2 채널 부하 로깅

```php
<?php

use Async\Channel;

$tasks = new Channel(100);

spawn(function() use ($tasks) {
    while (!$tasks->isClosed()) {
        $usage = $tasks->count() / $tasks->capacity() * 100;
        echo "Buffer is " . round($usage) . "% full\n";
        delay(1000);
    }
});
```

## 같이 보기

- [Channel::capacity](/ko/docs/reference/channel/capacity.html) --- 채널 용량
- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) --- 버퍼가 비어있는지 확인
- [Channel::isFull](/ko/docs/reference/channel/is-full.html) --- 버퍼가 가득 찼는지 확인
