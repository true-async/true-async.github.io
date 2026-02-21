---
layout: docs
lang: de
path_key: "/docs/reference/coroutine/as-hi-priority.html"
nav_active: docs
permalink: /de/docs/reference/coroutine/as-hi-priority.html
page_title: "Coroutine::asHiPriority"
description: "Die Coroutine als hochpriorisiert fuer den Scheduler markieren."
---

# Coroutine::asHiPriority

(PHP 8.6+, True Async 1.0)

```php
public Coroutine::asHiPriority(): Coroutine
```

Markiert die Coroutine als hochpriorisiert. Der Scheduler bevorzugt solche Coroutinen bei der Auswahl der naechsten auszufuehrenden Aufgabe.

Die Methode gibt dasselbe Coroutine-Objekt zurueck und ermoeglicht so ein Fluent Interface.

## Rueckgabewert

`Coroutine` -- dasselbe Coroutine-Objekt (Fluent Interface).

## Beispiele

### Beispiel #1 Prioritaet setzen

```php
<?php

use function Async\spawn;

$coroutine = spawn(function() {
    return "important task";
})->asHiPriority();
```

### Beispiel #2 Fluent Interface

```php
<?php

use function Async\spawn;
use function Async\await;

$result = await(
    spawn(fn() => criticalOperation())->asHiPriority()
);
```

## Siehe auch

- [spawn()](/de/docs/reference/spawn.html) -- Eine Coroutine erstellen
