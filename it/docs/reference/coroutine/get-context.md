---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/get-context.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/get-context.html
page_title: "Coroutine::getContext"
description: "Ottieni il contesto locale di una coroutine."
---

# Coroutine::getContext

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::getContext(): Async\Context
```

Restituisce il contesto locale della coroutine. Il contesto viene creato in modo lazy al primo accesso.

Il contesto consente di memorizzare dati associati a una specifica coroutine e passarli alle coroutine figlie.

## Valore di ritorno

`Async\Context` -- l'oggetto contesto della coroutine.

## Esempi

### Esempio #1 Accesso al contesto

```php
<?php

use function Async\spawn;
use function Async\await;

$coroutine = spawn(function() {
    $ctx = \Async\current_context();
    $ctx['request_id'] = uniqid();

    return $ctx['request_id'];
});

await($coroutine);
$ctx = $coroutine->getContext();
```

## Vedi anche

- [Context](/it/docs/components/context.html) -- Concetto di contesto
- [current_context()](/it/docs/reference/current-context.html) -- Ottieni il contesto della coroutine corrente
