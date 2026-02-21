---
layout: docs
lang: it
path_key: "/docs/reference/coroutine/is-started.html"
nav_active: docs
permalink: /it/docs/reference/coroutine/is-started.html
page_title: "Coroutine::isStarted"
description: "Verifica se la coroutine è stata avviata dallo scheduler."
---

# Coroutine::isStarted

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::isStarted(): bool
```

Verifica se la coroutine è stata avviata dallo scheduler. Una coroutine è considerata avviata dopo che lo scheduler ne inizia l'esecuzione.

## Valore di ritorno

`bool` -- `true` se la coroutine è stata avviata.

## Esempi

### Esempio #1 Verifica prima e dopo l'avvio

```php
<?php

use function Async\spawn;
use function Async\suspend;
use function Async\await;

$coroutine = spawn(function() {
    return "test";
});

var_dump($coroutine->isStarted()); // bool(false) -- ancora in coda

suspend(); // lascia che lo scheduler avvii la coroutine

var_dump($coroutine->isStarted()); // bool(true)

await($coroutine);

var_dump($coroutine->isStarted()); // bool(true) -- ancora true dopo il completamento
```

## Vedi anche

- [Coroutine::isQueued](/it/docs/reference/coroutine/is-queued.html) -- Verifica lo stato della coda
- [Coroutine::isRunning](/it/docs/reference/coroutine/is-running.html) -- Verifica se in esecuzione
- [Coroutine::isCompleted](/it/docs/reference/coroutine/is-completed.html) -- Verifica il completamento
