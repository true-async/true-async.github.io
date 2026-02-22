---
layout: docs
lang: ko
path_key: "/docs/reference/channel/is-full.html"
nav_active: docs
permalink: /ko/docs/reference/channel/is-full.html
page_title: "Channel::isFull"
description: "채널 버퍼가 가득 찼는지 확인합니다."
---

# Channel::isFull

(PHP 8.6+, True Async 1.0)

```php
public Channel::isFull(): bool
```

채널 버퍼가 최대 용량까지 채워졌는지 확인합니다.

랑데부 채널 (`capacity = 0`)의 경우, 버퍼가 없으므로
항상 `true`를 반환합니다.

## 반환값

`true` — 버퍼가 가득 참 (또는 랑데부 채널).
`false` — 버퍼에 여유 공간이 있음.

## 예제

### 예제 #1 버퍼 채움 상태 확인

```php
<?php

use Async\Channel;

$channel = new Channel(2);

echo $channel->isFull() ? "full" : "has space"; // "has space"

$channel->send('a');
$channel->send('b');

echo $channel->isFull() ? "full" : "has space"; // "full"
```

### 예제 #2 적응형 전송 속도

```php
<?php

use Async\Channel;

$channel = new Channel(50);

spawn(function() use ($channel) {
    foreach (readLargeFile('data.csv') as $line) {
        if ($channel->isFull()) {
            echo "Buffer full, slowing down processing\n";
        }
        $channel->send($line); // suspends if full
    }
    $channel->close();
});
```

## 같이 보기

- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) --- 버퍼가 비어있는지 확인
- [Channel::capacity](/ko/docs/reference/channel/capacity.html) --- 채널 용량
- [Channel::count](/ko/docs/reference/channel/count.html) --- 버퍼의 값 개수
- [Channel::sendAsync](/ko/docs/reference/channel/send-async.html) --- 비블로킹 전송
