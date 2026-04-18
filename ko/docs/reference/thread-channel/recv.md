---
layout: docs
lang: ko
path_key: "/docs/reference/thread-channel/recv.html"
nav_active: docs
permalink: /ko/docs/reference/thread-channel/recv.html
page_title: "ThreadChannel::recv()"
description: "스레드 채널에서 다음 값을 수신합니다. 사용 가능한 값이 없으면 호출 스레드를 차단합니다."
---

# ThreadChannel::recv

(PHP 8.6+, True Async 1.0)

```php
public ThreadChannel::recv(): mixed
```

채널에서 다음 값을 수신합니다. 이것은 **차단** 작업입니다 — 채널에 현재 사용 가능한 값이 없으면 호출 스레드가 차단됩니다.

- **버퍼 있는 채널**의 경우, 버퍼에 적어도 하나의 값이 있으면 `recv()`가 즉시 반환합니다.
  버퍼가 비어 있으면, 발신자가 값을 넣을 때까지 스레드가 차단됩니다.
- **버퍼 없는 채널**(`capacity = 0`)의 경우, 다른 스레드가 `send()`를 호출할 때까지 `recv()`가 차단됩니다.

채널이 닫혀 있고 버퍼에 여전히 값이 있으면, 그 값들이 정상적으로 반환됩니다.
버퍼가 비워지고 채널이 닫혀 있으면, `recv()`는 `ChannelClosedException`을 던집니다.

수신된 값은 원본의 **깊은 복사본**입니다 — 반환된 값을 수정해도 발신자의 복사본에 영향을 미치지 않습니다.

## 반환값

채널에서 다음 값 (`mixed`).

## 오류

- 채널이 닫혀 있고 버퍼가 비어 있으면 `Async\ChannelClosedException`을 던집니다.

## 예제

### 예제 #1 워커 스레드에서 생산된 값 수신

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(5);

    $worker = spawn_thread(function() use ($channel) {
        for ($i = 1; $i <= 5; $i++) {
            $channel->send($i * 10);
        }
        $channel->close();
    });

    // 모든 값 수신 — 버퍼가 비면 차단
    try {
        while (true) {
            echo $channel->recv(), "\n";
        }
    } catch (\Async\ChannelClosedException) {
        echo "All values received\n";
    }

    await($worker);
});
```

### 예제 #2 공유 채널을 비우는 소비자 스레드

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(20);

    // 생산자: 한 스레드에서 채널을 채웁니다
    $producer = spawn_thread(function() use ($channel) {
        foreach (range('a', 'e') as $letter) {
            $channel->send($letter);
        }
        $channel->close();
    });

    // 소비자: 다른 스레드에서 채널을 비웁니다
    $consumer = spawn_thread(function() use ($channel) {
        $collected = [];
        try {
            while (true) {
                $collected[] = $channel->recv();
            }
        } catch (\Async\ChannelClosedException) {
            // 버퍼가 비워지고 채널이 닫힘
        }
        return $collected;
    });

    await($producer);
    $result = await($consumer);
    echo implode(', ', $result), "\n"; // "a, b, c, d, e"
});
```

### 예제 #3 버퍼 없는 채널에서 수신

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $channel = new ThreadChannel(); // 버퍼 없음

    $sender = spawn_thread(function() use ($channel) {
        // 메인 스레드가 recv()를 호출할 때까지 여기서 차단됩니다
        $channel->send(['task' => 'compress', 'file' => '/tmp/data.bin']);
    });

    // 메인 코루틴(스레드)이 recv()를 호출 — 발신자의 차단을 해제합니다
    $task = $channel->recv();
    echo "Got task: {$task['task']} on {$task['file']}\n";

    await($sender);
});
```

## 참고

- [ThreadChannel::send](/ko/docs/reference/thread-channel/send.html) — 채널에 값 전송
- [ThreadChannel::isEmpty](/ko/docs/reference/thread-channel/is-empty.html) — 버퍼가 비었는지 확인
- [ThreadChannel::close](/ko/docs/reference/thread-channel/close.html) — 채널 닫기
- [ThreadChannel 컴포넌트 개요](/ko/docs/components/thread-channels.html)
