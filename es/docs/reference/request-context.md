---
layout: docs
lang: es
path_key: "/docs/reference/request-context.html"
nav_active: docs
permalink: /es/docs/reference/request-context.html
page_title: "request_context()"
description: "Async\\request_context(): contexto compartido de la solicitud, visible a todo el árbol de corrutinas del manejador. Asociado al request-scope que fija el código C anfitrión (servidor HTTP)."
---

# request_context

(PHP 8.6+, True Async 1.0)

`Async\request_context()` devuelve el [`Context`](/es/docs/components/context.html) del
request-scope, heredado desde la corrutina padre, o `null` si el request-scope no está fijado.

## Descripción

```php
namespace Async;

function request_context(): ?Context
```

El request-scope lo asigna el **código C anfitrión** (por ejemplo, el servidor HTTP) y se
propaga automáticamente a todas las corrutinas hijas. Esto le da al manejador un único contexto
visible a todo el árbol de corrutinas de la solicitud.

| Función | Qué devuelve |
|---------|--------------|
| `current_context()` | Contexto de la **corrutina actual**, aislado por corrutina |
| `coroutine_context()` | Alias de `current_context()` |
| `request_context()` | Contexto de la **solicitud**, común al handler y a todas sus corrutinas hijas |
| `root_context()` | Contexto del root-scope |

## Valor de retorno

`Async\Context`: contexto compartido del request-scope, o `null` fuera del request-scope (por
ejemplo, en un script CLI sin servidor HTTP).

## Ejemplos

### Ejemplo #1 Propagar el request-id por todo el árbol de corrutinas

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

    // Las corrutinas hijas ven el mismo contexto de forma automática.
    [$user, $posts] = await_all([
        spawn(fn() => fetchUser()),
        spawn(fn() => fetchPosts()),
    ]);

    $res->setHeader('X-Request-Id', $rid);
    $res->json(['user' => $user, 'posts' => $posts]);
});

function fetchUser(): array
{
    // request_id se ve aquí; por ejemplo, para logging
    $rid = request_context()?->get('request_id');
    log_debug("[$rid] fetching user");
    // ...
    return [/* ... */];
}

$server->start();
```

### Ejemplo #2 Acceso seguro fuera del request-scope

```php
<?php
use function Async\request_context;

function audit_log(string $event): void
{
    $ctx = request_context();
    $rid = $ctx?->get('request_id') ?? 'no-request';
    error_log("[$rid] $event");
}

// Funciona tanto en el handler HTTP (se ve request_id) como en una tarea CLI en background
// (request_context() === null, $rid === 'no-request').
```

### Ejemplo #3 Comparativa con `current_context()`

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
        // Se ve request_context porque es común a todo el scope de la solicitud.
        var_dump(request_context()->get('request_id')); // string(7) "abc-123"

        // current_context() de la corrutina hija es suyo propio.
        var_dump(current_context()->find('local'));     // NULL
    });
    await($child);

    $res->setStatusCode(204);
});
```

## Notas

> **Cuándo devuelve `null`.** El request-scope lo fija un código externo (servidor HTTP, cola,
> gRPC). En un script CLI normal sin ese entorno, `request_context()` siempre es `null`, y eso es
> lo esperado.

> **No es para comunicación arbitraria.** `request_context()` está intencionalmente limitado al
> scope de la solicitud. Para valores compartidos a nivel de sistema (config, registry) usa
> servicios habituales / contenedor DI; para per-corrutina, `current_context()`.

## Véase también

- [Async\\Context](/es/docs/components/context.html): la clase Context y sus métodos
- [Async\\current_context()](/es/docs/reference/current-context.html): contexto de la corrutina actual
- [Async\\root_context()](/es/docs/reference/root-context.html): contexto del root-scope
- [TrueAsync Server: scope por solicitud](/es/docs/server/workers.html#scope-por-solicitud)
