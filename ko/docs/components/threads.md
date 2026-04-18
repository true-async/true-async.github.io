---
layout: docs
lang: ko
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /ko/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — 별도의 병렬 스레드에서 코드 실행: 데이터 전달, WeakReference/WeakMap, ThreadChannel, 스레드 간 Future."
---

# Async\Thread: 별도의 스레드에서 PHP 실행

## 스레드가 필요한 이유

코루틴은 **I/O 바운드** 워크로드의 동시성 문제를 해결합니다 — 단일 프로세스가
수천 개의 동시 네트워크 또는 디스크 대기를 처리할 수 있습니다. 하지만 코루틴에는 한계가 있습니다:
모두 **동일한 PHP 프로세스** 안에서 실행되며 스케줄러로부터 번갈아 제어권을 받습니다.
작업이 **CPU 바운드**인 경우 — 압축, 파싱, 암호화, 무거운 연산 — 단 하나의 그런 코루틴이
스케줄러를 블록하고, 다른 모든 코루틴은 그것이 끝날 때까지 멈춥니다.

스레드는 이 한계를 해결합니다. `Async\Thread`는 **별도의 병렬 스레드**에서 클로저를 실행하며,
**자체적으로 격리된 PHP 런타임**을 가집니다: 자체 변수 집합, 자체 오토로더, 자체 클래스와 함수.
스레드 간에는 직접 공유되는 것이 없습니다 — 모든 데이터는 깊은 복사를 통해 **값으로 전달**됩니다.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// 메인 코루틴의 티커 — 병렬 스레드가 메인 프로그램의 계속 실행을 막지 않음을 증명
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // 별도 스레드에서의 무거운 연산
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

티커는 스레드의 무거운 작업과 동시에 5번의 "틱"을 차분하게 완료합니다 — 메인
프로그램은 기다릴 필요가 없습니다.

## 스레드 vs 코루틴: 언제 무엇을 사용할까

| 작업                                              | 도구                      |
|---------------------------------------------------|---------------------------|
| 많은 동시 HTTP/DB/파일 요청                       | 코루틴                    |
| 긴 CPU 바운드 작업 (파싱, 암호화)                | 스레드                    |
| 불안정한 코드 격리                                | 스레드                    |
| 여러 CPU 코어에 걸친 병렬 작업                   | 스레드                    |
| 작업 간 데이터 교환                               | 코루틴 + 채널             |

스레드는 **상대적으로 비싼 엔티티**입니다: 새 스레드를 시작하는 것은 코루틴을 시작하는 것보다
훨씬 무겁습니다. 그렇기 때문에 수천 개를 생성하지 않습니다: 일반적인 모델은 몇 개의 오래 사는
워커 스레드(종종 CPU 코어 수와 동일)이거나, 특정 무거운 작업을 위한 하나의 스레드입니다.

## 생명주기

```php
// 생성 — 스레드가 시작되고 즉시 실행을 시작함
$thread = spawn_thread(fn() => compute());

// 결과를 기다림. 호출 코루틴은 대기; 다른 코루틴은 계속 실행됨
$result = await($thread);

// 또는 논블로킹 검사
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread`는 `Completable` 인터페이스를 구현하므로, `await()`,
`await_all()`, `await_any()`, `Task\Group`에 전달할 수 있습니다 — 일반 코루틴과 동일하게.

### 상태

| 메서드            | 무엇을 확인하는지                                           |
|-------------------|-------------------------------------------------------------|
| `isRunning()`     | 스레드가 아직 실행 중                                       |
| `isCompleted()`   | 스레드가 완료됨 (성공 또는 예외 포함)                       |
| `isCancelled()`   | 스레드가 취소됨                                             |
| `getResult()`     | 성공적으로 완료된 경우 결과; 그렇지 않으면 `null`           |
| `getException()`  | 오류로 완료된 경우 예외; 그렇지 않으면 `null`               |

### 예외 처리

스레드 내부에서 발생한 예외는 잡혀서 `Async\RemoteException`으로 래핑되어 부모에게 전달됩니다:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()`은 예외 클래스를 부모 스레드에서 로드할 수 없는 경우 `null`을
반환할 수 있습니다 (예: 수신 스레드에만 존재하는 사용자 정의 클래스인 경우).

## 스레드 간 데이터 전달

이것이 모델에서 가장 중요한 부분입니다. **모든 것은 복사를 통해 전달됩니다** — 공유 참조 없음.

### 전달 가능한 것

| 타입                                                    | 동작                                                            |
|---------------------------------------------------------|-----------------------------------------------------------------|
| 스칼라 (`int`, `float`, `string`, `bool`, `null`)       | 복사됨                                                          |
| 배열                                                    | 깊은 복사; 중첩된 객체는 동일성 보존                            |
| 선언된 프로퍼티가 있는 객체 (`public $x` 등)           | 깊은 복사; 수신 측에서 처음부터 재생성                          |
| `Closure`                                               | 모든 `use(...)` 변수와 함께 함수 본문이 전달됨                  |
| `WeakReference`                                         | 참조 대상과 함께 전달됨 (아래 참조)                             |
| `WeakMap`                                               | 모든 키와 값과 함께 전달됨 (아래 참조)                          |
| `Async\FutureState`                                     | 스레드에서 결과를 쓰기 위해 단 한 번만 (아래 참조)             |

### 전달 불가능한 것

| 타입                                                   | 이유                                                                             |
|--------------------------------------------------------|----------------------------------------------------------------------------------|
| `stdClass` 및 동적 프로퍼티가 있는 모든 객체          | 동적 프로퍼티는 클래스 레벨 선언이 없어 수신 스레드에서 올바르게 재생성 불가    |
| PHP 참조 (`&$var`)                                     | 스레드 간 공유 참조는 모델에 위배됨                                              |
| 리소스 (`resource`)                                    | 파일 디스크립터, curl 핸들, 소켓은 특정 스레드에 바인딩됨                        |

이 중 하나를 전달하려고 시도하면 소스에서 즉시 `Async\ThreadTransferException`이 발생합니다:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // 동적 프로퍼티
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### 객체 동일성 보존

데이터 그래프에서 여러 번 참조되는 동일한 객체는 수신 스레드에서 **단 한 번만 생성**되며,
모든 참조가 그것을 가리킵니다. 단일 전달 작업 내에서 (하나의 클로저의 `use(...)`에서 오는 모든
변수, 하나의 채널 전송, 하나의 스레드 결과) 동일성이 보존됩니다:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// 수신 스레드의 환경에서 클래스가 선언되어야 함 — 부트로더를 통해 수행
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // 두 개의 다른 변수에서 동일한 인스턴스
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // 하나의 참조를 통한 변경이 다른 참조를 통해서도 보임
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

단일 그래프 내의 연결된 객체에도 동일하게 적용됩니다: 공유 중첩 객체에 대한 참조가 있는 배열은
전달 후에도 동일성을 보존합니다.

### 순환 참조

일반 객체를 통한 순환이 있는 그래프는 전달할 수 있습니다. 제한은 매우 깊게 중첩된 순환이
내부 전달 깊이 제한(수백 단계)에 도달할 수 있다는 것입니다. 실제로 이런 일은 거의 발생하지
않습니다. `$node->weakParent = WeakReference::create($node)` 형태의 순환 — 즉, `WeakReference`를
통해 자신을 참조하는 객체 — 은 현재 동일한 제한에 부딪히므로, 단일 전달 그래프 내에서는
사용하지 않는 것이 좋습니다.

## 스레드 간 WeakReference

`WeakReference`는 특별한 전달 로직을 가집니다. 동작은 그것과 함께 전달되는 것에 따라 달라집니다.

### 참조 대상도 전달됨 — 동일성 보존

객체 자체가 `WeakReference`와 함께 전달되는 경우 (직접, 배열 내부, 또는 다른 객체의 프로퍼티로),
수신 측에서 `$wr->get()`은 다른 참조에서 끝난 **바로 그** 인스턴스를 반환합니다:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### 참조 대상이 전달되지 않음 — WeakReference가 죽음

`WeakReference`만 전달되고 객체 자체는 전달되지 않으면, 수신 스레드에서 그 객체에 대한 강한
참조를 아무도 가지지 않습니다. PHP 규칙에 따라 이는 객체가 즉시 파괴되고 `WeakReference`가
**죽음** 상태가 됨을 의미합니다 (`$wr->get() === null`). 이것은 단일 스레드 PHP와 완전히 동일한
동작입니다: 강한 소유자 없이는 객체가 수집됩니다.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj는 전달되지 않음
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### 소스가 이미 죽음

전달 시점에 소스에서 `WeakReference`가 이미 죽어 있는 경우 (`$wr->get() === null`),
수신 스레드에도 죽음 상태로 도착합니다.

### 싱글톤

`WeakReference::create($obj)`는 싱글톤을 반환합니다: 동일한 객체에 대한 두 번의 호출은
**동일한** `WeakReference` 인스턴스를 반환합니다. 이 속성은 전달 중에도 보존됩니다 — 수신
스레드에도 객체당 정확히 하나의 `WeakReference` 인스턴스가 존재합니다.

## 스레드 간 WeakMap

`WeakMap`은 모든 항목과 함께 전달됩니다. 하지만 단일 스레드 PHP와 동일한 규칙이 적용됩니다:
**`WeakMap` 키는 누군가 강한 참조를 가지고 있는 한에서만 유지됩니다**.

### 키가 그래프에 있음 — 항목이 살아남음

키가 별도로 전달되거나 (또는 다른 전달된 객체를 통해 도달 가능하다면), 수신 스레드의
`WeakMap`에는 모든 항목이 포함됩니다:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### WeakMap만 — 항목이 사라짐

`WeakMap`만 전달되고 그 키가 그래프의 다른 곳에 나타나지 않으면, 수신 스레드에서 `WeakMap`은
**비어 있을 것입니다**. 이것은 버그가 아닙니다; 약한 시맨틱의 직접적인 결과입니다: 강한 소유자
없이는 키가 로드된 직후 파괴되고 해당 항목이 사라집니다.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost는 전달되지 않음
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

항목이 전달을 "살아남으려면", 그 키가 별도로 전달되거나 (또는 그래프에 포함된 다른 객체의
일부로) 전달되어야 합니다.

### 중첩 구조

`WeakMap`은 값으로 다른 `WeakMap`, `WeakReference`, 배열, 일반 객체를 포함할 수 있습니다 —
모든 것이 재귀적으로 전달됩니다. `$wm[$obj] = $wm` 형태의 순환도 올바르게 처리됩니다.

## 스레드 간 Future

스레드 간에 `Async\Future`를 직접 전달하는 것은 **불가능합니다**: `Future`는 생성된 스레드의
스케줄러에 바인딩된 이벤트를 가진 대기자 객체입니다. 대신 "쓰기" 측인 `Async\FutureState`를
전달할 수 있으며, **단 한 번만** 가능합니다.

일반적인 패턴: 부모가 `FutureState` + `Future` 쌍을 생성하고, `use(...)` 변수를 통해
`FutureState` 자체를 스레드에 전달하면, 스레드가 `complete()` 또는 `error()`를 호출하고,
부모는 자신의 `Future`를 통해 결과를 받습니다:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // 무거운 작업 시뮬레이션
        $data = "computed in thread";
        $state->complete($data);
    });

    // 부모는 자신의 Future를 통해 기다림 — 스레드가 $state->complete()를 호출할 때 이벤트가 도착
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**중요한 제약사항:**

1. `FutureState`는 **단 하나의** 스레드에만 전달될 수 있습니다. 두 번째 전달 시도는 예외를 발생시킵니다.
2. `Future` 자체를 전달하는 것은 허용되지 않습니다 — 부모 스레드에 속하며 자신의 소유자만
   깨울 수 있습니다.
3. `FutureState`가 전달된 후, 부모의 원래 객체는 유효하게 남습니다: 스레드가 `complete()`를
   호출하면, 그 변경이 부모의 `Future`를 통해 보입니다 — `await($future)`가 언블록됩니다.

이것은 `spawn_thread()`에서의 일반적인 `return` 외에, 스레드에서 호출자에게 **단일 결과**를
전달하는 유일한 표준 방법입니다. 많은 값을 스트리밍해야 한다면 `ThreadChannel`을 사용하세요.

## 부트로더: 스레드 환경 준비

스레드는 **자체 환경**을 가지며 부모 스크립트에서 선언된 클래스, 함수, 상수 정의를 상속하지
않습니다. 클로저가 사용자 정의 클래스를 사용하는 경우, 그 클래스는 재선언되거나 오토로드를
통해 로드되어야 합니다 — 이를 위해 `bootloader` 파라미터가 있습니다:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config는 스레드에 존재해야 함
        return $config->name;
    },
    bootloader: function() {
        // 메인 클로저 이전에 수신 스레드에서 실행됨
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

부트로더는 `use(...)` 변수가 로드되기 전과 메인 클로저가 호출되기 전에 수신 스레드에서
실행되도록 보장됩니다. 일반적인 부트로더 작업: 오토로드 등록, `eval`을 통한 클래스 선언,
ini 옵션 설정, 라이브러리 로딩.

## 엣지 케이스

### 슈퍼전역 변수

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV`는 스레드에서 자체적으로 존재합니다 — 새로운 요청처럼
새롭게 초기화됩니다. TrueAsync의 현재 버전에서는 수신 스레드에서의 이들 채우기가 일시적으로
비활성화되어 있습니다 (나중에 활성화될 예정) — CHANGELOG를 확인하세요.

### 정적 함수 변수

각 스레드는 자체적인 정적 함수 및 클래스 변수 집합을 가집니다. 하나의 스레드에서의 변경은
다른 스레드에서 보이지 않습니다 — 이것은 일반적인 격리의 일부입니다.

### Opcache

Opcache는 컴파일된 바이트코드 캐시를 스레드 간에 읽기 전용으로 공유합니다: 스크립트는
전체 프로세스에 대해 한 번 컴파일되고, 각 새로운 스레드는 준비된 바이트코드를 재사용합니다.
이것은 스레드 시작을 더 빠르게 만듭니다.

## 참조

- [`spawn_thread()`](/ko/docs/reference/spawn-thread.html) — 스레드에서 클로저 실행
- [`Async\ThreadChannel`](/ko/docs/components/thread-channels.html) — 스레드 간 채널
- [`await()`](/ko/docs/reference/await.html) — 스레드 결과 기다리기
- [`Async\RemoteException`](/ko/docs/components/exceptions.html) — 수신 스레드 오류의 래퍼
