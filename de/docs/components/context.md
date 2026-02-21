---
layout: docs
lang: de
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /de/docs/components/context.html
page_title: "Context"
description: "Context in TrueAsync -- Datenspeicherung in der Scope-Hierarchie, lokale und vererbte Werte, analog zu Go context.Context."
---

# Context: Ausführungskontexte

## Warum das gebraucht wird

Es gibt eine `API` mit einer Service-Klasse, die Aktionen durchführen muss, die an ein Autorisierungstoken gebunden sind.
Das Token jedoch an jede Methode des Service zu übergeben, ist eine schlechte Idee.
In `PHP` wird dieses Problem durch globale Variablen oder statische Klasseneigenschaften gelöst.
Aber in einer asynchronen Umgebung, in der ein einzelner Prozess verschiedene Anfragen bearbeiten kann, funktioniert dieser Ansatz nicht,
da zum Zeitpunkt des Aufrufs nicht bekannt ist, welche Anfrage gerade bearbeitet wird.

`Async\Context` ermöglicht es, Daten zu speichern, die mit einer Coroutine oder einem `Scope` verknüpft sind, und die Anwendungslogik
auf Basis des Ausführungskontexts aufzubauen.

## Was ist Context

`Async\Context` ist ein Key-Value-Speicher, der an einen `Scope` oder eine Coroutine gebunden ist.
Kontexte bilden eine Hierarchie: Beim Lesen eines Werts wird in der Scope-Hierarchie nach oben gesucht.

Dies ist analog zu `context.Context` in `Go` oder `CoroutineContext` in `Kotlin`.
Ein Mechanismus zur Datenübergabe durch die Hierarchie, ohne Parameter explizit weiterzureichen.

## Drei Ebenen des Kontexts

`TrueAsync` bietet drei Funktionen für den Zugriff auf Kontexte:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Kontext des aktuellen Scopes
$scopeCtx = current_context();

// Kontext der aktuellen Coroutine
$coroCtx = coroutine_context();

// Globaler Wurzelkontext
$rootCtx = root_context();
?>
```

### current_context()

Gibt den Kontext des aktuellen `Scope` zurück. Falls der Kontext noch nicht erstellt wurde, wird er automatisch erzeugt.
Hier gesetzte Werte sind für alle Coroutinen in diesem Scope sichtbar.

### coroutine_context()

Gibt den Kontext der aktuellen Coroutine zurück. Dies ist ein **privater** Kontext, der nur dieser Coroutine gehört.
Andere Coroutinen können hier gesetzte Daten nicht sehen.

### root_context()

Gibt den globalen Kontext zurück, der über die gesamte Anfrage hinweg geteilt wird. Hier gesetzte Werte sind über `find()` aus jedem Kontext sichtbar.

## Schlüssel

Ein Schlüssel kann ein **String** oder ein **Objekt** sein:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// String-Schlüssel
$ctx->set('request_id', 'abc-123');

// Objekt als Schlüssel (nützlich für eindeutige Token)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Objekt-Schlüssel werden als Referenz im Kontext gespeichert, was ihre Eindeutigkeit garantiert.

## Lesen: Lokal und hierarchisch

### find() / get() / has() -- Hierarchische Suche

Sucht einen Wert zuerst im aktuellen Kontext, dann im übergeordneten, und so weiter bis zum Wurzelkontext:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() sucht in der Hierarchie nach oben
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- im root_context gefunden
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Nur im aktuellen Kontext

Sucht einen Wert **nur** im aktuellen Kontext, ohne in der Hierarchie aufzusteigen:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- dieser Wert ist im aktuellen Scope nicht gesetzt

$inherited = current_context()->find('app_name');
// "MyApp" -- im übergeordneten Scope gefunden
?>
```

## Schreiben und Löschen

### set()

```php
<?php
$ctx = current_context();

// Wert setzen (Standard replace = false)
$ctx->set('key', 'value');

// Wiederholtes set ohne replace -- Fehler
$ctx->set('key', 'new_value'); // Fehler: A context key already exists

// Mit explizitem replace = true
$ctx->set('key', 'new_value', replace: true); // OK
```

Die Methode `set()` gibt `$this` zurück und ermöglicht Method-Chaining:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'en');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

Die Methode `unset()` gibt ebenfalls `$this` zurück.

## Praktische Beispiele

### Übergabe einer Request-ID

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Middleware setzt die request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Jede Coroutine in diesem Scope kann sie lesen
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Verwendung im Logging
    error_log("[$requestId] Verarbeite Anfrage...");
});
?>
```

### Coroutine-Kontext als privater Speicher

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... Arbeit ausführen
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Kann 'step' von c1 nicht sehen
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Konfiguration über root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Am Anfang der Anfrage setzen
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Von jeder Coroutine aus verfügbar
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## Siehe auch

- [Scope](/de/docs/components/scope.html) -- Verwaltung der Coroutine-Lebenszeiten
- [Coroutines](/de/docs/components/coroutines.html) -- die grundlegende Einheit der Nebenläufigkeit
- [current_context()](/de/docs/reference/current-context.html) -- Abrufen des Kontexts des aktuellen Scopes
