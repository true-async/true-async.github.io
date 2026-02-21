---
layout: docs
lang: it
path_key: "/docs/reference/signal.html"
nav_active: docs
permalink: /it/docs/reference/signal.html
page_title: "signal()"
description: "signal() — attendi un segnale del sistema operativo con supporto all'annullamento tramite Completable."
---

# signal

(PHP 8.6+, True Async 1.0)

`signal()` — Attende un segnale del sistema operativo. Restituisce un `Future` che si risolve con un valore `Signal` quando il segnale viene ricevuto.

## Descrizione

```php
signal(Async\Signal $signal, ?Async\Completable $cancellation = null): Async\Future
```

Crea un gestore di segnali del sistema operativo a uso singolo. Ogni chiamata a `signal()` crea un nuovo `Future` che si risolve alla prima ricezione del segnale specificato.
Se viene fornito il parametro `$cancellation`, il `Future` verrà rifiutato quando l'annullamento si attiva (es. al timeout).

Chiamate multiple a `signal()` con lo stesso segnale funzionano in modo indipendente — ognuna riceverà una notifica.

## Parametri

**`signal`**
Un valore dell'enum `Async\Signal` che specifica il segnale atteso. Ad esempio: `Signal::SIGINT`, `Signal::SIGTERM`, `Signal::SIGUSR1`.

**`cancellation`**
Un oggetto opzionale che implementa `Async\Completable` (es. il risultato di una chiamata a `timeout()`). Se l'oggetto di annullamento si attiva prima dell'arrivo del segnale, il `Future` verrà rifiutato con l'eccezione corrispondente (es. `Async\TimeoutException`).

Se l'oggetto di annullamento è già completato al momento della chiamata, `signal()` restituisce immediatamente un `Future` rifiutato.

## Valori di ritorno

Restituisce `Async\Future<Async\Signal>`. Quando il segnale viene ricevuto, il `Future` si risolve con il valore dell'enum `Async\Signal` corrispondente al segnale ricevuto.

## Errori/Eccezioni

- `Async\TimeoutException` — se il timeout si è attivato prima della ricezione del segnale.
- `Async\AsyncCancellation` — se l'annullamento è avvenuto per un altro motivo.

## Esempi

### Esempio #1 Attesa di un segnale con timeout

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;

try {
    $result = await(signal(Signal::SIGINT, timeout(5000)));
    echo "Segnale ricevuto: " . $result->name . "\n";
} catch (Async\TimeoutException $e) {
    echo "Segnale non ricevuto entro 5 secondi\n";
}
?>
```

### Esempio #2 Ricezione di un segnale da un'altra coroutine

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;

$future = signal(Signal::SIGUSR1);

spawn(function() {
    posix_kill(getmypid(), SIGUSR1);
});

$result = await($future);
echo "Segnale ricevuto: " . $result->name . "\n";
var_dump($result === Signal::SIGUSR1); // bool(true)
?>
```

### Esempio #3 Arresto controllato su SIGTERM

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\await;
use function Async\spawn;
use function Async\graceful_shutdown;

spawn(function() {
    await(signal(Signal::SIGTERM));
    echo "SIGTERM ricevuto, arresto in corso...\n";
    graceful_shutdown();
});
?>
```

### Esempio #4 Timeout già scaduto

```php
<?php
use Async\Signal;
use function Async\signal;
use function Async\timeout;
use function Async\await;
use function Async\delay;

$t = timeout(1);
delay(50); // Il timeout è già scaduto

$future = signal(Signal::SIGINT, $t);

try {
    await($future);
} catch (\Throwable $e) {
    echo get_class($e) . "\n"; // Async\TimeoutException
}
?>
```

## Note

> **Nota:** Ogni chiamata a `signal()` crea un gestore **a uso singolo**. Per attendere lo stesso segnale di nuovo, chiamare nuovamente `signal()`.

> **Nota:** `Signal::SIGINT` e `Signal::SIGBREAK` funzionano su tutte le piattaforme, incluso Windows. I segnali `SIGUSR1`, `SIGUSR2` e altri segnali POSIX sono disponibili solo su sistemi Unix.

> **Nota:** `Signal::SIGKILL` e `Signal::SIGSEGV` non possono essere catturati — questa è una limitazione del sistema operativo.

## Signal

L'enum `Async\Signal` definisce i segnali del sistema operativo disponibili:

| Valore | Segnale | Descrizione |
|--------|---------|-------------|
| `Signal::SIGHUP` | 1 | Connessione terminale persa |
| `Signal::SIGINT` | 2 | Interruzione (Ctrl+C) |
| `Signal::SIGQUIT` | 3 | Uscita con core dump |
| `Signal::SIGILL` | 4 | Istruzione illegale |
| `Signal::SIGABRT` | 6 | Terminazione anomala |
| `Signal::SIGFPE` | 8 | Errore aritmetico in virgola mobile |
| `Signal::SIGKILL` | 9 | Terminazione incondizionata |
| `Signal::SIGUSR1` | 10 | Segnale definito dall'utente 1 |
| `Signal::SIGSEGV` | 11 | Violazione dell'accesso alla memoria |
| `Signal::SIGUSR2` | 12 | Segnale definito dall'utente 2 |
| `Signal::SIGTERM` | 15 | Richiesta di terminazione |
| `Signal::SIGBREAK` | 21 | Break (Ctrl+Break, Windows) |
| `Signal::SIGABRT2` | 22 | Terminazione anomala (alternativa) |
| `Signal::SIGWINCH` | 28 | Cambio dimensione finestra terminale |

## Vedi anche

- [timeout()](/it/docs/reference/timeout.html) — creare un timeout per limitare l'attesa
- [await()](/it/docs/reference/await.html) — attesa del risultato di un Future
- [graceful_shutdown()](/it/docs/reference/graceful-shutdown.html) — arresto controllato dello scheduler
- [Cancellazione](/it/docs/components/cancellation.html) — meccanismo di annullamento
