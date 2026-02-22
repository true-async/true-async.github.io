---
layout: docs
lang: ko
path_key: "/docs/reference/coroutine/get-suspend-file-and-line.html"
nav_active: docs
permalink: /ko/docs/reference/coroutine/get-suspend-file-and-line.html
page_title: "Coroutine::getSuspendFileAndLine"
description: "코루틴이 일시 중단된 파일과 줄 번호를 가져옵니다."
---

# Coroutine::getSuspendFileAndLine

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getSuspendFileAndLine(): array
```

코루틴이 일시 중단된(또는 마지막으로 일시 중단된) 파일과 줄 번호를 반환합니다.

## 반환값

`array` -- 두 요소로 구성된 배열:
- `[0]` -- 파일 이름 (`string` 또는 `null`)
- `[1]` -- 줄 번호 (`int`)

## 예제

### 예제 #1 기본 사용법

```php
<?php

use function Async\spawn;
use function Async\suspend;

$coroutine = spawn(function() {
    suspend(); // line 7
});

suspend(); // 코루틴이 일시 중단되도록 양보

[$file, $line] = $coroutine->getSuspendFileAndLine();
echo "Suspended at: $file:$line\n"; // /app/script.php:7
```

## 같이 보기

- [Coroutine::getSuspendLocation](/ko/docs/reference/coroutine/get-suspend-location.html) -- 문자열 형태의 일시 중단 위치
- [Coroutine::getSpawnFileAndLine](/ko/docs/reference/coroutine/get-spawn-file-and-line.html) -- 생성 파일과 줄 번호
