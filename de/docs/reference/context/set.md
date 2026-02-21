---
layout: docs
lang: de
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /de/docs/reference/context/set.html
page_title: "Context::set"
description: "Einen Wert im Kontext anhand des Schluessels setzen."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Setzt einen Wert im aktuellen Kontext mit dem angegebenen Schluessel. Standardmaessig wird der Wert
**nicht ueberschrieben**, wenn der Schluessel bereits existiert. Um das Ueberschreiben zu erzwingen, verwenden Sie
den Parameter `replace = true`.

Die Methode gibt das `Context`-Objekt zurueck und ermoeglicht so Methodenverkettung.

## Parameter

**key**
: Der Schluessel, fuer den der Wert gesetzt werden soll. Kann ein String oder ein Objekt sein.
  Objekt-Schluessel sind nuetzlich, um Namenskonflikte zwischen Bibliotheken zu vermeiden.

**value**
: Der zu speichernde Wert. Kann von beliebigem Typ sein.

**replace**
: Wenn `false` (Standard) --- einen bestehenden Wert nicht ueberschreiben.
  Wenn `true` --- den Wert ueberschreiben, auch wenn der Schluessel bereits existiert.

## Rueckgabewert

Das `Context`-Objekt fuer Methodenverkettung.

## Beispiele

### Beispiel #1 Werte mit String-Schluesseln setzen

```php
<?php

use function Async\current_context;

// Methodenverkettung
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Beispiel #2 Verhalten ohne Ueberschreiben

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Erneutes Setzen ohne replace — Wert aendert sich NICHT
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// Mit replace = true — Wert wird ueberschrieben
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Beispiel #3 Objekt-Schluessel fuer Bibliotheksisolierung

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Jede Bibliothek verwendet ihren eigenen Objekt-Schluessel
class LoggerContext {
    public static object $key;
}
LoggerContext::$key = new stdClass();

class CacheContext {
    public static object $key;
}
CacheContext::$key = new stdClass();

current_context()
    ->set(LoggerContext::$key, new FileLogger('/var/log/app.log'))
    ->set(CacheContext::$key, new RedisCache('localhost:6379'));

spawn(function() {
    $logger = current_context()->find(LoggerContext::$key);
    $cache = current_context()->find(CacheContext::$key);

    $logger->info('Cache initialisiert');
});
```

### Beispiel #4 Kontext an Kind-Koroutinen weitergeben

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Eltern-Kontext
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Kind-Koroutinen erben Werte ueber find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Anfrage wird verarbeitet: {$traceId}\n";

    // Kind-Koroutine fuegt eigenen Wert hinzu
    current_context()->set('handler', 'user_controller');
});
```

## Siehe auch

- [Context::unset](/de/docs/reference/context/unset.html) --- Wert anhand des Schluessels entfernen
- [Context::find](/de/docs/reference/context/find.html) --- Wert anhand des Schluessels suchen
- [Context::get](/de/docs/reference/context/get.html) --- Wert abrufen (wirft Exception)
- [current_context()](/de/docs/reference/current-context.html) --- Den aktuellen Scope-Kontext abrufen
