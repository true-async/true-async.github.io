---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-spawn-file-and-line.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-spawn-file-and-line.html
page_title: "Coroutine::getSpawnFileAndLine"
description: "코루틴이 생성된 파일과 줄 번호를 가져옵니다."
---

# Coroutine::getSpawnFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSpawnFileAndLine(): array
```

이 코루틴을 생성하기 위해 `spawn()`이 호출된 파일과 줄 번호를 반환합니다.

## 반환값

`array` -- 두 요소로 구성된 배열:
- `[0]` -- 파일 이름 (`string` 또는 `null`)
- `[1]` -- 줄 번호 (`int`)

## 예제

### 예제 #1 기본 사용법

```php
<?php

use function Async\spawn;

$coroutine = spawn(fn() => "test"); // line 5

[$file, $line] = $coroutine->getSpawnFileAndLine();

echo "File: $file\n";  // /app/script.php
echo "Line: $line\n"; // 5
```

## 같이 보기

- [Coroutine::getSpawnLocation](/ko/docs/reference/coroutine/get-spawn-location.html) -- 문자열 형태의 생성 위치
- [Coroutine::getSuspendFileAndLine](/ko/docs/reference/coroutine/get-suspend-file-and-line.html) -- 일시 중단 파일과 줄 번호
