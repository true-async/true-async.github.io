---
layout: docs
lang: ko
path_key: "/docs/reference/await-first-success.html"
nav_active: docs
permalink: /ko/docs/reference/await-first-success.html
page_title: "await_first_success()"
description: "await_first_success() — 다른 태스크의 오류를 무시하고 첫 번째 성공적으로 완료된 태스크를 대기합니다."
---

# await_first_success

(PHP 8.6+, True Async 1.0)

`await_first_success()` — **첫 번째로 성공적으로** 완료된 태스크를 대기합니다. 다른 태스크의 오류는 별도로 수집되며 대기를 중단하지 않습니다.

## 설명

```php
await_first_success(
    iterable $triggers,
    ?Async\Awaitable $cancellation = null
): array
```

## 매개변수

**`triggers`**
`Async\Completable` 객체의 반복 가능한 컬렉션입니다.

**`cancellation`**
대기를 취소하기 위한 선택적 Awaitable입니다.

## 반환 값

두 요소의 배열: `[$result, $errors]`

- `$result` — 첫 번째로 성공적으로 완료된 태스크의 결과(모든 태스크가 실패한 경우 `null`)
- `$errors` — 첫 번째 성공 전에 실패한 태스크의 예외 배열

## 예제

### 예제 #1 장애 허용 요청

```php
<?php
use function Async\spawn;
use function Async\await_first_success;

// 여러 서버를 시도하고 첫 번째 성공 응답을 가져옵니다
[$result, $errors] = await_first_success([
    spawn(file_get_contents(...), 'https://primary.example.com/api'),
    spawn(file_get_contents(...), 'https://secondary.example.com/api'),
    spawn(file_get_contents(...), 'https://fallback.example.com/api'),
]);

if ($result !== null) {
    echo "데이터 수신 완료\n";
} else {
    echo "모든 서버에 접근할 수 없습니다\n";
    foreach ($errors as $error) {
        echo "  - " . $error->getMessage() . "\n";
    }
}
?>
```

## 참고

> **참고:** `triggers` 매개변수는 `Iterator` 구현을 포함한 모든 `iterable`을 허용합니다. [Iterator 예제](/ko/docs/reference/await-all-or-fail.html#example-3-with-iterator-instead-of-array)를 참조하세요.

## 같이 보기

- [await_any_or_fail()](/ko/docs/reference/await-any-or-fail.html) — 첫 번째 태스크, 오류 시 중단
- [await_all()](/ko/docs/reference/await-all.html) — 오류 허용하며 모든 태스크 대기
