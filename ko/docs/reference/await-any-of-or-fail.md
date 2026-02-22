---
layout: docs
lang: ko
path_key: "/docs/reference/await-any-of-or-fail.html"
nav_active: docs
permalink: /ko/docs/reference/await-any-of-or-fail.html
page_title: "await_any_of_or_fail()"
description: "await_any_of_or_fail() — 처음 N개의 성공적으로 완료된 태스크를 대기합니다."
---

# await_any_of_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_of_or_fail()` — 처음 **N개의** 태스크가 성공적으로 완료되기를 대기합니다. 처음 N개 중 하나가 실패하면 예외를 던집니다.

## 설명

```php
await_any_of_or_fail(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true
): array
```

## 매개변수

**`count`**
대기할 성공 결과의 수입니다. `0`이면 빈 배열을 반환합니다.

**`triggers`**
`Async\Completable` 객체의 반복 가능한 컬렉션입니다.

**`cancellation`**
대기를 취소하기 위한 선택적 Awaitable입니다.

**`preserveKeyOrder`**
`true`이면 결과 키가 입력 배열의 키에 해당합니다. `false`이면 완료 순서대로 반환됩니다.

## 반환 값

`$count`개의 성공 결과 배열입니다.

## 오류/예외

`$count`개의 성공에 도달하기 전에 태스크가 실패하면 해당 예외가 던져집니다.

## 예제

### 예제 #1 5개 중 2개의 결과 가져오기

```php
<?php
use function Async\spawn;
use function Async\await_any_of_or_fail;

$coroutines = [];
for ($i = 0; $i < 5; $i++) {
    $coroutines[] = spawn(file_get_contents(...), "https://api/server-$i");
}

// 성공한 응답 2개를 대기
$results = await_any_of_or_fail(2, $coroutines);
echo count($results); // 2
?>
```

## 참고

> **참고:** `triggers` 매개변수는 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. [Iterator 예제](/ko/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)를 참조하세요.

## 같이 보기

- [await_any_of()](/ko/docs/reference/await-any-of.html) — 오류 허용하며 처음 N개 대기
- [await_all_or_fail()](/ko/docs/reference/await-all-or-fail.html) — 모든 태스크 대기
