---
layout: docs
lang: de
path_key: "/docs/reference/thread-pool/is-closed.html"
nav_active: docs
permalink: /de/docs/reference/thread-pool/is-closed.html
page_title: "ThreadPool::isClosed()"
description: "Prüft, ob der Thread-Pool heruntergefahren wurde."
---

# ThreadPool::isClosed()

(PHP 8.6+, True Async 1.0)

```php
public ThreadPool::isClosed(): bool
```

Gibt `true` zurück, wenn der Pool über [`close()`](/de/docs/reference/thread-pool/close.html) oder [`cancel()`](/de/docs/reference/thread-pool/cancel.html) heruntergefahren wurde. Gibt `false` zurück, solange der Pool noch Aufgaben annimmt.

## Rückgabewert

`bool` — `true`, wenn der Pool geschlossen ist; `false`, wenn er noch aktiv ist.

## Beispiele

### Beispiel #1 Zustand vor dem Einreichen prüfen

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

spawn(function() {
    $pool = new ThreadPool(workers: 2);

    $future = $pool->submit(fn() => 'done');

    var_dump($pool->isClosed()); // bool(false)

    $pool->close();

    var_dump($pool->isClosed()); // bool(true)

    echo await($future), "\n"; // done
});
```

### Beispiel #2 Submit in gemeinsam genutzten Kontexten absichern

```php
<?php

use Async\ThreadPool;
use function Async\spawn;
use function Async\await;

function trySubmit(ThreadPool $pool, callable $task): mixed
{
    if ($pool->isClosed()) {
        return null;
    }
    return await($pool->submit($task));
}

spawn(function() {
    $pool = new ThreadPool(workers: 2);
    echo trySubmit($pool, fn() => 'hello'), "\n"; // hello
    $pool->close();
    var_dump(trySubmit($pool, fn() => 'missed')); // NULL
});
```

## Siehe auch

- [ThreadPool::close()](/de/docs/reference/thread-pool/close.html) — Geordnetes Herunterfahren
- [ThreadPool::cancel()](/de/docs/reference/thread-pool/cancel.html) — Hartes Herunterfahren
- [Async\ThreadPool](/de/docs/components/thread-pool.html) — Komponentenübersicht
