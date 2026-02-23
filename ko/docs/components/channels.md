---
layout: docs
lang: ko
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /ko/docs/components/channels.html
page_title: "채널"
description: "TrueAsync의 채널 -- 코루틴 간 안전한 데이터 전송, 작업 큐 및 배압(backpressure)."
---

# 채널

채널은 단일 스레드 환경보다 멀티스레드 환경에서의 통신에 더 유용합니다.
채널은 한 코루틴에서 다른 코루틴으로 안전하게 데이터를 전송하는 데 사용됩니다.
공유 데이터를 수정해야 하는 경우,
단일 스레드 환경에서는 채널을 만드는 것보다 객체를 여러 코루틴에 전달하는 것이 더 간단합니다.

그러나 채널은 다음 시나리오에서 유용합니다:
* 제한이 있는 작업 큐 구성
* 객체 풀 구성 (전용 `Async\Pool` 프리미티브 사용을 권장합니다)
* 동기화

예를 들어, 크롤링할 URL이 많지만 동시 연결은 N개 이하여야 하는 경우:

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Fetched page {$url}, length: " . strlen($content) . "\n";
        }
    });
}

// 채널을 값으로 채웁니다
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

이 예제에서 `MAX_QUEUE` 상수는 생산자의 제한자로 작동하여 배압(backpressure)을 만듭니다 --
소비자가 채널의 공간을 확보할 때까지 생산자가 데이터를 보낼 수 없는 상황입니다.

## 버퍼 없는 채널 (랑데부)

버퍼 크기가 `0`인 채널은 랑데부 모드로 작동합니다: `send()`는 다른 코루틴이 `recv()`를 호출할 때까지 차단되고, 그 반대도 마찬가지입니다. 이는 엄격한 동기화를 보장합니다:

```php
use Async\Channel;

$ch = new Channel(0); // 랑데부 채널

spawn(function() use ($ch) {
    echo "송신자: send 전\n";
    $ch->send("hello");
    echo "송신자: send 완료\n"; // recv() 이후에만
});

spawn(function() use ($ch) {
    echo "수신자: recv 전\n";
    $value = $ch->recv();
    echo "수신자: $value 수신됨\n";
});
```

## 작업 취소

`recv()` 및 `send()` 메서드는 선택적 취소 토큰(`Completable`)을 받아 임의의 조건에 따라 대기를 중단할 수 있습니다. 이는 고정된 타임아웃보다 유연합니다 — 다른 코루틴에서, 시그널로, 이벤트로, 또는 시간으로 연산을 취소할 수 있습니다:

```php
use Async\Channel;
use Async\CancelledException;

$ch = new Channel(0);

// 타임아웃으로 취소
spawn(function() use ($ch) {
    try {
        $ch->recv(Async\timeout(50)); // 최대 50ms 대기
    } catch (CancelledException $e) {
        echo "50ms 내에 아무도 데이터를 보내지 않았습니다\n";
    }
});

// 임의의 조건으로 취소
spawn(function() use ($ch) {
    $cancel = new \Async\Future();

    spawn(function() use ($cancel) {
        // 50ms 후에 취소
        Async\delay(50);
        $cancel->complete(null);
    });

    try {
        $ch->send("data", $cancel);
    } catch (CancelledException $e) {
        echo "아무도 데이터를 수신하지 않았습니다 — 연산이 취소되었습니다\n";
    }
});
```

## 경쟁 수신자

여러 코루틴이 같은 채널에서 `recv()`를 대기하는 경우, 각 값은 그 중 **하나만** 수신합니다. 값은 복제되지 않습니다:

```php
use Async\Channel;

$ch = new Channel(0);

// 송신자
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// 수신자 A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A 수신: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 수신자 B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B 수신: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// 각 값(1, 2, 3)은 A 또는 B 중 하나만 수신하며, 둘 다 수신하지 않습니다
```

이 패턴은 여러 코루틴이 공유 큐에서 작업을 경쟁하는 워커 풀을 구현하는 데 유용합니다.
