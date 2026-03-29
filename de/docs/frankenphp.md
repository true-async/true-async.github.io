---
layout: docs
lang: de
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /de/docs/frankenphp.html
page_title: "FrankenPHP"
description: "TrueAsync PHP mit FrankenPHP ausführen — Docker-Schnellstart, Kompilierung aus dem Quellcode, Caddyfile-Konfiguration, asynchroner Worker-Einstiegspunkt, Graceful Restart und Fehlerbehebung."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) ist ein PHP-Anwendungsserver, der auf [Caddy](https://caddyserver.com) aufbaut.
Er bettet die PHP-Laufzeitumgebung direkt in einen Go-Prozess ein und eliminiert so den Overhead eines separaten FastCGI-Proxys.

Im TrueAsync-Fork von FrankenPHP verarbeitet ein einzelner PHP-Thread **viele Anfragen gleichzeitig** —
jede eingehende HTTP-Anfrage erhält ihre eigene Koroutine, und der TrueAsync-Scheduler wechselt zwischen ihnen,
während sie auf I/O warten.

```
Traditionelles FPM / reguläres FrankenPHP:
  1 Anfrage → 1 Thread  (blockiert während I/O)

TrueAsync FrankenPHP:
  N Anfragen → 1 Thread  (Koroutinen, nicht-blockierendes I/O)
```

## Schnellstart — Docker

Der schnellste Weg, das Setup auszuprobieren, ist mit dem vorgefertigten Docker-Image:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Öffnen Sie [http://localhost:8080](http://localhost:8080) — Sie sehen das Live-Dashboard mit PHP-Version, aktiven Koroutinen, Speicherverbrauch und Betriebszeit.

### Verfügbare Image-Tags

| Tag | Beschreibung |
|-----|-------------|
| `latest-frankenphp` | Neueste stabile Version, neuestes PHP |
| `latest-php8.6-frankenphp` | Neueste stabile Version, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Bestimmte Version |

### Eigene PHP-Anwendung ausführen

Binden Sie Ihr Anwendungsverzeichnis ein und stellen Sie ein benutzerdefiniertes `Caddyfile` bereit:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Installation aus dem Quellcode

Das Kompilieren aus dem Quellcode liefert Ihnen eine native `frankenphp`-Binärdatei neben der `php`-Binärdatei.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Oder interaktiv — der Assistent fragt im Rahmen der Erweiterungsprofil-Auswahl nach FrankenPHP.

Go 1.26+ wird für den Build benötigt. Falls es nicht gefunden wird, lädt der Installer es automatisch herunter und verwendet es, ohne Ihre Systeminstallation zu beeinflussen.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go wird bei Bedarf über Homebrew installiert.

### Was installiert wird

Nach einem erfolgreichen Build werden beide Binärdateien in `$INSTALL_DIR/bin/` abgelegt:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Caddyfile-Konfiguration

FrankenPHP wird über ein `Caddyfile` konfiguriert. Die minimale Konfiguration für einen asynchronen TrueAsync-Worker:

```caddyfile
{
    admin off
    frankenphp {
        num_threads 4   # total PHP threads across all workers (default: 2× CPU cores)
    }
}

:8080 {
    root * /app
    php_server {
        index off
        file_server off
        worker {
            file /app/entrypoint.php
            num 1
            async
            match /*
        }
    }
}
```

### Globale `frankenphp`-Direktiven

| Direktive | Beschreibung |
|-----------|-------------|
| `num_threads N` | Gesamtgröße des PHP-Thread-Pools. Standardwert: `2 × CPU-Kerne`. Alle Worker teilen sich diesen Pool |

### Wichtige Worker-Direktiven

| Direktive | Beschreibung |
|-----------|-------------|
| `file` | Pfad zum PHP-Einstiegspunkt-Skript |
| `num` | Anzahl der PHP-Threads, die diesem Worker zugewiesen sind. Beginnen Sie mit `1` und passen Sie je nach CPU-intensiver Arbeit an |
| `async` | **Erforderlich** — aktiviert den TrueAsync-Koroutinen-Modus |
| `drain_timeout` | Wartezeit für laufende Anfragen beim Graceful Restart (Standard `30s`) |
| `match` | URL-Muster, das von diesem Worker verarbeitet wird |

### Mehrere Worker

Sie können verschiedene Einstiegspunkte für verschiedene Routen verwenden:

```caddyfile
:8080 {
    root * /app
    php_server {
        worker {
            file /app/api.php
            num 2
            async
            match /api/*
        }
        worker {
            file /app/web.php
            num 1
            async
            match /*
        }
    }
}
```

## Schreiben des Einstiegspunkts

Der Einstiegspunkt ist ein langlebiges PHP-Skript. Er registriert einen Request-Handler-Callback und übergibt dann die Kontrolle an `FrankenPHP`, das blockiert, bis der Server heruntergefahren wird.

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

set_time_limit(0);

HttpServer::onRequest(function (Request $request, Response $response): void {
    $path = parse_url($request->getUri(), PHP_URL_PATH);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello from TrueAsync! Path: $path");
    $response->end();
});
```

### Request-Objekt

```php
$request->getMethod();    // GET, POST, ...
$request->getUri();       // Full request URI
$request->getHeaders();   // Array of all HTTP headers
$request->getHeader($name); // Single header value
$request->getBody();      // Raw request body string
```

### Response-Objekt

```php
$response->setStatus(int $code);
$response->setHeader(string $name, string $value);
$response->write(string $data);   // Can be called multiple times (streaming)
$response->end();                 // Finalize and send the response
```

> **Wichtig:** Rufen Sie `end()` immer auf, auch wenn der Body leer ist. `write()` übergibt den PHP-Puffer
> direkt an Go ohne Kopieren; `end()` gibt die ausstehende Schreibreferenz frei und signalisiert,
> dass die Antwort vollständig ist. Wird `end()` weggelassen, bleibt die Anfrage hängen.

`getBody()` liest den gesamten Request-Body auf einmal und gibt ihn als String zurück. Der Body wird
auf der Go-Seite gepuffert, sodass der Lesevorgang aus PHP-Sicht nicht-blockierend ist.

### Asynchrones I/O im Handler

Da jede Anfrage in ihrer eigenen Koroutine läuft, können Sie blockierende I/O-Aufrufe frei verwenden — sie geben die Koroutine ab, anstatt den Thread zu blockieren:

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Both requests run concurrently in the same PHP thread
    $db   = new PDO('pgsql:host=localhost;dbname=app', 'user', 'pass');
    $rows = $db->query('SELECT * FROM users LIMIT 10')->fetchAll();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($rows));
    $response->end();
});
```

### Zusätzliche Koroutinen starten

Der Handler selbst ist bereits eine Koroutine, sodass Sie mit `spawn()` untergeordnete Aufgaben starten können:

```php
use function Async\spawn;
use function Async\await;

HttpServer::onRequest(function (Request $request, Response $response): void {
    // Fan-out: run two DB queries concurrently
    $users  = spawn(fn() => fetchUsers());
    $totals = spawn(fn() => fetchTotals());

    $data = [
        'users'  => await($users),
        'totals' => await($totals),
    ];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

## Optimierung

### Worker-Thread-Anzahl (`num`)

Jeder PHP-Thread führt eine TrueAsync-Scheduler-Schleife aus. Ein einzelner Thread verarbeitet bereits Tausende gleichzeitiger I/O-gebundener Anfragen über Koroutinen. Fügen Sie weitere Threads nur hinzu, wenn Sie CPU-intensive Arbeit haben, die von echter Parallelität profitiert (jeder Thread läuft dank ZTS auf einem separaten OS-Thread).

Ein guter Ausgangspunkt:

```
I/O-lastige API:       num 1–2
Gemischte Arbeitslast: num = Anzahl der CPU-Kerne / 2
CPU-lastig:            num = Anzahl der CPU-Kerne
```

## Graceful Restart

Asynchrone Worker unterstützen **Green-Blue-Neustarts** — Code wird neu geladen, ohne laufende Anfragen zu verlieren.

Wenn ein Neustart ausgelöst wird (über die Admin-API, File-Watcher oder Config-Reload):

1. Alte Threads werden **abgetrennt** — keine neuen Anfragen werden an sie weitergeleitet.
2. Laufende Anfragen erhalten eine Wartezeit (`drain_timeout`, Standard `30s`), um abgeschlossen zu werden.
3. Alte Threads werden heruntergefahren und geben ihre Ressourcen frei (Notifier, Channels).
4. Neue Threads starten mit dem aktualisierten PHP-Code.

Während des Drain-Fensters erhalten neue Anfragen `HTTP 503`. Sobald die neuen Threads bereit sind, wird der Datenverkehr normal fortgesetzt.

### Auslösung über Admin-API

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

Die Caddy-Admin-API hört standardmäßig auf `localhost:2019`. Um sie zu aktivieren, entfernen Sie `admin off` aus Ihrem globalen Block (oder beschränken Sie sie auf localhost):

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Konfiguration des Drain-Timeouts

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Installation überprüfen

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Prüfen Sie, ob TrueAsync in PHP aktiv ist:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Fehlerbehebung

### Anfragen erreichen den PHP-Handler nicht

Stellen Sie sicher, dass der Worker `async` aktiviert hat **und** dass der Caddy-Matcher den Datenverkehr an ihn weiterleitet. Ohne `match *` (oder ein bestimmtes Muster) erreichen keine Anfragen den asynchronen Worker.

### `undefined reference to tsrm_*` beim Build

PHP wurde mit `--enable-embed=shared` kompiliert. Kompilieren Sie ohne `=shared` neu:

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Anfragen erhalten `HTTP 503`

Alle PHP-Threads sind ausgelastet und die Wartezeit ist aktiv (Drain-Fenster während eines Neustarts), oder die Thread-Warteschlange ist gesättigt. Erhöhen Sie `num`, um weitere Threads hinzuzufügen, oder reduzieren Sie `drain_timeout`, wenn Deployments zu lange dauern.

## Debugging mit Delve

Go 1.25+ erzeugt **DWARF v5** Debug-Informationen. Wenn Delve einen Kompatibilitätsfehler meldet, kompilieren Sie mit DWARF v4 neu:

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Starten Sie den Debugger:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Quellcode

| Repository | Beschreibung |
|------------|-------------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | TrueAsync-Fork von FrankenPHP (`true-async`-Branch) |
| [true-async/releases](https://github.com/true-async/releases) | Docker-Images, Installer, Build-Konfiguration |

Für einen tiefen Einblick in die interne Funktionsweise der Go-PHP-Integration siehe die Seite
[FrankenPHP-Architektur](/de/architecture/frankenphp.html).
