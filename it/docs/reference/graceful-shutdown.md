---
layout: docs
lang: it
path_key: "/docs/reference/graceful-shutdown.html"
nav_active: docs
permalink: /it/docs/reference/graceful-shutdown.html
page_title: "graceful_shutdown()"
description: "graceful_shutdown() — arresto controllato dello scheduler con annullamento di tutte le coroutine."
---

# graceful_shutdown

(PHP 8.6+, True Async 1.0)

`graceful_shutdown()` — Avvia un arresto controllato dello scheduler. Tutte le coroutine ricevono una richiesta di annullamento.

## Descrizione

```php
graceful_shutdown(?Async\AsyncCancellation $cancellationError = null): void
```

Avvia la procedura di arresto controllato: tutte le coroutine attive vengono annullate e l'applicazione continua a funzionare fino al loro completamento naturale.

## Parametri

**`cancellationError`**
Un errore di annullamento opzionale da passare alle coroutine. Se non specificato, viene utilizzato un messaggio predefinito.

## Valori di ritorno

Nessun valore di ritorno.

## Esempi

### Esempio #1 Gestione di un segnale di terminazione

```php
<?php
use function Async\spawn;
use function Async\graceful_shutdown;
use Async\AsyncCancellation;

// Server che gestisce le richieste
spawn(function() {
    // Alla ricezione di un segnale — arresto controllato
    pcntl_signal(SIGTERM, function() {
        graceful_shutdown(new AsyncCancellation('Arresto del server'));
    });

    while (true) {
        // Elaborazione delle richieste...
    }
});
?>
```

## Note

> **Nota:** Le coroutine create **dopo** la chiamata a `graceful_shutdown()` verranno annullate immediatamente.

> **Nota:** `exit` e `die` attivano automaticamente un arresto controllato.

## Vedi anche

- [Cancellazione](/it/docs/components/cancellation.html) — meccanismo di annullamento
- [Scope](/it/docs/components/scope.html) — gestione del ciclo di vita
