---
layout: docs
lang: ko
path_key: "/docs/reference/scope/get-child-scopes.html"
nav_active: docs
permalink: /ko/docs/reference/scope/get-child-scopes.html
page_title: "Scope::getChildScopes"
description: "자식 스코프 배열을 반환합니다."
---

# Scope::getChildScopes

(PHP 8.6+, True Async 1.0)

```php
public function getChildScopes(): array
```

해당 스코프에서 `Scope::inherit()`를 통해 생성된 모든 자식 스코프의 배열을 반환합니다. 스코프 계층 구조의 모니터링 및 디버깅에 유용합니다.

## 반환값

`array` — 해당 스코프의 자식인 `Scope` 객체 배열.

## 예제

### 예제 #1 자식 스코프 가져오기

```php
<?php

use Async\Scope;

$parent = new Scope();
$child1 = Scope::inherit($parent);
$child2 = Scope::inherit($parent);

$children = $parent->getChildScopes();

var_dump(count($children)); // int(2)
```

### 예제 #2 자식 스코프 상태 모니터링

```php
<?php

use Async\Scope;

$appScope = new Scope();

$workerScope = Scope::inherit($appScope);
$bgScope = Scope::inherit($appScope);

$workerScope->spawn(function() {
    \Async\delay(1000);
});

foreach ($appScope->getChildScopes() as $child) {
    $status = match(true) {
        $child->isCancelled() => 'cancelled',
        $child->isFinished()  => 'finished',
        $child->isClosed()    => 'closed',
        default               => 'active',
    };
    echo "Scope: $status\n";
}
```

## 참고

- [Scope::inherit](/ko/docs/reference/scope/inherit.html) — 자식 스코프 생성
- [Scope::setChildScopeExceptionHandler](/ko/docs/reference/scope/set-child-scope-exception-handler.html) — 자식 스코프의 예외 핸들러
