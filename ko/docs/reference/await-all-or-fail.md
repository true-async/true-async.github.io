---
layout: docs
lang: ko
path_key: "/docs/reference/await-all-or-fail.html"
nav_active: docs
permalink: /ko/docs/reference/await-all-or-fail.html
page_title: "await_all_or_fail()"
description: "await_all_or_fail() — 모든 태스크의 완료를 대기하며, 첫 번째 오류 시 예외를 던집니다."
---

# await_all_or_fail

(PHP 8.6+, True Async 1.0)

`await_all_or_fail()` — **모든** 태스크가 성공적으로 완료되기를 대기합니다. 첫 번째 오류 시 예외를 던지고 나머지 태스크를 취소합니다.

## 설명

```php
await_all_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## 매개변수

**`triggers`**
`Async\Completable` 객체(코루틴, Future 등)의 반복 가능한 컬렉션입니다.

**`cancellation`**
전체 대기를 취소하기 위한 선택적 Awaitable입니다(예: `timeout()`).

**`preserveKeyOrder`**
`true`(기본값)이면 입력 배열의 키 순서대로 결과가 반환됩니다. `false`이면 완료 순서대로 반환됩니다.

## 반환 값

모든 태스크의 결과 배열입니다. 키는 입력 배열의 키에 해당합니다.

## 오류/예외

첫 번째로 실패한 태스크의 예외를 던집니다.

## 예제

### 예제 #1 병렬 데이터 로딩

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

$results = await_all_or_fail([
    'users'    => spawn(file_get_contents(...), 'https://api/users'),
    'orders'   => spawn(file_get_contents(...), 'https://api/orders'),
    'products' => spawn(file_get_contents(...), 'https://api/products'),
]);

// $results['users'], $results['orders'], $results['products']
?>
```

### 예제 #2 타임아웃 사용

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;
use function Async\timeout;

try {
    $results = await_all_or_fail($coroutines, timeout(5000));
} catch (Async\TimeoutException $e) {
    echo "5초 안에 모든 태스크가 완료되지 않았습니다\n";
}
?>
```

### 예제 #3 배열 대신 Iterator 사용

모든 `await_*` 계열 함수는 배열뿐만 아니라 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. 이를 통해 코루틴을 동적으로 생성할 수 있습니다:

```php
<?php
use function Async\spawn;
use function Async\await_all_or_fail;

class UrlIterator implements \Iterator {
    private array $urls;
    private int $pos = 0;

    public function __construct(array $urls) { $this->urls = $urls; }
    public function current(): mixed {
        return spawn(file_get_contents(...), $this->urls[$this->pos]);
    }
    public function key(): int { return $this->pos; }
    public function next(): void { $this->pos++; }
    public function valid(): bool { return isset($this->urls[$this->pos]); }
    public function rewind(): void { $this->pos = 0; }
}

$iterator = new UrlIterator([
    'https://api.example.com/a',
    'https://api.example.com/b',
    'https://api.example.com/c',
]);

$results = await_all_or_fail($iterator);
?>
```

## 같이 보기

- [await_all()](/ko/docs/reference/await-all.html) — 오류 허용하며 모든 태스크 대기
- [await()](/ko/docs/reference/await.html) — 단일 태스크 대기
