---
layout: docs
lang: it
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /it/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Eseguire TrueAsync PHP con FrankenPHP — avvio rapido con Docker, compilazione dal codice sorgente, configurazione del Caddyfile, punto di ingresso del worker asincrono, riavvio graduale e risoluzione dei problemi."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) è un application server PHP costruito su [Caddy](https://caddyserver.com).
Integra il runtime PHP direttamente in un processo Go, eliminando il sovraccarico di un proxy FastCGI separato.

Nel fork TrueAsync di FrankenPHP, un singolo thread PHP gestisce **molte richieste contemporaneamente** —
ogni richiesta HTTP in arrivo ottiene la propria coroutine e lo scheduler TrueAsync le alterna
mentre sono in attesa di I/O.

```
FPM tradizionale / FrankenPHP standard:
  1 richiesta → 1 thread  (bloccato durante l'I/O)

TrueAsync FrankenPHP:
  N richieste → 1 thread  (coroutine, I/O non bloccante)
```

## Avvio rapido — Docker

Il modo più veloce per provare la configurazione è con l'immagine Docker precompilata:

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Apri [http://localhost:8080](http://localhost:8080) — vedrai la dashboard in tempo reale che mostra la versione PHP,
le coroutine attive, la memoria e l'uptime.

### Tag immagine disponibili

| Tag | Descrizione |
|-----|-------------|
| `latest-frankenphp` | Ultima versione stabile, ultima versione PHP |
| `latest-php8.6-frankenphp` | Ultima versione stabile, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Versione specifica |

### Eseguire la propria applicazione PHP

Monta la directory della tua applicazione e fornisci un `Caddyfile` personalizzato:

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Installazione dal codice sorgente

La compilazione dal codice sorgente produce un binario nativo `frankenphp` insieme al binario `php`.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Oppure in modalità interattiva — il wizard chiederà informazioni su FrankenPHP durante la selezione del preset delle estensioni.

Per la compilazione è richiesto Go 1.26+. Se non viene trovato, l'installer lo scarica e lo utilizza automaticamente
senza influire sull'installazione di sistema.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go viene installato tramite Homebrew se necessario.

### Cosa viene installato

Dopo una compilazione riuscita, entrambi i binari vengono posizionati in `$INSTALL_DIR/bin/`:

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Configurazione del Caddyfile

FrankenPHP è configurato tramite un `Caddyfile`. La configurazione minima per un worker asincrono TrueAsync:

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

### Direttive globali `frankenphp`

| Direttiva | Descrizione |
|-----------|-------------|
| `num_threads N` | Dimensione totale del pool di thread PHP. Predefinito: `2 × core CPU`. Tutti i worker condividono questo pool |

### Direttive chiave del worker

| Direttiva | Descrizione |
|-----------|-------------|
| `file` | Percorso dello script PHP del punto di ingresso |
| `num` | Numero di thread PHP assegnati a questo worker. Inizia con `1` e regola in base al lavoro CPU-bound |
| `async` | **Obbligatorio** — abilita la modalità coroutine di TrueAsync |
| `drain_timeout` | Periodo di grazia per le richieste in corso durante il riavvio graduale (predefinito `30s`) |
| `match` | Pattern URL gestito da questo worker |

### Worker multipli

È possibile eseguire punti di ingresso diversi per route diverse:

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

## Scrittura del punto di ingresso

Il punto di ingresso è uno script PHP a lunga esecuzione. Registra una callback per la gestione delle richieste e poi
cede il controllo a `FrankenPHP`, che resta in attesa fino all'arresto del server.

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

### Oggetto Request

```php
$request->getMethod();    // GET, POST, ...
$request->getUri();       // URI completo della richiesta
$request->getHeaders();   // Array di tutti gli header HTTP
$request->getHeader($name); // Valore di un singolo header
$request->getBody();      // Corpo della richiesta come stringa raw
```

### Oggetto Response

```php
$response->setStatus(int $code);
$response->setHeader(string $name, string $value);
$response->write(string $data);   // Can be called multiple times (streaming)
$response->end();                 // Finalize and send the response
```

> **Importante:** chiama sempre `end()`, anche quando il corpo è vuoto. `write()` passa il buffer PHP
> direttamente a Go senza copiarlo; `end()` rilascia il riferimento di scrittura in sospeso e segnala
> che la risposta è completa. Omettere `end()` bloccherà la richiesta.

`getBody()` legge l'intero corpo della richiesta in una sola volta e lo restituisce come stringa. Il corpo è bufferizzato
sul lato Go, quindi la lettura è non bloccante dal punto di vista di PHP.

### I/O asincrono all'interno dell'handler

Poiché ogni richiesta viene eseguita nella propria coroutine, è possibile utilizzare liberamente le chiamate I/O bloccanti —
queste cederanno la coroutine anziché bloccare il thread:

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

### Avvio di coroutine aggiuntive

L'handler stesso è già una coroutine, quindi è possibile avviare (`spawn()`) lavoro figlio:

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

## Ottimizzazione

### Numero di thread del worker (`num`)

Ogni thread PHP esegue un singolo loop dello scheduler TrueAsync. Un singolo thread gestisce già migliaia di
richieste I/O-bound concorrenti tramite coroutine. Aggiungi più thread solo quando hai lavoro CPU-bound
che beneficia di un vero parallelismo (ogni thread viene eseguito su un thread OS separato grazie a ZTS).

Un buon punto di partenza:

```
API I/O-heavy:        num 1–2
Carico di lavoro misto: num = numero di core CPU / 2
CPU-heavy:            num = numero di core CPU
```

## Riavvio graduale

I worker asincroni supportano il **riavvio green-blue** — il codice viene ricaricato senza interrompere le richieste in corso.

Quando viene attivato un riavvio (tramite API di amministrazione, file watcher o ricaricamento della configurazione):

1. I vecchi thread vengono **scollegati** — nessuna nuova richiesta viene instradata verso di essi.
2. Le richieste in corso ottengono un periodo di grazia (`drain_timeout`, predefinito `30s`) per completarsi.
3. I vecchi thread si arrestano e rilasciano le proprie risorse (notifier, canali).
4. I nuovi thread si avviano con il codice PHP aggiornato.

Durante la finestra di drain le nuove richieste ricevono `HTTP 503`. Una volta che i nuovi thread sono pronti, il traffico riprende normalmente.

### Attivazione tramite Admin API

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

L'API di amministrazione di Caddy ascolta su `localhost:2019` per impostazione predefinita. Per abilitarla, rimuovi `admin off` dal
blocco globale (o limitala a localhost):

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configurazione del drain timeout

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Verifica dell'installazione

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Verifica che TrueAsync sia attivo da PHP:

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Risoluzione dei problemi

### Le richieste non arrivano all'handler PHP

Assicurati che il worker abbia `async` abilitato **e** che il matcher di Caddy instradi il traffico verso di esso.
Senza `match *` (o un pattern specifico) nessuna richiesta raggiunge il worker asincrono.

### `undefined reference to tsrm_*` durante la compilazione

PHP è stato compilato con `--enable-embed=shared`. Ricompila senza `=shared`:

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Le richieste restituiscono `HTTP 503`

Tutti i thread PHP sono occupati e il periodo di grazia è attivo (finestra di drain durante un riavvio),
oppure la coda dei thread è satura. Aumenta `num` per aggiungere più thread, o riduci `drain_timeout`
se i deploy richiedono troppo tempo.

## Debug con Delve

Go 1.25+ genera informazioni di debug **DWARF v5**. Se Delve segnala un errore di compatibilità, ricompila
con DWARF v4:

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Avvia il debugger:

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Codice sorgente

| Repository | Descrizione |
|------------|-------------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | Fork TrueAsync di FrankenPHP (branch `true-async`) |
| [true-async/releases](https://github.com/true-async/releases) | Immagini Docker, installer, configurazione di build |

Per un approfondimento su come funziona internamente l'integrazione Go ↔ PHP, consulta la pagina
[Architettura FrankenPHP](/it/architecture/frankenphp.html).
