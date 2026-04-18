---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/capacity.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/capacity.html
page_title: "ThreadChannel::capacity()"
description: "스레드 채널의 버퍼 용량을 가져옵니다."
---

# ThreadChannel::capacity

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::capacity(): int
```

생성 시점에 설정된 채널 용량을 반환합니다.

- `0` — 버퍼 없는(동기) 채널: 수신자가 준비될 때까지 `send()`가 차단됩니다.
- 양수 — 버퍼가 동시에 보유할 수 있는 최대 값의 수.

용량은 채널의 수명 동안 고정되며 변경되지 않습니다.

## 반환값

채널 버퍼 용량 (`int`).

## 예제

### 예제 #1 용량 확인

```php
<?php

use Async\ThreadChannel;

$unbuffered = new ThreadChannel();
echo $unbuffered->capacity(); // 0

$buffered = new ThreadChannel(64);
echo $buffered->capacity(); // 64
```

### 예제 #2 채널 유형에 따른 적응형 로직

```php
<?php

use Async\ThreadChannel;

function describeChannel(ThreadChannel $ch): void {
    if ($ch->capacity() === 0) {
        echo "Unbuffered: each send() blocks until recv() is called\n";
    } else {
        $free = $ch->capacity() - $ch->count();
        echo "Buffered: capacity {$ch->capacity()}, {$free} slot(s) free\n";
    }
}

$ch = new ThreadChannel(8);
$ch->send('item');
describeChannel($ch); // "Buffered: capacity 8, 7 slot(s) free"
```

## 참고

- [ThreadChannel::__construct](/ko/docs/reference/thread-channel/__construct.html) — 채널 생성
- [ThreadChannel::count](/ko/docs/reference/thread-channel/count.html) — 현재 버퍼에 있는 값의 수
- [ThreadChannel::isFull](/ko/docs/reference/thread-channel/is-full.html) — 버퍼가 가득 찼는지 확인
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
