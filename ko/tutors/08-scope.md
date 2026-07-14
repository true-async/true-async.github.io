---
layout: tutorial
lang: ko
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /ko/tutors/08-scope.html
page_title: "Scope"
description: "Scope: 누가 코루틴을 소유하고, 완료를 기다리고, 그룹 전체를 취소하는가."
---

# Scope

앞 장에서 우리는 열 개의 워커를 띄우고 채널을 닫았습니다. 파일을 다 읽고
`close()`를 호출했으며 메인 흐름은 다음으로 넘어갔습니다. 하지만 잠깐,
워커들은 아직 버퍼를 처리하는 중입니다. 임포트 함수는 이미 제어를
반환했는데, 작업은 끝나지 않았습니다. 만약 지금 당장 PHP 스크립트가
끝난다면, 일부 주소는 확인되지 못한 채 남을 것입니다.

그리고 같은 장에서 나온 두 번째 걱정거리가 있습니다. 워커 안의
`checkAddress`가 예외를 던지면 어떻게 될까요? 예외를 다룬 장에서 우리는
그것이 코루틴의 핸들에 저장되어 `await`를 기다린다는 것을 알고 있습니다.
그런데 아무도 워커를 `await`할 생각이 없었습니다. 오류는 아무것도 고칠 수
없는 맨 마지막에 이르러서야 표면으로 떠오를 것입니다.

두 문제 모두 손으로 해결할 수 있습니다. 코루틴을 배열에 모아두고 각각을
`await`하는 것입니다.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... 파일 읽기 ...

foreach ($workers as $worker) {
    await($worker);
}
```

동작은 합니다. 하지만 이것은 장부 관리입니다. 배열을 준비하는 것을 잊지
않고, 그것을 코드 경로 전체에 들고 다니다가, 끝에서 순회해야 합니다.
그리고 코루틴이 호출된 함수 깊숙한 어딘가에서 띄워지면, 그것은 애초에 그
배열에 들어가지도 못합니다. 우리가 원하는 것은 코루틴이 스스로 누구에게
속하는지 아는 것입니다.

그것이 바로 `Scope`의 역할입니다.

## 코루틴을 위한 샌드박스

`Scope`는 코루틴이 살아가는 공간입니다. 그 안에서 띄워진 모든 코루틴을
알고 있으며, 그것들을 하나의 그룹으로 다룰 수 있습니다.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

앞 장과의 차이는 두 줄입니다. `spawn()` 대신 `$workers->spawn()`, 그리고
끝에 붙은 `awaitCompletion()`입니다. `awaitCompletion` 메서드는 스코프
안의 모든 코루틴이, 그 수가 얼마이든, 끝날 때까지 기다립니다. 배열도 없고
장부 관리도 없습니다. 스코프가 스스로 추적합니다.

여기서 취소 토큰은 선택 사항이 아니라 필수 인자입니다. 스코프는 의도적으로
경계 없이 그룹을 기다리는 것을 허용하지 않습니다. 익숙한 `timeout`이 딱
들어맞으며, 임포트가 1분 안에 끝나지 못하면 대기가
`OperationCanceledException`으로 중단되고, 조금 더 기다릴지 아니면 그룹을
취소할지는 여러분이 결정할 몫입니다.

## 오류가 더 이상 사라지지 않습니다

죽어 버린 워커로 돌아가 봅시다. 스코프 안의 코루틴은 소리 없이 죽을 수
없습니다. 처리되지 않은 예외는 부모 스코프로 거슬러 올라갑니다. 기본적으로
스코프는 엄격하게 반응합니다. 한 코루틴의 오류가 나머지 전부를 취소하고,
예외는 `awaitCompletion`에서 기다리고 있는 쪽에게 전달됩니다.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

이 전략을 fail-together라고 부릅니다. 그룹은 전체가 함께 끝나거나, 전체가
함께 멈춥니다. 임포트에서는 이것이 합리적입니다. `GeoDirectory`가 다운되면
남은 아홉 개의 워커로 그것을 폭격할 이유가 없습니다.

하지만 엄격함이 항상 원하는 바는 아닙니다. 파일 안의 잘못된 주소 하나가
나머지 구만 구천 개를 포기할 이유는 되지 못합니다. 그런 경우에는 스코프에
오류 핸들러를 지정하면 코루틴들이 독립적으로 됩니다. 실패한 것은 로그에
남고, 나머지는 계속 일합니다.

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

예외 자체 외에도 핸들러는 스코프와 실패한 코루틴을 받습니다. 정확히 누가
죽었는지 파악하거나 작업을 재시작하는 데 편리합니다.

전략의 선택은 여러분에게 달려 있으며, 그것이 평범한 `spawn`과의 가장 큰
차이입니다. 거기서는 유일한 전략이 "쏘고 잊어버리기"뿐입니다.

## 그룹 전체 취소하기

취소를 다룬 장에서 우리는 `cancel()`로 코루틴 하나를 멈췄습니다. 스코프는
그것을 그룹 전체에 대해 한 번에 해냅니다.

```php
$workers->cancel();
```

안에 있는 모든 코루틴이 각자의 대기 지점에서 익숙한 `AsyncCancellation`을
받습니다. 어떤 것은 `recv`에서, 어떤 것은 `delay`에서 받습니다. 메커니즘은
같은 협조적 방식이며, 다만 신호가 모두에게 한꺼번에 나갈 뿐입니다.

스코프는 자식 스코프를 담을 수 있고, 취소는 계층 구조를 따라 재귀적으로
아래로 흐릅니다. 부모를 취소하면 그 가지 전체가 취소됩니다. 코루틴은 더
이상 독립적인 작업들이 흩어져 쌓인 더미가 아니라, 각자가 자리와 소유자를
가진 트리를 이룹니다. 이 접근을 구조적 동시성이라고 부르며, 이미 Kotlin,
Swift, Java에서 그 진가를 입증했습니다. TrueAsync가 그것을 PHP로
가져옵니다.

## 스코프는 객체에 속합니다

스코프의 가장 우아한 활용은 그 소유권을 객체에게 넘겨주는 것입니다.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* 워커와 파일 읽기 */);
        $this->scope->spawn(/* 첫 장의 진행률 코루틴 */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

이제 코루틴의 수명은 서비스의 수명과 일치합니다. 객체가 존재하는 한 그
코루틴들은 계속 일합니다. 객체를 파괴하면 `dispose()`가 그것이 띄우는 데
성공한 모든 것을 취소합니다.

첫 장의 `$progress->cancel()`을 기억하시나요? 우리는 진행률 코루틴이
불필요해지는 순간을 손으로 포착했습니다. 스코프가 있으면 그 질문은 그냥
사라집니다. 진행률은 임포트가 도는 동안 필요하고, 임포트는 정확히
`ImportService`가 사는 동안 돕니다. 소유권이 코드에 직접 표현되며,
코루틴을 잊을 곳 자체가 남아 있지 않습니다.

## 임포트 전체, 처음부터 끝까지

여덟 장에 걸쳐 쌓아 온 모든 것을 하나의 동작하는 클래스로 모아 봅시다.
첫 장의 코루틴과 진행률, 일곱 번째 장의 백프레셔를 인지하는 채널,
이번 장의 스코프입니다.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // 워커: 채널에서 주소를 꺼냄, 병행으로 $this->workers 개를 넘지 않음
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                foreach ($queue as $address) {
                        checkAddress($address);
                        $counter++;
                }
            });
        }

        // 진행률: 임포트가 끝날 때까지 1초에 한 번 상태를 렌더링함
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // 생산자: 파일을 읽음, 채널의 백프레셔가 메모리를 보호함
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // 모든 것을 기다림: 워커와 진행률 코루틴 둘 다
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

더 자세히 볼 만한 세부 사항이 두어 가지 있습니다. 진행률은 더 이상 무한
루프가 아닙니다. `while ($counter < $total)` 조건이 마지막 주소가
처리되면 협조적으로 그것을 끝내므로, `awaitCompletion`은 단 한 번의
`cancel` 없이 모든 것을 기다립니다. 그리고 소멸자의 `dispose()`는 정상
동작에서는 아무런 역할도 하지 않습니다. 임포트가 예외를 던지거나 객체가
도중에 버려질 때를 위한 안전망입니다.

이것이 스코프의 핵심입니다. `spawn`은 "병행 작업을 어떻게 시작하는가"라는
질문에만 답합니다. 스코프는 그 바로 뒤에 따라오는 질문들을 다룹니다. 누가
그 작업을 기다리는가, 누가 오류를 알게 되는가, 누가 그것을 멈추는가.
스코프가 없으면 코루틴은 혼자 알아서 살아가야 하고, 스코프 안에서는
소유자와 프로그램 구조 속의 자리를 갖습니다.

지금까지 워커들은 바깥세상에서 읽어 오기만 했습니다. 하지만 확인된 주소는
여전히 데이터베이스에 저장되어야 합니다. 열 개의 코루틴에게 하나의 `PDO`
객체를 그냥 건네줄 수 있을까요? 다음 장을 여는 좋은 질문입니다.
