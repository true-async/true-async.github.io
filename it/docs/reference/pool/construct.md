---
layout: docs
lang: it
path_key: "/docs/reference/pool/construct.html"
nav_active: docs
permalink: /it/docs/reference/pool/construct.html
page_title: "Pool::__construct"
description: "Crea un nuovo pool di risorse."
---

# Pool::__construct

(PHP 8.6+, True Async 1.0)

```php
public Pool::__construct(
    callable $factory,
    ?callable $destructor = null,
    ?callable $healthcheck = null,
    ?callable $beforeAcquire = null,
    ?callable $beforeRelease = null,
    int $min = 0,
    int $max = 10,
    int $healthcheckInterval = 0
)
```

Crea un nuovo pool di risorse. Il pool gestisce un insieme di oggetti riutilizzabili
(connessioni, client, descrittori di file, ecc.), creandoli
e distruggendoli automaticamente secondo necessita'.

## Parametri

**factory**
: Una funzione factory per la creazione di una nuova risorsa. Viene chiamata ogni volta
  che il pool necessita di una nuova risorsa e il conteggio attuale e' inferiore a `max`.
  Deve restituire una risorsa pronta all'uso.

**destructor**
: Una funzione per la corretta distruzione di una risorsa. Viene chiamata quando il pool viene chiuso
  o quando una risorsa viene rimossa (es. dopo un controllo di salute fallito).
  `null` --- la risorsa viene semplicemente rimossa dal pool senza azioni aggiuntive.

**healthcheck**
: Una funzione di controllo della salute della risorsa. Riceve una risorsa, restituisce `bool`.
  `true` --- la risorsa e' sana, `false` --- la risorsa verra' distrutta e sostituita.
  `null` --- non viene effettuato alcun controllo di salute.

**beforeAcquire**
: Un hook chiamato prima che una risorsa venga consegnata. Riceve la risorsa.
  Puo' essere usato per preparare la risorsa (es. reimpostare lo stato).
  `null` --- nessun hook.

**beforeRelease**
: Un hook chiamato prima che una risorsa venga restituita al pool. Riceve la risorsa,
  restituisce `bool`. Se restituisce `false`, la risorsa viene distrutta anziche'
  essere restituita al pool.
  `null` --- nessun hook.

**min**
: Il numero minimo di risorse nel pool. Quando il pool viene creato,
  `min` risorse vengono create immediatamente. Il valore predefinito e' `0`.

**max**
: Il numero massimo di risorse nel pool. Quando il limite viene raggiunto,
  le chiamate `acquire()` si bloccano fino al rilascio di una risorsa.
  Il valore predefinito e' `10`.

**healthcheckInterval**
: L'intervallo per i controlli di salute in background delle risorse in millisecondi.
  `0` --- il controllo in background e' disabilitato (controllo solo all'acquisizione).

## Esempi

### Esempio #1 Pool di connessioni PDO

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: function(): PDO {
        return new PDO('mysql:host=localhost;dbname=app', 'user', 'pass', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    },
    destructor: function(PDO $pdo): void {
        // PDO viene chiuso automaticamente quando rimosso
    },
    healthcheck: function(PDO $pdo): bool {
        try {
            $pdo->query('SELECT 1');
            return true;
        } catch (\Throwable) {
            return false;
        }
    },
    min: 2,
    max: 20,
    healthcheckInterval: 30000 // controlla ogni 30 secondi
);

$conn = $pool->acquire();
$result = $conn->query('SELECT * FROM users');
$pool->release($conn);
```

### Esempio #2 Pool con hook

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new RedisClient('127.0.0.1', 6379),
    destructor: fn(RedisClient $r) => $r->close(),
    beforeAcquire: function(RedisClient $r): void {
        $r->select(0); // reimposta al database predefinito
    },
    beforeRelease: function(RedisClient $r): bool {
        // Se la connessione e' interrotta — distruggi la risorsa
        return $r->isConnected();
    },
    max: 5
);
```

## Vedi anche

- [Pool::acquire](/it/docs/reference/pool/acquire.html) --- Acquisisce una risorsa dal pool
- [Pool::release](/it/docs/reference/pool/release.html) --- Rilascia una risorsa al pool
- [Pool::close](/it/docs/reference/pool/close.html) --- Chiude il pool
