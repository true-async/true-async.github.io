---
layout: docs
lang: ko
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /ko/docs/components/introduction.html
page_title: "왜 비동기인가?"
description: "비동기란 무엇이며 왜 필요한가?"
---

## 전통적인 PHP (FPM) 동작 방식

![FPM 모델](../../../assets/docs/fpm_model.jpg)

PHP 서버 애플리케이션이 레스토랑이라면, 아마도 각 테이블에
전담 웨이터가 배정되는 고급 레스토랑으로 간주될 것입니다.

서버에 대한 각 새로운 요청은 별도의 PHP VM, 프로세스 또는 스레드에 의해 처리되며,
이후 상태가 파괴됩니다.
이것은 웨이터가 한 테이블을 서빙한 후 해고되거나 기억이 지워지는 것과 같습니다.

이 모델에는 장점이 있습니다: PHP 오류가 발생하거나 메모리 누수가 있거나
데이터베이스 연결을 잊어도 다른 요청에 영향을 미치지 않습니다. 각 요청이 격리되어 있습니다.
이는 개발이 더 간단하고, 디버깅이 더 간단하며, 높은 내결함성을 의미합니다.

최근 몇 년간 PHP 커뮤니티는 단일 PHP VM이 여러 요청을 처리하면서
요청 간에 상태를 보존하는 stateful 모델을 도입하려고 시도하고 있습니다.
예를 들어, Swoole이나 RoadRunner를 사용하는 Laravel Octane 프로젝트는
요청 간 상태를 보존하여 더 나은 성능을 달성합니다.
하지만 이것은 가능한 것의 한계와는 거리가 멉니다.

각 주문 후에 웨이터를 해고하는 것은 너무 비용이 많이 듭니다.
주방에서 요리가 천천히 준비되기 때문에 웨이터는 대부분의 시간을 기다리며 보냅니다.
PHP-FPM에서도 같은 일이 일어납니다: PHP VM이 유휴 상태입니다.
더 많은 컨텍스트 전환이 있고,
프로세스나 스레드를 생성하고 파괴하는 데 더 많은 오버헤드가 있으며,
더 많은 리소스를 소비합니다.

```php
// 전통적인 PHP-FPM
$user = file_get_contents('https://api/user/123');     // 서서 기다리기 300ms
$orders = $db->query('SELECT * FROM orders');          // 서서 기다리기 150ms
$balance = file_get_contents('https://api/balance');   // 서서 기다리기 200ms

// 소요: 순수 대기 650ms
// CPU는 유휴. 메모리는 유휴. 모든 것이 대기 중.
```

## 동시성

![동시성 모델](../../../assets/docs/concurrency_model.jpg)

주방이 즉시 요리를 준비할 수 없고,
웨이터가 준비 사이에 유휴 시간이 있기 때문에,
여러 고객의 주문을 처리할 기회가 있습니다.

이 방식은 꽤 유연하게 작동할 수 있습니다:
테이블 1이 세 가지 요리를 주문했습니다.
테이블 2가 두 가지 요리를 주문했습니다.
웨이터가 테이블 1에 첫 번째 요리를 가져오고, 그다음 테이블 2에 첫 번째 요리를 가져옵니다.
또는 첫 번째 테이블에 두 가지 요리와 두 번째 테이블에 한 가지를 가져올 수도 있습니다. 또는 반대로!

이것이 동시성입니다: 단일 리소스(`CPU`)를 여러 논리적 실행 스레드 간에 공유하는 것으로,
이를 코루틴이라고 합니다.

```php
use function Async\spawn;
use function Async\await;

// 세 가지 요청을 "동시에" 실행
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// 한 요청이 응답을 기다리는 동안 다른 것을 합니다!
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// 소요: 300ms (가장 느린 요청의 시간)
```

## 동시성은 병렬성이 아닙니다

차이점을 이해하는 것이 중요합니다.

**동시성** -- `True Async`, `JavaScript`, `Python`에서와 같이:
- 한 명의 웨이터가 테이블 사이를 빠르게 전환
- 하나의 PHP 스레드가 작업 사이를 전환
- 작업이 **인터리브**되지만 동시에 실행되지 않음
- 경쟁 상태 없음 -- 어느 순간에든 하나의 코루틴만 실행됨

**병렬성** -- 멀티스레딩 (`Go`):
- 여러 웨이터가 동시에 작업
- 여러 스레드가 다른 CPU 코어에서 실행
- 작업이 **진정으로 동시에** 실행됨
- 뮤텍스, 잠금 등 그 모든 고통이 필요함

## 다음 단계

이제 본질을 이해했습니다. 더 깊이 파고들 수 있습니다:

- [효율성](../evidence/concurrency-efficiency.md) -- 최대 성능을 위해 얼마나 많은 코루틴이 필요한가
- [증거 기반](../evidence/coroutines-evidence.md) -- 코루틴의 효과를 확인하는 측정, 벤치마크 및 연구
- [실전 Swoole](../evidence/swoole-evidence.md) -- 실제 측정: Appwrite +91%, IdleMMO 35M req/day, DB 벤치마크
- [실전 Python asyncio](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% 비용, Instagram, uvloop 벤치마크
- [코루틴](coroutines.md) -- 내부 동작 방식
- [Scope](scope.md) -- 코루틴 그룹 관리 방법
- [스케줄러](scheduler.md) -- 어떤 코루틴을 실행할지 결정하는 주체
