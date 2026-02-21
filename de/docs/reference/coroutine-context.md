---
layout: docs
lang: de
path_key: "/docs/reference/coroutine-context.html"
nav_active: docs
permalink: /de/docs/reference/coroutine-context.html
page_title: "coroutine_context()"
description: "coroutine_context() — den privaten Kontext der aktuellen Coroutine abrufen."
---

# coroutine_context

(PHP 8.6+, True Async 1.0)

`coroutine_context()` — Gibt das an die aktuelle Coroutine gebundene `Async\Context`-Objekt zurueck.

## Beschreibung

```php
coroutine_context(): Async\Context
```

Gibt den **privaten** Kontext der aktuellen Coroutine zurueck. Hier gesetzte Daten sind fuer andere Coroutinen nicht sichtbar. Wenn der Kontext fuer die Coroutine noch nicht erstellt wurde, wird er automatisch erstellt.

## Rueckgabewerte

Ein `Async\Context`-Objekt.

## Beispiele

```php
<?php
use function Async\spawn;
use function Async\coroutine_context;

spawn(function() {
    coroutine_context()->set('step', 1);
    // Spaeter in derselben Coroutine
    $step = coroutine_context()->getLocal('step'); // 1
});

spawn(function() {
    // Kann 'step' aus einer anderen Coroutine nicht sehen
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

## Siehe auch

- [current_context()](/de/docs/reference/current-context.html) — Scope-Kontext
- [root_context()](/de/docs/reference/root-context.html) — globaler Kontext
- [Context](/de/docs/components/context.html) — das Kontext-Konzept
