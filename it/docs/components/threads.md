---
layout: docs
lang: it
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /it/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — esecuzione di codice in un thread parallelo separato: trasferimento dati, WeakReference/WeakMap, ThreadChannel, Future tra thread."
---

# Async\Thread: eseguire PHP in un thread separato

## Perché i thread sono necessari

Le coroutine risolvono il problema della concorrenza per i carichi di lavoro **I/O-bound** — un singolo
processo può gestire migliaia di attese di rete o disco concorrenti. Ma le coroutine hanno una
limitazione: girano tutte **nello stesso processo PHP** e si alternano nel ricevere il controllo dallo
scheduler. Se un'attività è **CPU-bound** — compressione, analisi, crittografia, calcoli pesanti —
una singola coroutine di questo tipo bloccherà lo scheduler, e tutte le altre coroutine si fermeranno
finché non avrà terminato.

I thread risolvono questa limitazione. `Async\Thread` esegue una closure in un **thread parallelo
separato** con il suo **runtime PHP isolato**: il suo set di variabili, il suo autoloader, le sue
classi e funzioni. Nulla è condiviso direttamente tra i thread — i dati vengono passati **per valore**,
tramite copia profonda.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Ticker nella coroutine principale — dimostra che il thread parallelo
// non impedisce al programma principale di continuare
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Calcolo pesante in un thread separato
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

Il ticker completa tranquillamente i suoi 5 "tick" concorrentemente con il lavoro pesante del thread —
il programma principale non deve aspettare.

## Quando usare thread vs coroutine

| Attività                                                  | Strumento                 |
|-----------------------------------------------------------|---------------------------|
| Molte richieste HTTP/DB/file concorrenti                  | Coroutine                 |
| Lavoro CPU-bound lungo (analisi, crittografia)            | Thread                    |
| Isolamento di codice instabile                            | Thread                    |
| Lavoro parallelo su più core CPU                          | Thread                    |
| Scambio di dati tra attività                              | Coroutine + canali        |

Un thread è un'**entità relativamente costosa**: avviare un nuovo thread è di un ordine di grandezza
più pesante che avviare una coroutine. Ecco perché non ne crei migliaia: il modello tipico prevede
pochi thread worker di lunga durata (spesso pari al numero di core CPU), o un thread per un'attività
pesante specifica.

## Ciclo di vita

```php
// Creazione — il thread si avvia e inizia l'esecuzione immediatamente
$thread = spawn_thread(fn() => compute());

// Attesa del risultato. La coroutine chiamante attende; le altre continuano a girare
$result = await($thread);

// Oppure un controllo non bloccante
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` implementa l'interfaccia `Completable`, quindi può essere passato a `await()`,
`await_all()`, `await_any()` e `Task\Group` — esattamente come una normale coroutine.

### Stati

| Metodo            | Cosa controlla                                                  |
|-------------------|-----------------------------------------------------------------|
| `isRunning()`     | Il thread è ancora in esecuzione                                |
| `isCompleted()`   | Il thread è terminato (con successo o con un'eccezione)         |
| `isCancelled()`   | Il thread è stato annullato                                     |
| `getResult()`     | Il risultato se è terminato con successo; altrimenti `null`     |
| `getException()`  | L'eccezione se è terminato con un errore; altrimenti `null`     |

### Gestione delle eccezioni

Un'eccezione lanciata all'interno di un thread viene catturata e consegnata al genitore avvolta
in `Async\RemoteException`:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()` può restituire `null` se la classe dell'eccezione non poteva essere caricata
nel thread genitore (ad esempio, è una classe definita dall'utente che esiste solo nel thread ricevente).

## Trasferimento di dati tra thread

Questa è la parte più importante del modello. **Tutto viene trasferito tramite copia** — nessun
riferimento condiviso.

### Cosa può essere trasferito

| Tipo                                                    | Comportamento                                                         |
|---------------------------------------------------------|-----------------------------------------------------------------------|
| Scalari (`int`, `float`, `string`, `bool`, `null`)      | Copiati                                                               |
| Array                                                   | Copia profonda; gli oggetti annidati preservano l'identità            |
| Oggetti con proprietà dichiarate (`public $x`, ecc.)   | Copia profonda; ricreati da zero nel thread ricevente                 |
| `Closure`                                               | Il corpo della funzione viene trasferito insieme a tutte le var `use(...)` |
| `WeakReference`                                         | Trasferito insieme al referente (vedi sotto)                          |
| `WeakMap`                                               | Trasferito con tutte le chiavi e i valori (vedi sotto)                |
| `Async\FutureState`                                     | Solo una volta, per scrivere un risultato dal thread (vedi sotto)     |

### Cosa non può essere trasferito

| Tipo                                                   | Perché                                                                                   |
|--------------------------------------------------------|------------------------------------------------------------------------------------------|
| `stdClass` e qualsiasi oggetto con proprietà dinamiche | Le proprietà dinamiche non hanno dichiarazione a livello di classe e non possono essere correttamente ricreate nel thread ricevente |
| Riferimenti PHP (`&$var`)                              | Un riferimento condiviso tra thread contraddice il modello                               |
| Risorse (`resource`)                                   | I descrittori di file, gli handle curl, i socket sono legati a un thread specifico       |

Il tentativo di trasferire qualsiasi di questi genererà immediatamente `Async\ThreadTransferException`
nella sorgente:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // proprietà dinamiche
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### L'identità degli oggetti viene preservata

Lo stesso oggetto referenziato più volte in un grafo di dati viene **creato solo una volta nel thread
ricevente**, e tutti i riferimenti puntano ad esso. All'interno di una singola operazione di trasferimento
(tutte le variabili da `use(...)` di una closure, un invio su canale, un risultato di thread) l'identità
viene preservata:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// La classe deve essere dichiarata nell'ambiente del thread ricevente — lo facciamo tramite un bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // La stessa istanza in due variabili diverse
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // Una mutazione tramite un riferimento è visibile attraverso l'altro
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

Lo stesso vale per gli oggetti collegati all'interno di un singolo grafo: un array con riferimenti a
oggetti annidati condivisi preserverà l'identità dopo il trasferimento.

### Cicli

Un grafo con un ciclo tramite oggetti regolari può essere trasferito. La limitazione è che i cicli
molto profondamente annidati possono superare il limite interno di profondità di trasferimento (centinaia
di livelli). In pratica, questo non si verifica quasi mai. I cicli della forma
`$node->weakParent = WeakReference::create($node)` — cioè un oggetto che fa riferimento a se stesso
tramite un `WeakReference` — attualmente si scontrano con lo stesso limite, quindi è meglio non usarli
all'interno di un singolo grafo trasferito.

## WeakReference tra thread

`WeakReference` ha una logica di trasferimento speciale. Il comportamento dipende da cosa altro viene
trasferito insieme ad esso.

### Il referente viene trasferito — l'identità viene preservata

Se l'oggetto stesso viene trasferito insieme al `WeakReference` (direttamente, all'interno di un array,
o come proprietà di un altro oggetto), allora nel thread ricevente `$wr->get()` restituisce **esattamente
quella** istanza che è finita negli altri riferimenti:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### Il referente non viene trasferito — WeakReference diventa morto

Se viene trasferito solo il `WeakReference` ma non l'oggetto stesso, allora nel thread ricevente
nessuno detiene un riferimento forte a quell'oggetto. Secondo le regole di PHP questo significa che
l'oggetto viene immediatamente distrutto e il `WeakReference` diventa **morto** (`$wr->get() === null`).
Questo è esattamente lo stesso comportamento del PHP a singolo thread: senza un proprietario forte,
l'oggetto viene raccolto.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj NON viene trasferito
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### La sorgente è già morta

Se il `WeakReference` era già morto nella sorgente al momento del trasferimento (`$wr->get() === null`),
arriverà nel thread ricevente già morto.

### Singleton

`WeakReference::create($obj)` restituisce un singleton: due chiamate per lo stesso oggetto producono
**la stessa** istanza di `WeakReference`. Questa proprietà viene preservata durante il trasferimento —
nel thread ricevente ci sarà anche esattamente un'istanza di `WeakReference` per oggetto.

## WeakMap tra thread

`WeakMap` viene trasferito con tutte le sue voci. Ma si applica la stessa regola del PHP a singolo
thread: **una chiave `WeakMap` vive solo finché qualcuno detiene un riferimento forte ad essa**.

### Le chiavi sono nel grafo — le voci sopravvivono

Se le chiavi vengono trasferite separatamente (o sono raggiungibili attraverso altri oggetti trasferiti),
il `WeakMap` nel thread ricevente contiene tutte le voci:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Solo WeakMap — le voci scompaiono

Se viene trasferito solo il `WeakMap` e le sue chiavi non compaiono da nessun'altra parte nel grafo,
il `WeakMap` **sarà vuoto nel thread ricevente**. Questo non è un bug; è una diretta conseguenza della
semantica weak: senza un proprietario forte, la chiave viene distrutta immediatamente dopo il caricamento
e la voce corrispondente scompare.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost non viene trasferito
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

Affinché una voce "sopravviva" al trasferimento, la sua chiave deve essere trasferita separatamente
(o come parte di qualche altro oggetto che è incluso nel grafo).

### Strutture annidate

Un `WeakMap` può contenere altri `WeakMap`, `WeakReference`, array e oggetti regolari come valori —
tutto viene trasferito ricorsivamente. I cicli della forma `$wm[$obj] = $wm` vengono gestiti correttamente.

## Future tra thread

Trasferire direttamente un `Async\Future` tra thread **non è possibile**: un `Future` è un oggetto
di attesa i cui eventi sono legati allo scheduler del thread in cui è stato creato. Invece, puoi
trasferire il lato "scrittore" — `Async\FutureState` — e solo **una volta**.

Il pattern tipico: il genitore crea una coppia `FutureState` + `Future`, passa `FutureState` stesso
nel thread tramite una variabile `use(...)`, il thread chiama `complete()` o `error()`, e il genitore
riceve il risultato attraverso il suo `Future`:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // Simulazione di lavoro pesante
        $data = "computed in thread";
        $state->complete($data);
    });

    // Il genitore attende tramite il suo Future — l'evento arriva qui
    // quando il thread chiama $state->complete()
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**Vincoli importanti:**

1. `FutureState` può essere trasferito a **un solo** thread. Un secondo tentativo di trasferimento
   genererà un'eccezione.
2. Il trasferimento del `Future` stesso non è consentito — appartiene al thread genitore e può solo
   svegliare il proprio proprietario.
3. Dopo che `FutureState` è stato trasferito, l'oggetto originale nel genitore rimane valido: quando
   il thread chiama `complete()`, quella modifica diventa visibile attraverso il `Future` nel genitore —
   `await($future)` si sblocca.

Questo è l'unico modo standard per consegnare un **singolo risultato** da un thread al chiamante,
al di fuori del normale `return` da `spawn_thread()`. Se hai bisogno di trasmettere molti valori,
usa `ThreadChannel`.

## Bootloader: preparare l'ambiente del thread

Un thread ha il **suo proprio ambiente** e non eredita le definizioni di classi, funzioni o costanti
dichiarate nello script genitore. Se una closure usa una classe definita dall'utente, quella classe
deve essere ri-dichiarata o caricata tramite autoload — per questo esiste il parametro `bootloader`:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config deve esistere nel thread
        return $config->name;
    },
    bootloader: function() {
        // Eseguito nel thread ricevente PRIMA della closure principale
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Il bootloader è garantito di girare nel thread ricevente prima che le variabili `use(...)` vengano
caricate e prima che la closure principale venga chiamata. Compiti tipici del bootloader: registrare
l'autoload, dichiarare classi tramite `eval`, impostare opzioni ini, caricare librerie.

## Casi limite

### Superglobali

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` sono propri del thread — vengono inizializzati da zero, come
in una nuova richiesta. Nella versione attuale di TrueAsync, la loro compilazione nei thread riceventi
è temporaneamente disabilitata (prevista per essere abilitata in seguito) — controlla il CHANGELOG.

### Variabili statiche di funzione

Ogni thread ha il suo set di variabili statiche di funzione e di classe. Le modifiche in un thread
non sono visibili agli altri — questo fa parte dell'isolamento generale.

### Opcache

Opcache condivide la sua cache di bytecode compilato tra i thread in sola lettura: gli script vengono
compilati una volta per l'intero processo, e ogni nuovo thread riutilizza il bytecode pronto. Questo
rende l'avvio dei thread più veloce.

## Vedi anche

- [`spawn_thread()`](/it/docs/reference/spawn-thread.html) — esecuzione di una closure in un thread
- [`Async\ThreadChannel`](/it/docs/components/thread-channels.html) — canali tra thread
- [`await()`](/it/docs/reference/await.html) — attesa del risultato di un thread
- [`Async\RemoteException`](/it/docs/components/exceptions.html) — wrapper per errori del thread ricevente
