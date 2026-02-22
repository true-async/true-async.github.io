---
layout: docs
lang: ko
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /ko/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- 작업 그룹을 관리하기 위한 고수준 구조적 동시성 패턴."
---

# Async\TaskGroup 클래스

(PHP 8.6+, True Async 1.0)

## 소개

코루틴으로 작업할 때 여러 작업을 실행하고 그 결과를 기다려야 하는 경우가 자주 있습니다.
`spawn()`과 `await()`를 직접 사용하면 개발자가 모든 코루틴이
대기되거나 취소되었는지 확인해야 할 책임을 집니다. 잊혀진 코루틴은 계속 실행되고,
처리되지 않은 오류는 사라지며, 작업 그룹을 취소하려면 수동 코드가 필요합니다.

`await_all()`과 `await_any()` 함수는 서로 다른 작업 간의 논리적 관계를 고려하지 않습니다.
예를 들어, 여러 요청을 보내고 첫 번째 결과를 가져온 다음 나머지를 취소해야 할 때,
`await_any()`는 나머지 작업을 취소하기 위해 프로그래머에게 추가 코드를 요구합니다.
이러한 코드는 상당히 복잡할 수 있으므로 `await_all()`과 `await_any()`는
이 상황에서 안티패턴으로 간주해야 합니다.

이 목적으로 `Scope`를 사용하는 것은 적합하지 않습니다. 작업 코루틴이 다른 자식 코루틴을 생성할 수 있어
프로그래머가 작업 코루틴 목록을 유지하고 별도로 추적해야 하기 때문입니다.

**TaskGroup**은 이 모든 문제를 해결합니다. 모든 작업이 적절히 대기되거나 취소됨을
보장하는 고수준 구조적 동시성 패턴입니다. 작업을 논리적으로 그룹화하고
하나의 단위로 조작할 수 있게 합니다.

## 대기 전략

`TaskGroup`은 결과를 기다리는 여러 전략을 제공합니다.
각각은 `Future`를 반환하며, 타임아웃을 전달할 수 있습니다: `->await(Async\timeout(5.0))`.

- **`all()`** -- 모든 작업 결과의 배열로 해결되는 `Future`를 반환합니다.
  최소 하나의 작업이 예외를 던지면 `CompositeException`으로 거부됩니다.
  `ignoreErrors: true` 매개변수를 사용하면 성공한 결과만 반환합니다.
- **`race()`** -- 성공 여부와 관계없이 첫 번째 완료된 작업의 결과로 해결되는 `Future`를 반환합니다.
  다른 작업은 계속 실행됩니다.
- **`any()`** -- 첫 번째 *성공적으로* 완료된 작업의 결과로 해결되는 `Future`를 반환하며,
  오류를 무시합니다. 모든 작업이 실패하면 `CompositeException`으로 거부됩니다.
- **`awaitCompletion()`** -- `Scope` 내의 다른 코루틴뿐만 아니라 모든 작업의 완전한 완료를 기다립니다.

## 동시성 제한

`concurrency` 매개변수가 지정되면 `TaskGroup`은 코루틴 풀로 작동합니다:
제한을 초과하는 작업은 대기열에서 기다리며 빈 슬롯이 나타날 때까지 코루틴을 생성하지 않습니다.
이는 대량의 작업을 처리할 때 메모리를 절약하고 부하를 제어합니다.

## TaskGroup과 Scope

`TaskGroup`은 작업 코루틴의 생명주기를 관리하기 위해 `Scope`를 사용합니다.
`TaskGroup`을 생성할 때 기존 `Scope`를 전달하거나 `TaskGroup`이 현재 스코프에서 자식 `Scope`를 생성하도록 할 수 있습니다.
`TaskGroup`에 추가된 모든 작업은 이 `Scope` 내에서 실행됩니다.
이는 `TaskGroup`이 취소되거나 파괴될 때
모든 코루틴이 자동으로 취소되어 안전한 리소스 관리와 누수 방지를 보장합니다.

## 봉인과 반복

`TaskGroup`은 `seal()` 메서드를 사용하여 봉인할 때까지
동적으로 작업을 추가할 수 있습니다.

`all()` 메서드는 대기열의 모든 기존 작업이 완료되면 트리거되는 `Future`를 반환합니다.
이를 통해 작업이 동적으로 추가되는 루프에서 `TaskGroup`을 사용하고,
현재 작업 세트의 결과를 얻기 위해 `all()`을 호출할 수 있습니다.

`TaskGroup`은 결과가 준비되는 대로 반복하기 위한 `foreach`도 지원합니다.
이 경우 모든 작업을 추가한 후 `seal()`을 호출하여
새 작업이 없음을 알리고, 모든 결과를 처리한 후 `foreach`가 종료될 수 있도록 해야 합니다.

## 클래스 개요

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* 메서드 */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* 작업 추가 */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* 결과 대기 */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* 생명주기 */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* 상태 */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* 결과와 오류 */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* 반복 */
    public getIterator(): Iterator
}
```

## 예제

### all() -- 병렬 데이터 로딩

가장 흔한 시나리오 -- 여러 소스에서 동시에 데이터를 로딩합니다:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

세 요청 모두 병렬로 실행됩니다. 그 중 하나가 예외를 던지면
`all()`은 `CompositeException`으로 거부되는 `Future`를 반환합니다.

### race() -- 헤지드 요청

"헤지드 요청" 패턴 -- 동일한 요청을 여러 레플리카에 보내고
첫 번째 응답을 취합니다. 이는 느리거나 과부하된 서버에서 지연 시간을 줄입니다:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// 첫 번째 응답이 결과가 되고, 다른 작업은 계속 실행됩니다
$product = $group->race()->await();
```

### any() -- 오류 내성 검색

여러 제공자에 쿼리하고, 오류를 무시하면서 첫 번째 성공한 응답을 취합니다:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any()는 실패한 제공자를 무시하고 첫 번째 성공한 결과를 반환합니다
$results = $group->any()->await();

// 실패한 제공자의 오류는 명시적으로 처리해야 합니다, 그렇지 않으면 소멸자가 예외를 던집니다
$group->suppressErrors();
```

모든 제공자가 실패하면 `any()`는 모든 오류가 포함된 `CompositeException`을 던집니다.

### 동시성 제한 -- 큐 처리

10,000개의 작업을 처리하되 동시에 50개 이하로:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup`은 자동으로 작업을 대기열에 넣습니다. 빈 슬롯이 나타날 때만
코루틴이 생성되어 대량의 작업에서 메모리를 절약합니다.

### 완료되는 대로 결과 반복

모든 작업이 끝날 때까지 기다리지 않고 결과를 처리합니다:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // 결과는 추가된 순서가 아니라 준비되는 대로 도착합니다
    saveToStorage($result);
}
```

### 작업 그룹 타임아웃

결과 대기 시간을 제한합니다:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "5초 내에 데이터를 가져오지 못했습니다";
}
```

## 다른 언어의 유사 기능

| 기능                    | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| 구조적 동시성            | `seal()` + `all()->await()`         | `async with` 블록               | `try-with-resources` + `join()`          | 스코프를 통해 자동         |
| 대기 전략               | `all()`, `race()`, `any()` -> Future | `async with`만 가능              | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| 동시성 제한             | `concurrency: N`                    | 없음 (`Semaphore` 필요)          | 없음                                      | 없음 (`Semaphore` 필요)    |
| 결과 반복               | 완료 순서대로 `foreach`              | 없음                             | 없음                                      | `Channel`                 |
| 오류 처리               | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | 예외가 스코프를 취소       |

PHP `TaskGroup`은 다른 언어에서 여러 프리미티브에 분산되어 있는 기능을 결합합니다:
세마포어 없는 동시성 제한, 단일 객체의 다양한 대기 전략, 완료 순서대로의 결과 반복.

## 목차

- [TaskGroup::__construct](/ko/docs/reference/task-group/construct.html) -- 작업 그룹 생성
- [TaskGroup::spawn](/ko/docs/reference/task-group/spawn.html) -- 자동 증가 키로 작업 추가
- [TaskGroup::spawnWithKey](/ko/docs/reference/task-group/spawn-with-key.html) -- 명시적 키로 작업 추가
- [TaskGroup::all](/ko/docs/reference/task-group/all.html) -- 모든 작업을 기다리고 결과 가져오기
- [TaskGroup::race](/ko/docs/reference/task-group/race.html) -- 첫 번째 완료된 작업의 결과 가져오기
- [TaskGroup::any](/ko/docs/reference/task-group/any.html) -- 첫 번째 성공한 작업의 결과 가져오기
- [TaskGroup::awaitCompletion](/ko/docs/reference/task-group/await-completion.html) -- 모든 작업 완료 대기
- [TaskGroup::seal](/ko/docs/reference/task-group/seal.html) -- 새 작업에 대해 그룹 봉인
- [TaskGroup::cancel](/ko/docs/reference/task-group/cancel.html) -- 모든 작업 취소
- [TaskGroup::dispose](/ko/docs/reference/task-group/dispose.html) -- 그룹의 스코프 파괴
- [TaskGroup::finally](/ko/docs/reference/task-group/finally.html) -- 완료 핸들러 등록
- [TaskGroup::isFinished](/ko/docs/reference/task-group/is-finished.html) -- 모든 작업 완료 여부 확인
- [TaskGroup::isSealed](/ko/docs/reference/task-group/is-sealed.html) -- 그룹 봉인 여부 확인
- [TaskGroup::count](/ko/docs/reference/task-group/count.html) -- 작업 수 가져오기
- [TaskGroup::getResults](/ko/docs/reference/task-group/get-results.html) -- 성공한 결과 배열 가져오기
- [TaskGroup::getErrors](/ko/docs/reference/task-group/get-errors.html) -- 오류 배열 가져오기
- [TaskGroup::suppressErrors](/ko/docs/reference/task-group/suppress-errors.html) -- 오류를 처리됨으로 표시
- [TaskGroup::getIterator](/ko/docs/reference/task-group/get-iterator.html) -- 완료 순서대로 결과 반복
