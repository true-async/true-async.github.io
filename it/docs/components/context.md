---
layout: docs
lang: it
path_key: "/docs/components/context.html"
nav_active: docs
permalink: /it/docs/components/context.html
page_title: "Contesto"
description: "Context in TrueAsync -- memorizzazione di dati nella gerarchia degli scope, valori locali ed ereditati, analogo a Go context.Context."
---

# Context: Contesti di Esecuzione

## Perché È Necessario

C'è un'`API` con una classe di servizio che deve eseguire azioni legate a un token di autorizzazione.
Tuttavia, passare il token a ogni metodo del servizio è una cattiva idea.
In `PHP`, questo problema viene risolto tramite variabili globali o proprietà statiche delle classi.
Ma in un ambiente asincrono, dove un singolo processo può gestire diverse richieste, questo approccio non funziona,
perché al momento della chiamata non si sa quale richiesta si stia gestendo.

`Async\Context` permette di memorizzare dati associati a una coroutine o a uno `Scope` e costruire la logica dell'applicazione
basata sul contesto di esecuzione.

## Cos'è il Context

`Async\Context` è un archivio chiave-valore associato a uno `Scope` o a una coroutine.
I contesti formano una gerarchia: quando si legge un valore, la ricerca risale l'albero degli scope.

È analogo a `context.Context` in `Go` o `CoroutineContext` in `Kotlin`.
Un meccanismo per passare dati attraverso la gerarchia senza passare esplicitamente i parametri.

## Tre Livelli di Context

`TrueAsync` fornisce tre funzioni per accedere ai contesti:

```php
<?php
use function Async\current_context;
use function Async\coroutine_context;
use function Async\root_context;

// Contesto dello Scope corrente
$scopeCtx = current_context();

// Contesto della coroutine corrente
$coroCtx = coroutine_context();

// Contesto radice globale
$rootCtx = root_context();
?>
```

### current_context()

Restituisce il contesto dello `Scope` corrente. Se il contesto non è ancora stato creato, ne crea uno automaticamente.
I valori impostati qui sono visibili a tutte le coroutine in questo Scope.

### coroutine_context()

Restituisce il contesto della coroutine corrente. Questo è un contesto **privato** che appartiene solo a questa coroutine.
Le altre coroutine non possono vedere i dati impostati qui.

### root_context()

Restituisce il contesto globale, condiviso in tutta la richiesta. I valori qui sono visibili tramite `find()` da qualsiasi contesto.

## Chiavi

Una chiave può essere una **stringa** o un **oggetto**:

```php
<?php
use function Async\current_context;

$ctx = current_context();

// Chiave stringa
$ctx->set('request_id', 'abc-123');

// Oggetto come chiave (utile per token univoci)
$key = new stdClass();
$ctx->set($key, 'value');
?>
```

Le chiavi oggetto sono memorizzate per riferimento nel contesto, il che garantisce la loro unicità.

## Lettura: Locale e Gerarchica

### find() / get() / has() -- Ricerca Gerarchica

Cerca un valore prima nel contesto corrente, poi nel genitore, e così via fino alla radice:

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;
use function Async\await;

root_context()->set('app_name', 'MyApp');

$scope = new Async\Scope();

spawn(function() {
    // find() cerca risalendo la gerarchia
    $name = current_context()->find('app_name');
    echo $name; // "MyApp" -- trovato in root_context
});
?>
```

### findLocal() / getLocal() / hasLocal() -- Solo Contesto Corrente

Cerca un valore **solo** nel contesto corrente, senza risalire la gerarchia:

```php
<?php
use function Async\root_context;
use function Async\current_context;

root_context()->set('app_name', 'MyApp');

$local = current_context()->findLocal('app_name');
// null -- questo valore non è impostato nello Scope corrente

$inherited = current_context()->find('app_name');
// "MyApp" -- trovato nello scope genitore
?>
```

## Scrittura e Cancellazione

### set()

```php
<?php
$ctx = current_context();

// Imposta un valore (default replace = false)
$ctx->set('key', 'value');

// set ripetuto senza replace -- errore
$ctx->set('key', 'new_value'); // Errore: A context key already exists

// Con replace esplicito = true
$ctx->set('key', 'new_value', replace: true); // OK
```

Il metodo `set()` restituisce `$this`, permettendo il concatenamento dei metodi:

```php
<?php
current_context()
    ->set('user_id', 42)
    ->set('request_id', 'abc-123')
    ->set('locale', 'it');
?>
```

### unset()

```php
<?php
$ctx = current_context();
$ctx->unset('key');
```

Il metodo `unset()` restituisce anch'esso `$this`.

## Esempi Pratici

### Passaggio di un ID Richiesta

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\current_context;

// Il middleware imposta il request_id
current_context()->set('request_id', bin2hex(random_bytes(8)));

// Qualsiasi coroutine in questo scope può leggerlo
spawn(function() {
    $requestId = current_context()->find('request_id');
    // Utilizzato nel logging
    error_log("[$requestId] Elaborazione richiesta...");
});
?>
```

### Contesto della Coroutine come Archivio Privato

```php
<?php
use function Async\spawn;
use function Async\await;
use function Async\coroutine_context;

$c1 = spawn(function() {
    coroutine_context()->set('step', 1);
    // ... esegui lavoro
    $step = coroutine_context()->getLocal('step');
});

$c2 = spawn(function() {
    // Non può vedere 'step' da c1
    $step = coroutine_context()->findLocal('step'); // null
});
?>
```

### Configurazione tramite root_context

```php
<?php
use function Async\root_context;
use function Async\current_context;
use function Async\spawn;

// Impostato all'inizio della richiesta
root_context()
    ->set('db_host', 'localhost')
    ->set('cache_ttl', 3600);

// Disponibile da qualsiasi coroutine
spawn(function() {
    $dbHost = current_context()->find('db_host'); // "localhost"
});
?>
```

## Vedi Anche

- [Scope](/it/docs/components/scope.html) -- gestione del ciclo di vita delle coroutine
- [Coroutine](/it/docs/components/coroutines.html) -- l'unità base della concorrenza
- [current_context()](/it/docs/reference/current-context.html) -- ottenere il contesto dello Scope corrente
