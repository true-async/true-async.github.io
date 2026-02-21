---
layout: architecture
lang: it
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /it/architecture/events.html
page_title: "Eventi e Modello degli Eventi"
description: "La struttura base zend_async_event_t -- fondamento di tutte le operazioni asincrone, sistema di callback, flag, gerarchia degli eventi."
---

# Eventi e Modello degli Eventi

Un evento (`zend_async_event_t`) è una struttura universale
da cui **tutte** le primitive asincrone ereditano:
coroutine, `future`, canali, timer, eventi `poll`, segnali e altri.

L'interfaccia unificata degli eventi consente di:
- Iscriversi a qualsiasi evento tramite callback
- Combinare eventi eterogenei in un'unica attesa
- Gestire il ciclo di vita attraverso il ref-counting

## Struttura Base

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Offset ai dati aggiuntivi

    union {
        uint32_t ref_count;          // Per oggetti C
        uint32_t zend_object_offset; // Per oggetti Zend
    };

    uint32_t loop_ref_count;         // Contatore riferimenti del loop eventi

    zend_async_callbacks_vector_t callbacks;

    // Metodi
    zend_async_event_add_callback_t add_callback;
    zend_async_event_del_callback_t del_callback;
    zend_async_event_start_t start;
    zend_async_event_stop_t stop;
    zend_async_event_replay_t replay;       // Nullable
    zend_async_event_dispose_t dispose;
    zend_async_event_info_t info;           // Nullable
    zend_async_event_callbacks_notify_t notify_handler; // Nullable
};
```

### Metodi Virtuali di un Evento

Ogni evento ha un piccolo set di metodi virtuali.

| Metodo           | Scopo                                              |
|------------------|----------------------------------------------------|
| `add_callback`   | Iscrivere un callback all'evento                   |
| `del_callback`   | Annullare l'iscrizione di un callback              |
| `start`          | Attivare l'evento nel reactor                      |
| `stop`           | Disattivare l'evento                               |
| `replay`         | Riconsegnare il risultato (per future, coroutine)  |
| `dispose`        | Rilasciare le risorse                              |
| `info`           | Descrizione testuale dell'evento (per il debug)    |
| `notify_handler` | Hook chiamato prima di notificare i callback       |

#### `add_callback`

Aggiunge un callback all'array dinamico `callbacks` dell'evento.
Chiama `zend_async_callbacks_push()`,
che incrementa il `ref_count` del callback e aggiunge il puntatore al vettore.

#### `del_callback`

Rimuove un callback dal vettore (O(1) tramite scambio con l'ultimo elemento)
e chiama `callback->dispose`.

Scenario tipico: durante un'attesa `select` su più eventi,
quando uno si attiva, gli altri vengono cancellati tramite `del_callback`.

#### `start`

I metodi `start` e `stop` sono destinati agli eventi che possono essere inseriti nell'`EventLoop`.
Pertanto, non tutte le primitive implementano questo metodo.

Per gli eventi dell'EventLoop, `start` incrementa il `loop_ref_count`, che consente
all'evento di rimanere nell'EventLoop finché qualcuno ne ha bisogno.

| Tipo                                           | Cosa fa `start`                                                          |
|------------------------------------------------|--------------------------------------------------------------------------|
| Coroutine, `Future`, `Channel`, `Pool`, `Scope` | Non fa nulla                                                            |
| Timer                                          | `uv_timer_start()` + incrementa `loop_ref_count` e `active_event_count`  |
| Poll                                           | `uv_poll_start()` con maschera degli eventi (READABLE/WRITABLE)          |
| Segnale                                        | Registra l'evento nella tabella globale dei segnali                      |
| IO                                             | Incrementa `loop_ref_count` -- lo stream libuv parte tramite read/write  |

#### `stop`

Il metodo speculare di `start`. Decrementa il `loop_ref_count` per gli eventi di tipo EventLoop.
L'ultima chiamata `stop` (quando `loop_ref_count` raggiunge 0) arresta effettivamente l'`handle`.

#### `replay`

Consente ai sottoscrittori tardivi di ricevere il risultato di un evento già completato.
Implementato solo dai tipi che memorizzano un risultato.

| Tipo         | Cosa restituisce `replay`                        |
|--------------|--------------------------------------------------|
| **Coroutine** | `coroutine->result` e/o `coroutine->exception`   |
| **Future**   | `future->result` e/o `future->exception`          |

Se viene fornito un `callback`, viene chiamato in modo sincrono con il risultato.
Se viene fornito `result`/`exception`, i valori vengono copiati nei puntatori.
Senza `replay`, l'attesa su un evento chiuso produce un avviso.

#### `dispose`

Questo metodo tenta di rilasciare l'evento decrementando il suo `ref_count`.
Se il contatore raggiunge zero, viene attivata la deallocazione effettiva delle risorse.

#### `info`

Una stringa leggibile per il debug e il logging.

| Tipo                 | Stringa di esempio                                                       |
|----------------------|--------------------------------------------------------------------------|
| **Coroutine**        | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` o `"FutureState(pending)"`                    |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

Un hook che intercetta la notifica **prima** che i callback ricevano il risultato.
Per default `NULL` per tutti gli eventi. Utilizzato in `Async\Timeout`:

## Ciclo di Vita degli Eventi

![Ciclo di Vita degli Eventi](/diagrams/it/architecture-events/lifecycle.svg)

Un evento attraversa diversi stati:
- **Creato** -- memoria allocata, `ref_count = 1`, è possibile iscrivere i callback
- **Attivo** -- registrato nell'`EventLoop` (`start()`), incrementa `active_event_count`
- **Attivato** -- `libuv` ha chiamato il callback. Per eventi periodici (timer, poll) -- ritorna ad **Attivo**. Per eventi one-shot (DNS, exec, Future) -- transizione a **Chiuso**
- **Fermato** -- temporaneamente rimosso dall'`EventLoop` (`stop()`), può essere riattivato
- **Chiuso** -- `flags |= F_CLOSED`, l'iscrizione non è possibile, quando si raggiunge `ref_count = 0`, viene chiamato `dispose`

## Interazione: Evento, Callback, Coroutine

![Evento -> Callback -> Coroutine](/diagrams/it/architecture-events/callback-flow.svg)

## Doppia Vita: Oggetto C e Oggetto Zend

Gli eventi spesso vivono in due mondi contemporaneamente.
Un timer, un handle `poll` o una query `DNS` è un oggetto `C` interno gestito dal `Reactor`.
Ma una coroutine o un `Future` è anche un oggetto `PHP` accessibile dal codice utente.

Le strutture C nell'`EventLoop` possono vivere più a lungo degli oggetti `PHP` che le referenziano, e viceversa.
Gli oggetti C usano `ref_count`, mentre gli oggetti `PHP` usano `GC_ADDREF/GC_DELREF`
con il garbage collector.

Pertanto, `TrueAsync` supporta diversi tipi di binding tra oggetti PHP e oggetti C.

### Oggetto C

Gli eventi interni invisibili dal codice PHP usano il campo `ref_count`.
Quando l'ultimo proprietario rilascia il riferimento, viene chiamato `dispose`:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose al raggiungimento di 0
```

### Oggetto Zend

Una coroutine è un oggetto `PHP` che implementa l'interfaccia `Awaitable`.
Invece di `ref_count`, usano il campo `zend_object_offset`,
che punta all'offset della struttura `zend_object`.

Le macro `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE` funzionano correttamente in tutti i casi.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

Lo `zend_object` fa parte della struttura C dell'evento
e può essere recuperato usando `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT`.

```c
// Ottieni l'evento dall'oggetto PHP (considerando il riferimento all'evento)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// Ottieni l'oggetto PHP dall'evento
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Riferimento all'Evento

Alcuni eventi affrontano un problema architetturale: non possono essere direttamente oggetti `Zend`.

Ad esempio, un timer. Il `GC` di `PHP` potrebbe decidere di raccogliere l'oggetto in qualsiasi momento, ma `libuv` richiede
la chiusura asincrona dell'handle tramite `uv_close()` con un callback. Se il `GC` chiama il distruttore
mentre `libuv` non ha ancora finito di lavorare con l'handle, otteniamo `use-after-free`.

In questo caso, si utilizza l'approccio **Event Reference**: l'oggetto `PHP` memorizza non l'evento stesso, ma un puntatore ad esso:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Puntatore all'evento effettivo
} zend_async_event_ref_t;
```

Con questo approccio, i cicli di vita dell'oggetto `PHP` e dell'evento C sono **indipendenti**.
L'oggetto `PHP` può essere raccolto dal `GC` senza influenzare l'`handle`,
e l'`handle` si chiuderà in modo asincrono quando sarà pronto.

La macro `ZEND_ASYNC_OBJECT_TO_EVENT()` riconosce automaticamente un riferimento
tramite il prefisso `flags` e segue il puntatore.

## Sistema di Callback

Iscriversi agli eventi è il meccanismo principale di interazione tra le coroutine e il mondo esterno.
Quando una coroutine vuole attendere un timer, dati da un socket o il completamento di un'altra coroutine,
registra un `callback` sull'evento corrispondente.

Ogni evento memorizza un array dinamico di sottoscrittori:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Puntatore all'indice dell'iteratore attivo (o NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` risolve il problema della rimozione sicura dei callback durante l'iterazione.

### Struttura del Callback

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Un callback è anch'esso una struttura con ref-counting. Questo è necessario perché un singolo `callback`
può essere referenziato sia dal vettore dell'evento che dal `waker` della coroutine contemporaneamente.
Il `ref_count` garantisce che la memoria venga liberata solo quando entrambe le parti rilasciano il loro riferimento.

### Callback della Coroutine

La maggior parte dei callback in `TrueAsync` viene utilizzata per risvegliare una coroutine.
Pertanto, memorizzano informazioni sulla coroutine e sull'evento a cui si sono iscritti:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Ereditarietà
    zend_coroutine_t *coroutine;         // Chi risvegliare
    zend_async_event_t *event;           // Da dove proviene
};
```

Questo binding è la base del meccanismo [Waker](/it/architecture/waker.html):

## Flag degli Eventi

I flag a bit nel campo `flags` controllano il comportamento dell'evento in ogni fase del suo ciclo di vita:

| Flag                  | Scopo                                                                            |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Evento completato. `start`/`stop` non funzionano più, l'iscrizione non è possibile |
| `F_RESULT_USED`       | Qualcuno è in attesa del risultato -- non serve l'avviso di risultato non usato  |
| `F_EXC_CAUGHT`        | L'errore verrà catturato -- sopprimere l'avviso di eccezione non gestita         |
| `F_ZVAL_RESULT`       | Il risultato nel callback è un puntatore a `zval` (non `void*`)                 |
| `F_ZEND_OBJ`          | L'evento è un oggetto `Zend` -- passa `ref_count` a `GC_ADDREF`                 |
| `F_NO_FREE_MEMORY`    | `dispose` non deve liberare la memoria (l'oggetto non è stato allocato tramite `emalloc`) |
| `F_EXCEPTION_HANDLED` | L'eccezione è stata gestita -- non serve rilanciare                              |
| `F_REFERENCE`         | La struttura è un `Event Reference`, non un evento effettivo                     |
| `F_OBJ_REF`           | A `extra_offset` c'è un puntatore a `zend_object`                               |
| `F_CLOSE_FD`          | Chiudere il descrittore di file alla distruzione                                 |
| `F_HIDDEN`            | Evento nascosto -- non partecipa al `Deadlock Detection`                         |

### Rilevamento Deadlock

`TrueAsync` traccia il numero di eventi attivi nell'`EventLoop` tramite `active_event_count`.
Quando tutte le coroutine sono sospese e non ci sono eventi attivi -- è un `deadlock`:
nessun evento può risvegliare alcuna coroutine.

Ma alcuni eventi sono sempre presenti nell'`EventLoop` e non sono correlati alla logica utente:
timer `healthcheck` in background, handler di sistema. Se vengono contati come "attivi",
il `deadlock detection` non si attiverà mai.

Per tali eventi, si utilizza il flag `F_HIDDEN`:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Contrassegna come nascosto
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, ma solo se NON nascosto
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, ma solo se NON nascosto
```

## Gerarchia degli Eventi

In `C` non esiste l'ereditarietà delle classi, ma esiste una tecnica: se il primo campo di una struttura
è `zend_async_event_t`, allora un puntatore alla struttura può essere castato in sicurezza
a un puntatore a `zend_async_event_t`. Questo è esattamente come tutti gli eventi specializzati
"ereditano" dalla base:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- polling fd/socket
|   \-- zend_async_poll_proxy_t  -- proxy per il filtraggio degli eventi
|-- zend_async_timer_event_t     -- timer (one-shot e periodici)
|-- zend_async_signal_event_t    -- segnali POSIX
|-- zend_async_process_event_t   -- attesa della terminazione del processo
|-- zend_async_thread_event_t    -- thread in background
|-- zend_async_filesystem_event_t -- modifiche al filesystem
|-- zend_async_dns_nameinfo_t    -- DNS inverso
|-- zend_async_dns_addrinfo_t    -- risoluzione DNS
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- socket server TCP
|-- zend_async_trigger_event_t   -- risveglio manuale (sicuro tra thread)
|-- zend_async_task_t            -- task del pool di thread
|-- zend_async_io_t              -- I/O unificato
|-- zend_coroutine_t             -- coroutine
|-- zend_future_t                -- future
|-- zend_async_channel_t         -- canale
|-- zend_async_group_t           -- gruppo di task
|-- zend_async_pool_t            -- pool di risorse
\-- zend_async_scope_t           -- scope
```

Grazie a questo, un `Waker` può iscriversi a **qualsiasi** di questi eventi
con la stessa chiamata `event->add_callback`, senza conoscere il tipo specifico.

### Esempi di Strutture Specializzate

Ogni struttura aggiunge all'evento base solo quei campi
che sono specifici del suo tipo:

**Timer** -- estensione minimale:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Millisecondi
    bool is_periodic;
};
```

**Poll** -- tracciamento I/O su un descrittore:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // Cosa tracciare: READABLE|WRITABLE|...
    async_poll_event triggered_events; // Cosa è effettivamente successo
};
```

**Filesystem** -- monitoraggio del filesystem:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Quale file è cambiato
};
```

**Exec** -- esecuzione di comandi esterni:
```c
struct _zend_async_exec_event_s {
    zend_async_event_t base;
    zend_async_exec_mode exec_mode;    // exec/system/passthru/shell_exec
    bool terminated;
    char *cmd;
    zval *return_value;
    zend_long exit_code;
    int term_signal;
};
```

## Poll Proxy

Immaginate una situazione: due coroutine su un singolo socket TCP -- una legge, l'altra scrive.
Necessitano di eventi diversi (`READABLE` vs `WRITABLE`), ma il socket è uno.

`Poll Proxy` risolve questo problema. Invece di creare due handle `uv_poll_t`
per lo stesso fd (il che è impossibile in `libuv`), viene creato un singolo `poll_event`
insieme a diversi proxy con maschere diverse:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Poll padre
    async_poll_event events;               // Sottoinsieme di eventi per questo proxy
    async_poll_event triggered_events;     // Cosa si è attivato
};
```

Il `Reactor` aggrega le maschere da tutti i proxy attivi e passa la maschera combinata a `uv_poll_start`.
Quando `libuv` segnala un evento, il `Reactor` controlla ogni proxy
e notifica solo quelli la cui maschera corrisponde.

## Async IO

Per le operazioni di I/O su stream (lettura da un file, scrittura su un socket, lavoro con le pipe),
`TrueAsync` fornisce un `handle` unificato:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // Per PIPE/FILE
        zend_socket_t socket;        // Per TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

La stessa interfaccia `ZEND_ASYNC_IO_READ/WRITE/CLOSE` funziona con qualsiasi tipo,
e l'implementazione specifica viene selezionata al momento della creazione dell'`handle` in base al `type`.

Tutte le operazioni I/O sono asincrone e restituiscono un `zend_async_io_req_t` -- una richiesta one-shot:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Errore dell'operazione (o NULL)
    char *buf;                 // Buffer dati
    bool completed;            // Operazione completata?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Una coroutine chiama `ZEND_ASYNC_IO_READ`, riceve un `req`,
si iscrive al suo completamento tramite il `Waker` e va a dormire.
Quando `libuv` completa l'operazione, `req->completed` diventa `true`,
il callback risveglia la coroutine, e questa recupera i dati da `req->buf`.
