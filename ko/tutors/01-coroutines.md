---
layout: tutorial
lang: ko
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /ko/tutors/01-coroutines.html
page_title: "코루틴"
description: "코루틴 첫걸음: spawn()과 병행 실행."
---

# 코루틴 만들기

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

`counter` 함수는 1초씩 멈추면서 카운터를 화면에 출력합니다.

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

`sleep`이 호출될 때마다 PHP 스레드는 주어진 시간만큼 잠듭니다.
그동안 PHP는 말 그대로 아무것도 하지 않습니다.
PHP 스크립트는 함수 자체가 기다리는 시간과 정확히 같은 5초 동안 실행됩니다.

`counter` 함수를 코루틴 안에서 실행하면 어떻게 될까요?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

이제 출력이 번갈아 나타납니다.
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

스크립트의 전체 실행 시간은 여전히 약 5초이지만, 이제 스크립트는 두 함수를 "병행하여" 실행하는 것처럼 동작합니다.
그렇다면 실제로 무슨 일이 일어나고 있는 걸까요?

`spawn`은 두 번째 논리적 제어 흐름 "B"를 만들고, 그 안에서 `counter` 함수가 실행됩니다.
스레드 "A"가 `sleep`에 도달하면 PHP 전체를 차단하는 대신 다른 논리적 스레드 "B"에게 제어권을 넘깁니다. 이런 식으로 계속됩니다.

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## 무엇이 좋은가요?

`counter` 함수가 I/O 작업과 타이머 작업(`sleep`)을 수행하는 평범한 순차 코드라고 상상해 보세요. I/O 작업은 운영체제 커널이 처리하므로 PHP 코드는 그것을 기다려야 합니다. 그동안 PHP는 다른 일을 할 수 있습니다.
코루틴을 사용하면 별도의 프로세스, 스레드, 동기화, 데이터 경쟁, 그리고 병렬 프로그래밍의 수많은 골칫거리 없이도 그 대기 시간을 유용한 작업으로 채울 수 있습니다.

실용적인 예제를 살펴봅시다.

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

`processUsers` 함수는 CSV 파일을 읽고 각 행을 처리합니다.
파일은 크고, 모든 행을 화면에 출력할 필요는 없지만, 진행 상황은 확인할 수 있으면 좋겠습니다.
반복할 때마다 진행률 표시줄을 다시 그릴 수도 있지만, 그러면 처리 성능이 떨어집니다.
100번 반복할 때마다 다시 그릴 수도 있지만, 행마다 처리 시간이 다를 수 있습니다.
그렇다면 대략 일정한 간격으로 진행 상황을 부드럽게 보여주려면 어떻게 해야 할까요?

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

이는 현재 진행 상황을 1초에 한 번씩 표시하는 `$progress` 코루틴으로 달성할 수 있습니다.
이 코루틴은 `processUsers` 함수 안에서 증가하고 참조로 코루틴에 전달되는 `$counter` 변수에 의존합니다.

```bash
[====>                         ] 15%
```

이 해법의 아름다운 점은 `printProgress`가 `processUsers`에 대해 아무것도 모르고, 그 반대도 마찬가지라는 것입니다.
두 함수는 서로 의존하지 않지만 함께 동작합니다.

다시 말해, 코루틴은 병행 실행의 착각을 만들어낼 뿐만 아니라 관심사 분리에도 도움을 줍니다.

`$progress->cancel()`을 눈치채셨나요? 정확히 무엇을 위한 것일까요?
