---
layout: docs
lang: it
path_key: "/docs/reference/future/ignore.html"
nav_active: docs
permalink: /it/docs/reference/future/ignore.html
page_title: "Future::ignore"
description: "Non propaga gli errori non gestiti al gestore dell'event loop."
---

# Future::ignore

(PHP 8.6+, True Async 1.0)

```php
public function ignore(): Future
```

Contrassegna il `Future` come ignorato. Se il Future si completa con un errore e l'errore non viene gestito, non verra' passato al gestore delle eccezioni non gestite dell'event loop. Utile per le attivita' "fire-and-forget" dove il risultato non e' importante.

## Valore di ritorno

`Future` --- restituisce lo stesso Future per il concatenamento dei metodi.

## Esempi

### Esempio #1 Ignorare gli errori del Future

```php
<?php

use Async\Future;

// Avvia un'attivita' di cui non ci interessano gli errori
\Async\async(function() {
    // Questa operazione potrebbe fallire
    sendAnalytics(['event' => 'page_view']);
})->ignore();

// L'errore non verra' passato al gestore dell'event loop
```

### Esempio #2 Utilizzo di ignore con il concatenamento dei metodi

```php
<?php

use Async\Future;

function warmupCache(array $keys): void {
    foreach ($keys as $key) {
        \Async\async(function() use ($key) {
            $data = loadFromDatabase($key);
            saveToCache($key, $data);
        })->ignore(); // Gli errori della cache non sono critici
    }
}

warmupCache(['user:1', 'user:2', 'user:3']);
```

## Vedi anche

- [Future::catch](/it/docs/reference/future/catch.html) --- Gestisce un errore del Future
- [Future::finally](/it/docs/reference/future/finally.html) --- Callback al completamento del Future
