---
layout: docs
lang: de
path_key: "/docs/reference/current-context.html"
nav_active: docs
permalink: /de/docs/reference/current-context.html
page_title: "current_context()"
description: "current_context() — den Kontext des aktuellen Scope abrufen."
---

# current_context

(PHP 8.6+, True Async 1.0)

`current_context()` — Gibt das an den aktuellen Scope gebundene `Async\Context`-Objekt zurueck.

## Beschreibung

```php
current_context(): Async\Context
```

Wenn der Kontext fuer den aktuellen Scope noch nicht erstellt wurde, wird er automatisch erstellt.
In diesem Kontext gesetzte Werte sind fuer alle Coroutinen im aktuellen Scope ueber `find()` sichtbar.

## Rueckgabewerte

Ein `Async\Context`-Objekt.

## Beispiele

```php
<?php
use function Async\current_context;
use function Async\spawn;

current_context()->set('request_id', 'abc-123');

spawn(function() {
    // Sieht den Wert aus dem uebergeordneten Scope
    $id = current_context()->find('request_id'); // "abc-123"
});
?>
```

## Siehe auch

- [coroutine_context()](/de/docs/reference/coroutine-context.html) — Coroutine-Kontext
- [root_context()](/de/docs/reference/root-context.html) — globaler Kontext
- [Context](/de/docs/components/context.html) — das Kontext-Konzept
