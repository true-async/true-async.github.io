---
layout: docs
lang: ko
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /ko/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context() — 핸들러의 코루틴 트리 전체에서 보이는 공유 요청 컨텍스트. 임베딩 C 코드(HTTP 서버)가 설정한 request-scope에 묶여 있습니다."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()`는 부모 코루틴에서 상속받은 request-scope의
[`Context`](/ko/docs/components/context.html)를 반환하거나, request-scope가 설정되지 않았으면
`null`을 반환합니다.

## 설명

```php
namespace Async;

function request_context(): ?Context
```

Request-scope는 **임베딩 C 코드**(예: HTTP 서버)가 할당하며 모든 자식 코루틴에 자동으로 전파됩니다.
이로써 핸들러는 요청의 코루틴 트리 전체에서 볼 수 있는 단일 컨텍스트를 갖습니다.

| 함수 | 무엇을 반환 |
|---------|----------------|
| `current_context()` | **현재 코루틴**의 컨텍스트 — 각 코루틴마다 격리됨 |
| `coroutine_context()` | `current_context()` 별칭 |
| `request_context()` | **요청**의 컨텍스트 — 핸들러와 모든 자식 코루틴에 공유됨 |
| `root_context()` | root-scope의 컨텍스트 |

## 반환 값

`Async\Context` — request-scope의 공유 컨텍스트. request-scope 밖(예: HTTP 서버가 없는 CLI
스크립트)에서는 `null`.

## 예제

### 예제 #1 코루틴 트리 전체에 request-id 전파

```php
<?php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;
use function Async\spawn;
use function Async\await_all;
use function Async\request_context;

$server = new HttpServer((new HttpServerConfig())->addListener('0.0.0.0', 8080));

$server->addHttpHandler(function ($req, $res) {
    $rid = $req->getHeader('X-Request-Id') ?? bin2hex(random_bytes(8));
    request_context()->set('request_id', $rid);
    request_context()->set('user_id', authUser($req));

    // 자식 코루틴이 동일한 컨텍스트를 자동으로 봅니다.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // 여기서도 request_id가 보임 — 예: 로깅에 활용
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### 예제 #2 request-scope 밖에서의 안전한 접근

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// HTTP 핸들러(request_id가 보임)와 백그라운드 CLI 작업
// (request_context() === null, $rid === 'no-request') 모두에서 동작.
```

### 예제 #3 `current_context()`와의 비교

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\request_context;
use function Async\current_context;

$server->addHttpHandler(function ($req, $res) {
    request_context()->set('request_id', 'abc-123');
    current_context()->set('local',      'handler-only');

    $child = spawn(function () {
        // request_context는 요청 scope 전체에 공유되므로 보임.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // 자식 코루틴의 current_context()는 자체 컨텍스트.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## 참고

> **언제 `null`이 반환되는가.** request-scope는 외부 코드(HTTP 서버, 큐, gRPC)가 설정합니다.
> 그러한 환경이 없는 일반 CLI 스크립트에서는 `request_context()`가 항상 `null` — 정상입니다.

> **임의 통신용이 아닙니다.** `request_context()`는 의도적으로 요청 scope로 제한됩니다.
> 시스템 전역 값(설정, registry)은 일반 서비스 / DI 컨테이너를 사용하고, per-coroutine은
> `current_context()`를 사용하세요.

## 참고

- [Async\\Context](/ko/docs/components/context.html) — 컨텍스트 클래스와 메서드
- [Async\\current_context()](/ko/docs/reference/current-context.html) — 현재 코루틴의 컨텍스트
- [Async\\root_context()](/ko/docs/reference/root-context.html) — root-scope의 컨텍스트
- [TrueAsync Server: 요청별 scope](/ko/docs/server/workers.html#요청별-scope)
