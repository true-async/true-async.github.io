---
layout: docs
lang: it
path_key: "/docs/reference/pool/deactivate.html"
nav_active: docs
permalink: /it/docs/reference/pool/deactivate.html
page_title: "Pool::deactivate"
description: "Forza il pool nello stato INACTIVE."
---

# Pool::deactivate

(PHP 8.6+, True Async 1.0)

```php
public Pool::deactivate(): void
```

Forza la transizione del pool allo stato `INACTIVE`. In questo stato,
il pool rifiuta tutte le richieste di acquisizione di risorse. Utilizzato per la
disattivazione manuale quando vengono rilevati problemi con un servizio esterno.

A differenza di `close()`, la disattivazione e' reversibile --- il pool puo' essere riportato
allo stato di funzionamento tramite `activate()` o `recover()`.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Disattivazione al rilevamento di un problema

```php
<?php

use Async\Pool;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 10
);

// Al rilevamento di un errore critico
try {
    $client = $pool->acquire();
    $response = $client->get('/critical-endpoint');
    $pool->release($client);
} catch (ServiceUnavailableException $e) {
    $pool->deactivate();
    echo "Service unavailable, pool deactivated\n";
}
```

### Esempio #2 Manutenzione programmata

```php
<?php

use Async\Pool;

function startMaintenance(Pool $pool): void
{
    $pool->deactivate();
    echo "Pool deactivated for maintenance\n";
}

function endMaintenance(Pool $pool): void
{
    $pool->activate();
    echo "Maintenance complete, pool activated\n";
}
```

## Vedi anche

- [Pool::activate](/it/docs/reference/pool/activate.html) --- Transizione allo stato ACTIVE
- [Pool::recover](/it/docs/reference/pool/recover.html) --- Transizione allo stato RECOVERING
- [Pool::getState](/it/docs/reference/pool/get-state.html) --- Stato attuale
- [Pool::close](/it/docs/reference/pool/close.html) --- Chiusura permanente del pool (irreversibile)
