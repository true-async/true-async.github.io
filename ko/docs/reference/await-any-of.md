---
layout: docs
lang: ko
path_key: "/docs/reference/await-any-of.html"
nav_active: docs
permalink: /ko/docs/reference/await-any-of.html
page_title: "await_any_of()"
description: "await_any_of() — 부분 실패를 허용하면서 처음 N개의 태스크를 대기합니다."
---

# await_any_of

(PHP 8.6+, True Async 1.0)

`await_any_of()` — 처음 **N개의** 태스크 완료를 대기하며, 결과와 오류를 별도로 수집합니다. 개별 태스크가 실패해도 예외를 던지지 않습니다.

## 설명

```php
await_any_of(
    int $count,
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## 매개변수

**`count`**
대기할 성공 결과의 수입니다.

**`triggers`**
`Async\Completable` 객체의 반복 가능한 컬렉션입니다.

**`cancellation`**
대기를 취소하기 위한 선택적 Awaitable입니다.

**`preserveKeyOrder`**
`true`이면 결과 키가 입력 배열의 키에 해당합니다.

**`fillNull`**
`true`이면 실패한 태스크의 결과 배열에 `null`이 배치됩니다.

## 반환 값

두 요소의 배열: `[$results, $errors]`

- `$results` — 성공적인 결과의 배열(최대 `$count`개 항목)
- `$errors` — 실패한 태스크의 예외 배열

## 예제

### 예제 #1 오류 허용 쿼럼

```php
<?php
use function Async\spawn;
use function Async\await_any_of;

$nodes = ['node1', 'node2', 'node3', 'node4', 'node5'];

$coroutines = [];
foreach ($nodes as $node) {
    $coroutines[$node] = spawn(file_get_contents(...), "https://$node/vote");
}

// 쿼럼 대기: 5개 중 3개의 응답
[$results, $errors] = await_any_of(3, $coroutines);

if (count($results) >= 3) {
    echo "쿼럼 달성\n";
} else {
    echo "쿼럼 미달성, 오류: " . count($errors) . "\n";
}
?>
```

## 참고

> **참고:** `triggers` 매개변수는 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. [Iterator 예제](/ko/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)를 참조하세요.

## 같이 보기

- [await_any_of_or_fail()](/ko/docs/reference/await-any-of-or-fail.html) — 처음 N개, 오류 시 중단
- [await_all()](/ko/docs/reference/await-all.html) — 오류 허용하며 모든 태스크 대기
