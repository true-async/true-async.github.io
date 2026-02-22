---
layout: docs
lang: ko
path_key: "/docs/reference/channel/capacity.html"
nav_active: docs
permalink: /ko/docs/reference/channel/capacity.html
page_title: "Channel::capacity"
description: "채널 버퍼 용량을 가져옵니다."
---

# Channel::capacity

(PHP 8.6+, True Async 1.0)

```php
public Channel::capacity(): int
```

생성자를 통해 생성 시 설정된 채널 용량을 반환합니다.

- `0` — 랑데부 채널 (버퍼 없음).
- 양수 — 최대 버퍼 크기.

이 값은 채널의 수명 동안 변경되지 않습니다.

## 반환값

채널 버퍼 용량 (`int`).

## 예제

### 예제 #1 용량 확인

```php
<?php

use Async\Channel;

$rendezvous = new Channel();
echo $rendezvous->capacity(); // 0

$buffered = new Channel(100);
echo $buffered->capacity(); // 100
```

### 예제 #2 채널 타입에 따른 적응형 로직

```php
<?php

use Async\Channel;

function processChannel(Channel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Rendezvous channel: each send waits for a receiver\n";
    } else {
        echo "Buffered channel: capacity {$ch->capacity()}\n";
        echo "Free: " . ($ch->capacity() - $ch->count()) . " slots\n";
    }
}
```

## 같이 보기

- [Channel::__construct](/ko/docs/reference/channel/construct.html) — 채널 생성
- [Channel::count](/ko/docs/reference/channel/count.html) — 버퍼의 값 개수
- [Channel::isFull](/ko/docs/reference/channel/is-full.html) — 버퍼가 가득 찼는지 확인
