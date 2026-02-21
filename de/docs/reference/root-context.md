---
layout: docs
lang: de
path_key: "/docs/reference/root-context.html"
nav_active: docs
permalink: /de/docs/reference/root-context.html
page_title: "root_context()"
description: "root_context() — den globalen Wurzelkontext abrufen, der von allen Scopes aus sichtbar ist."
---

# root_context

(PHP 8.6+, True Async 1.0)

`root_context()` — Gibt das globale Wurzel-`Async\Context`-Objekt zurueck, das ueber die gesamte Anfrage hinweg geteilt wird.

## Beschreibung

```php
root_context(): Async\Context
```

Gibt den obersten Kontext zurueck. Hier gesetzte Werte sind ueber `find()` aus jedem Kontext in der Hierarchie sichtbar.

## Rueckgabewerte

Ein `Async\Context`-Objekt.

## Beispiele

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Globale Konfiguration setzen
root_context()
    ->set('app_name', 'MyApp')
    ->set('environment', 'production');

spawn(function() {
    // Von jeder Coroutine ueber find() erreichbar
    $env = current_context()->find('environment'); // "production"
});
?>
```

## Siehe auch

- [current_context()](/de/docs/reference/current-context.html) — Scope-Kontext
- [coroutine_context()](/de/docs/reference/coroutine-context.html) — Coroutine-Kontext
- [Context](/de/docs/components/context.html) — das Kontext-Konzept
