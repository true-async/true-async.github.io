---
layout: docs
lang: it
path_key: "/docs/reference/context/set.html"
nav_active: docs
permalink: /it/docs/reference/context/set.html
page_title: "Context::set"
description: "Imposta un valore nel contesto per chiave."
---

# Context::set

(PHP 8.6+, True Async 1.0)

```php
public Context::set(string|object $key, mixed $value, bool $replace = false): Context
```

Imposta un valore nel contesto corrente con la chiave specificata. Per impostazione predefinita, se la chiave
esiste gia', il valore **non viene sovrascritto**. Per forzare la sovrascrittura, usa
il parametro `replace = true`.

Il metodo restituisce l'oggetto `Context`, consentendo il concatenamento dei metodi.

## Parametri

**key**
: La chiave per cui impostare il valore. Puo' essere una stringa o un oggetto.
  Le chiavi oggetto sono utili per evitare conflitti di nome tra librerie.

**value**
: Il valore da memorizzare. Puo' essere di qualsiasi tipo.

**replace**
: Se `false` (predefinito) --- non sovrascrive un valore esistente.
  Se `true` --- sovrascrive il valore anche se la chiave esiste gia'.

## Valore di ritorno

L'oggetto `Context` per il concatenamento dei metodi.

## Esempi

### Esempio #1 Impostazione di valori con chiavi stringa

```php
<?php

use function Async\current_context;

// Concatenamento dei metodi
current_context()
    ->set('request_id', 'req-001')
    ->set('user_id', 42)
    ->set('locale', 'ru_RU');

echo current_context()->find('request_id') . "\n"; // "req-001"
echo current_context()->find('user_id') . "\n";    // 42
```

### Esempio #2 Comportamento senza sovrascrittura

```php
<?php

use function Async\current_context;

current_context()->set('mode', 'production');

// Impostazione di nuovo senza replace — il valore NON cambia
current_context()->set('mode', 'debug');
echo current_context()->find('mode') . "\n"; // "production"

// Con replace = true — il valore viene sovrascritto
current_context()->set('mode', 'debug', replace: true);
echo current_context()->find('mode') . "\n"; // "debug"
```

### Esempio #3 Chiavi oggetto per l'isolamento delle librerie

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Ogni libreria usa la propria chiave oggetto
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

    $logger->info('Cache inizializzata');
});
```

### Esempio #4 Passaggio del contesto alle coroutine figlie

```php
<?php

use function Async\current_context;
use function Async\spawn;

// Contesto genitore
current_context()
    ->set('trace_id', bin2hex(random_bytes(8)))
    ->set('service', 'api-gateway');

// Le coroutine figlie ereditano i valori tramite find()
spawn(function() {
    $traceId = current_context()->find('trace_id');
    echo "Elaborazione richiesta: {$traceId}\n";

    // La coroutine figlia aggiunge il proprio valore
    current_context()->set('handler', 'user_controller');
});
```

## Vedi anche

- [Context::unset](/it/docs/reference/context/unset.html) --- Rimuovi il valore per chiave
- [Context::find](/it/docs/reference/context/find.html) --- Cerca il valore per chiave
- [Context::get](/it/docs/reference/context/get.html) --- Ottieni il valore (lancia eccezione)
- [current_context()](/it/docs/reference/current-context.html) --- Ottieni il contesto dello Scope corrente
