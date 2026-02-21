---
layout: docs
lang: it
path_key: "/docs/reference/pool/activate.html"
nav_active: docs
permalink: /it/docs/reference/pool/activate.html
page_title: "Pool::activate"
description: "Forza il pool nello stato ACTIVE."
---

# Pool::activate

(PHP 8.6+, True Async 1.0)

```php
public Pool::activate(): void
```

Forza la transizione del pool allo stato `ACTIVE`. Le risorse diventano nuovamente
disponibili per l'acquisizione. Utilizzato per la gestione manuale del Circuit Breaker,
ad esempio, dopo aver confermato che il servizio si e' ripreso.

## Parametri

Questo metodo non accetta parametri.

## Valore di ritorno

Nessun valore restituito.

## Esempi

### Esempio #1 Attivazione manuale dopo verifica

```php
<?php

use Async\Pool;
use Async\CircuitBreakerState;

$pool = new Pool(
    factory: fn() => new HttpClient('https://api.example.com'),
    max: 5
);

// Supponiamo che il pool sia stato disattivato
if ($pool->getState() === CircuitBreakerState::INACTIVE) {
    // Verifica manuale della disponibilita' del servizio
    if (checkServiceHealth('https://api.example.com/health')) {
        $pool->activate();
        echo "Pool activated\n";
    }
}
```

### Esempio #2 Attivazione tramite segnale esterno

```php
<?php

use Async\Pool;

// Gestore del webhook dal sistema di monitoraggio
function onServiceRestored(Pool $pool): void
{
    $pool->activate();
    echo "Service restored, pool activated\n";
}
```

## Vedi anche

- [Pool::deactivate](/it/docs/reference/pool/deactivate.html) --- Transizione allo stato INACTIVE
- [Pool::recover](/it/docs/reference/pool/recover.html) --- Transizione allo stato RECOVERING
- [Pool::getState](/it/docs/reference/pool/get-state.html) --- Stato attuale
