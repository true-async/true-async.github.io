---
layout: docs
lang: ko
path_key: "/docs/reference/await-all.html"
nav_active: docs
permalink: /ko/docs/reference/await-all.html
page_title: "await_all()"
description: "await_all() — 부분 실패를 허용하면서 모든 태스크를 대기합니다."
---

# await_all

(PHP 8.6+, True Async 1.0)

`await_all()` — **모든** 태스크의 완료를 대기하며, 결과와 오류를 별도로 수집합니다. 개별 태스크가 실패해도 예외를 던지지 않습니다.

## 설명

```php
await_all(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null,
    bool $preserveKeyOrder = true,
    bool $fillNull = false
): array
```

## 매개변수

**`triggers`**
`Async\Completable` 객체의 반복 가능한 컬렉션입니다.

**`cancellation`**
전체 대기를 취소하기 위한 선택적 Awaitable입니다.

**`preserveKeyOrder`**
`true`(기본값)이면 입력 배열의 키 순서대로 결과가 반환됩니다. `false`이면 완료 순서대로 반환됩니다.

**`fillNull`**
`true`이면 실패한 태스크의 결과 배열에 `null`이 배치됩니다. `false`(기본값)이면 오류가 있는 키는 생략됩니다.

## 반환 값

두 요소의 배열: `[$results, $errors]`

- `$results` — 성공적인 결과의 배열
- `$errors` — 예외의 배열(키는 입력 태스크의 키에 해당)

## 예제

### 예제 #1 부분 실패 허용

```php
<?php
use function Async\spawn;
use function Async\await_all;

$coroutines = [
    'fast'   => spawn(file_get_contents(...), 'https://api/fast'),
    'slow'   => spawn(file_get_contents(...), 'https://api/slow'),
    'broken' => spawn(function() { throw new \Exception('Error'); }),
];

[$results, $errors] = await_all($coroutines);

// $results에는 'fast'와 'slow'가 포함됩니다
// $errors에는 'broken' => Exception이 포함됩니다
foreach ($errors as $key => $error) {
    echo "태스크 '$key' 실패: {$error->getMessage()}\n";
}
?>
```

### 예제 #2 fillNull 사용

```php
<?php
[$results, $errors] = await_all($coroutines, fillNull: true);

// $results['broken'] === null (누락된 키 대신)
?>
```

## 참고

> **참고:** `triggers` 매개변수는 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. 반복 중에 코루틴을 동적으로 생성할 수 있습니다. [Iterator 예제](/ko/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)를 참조하세요.

## 같이 보기

- [await_all_or_fail()](/ko/docs/reference/await-all-or-fail.html) — 모든 태스크, 오류 시 중단
- [await_any_or_fail()](/ko/docs/reference/await-any-or-fail.html) — 첫 번째 결과
