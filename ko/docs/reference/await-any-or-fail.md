---
layout: docs
lang: ko
path_key: "/docs/reference/await-any-or-fail.html"
nav_active: docs
permalink: /ko/docs/reference/await-any-or-fail.html
page_title: "await_any_or_fail()"
description: "await_any_or_fail() — 첫 번째로 완료된 태스크를 대기합니다."
---

# await_any_or_fail

(PHP 8.6+, True Async 1.0)

`await_any_or_fail()` — **첫 번째로** 완료된 태스크를 대기합니다. 첫 번째로 완료된 태스크가 예외를 던진 경우 해당 예외가 전파됩니다.

## 설명

```php
await_any_or_fail(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): mixed
```

## 매개변수

**`triggers`**
`Async\Completable` 객체의 반복 가능한 컬렉션입니다.

**`cancellation`**
대기를 취소하기 위한 선택적 Awaitable입니다.

## 반환 값

첫 번째로 완료된 태스크의 결과입니다.

## 오류/예외

첫 번째로 완료된 태스크가 예외를 던진 경우 해당 예외가 전파됩니다.

## 예제

### 예제 #1 요청 경쟁

```php
<?php
use function Async\spawn;
use function Async\await_any_or_fail;

// 가장 먼저 응답하는 쪽이 승리
$result = await_any_or_fail([
    spawn(file_get_contents(...), 'https://mirror1.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror2.example.com/data'),
    spawn(file_get_contents(...), 'https://mirror3.example.com/data'),
]);

echo "가장 빠른 미러에서 응답을 수신했습니다\n";
?>
```

## 참고

> **참고:** `triggers` 매개변수는 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. [Iterator 예제](/ko/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)를 참조하세요.

## 같이 보기

- [await_first_success()](/ko/docs/reference/await-first-success.html) — 오류를 무시하고 첫 번째 성공
- [await_all_or_fail()](/ko/docs/reference/await-all-or-fail.html) — 모든 태스크 대기
