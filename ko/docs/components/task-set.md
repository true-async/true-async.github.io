---
layout: docs
lang: ko
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /ko/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — 결과 전달 후 자동 정리되는 동적 작업 세트."
---

# Async\TaskSet 클래스

(PHP 8.6+, True Async 1.0)

## 소개

`TaskGroup`은 작업 자체가 아닌 결과가 목적인 시나리오에 적합합니다.
하지만 결과를 스트림으로 소비하면서 작업 수를 제어해야 하는 상황도 많습니다.

대표적인 예시:

- **Supervisor**: 작업을 모니터링하고 완료에 반응하는 코드.
- **코루틴 풀**: 고정된 수의 코루틴이 데이터를 처리하는 패턴.

**TaskSet**은 이러한 문제를 해결하기 위해 설계되었습니다. `joinNext()`, `joinAll()`, `joinAny()` 또는 `foreach`를 통해 결과가 전달되는 시점에 완료된 작업을 자동으로 제거합니다.

## TaskGroup과의 차이점

| 속성                      | TaskGroup                          | TaskSet                                    |
|---------------------------|------------------------------------|--------------------------------------------|
| 결과 저장                 | 명시적 요청까지 모든 결과 보존     | 전달 후 제거                               |
| 메서드 재호출             | 멱등성 — 동일한 결과               | 매 호출마다 다음 요소                      |
| `count()`                 | 전체 작업 수                       | 아직 전달되지 않은 작업 수                 |
| 대기 메서드               | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`     |
| 반복                      | 항목 유지                          | `foreach` 이후 항목 제거                   |
| 사용 사례                 | 고정된 작업 세트                   | 동적 작업 스트림                           |

## 멱등성 vs 소비

**TaskSet**과 **TaskGroup**의 **핵심적인 개념 차이**입니다.

**TaskGroup은 멱등적입니다.** `race()`, `any()`, `all()` 호출은 항상 동일한 결과를 반환합니다. `foreach` 반복은 항상 모든 작업을 순회합니다.
결과는 그룹에 저장되어 반복 접근이 가능합니다:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race()는 항상 동일한 첫 번째 완료된 작업을 반환
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — 동일한 결과!

// all()은 항상 전체 배열을 반환
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — 동일한 배열!

// foreach는 항상 모든 요소를 순회
foreach ($group as $key => [$result, $error]) { /* 3회 반복 */ }
foreach ($group as $key => [$result, $error]) { /* 다시 3회 반복 */ }

echo $group->count(); // 3 — 항상 3
```

**TaskSet은 소비형입니다.** `joinNext()` / `joinAny()`를 호출할 때마다 다음 요소를 추출하고 세트에서 제거합니다. 이후 `foreach`에서는 이미 전달된 항목을 찾을 수 없습니다. 이 동작은 큐나 채널에서 읽는 것과 유사합니다:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext()는 매번 다음 결과를 반환
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — 다른 결과!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — 세트가 비어 있음

// 완전히 소비된 후 joinAll() — 빈 배열
$set->seal();
$rest = $set->joinAll()->await(); // [] — 반환할 것이 없음
```

반복에서도 동일한 로직이 적용됩니다:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// 첫 번째 foreach가 모든 결과를 소비
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// 두 번째 foreach — 비어 있음, 반복할 것이 없음
foreach ($set as $key => [$result, $error]) {
    echo "이 코드는 실행되지 않습니다\n";
}
```

> **규칙:** 결과에 반복 접근이 필요하면 `TaskGroup`을 사용하세요.
> 결과를 한 번만 처리하고 메모리를 해제해야 한다면 `TaskSet`을 사용하세요.

## join 메서드의 의미론

`TaskGroup`에서 `race()` / `any()` / `all()`이 항목을 그룹에 남기는 것과 달리,
`TaskSet`은 **join** 의미론을 가진 메서드를 사용합니다 — 결과가 전달되면 항목이 제거됩니다:

- **`joinNext()`** — `race()`의 유사 메서드: 첫 번째 완료된 작업의 결과(성공 또는 오류),
  항목이 세트에서 제거됩니다.
- **`joinAny()`** — `any()`의 유사 메서드: 첫 번째 *성공적으로* 완료된 작업의 결과,
  항목이 세트에서 제거됩니다. 오류는 건너뜁니다.
- **`joinAll()`** — `all()`의 유사 메서드: 모든 결과의 배열,
  모든 항목이 세트에서 제거됩니다.

## 자동 정리

자동 정리는 모든 결과 전달 지점에서 작동합니다:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

`foreach`를 통한 반복 시 처리된 각 항목은 즉시 제거됩니다:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count()는 매 반복마다 감소
    process($result);
}
```

## 동시성 제한

`TaskGroup`과 마찬가지로 `TaskSet`도 동시성 제한을 지원합니다:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

제한을 초과하는 작업은 대기열에 배치되고 슬롯이 확보되면 시작됩니다.

## 클래스 개요

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* 메서드 */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* 작업 추가 */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* 결과 대기 (자동 정리 포함) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* 생명주기 */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* 상태 */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* 완료 대기 */
    public awaitCompletion(): void

    /* 반복 (자동 정리 포함) */
    public getIterator(): Iterator
}
```

## 예제

### joinAll() — 자동 정리를 포함한 병렬 로딩

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, 모든 항목 제거됨

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — 완료되는 대로 작업 처리

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "결과 수신, 남은 작업: {$set->count()}\n";
}
```

### joinAny() — 내결함성 검색

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// 첫 번째 성공 결과, 항목 제거됨
$result = $set->joinAny()->await();
echo "검색 완료, 활성 작업 수: {$set->count()}\n";
```

### foreach — 스트리밍 처리

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("$key 처리 오류: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // 항목 제거됨, 메모리 해제됨
}
```

### 동적 작업 추가를 포함한 Worker 루프

```php
$set = new Async\TaskSet(concurrency: 10);

// 하나의 코루틴이 작업을 추가
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// 다른 코루틴이 결과를 처리
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("오류: {$error->getMessage()}");
        }
    }
});
```

## 다른 언어의 동등 기능

| 기능                 | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| 동적 세트            | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| 자동 정리            | 자동                              | 수동 관리                     | 수동 관리                 | 수동 관리              |
| 동시성 제한          | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | 버퍼 채널              |
| 스트리밍 반복        | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## 목차

- [TaskSet::__construct](/ko/docs/reference/task-set/construct.html) — 작업 세트 생성
- [TaskSet::spawn](/ko/docs/reference/task-set/spawn.html) — 자동 증분 키로 작업 추가
- [TaskSet::spawnWithKey](/ko/docs/reference/task-set/spawn-with-key.html) — 명시적 키로 작업 추가
- [TaskSet::joinNext](/ko/docs/reference/task-set/join-next.html) — 첫 번째 완료된 작업의 결과 가져오기
- [TaskSet::joinAny](/ko/docs/reference/task-set/join-any.html) — 첫 번째 성공한 작업의 결과 가져오기
- [TaskSet::joinAll](/ko/docs/reference/task-set/join-all.html) — 모든 작업을 기다리고 결과 가져오기
- [TaskSet::seal](/ko/docs/reference/task-set/seal.html) — 새로운 작업에 대해 세트 봉인
- [TaskSet::cancel](/ko/docs/reference/task-set/cancel.html) — 모든 작업 취소
- [TaskSet::dispose](/ko/docs/reference/task-set/dispose.html) — 세트의 scope 파괴
- [TaskSet::finally](/ko/docs/reference/task-set/finally.html) — 완료 핸들러 등록
- [TaskSet::isFinished](/ko/docs/reference/task-set/is-finished.html) — 모든 작업이 완료되었는지 확인
- [TaskSet::isSealed](/ko/docs/reference/task-set/is-sealed.html) — 세트가 봉인되었는지 확인
- [TaskSet::count](/ko/docs/reference/task-set/count.html) — 미전달 작업 수 가져오기
- [TaskSet::awaitCompletion](/ko/docs/reference/task-set/await-completion.html) — 모든 작업 완료 대기
- [TaskSet::getIterator](/ko/docs/reference/task-set/get-iterator.html) — 자동 정리를 포함한 결과 반복
