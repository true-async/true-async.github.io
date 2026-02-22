---
layout: docs
lang: ko
path_key: "/docs/reference/channel/is-closed.html"
nav_active: docs
permalink: /ko/docs/reference/channel/is-closed.html
page_title: "Channel::isClosed"
description: "채널이 닫혔는지 확인합니다."
---

# Channel::isClosed

(PHP 8.6+, True Async 1.0)

```php
public Channel::isClosed(): bool
```

`close()` 호출에 의해 채널이 닫혔는지 확인합니다.

닫힌 채널은 `send()`를 통한 새로운 값을 받지 않지만,
`recv()`를 통해 버퍼에 남은 값을 읽을 수 있습니다.

## 반환값

`true` — 채널이 닫힘.
`false` — 채널이 열려 있음.

## 예제

### 예제 #1 채널 상태 확인

```php
<?php

use Async\Channel;

$channel = new Channel(5);

echo $channel->isClosed() ? "closed" : "open"; // "open"

$channel->send('data');
$channel->close();

echo $channel->isClosed() ? "closed" : "open"; // "closed"

// You can still read the buffer even after closing
$value = $channel->recv(); // "data"
```

### 예제 #2 조건부 전송

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    while (!$channel->isClosed()) {
        $data = produceData();
        $channel->send($data);
        delay(100);
    }
    echo "Channel closed, stopping sends\n";
});
```

## 같이 보기

- [Channel::close](/ko/docs/reference/channel/close.html) — 채널 닫기
- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) — 버퍼가 비어있는지 확인
