---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/__construct.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/__construct.html
page_title: "ThreadChannel::__construct()"
description: "OS 스레드 간에 데이터를 교환하기 위한 새로운 스레드 안전 채널을 생성합니다."
---

# ThreadChannel::__construct

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::__construct(int $capacity = 0)
```

OS 스레드 간에 데이터를 전달하기 위한 새로운 스레드 안전 채널을 생성합니다.

`ThreadChannel`은 [`Channel`](/ko/docs/components/channels.html)의 크로스 스레드 대응물입니다.
`Channel`이 단일 스레드 내의 코루틴 간 통신을 위해 설계된 반면,
`ThreadChannel`은 **별도의 OS 스레드** 간에 데이터를 안전하게 전달할 수 있게 합니다 — 예를 들어,
메인 스레드와 `spawn_thread()`로 시작하거나 `ThreadPool`에 제출된 워커 스레드 간에.

채널의 동작은 `$capacity` 매개변수에 따라 달라집니다:

- **`capacity = 0`** — 버퍼 없는(동기) 채널. `send()`는 다른 스레드가 `recv()`를 호출할 때까지
  호출 스레드를 차단합니다. 이는 발신자가 계속하기 전에 수신자가 준비되었음을 보장합니다.
- **`capacity > 0`** — 버퍼 있는 채널. 버퍼에 공간이 있는 한 `send()`는 차단하지 않습니다.
  버퍼가 가득 차면, 공간이 생길 때까지 호출 스레드를 차단합니다.

채널을 통해 전달되는 모든 값은 **깊은 복사**됩니다 — `spawn_thread()`와 동일한 직렬화 규칙이
적용됩니다. 직렬화할 수 없는 객체(예: 클로저, 리소스, 참조가 있는 `stdClass`)는 `ThreadTransferException`을 발생시킵니다.

## 매개변수

**capacity**
: 채널 내부 버퍼의 용량.
  `0` — 버퍼 없는 채널(기본값), `send()`는 수신자가 준비될 때까지 차단합니다.
  양수 — 버퍼 크기; `send()`는 버퍼가 가득 찰 때만 차단합니다.

## 예제

### 예제 #1 스레드 간 버퍼 없는 채널

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // capacity = 0

    $thread = spawn_thread(function() use ($channel) {
        $value = $channel->recv(); // 메인 스레드가 send할 때까지 차단
        return "Worker received: $value";
    });

    $channel->send('hello'); // 워커가 recv()를 호출할 때까지 차단
    echo await($thread), "\n";
});
```

### 예제 #2 스레드 간 버퍼 있는 채널

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(10); // 10개 항목 버퍼

    $producer = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 10; $i++) {
            $channel->send($i); // 버퍼가 가득 찰 때까지 차단하지 않음
        }
        $channel->close();
    });

    $consumer = spawn_thread(function() use ($channel) {
        $results = [];
        while (!$channel->isClosed() || !$channel->isEmpty()) {
            try {
                $results[] = $channel->recv();
            } catch (\Async\ChannelClosedException) {
                break;
            }
        }
        return $results;
    });

    await($producer);
    $results = await($consumer);
    echo implode(', ', $results), "\n";
});
```

## 참고

- [ThreadChannel::send](/ko/docs/reference/thread-channel/send.html) — 채널에 값 전송
- [ThreadChannel::recv](/ko/docs/reference/thread-channel/recv.html) — 채널에서 값 수신
- [ThreadChannel::capacity](/ko/docs/reference/thread-channel/capacity.html) — 채널 용량 가져오기
- [ThreadChannel::close](/ko/docs/reference/thread-channel/close.html) — 채널 닫기
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
