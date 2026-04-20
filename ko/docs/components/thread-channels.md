---
layout: docs
lang: ko
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /ko/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — TrueAsync에서 OS 스레드 간 데이터를 전달하기 위한 스레드 안전 채널."
---

# Async\ThreadChannel: OS 스레드 간 채널

## 일반 Channel과의 차이점

`Async\Channel`은 **단일 스레드 내에서** 동작합니다 — 같은 스케줄러의 코루틴들 사이에서. 데이터는 **스레드-로컬 메모리**에 존재하며, 한 번에 하나의 코루틴만 채널에 접근한다는 사실로 안전성이 보장됩니다.

`Async\ThreadChannel`은 **OS 스레드 간** 데이터 전달을 위해 설계되었습니다. 채널 버퍼는 단일 스레드의 메모리가 아닌, 모든 스레드에서 접근 가능한 **공유 메모리**에 존재합니다. 전송된 각 값은 해당 공유 메모리로 깊은 복사되며, 수신 측에서는 다시 스레드의 로컬 메모리로 복사됩니다. 동기화는 스레드 안전 뮤텍스를 통해 이루어지므로, `send()`와 `recv()`를 서로 다른 OS 스레드에서 동시에 호출할 수 있습니다.

| 속성                              | `Async\Channel`                        | `Async\ThreadChannel`                        |
|-----------------------------------|----------------------------------------|----------------------------------------------|
| 범위                              | 단일 OS 스레드                         | OS 스레드 간                                 |
| 버퍼 데이터 위치                  | 스레드-로컬 메모리                     | 모든 스레드에서 보이는 공유 메모리           |
| 동기화                            | 코루틴 스케줄러 (협력적)               | 뮤텍스 (스레드 안전)                         |
| 랑데뷰 (capacity=0)               | 지원됨                                 | 없음 — 항상 버퍼링됨                         |
| 최소 용량                         | 0                                      | 1                                            |

모든 코드가 단일 스레드에서 실행된다면 — 더 가벼운 `Async\Channel`을 사용하세요. `ThreadChannel`은 실제로 OS 스레드 간 데이터 교환이 필요한 경우에만 의미가 있습니다.

## 채널 생성

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — 버퍼 크기 (최소 `1`). 값이 클수록 급격한 생산자를 더 잘 흡수하지만, 라이브 큐를 위한 메모리를 더 많이 소비합니다.

## 기본 예제: 생산자 + 소비자

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // 생산자 — 별도의 OS 스레드
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // 소비자 — 메인 스레드 (코루틴)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "got: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "channel closed\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

생산자는 별도 스레드에서 채널에 쓰고, 메인 스레드는 `recv()`를 통해 읽습니다 — 특별한 것이 없으며, 일반 `Channel`처럼 보입니다.

## send / recv

### `send($value[, $cancellation])`

채널에 값을 전송합니다. 버퍼가 가득 차면 — 다른 스레드가 공간을 확보할 때까지 **현재 코루틴을 일시 중단**합니다 (협력적 중단 — 이 스케줄러의 다른 코루틴들은 계속 실행됩니다).

값은 `spawn_thread()`의 `use(...)`를 통해 캡처된 변수와 동일한 규칙에 따라 **채널의 공유 메모리로 깊은 복사됩니다**. 동적 속성을 가진 객체, PHP 참조, 리소스는 `Async\ThreadTransferException`과 함께 거부됩니다.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // 배열
$ch->send(new Point(3, 4));                    // 선언된 속성을 가진 객체
$ch->send($futureState);                       // Async\FutureState (한 번만!)
```

채널이 이미 닫혀 있으면 — `send()`는 `Async\ThreadChannelException`을 던집니다.

### `recv([$cancellation])`

채널에서 값을 읽습니다. 버퍼가 비어 있으면 — 데이터가 도착하거나 **또는** 채널이 닫힐 때까지 현재 코루틴을 일시 중단합니다.

- 데이터가 도착하면 — 값을 반환합니다.
- 채널이 닫히고 버퍼가 비어 있으면 — `Async\ThreadChannelException`을 던집니다.
- 채널이 닫혔지만 버퍼에 아직 항목이 있으면 — **남은 데이터를 먼저 소진**하고, 버퍼가 비워진 후에야 `ThreadChannelException`을 던집니다.

이를 통해 채널이 닫힌 후에도 올바르게 소진할 수 있습니다.

## 채널 상태

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| 메서드         | 반환값                                        |
|----------------|-----------------------------------------------|
| `capacity()`   | 생성자에서 설정한 버퍼 크기                   |
| `count()`      | 버퍼에 있는 현재 메시지 수                    |
| `isEmpty()`    | 버퍼가 비어 있으면 `true`                     |
| `isFull()`     | 버퍼가 용량까지 채워져 있으면 `true`          |
| `isClosed()`   | 채널이 닫혀 있으면 `true`                     |

`ThreadChannel`은 `Countable`을 구현하므로 `count($ch)`가 동작합니다.

## close()

```php
$ch->close();
```

닫은 후:

- `send()`는 즉시 `Async\ThreadChannelException`을 던집니다.
- `recv()`는 **남은 값들을 소진**한 후, `ThreadChannelException`을 던지기 시작합니다.
- `send()` 또는 `recv()`에서 일시 중단된 모든 코루틴/스레드는 `ThreadChannelException`과 함께 **깨어납니다**.

채널은 한 번만 닫을 수 있습니다. 반복 호출은 안전한 no-op입니다.

## 패턴: 워커 풀

두 개의 채널 — 하나는 작업용, 하나는 결과용. 워커 스레드들은 첫 번째에서 작업을 읽고 두 번째에 결과를 넣습니다.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 워커 스레드 3개
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // CPU 부하 시뮬레이션
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // jobs 채널이 닫힘 — 워커 종료
            }
        });
    }

    // 작업 6개 전달
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // 모든 워커 스레드가 완료될 때까지 대기
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // 결과 소진
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

각 워커는 2개의 작업을 처리했습니다 — 부하가 세 스레드에 고르게 분배되었습니다.

### 분배에 대한 참고사항

생산자가 워커가 읽는 속도보다 빠르게 채널에 쓰거나 (또는 워커가 거의 CPU 시간을 소비하지 않는 경우), **첫 번째 워커가 모든 작업을 가져갈 수 있습니다** — `recv()`가 먼저 깨어나 다른 워커들이 자신의 `recv()`에 도달하기 전에 다음 메시지를 가져가기 때문입니다. 이는 동시 큐의 정상적인 동작입니다 — 공정한 스케줄링은 보장되지 않습니다.

엄격한 균일성이 필요하다면 — 작업을 미리 파티셔닝하거나 (해시로 샤딩), 각 워커에게 전용 채널을 부여하세요.

## 채널을 통한 복잡한 데이터 전달

`ThreadChannel`은 크로스 스레드 데이터 전송이 지원하는 모든 것을 전달할 수 있습니다 ([스레드 간 데이터 전달](/ko/docs/components/threads.html#passing-data-between-threads) 참고):

- 스칼라, 배열, 선언된 속성을 가진 객체
- `Closure` (클로저)
- `WeakReference`와 `WeakMap` (`spawn_thread`에서와 동일한 강한 소유자 규칙 적용)
- `Async\FutureState` (한 번)

각 `send()` 호출은 자체 식별자 테이블을 가진 독립적인 작업입니다. **동일성은 단일 메시지 내에서 보존**되지만, 별도의 `send()` 호출 간에는 보존되지 않습니다. 두 수신자가 "동일한" 객체를 보길 원한다면 — 두 개의 별도 메시지가 아니라 배열 안에 한 번 담아 전송하세요.

## 제한 사항

- **최소 용량은 1입니다.** `Async\Channel`과 달리 랑데뷰 (capacity=0)는 지원되지 않습니다.
- **`ThreadChannel`은 직렬화를 지원하지 않습니다.** 채널 객체는 파일에 저장하거나 네트워크를 통해 전송할 수 없습니다 — 채널은 살아있는 프로세스 내에서만 존재합니다.
- **채널 핸들은 전달할 수 있습니다** — `spawn_thread`를 통해 또는 다른 채널 내부에 중첩하여. `ThreadChannel`의 객체 핸들은 올바르게 전송되며, 양측이 동일한 내부 버퍼를 봅니다.

## 참고 항목

- [`Async\Thread`](/ko/docs/components/threads.html) — TrueAsync의 OS 스레드
- [`spawn_thread()`](/ko/docs/reference/spawn-thread.html) — 새 스레드에서 클로저 시작
- [`Async\Channel`](/ko/docs/components/channels.html) — 동일 스레드 내 코루틴 간 채널
