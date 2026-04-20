---
layout: docs
lang: it
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /it/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — un canale thread-safe per trasferire dati tra thread OS in TrueAsync."
---

# Async\ThreadChannel: canali tra thread OS

## Come si differenzia da un Channel normale

`Async\Channel` funziona **all'interno di un singolo thread** — tra le coroutine dello stesso scheduler. I suoi dati risiedono nella **memoria locale del thread**, e la sicurezza è garantita dal fatto che solo una coroutine alla volta accede al canale.

`Async\ThreadChannel` è progettato per trasferire dati **tra thread OS**. Il buffer del canale risiede nella **memoria condivisa** accessibile a tutti i thread, non nella memoria di un singolo thread. Ogni valore inviato viene copiato in profondità in quella memoria condivisa, e sul lato ricevente — di nuovo nella memoria locale del thread. La sincronizzazione avviene tramite un mutex thread-safe, quindi `send()` e `recv()` possono essere chiamati da diversi thread OS in modo concorrente.

| Proprietà                          | `Async\Channel`                        | `Async\ThreadChannel`                        |
|------------------------------------|----------------------------------------|----------------------------------------------|
| Scope                              | Singolo thread OS                      | Tra thread OS                                |
| Dove risiedono i dati in buffer    | Memoria locale del thread              | Memoria condivisa visibile a tutti i thread  |
| Sincronizzazione                   | Scheduler coroutine (cooperativo)      | Mutex (thread-safe)                          |
| Rendezvous (capacity=0)            | Supportato                             | No — sempre con buffer                       |
| Capacità minima                    | 0                                      | 1                                            |

Se tutto gira in un singolo thread — usa `Async\Channel`, è più leggero. `ThreadChannel` ha senso solo quando si ha effettivamente bisogno di scambiare dati tra thread OS.

## Creare un canale

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — dimensione del buffer (minimo `1`). Valori più grandi assorbono meglio i produttori a raffica, ma consumano più memoria per la coda attiva.

## Esempio base: produttore + consumatore

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Produttore — un thread OS separato
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Consumatore — nel thread principale (una coroutine)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "ricevuto: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "canale chiuso\n";
    }

    await($producer);
});
```

```
ricevuto: item-1
ricevuto: item-2
ricevuto: item-3
ricevuto: item-4
ricevuto: item-5
canale chiuso
```

Il produttore scrive nel canale da un thread separato; il thread principale legge tramite `recv()` — niente di speciale, sembra identico a un `Channel` normale.

## send / recv

### `send($value[, $cancellation])`

Invia un valore nel canale. Se il buffer è pieno — **sospende la coroutine corrente** (sospensione cooperativa — le altre coroutine nello stesso scheduler continuano a girare) finché un altro thread non libera spazio.

Il valore viene **copiato in profondità nella memoria condivisa del canale** seguendo le stesse regole delle variabili catturate tramite `use(...)` in `spawn_thread()`. Oggetti con proprietà dinamiche, riferimenti PHP e risorse vengono rifiutati con `Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // array
$ch->send(new Point(3, 4));                    // oggetto con props dichiarate
$ch->send($futureState);                       // Async\FutureState (una sola volta!)
```

Se il canale è già chiuso — `send()` lancia `Async\ThreadChannelException`.

### `recv([$cancellation])`

Legge un valore dal canale. Se il buffer è vuoto — sospende la coroutine corrente finché non arrivano dati **oppure** il canale viene chiuso.

- Se arrivano dati — restituisce il valore.
- Se il canale è chiuso e il buffer è vuoto — lancia `Async\ThreadChannelException`.
- Se il canale è chiuso ma il buffer contiene ancora elementi — **svuota prima i dati rimanenti**, lanciando `ThreadChannelException` solo quando il buffer è vuoto.

Questo consente di svuotare correttamente un canale dopo che è stato chiuso.

## Stato del canale

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| Metodo         | Restituisce                                        |
|----------------|----------------------------------------------------|
| `capacity()`   | Dimensione del buffer impostata nel costruttore    |
| `count()`      | Numero corrente di messaggi nel buffer             |
| `isEmpty()`    | `true` se il buffer è vuoto                        |
| `isFull()`     | `true` se il buffer è pieno fino alla capacità     |
| `isClosed()`   | `true` se il canale è stato chiuso                 |

`ThreadChannel` implementa `Countable`, quindi `count($ch)` funziona.

## close()

```php
$ch->close();
```

Dopo la chiusura:

- `send()` lancia immediatamente `Async\ThreadChannelException`.
- `recv()` **svuota i valori rimanenti**, poi inizia a lanciare `ThreadChannelException`.
- Tutte le coroutine/thread sospesi in `send()` o `recv()` vengono **risvegliati** con `ThreadChannelException`.

Un canale può essere chiuso una sola volta. Una chiamata ripetuta è una no-op sicura.

## Pattern: worker pool

Due canali — uno per i job, uno per i risultati. I thread worker leggono i job dal primo e inseriscono i risultati nel secondo.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 thread worker
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Simula carico CPU
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // canale jobs chiuso — il worker esce
            }
        });
    }

    // Invia 6 job
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Attende che tutti i thread worker terminino
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Svuota i risultati
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Ogni worker ha gestito 2 job — il carico è stato distribuito su tre thread.

### Nota sulla distribuzione

Se il produttore scrive nel canale più velocemente di quanto i worker leggano (o se i worker impiegano quasi nessun tempo CPU), **il primo worker potrebbe prendere tutti i job** immediatamente, perché il suo `recv()` si sveglia per primo e preleva il messaggio successivo prima che gli altri worker raggiungano il loro `recv()`. Questo è il comportamento normale per una coda concorrente — lo scheduling equo non è garantito.

Se è richiesta una distribuzione rigorosamente uniforme — suddividi i task in anticipo (shard-by-hash), oppure dai ad ogni worker il proprio canale dedicato.

## Trasferire dati complessi attraverso il canale

`ThreadChannel` può trasportare qualsiasi cosa supportata dal trasferimento dati tra thread (vedi [Trasferire dati tra thread](/it/docs/components/threads.html#passing-data-between-threads)):

- scalari, array, oggetti con proprietà dichiarate
- `Closure` (closure)
- `WeakReference` e `WeakMap` (con le stesse regole di strong-owner di `spawn_thread`)
- `Async\FutureState` (una sola volta)

Ogni chiamata `send()` è un'operazione indipendente con la propria tabella di identità. **L'identità è preservata all'interno di un singolo messaggio**, ma non tra chiamate `send()` separate. Se vuoi che due ricevitori vedano "lo stesso" oggetto — invialo una volta all'interno di un array, non come due messaggi separati.

## Limitazioni

- **La capacità minima è 1.** Il rendezvous (capacity=0) non è supportato, a differenza di `Async\Channel`.
- **`ThreadChannel` non supporta la serializzazione.** Gli oggetti canale non possono essere salvati su file o inviati attraverso la rete — un canale esiste solo all'interno di un processo attivo.
- **Un handle di canale può essere passato** tramite `spawn_thread` o annidato all'interno di un altro canale — l'handle dell'oggetto per `ThreadChannel` viene trasferito correttamente, e entrambi i lati vedono lo stesso buffer interno.

## Vedi anche

- [`Async\Thread`](/it/docs/components/threads.html) — thread OS in TrueAsync
- [`spawn_thread()`](/it/docs/reference/spawn-thread.html) — avvia una closure in un nuovo thread
- [`Async\Channel`](/it/docs/components/channels.html) — canali tra coroutine nello stesso thread
