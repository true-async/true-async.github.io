---
layout: architecture
lang: it
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /it/architecture/scheduler-reactor.html
page_title: "Scheduler e Reactor"
description: "Design interno dello scheduler delle coroutine e del reactor degli eventi -- code, cambio di contesto, libuv, pool di fiber."
---

# Coroutine, Scheduler e Reactor

`Scheduler` e `Reactor` sono i due componenti principali del runtime.
Lo `Scheduler` gestisce la coda delle coroutine e il cambio di contesto,
mentre il `Reactor` gestisce gli eventi `I/O` attraverso l'`Event loop`.

![Interazione tra Scheduler e Reactor](/diagrams/it/architecture-scheduler-reactor/architecture.svg)

## Scheduler

### Coroutine dello Scheduler e Minimizzazione dei Cambi di Contesto

In molte implementazioni di coroutine, lo `scheduler` utilizza un thread separato
o almeno un contesto di esecuzione separato. Una coroutine chiama `yield`,
il controllo passa allo `scheduler`, che seleziona la prossima coroutine e passa ad essa.
Questo produce **due** cambi di contesto per `suspend`/`resume`: coroutine -> scheduler -> coroutine.

In `TrueAsync`, lo `Scheduler` ha **la propria coroutine** (`ZEND_ASYNC_SCHEDULER`)
con un contesto dedicato. Quando tutte le coroutine utente sono in attesa e la coda è vuota,
il controllo viene passato a questa coroutine, dove esegue il ciclo principale: `reactor tick`, `microtask`.

Poiché le coroutine utilizzano un contesto di esecuzione completo (stack + registri),
il cambio di contesto richiede circa 10-20 ns su `x86` moderno.
Pertanto, `TrueAsync` ottimizza il numero di cambi
permettendo ad alcune operazioni di essere eseguite direttamente nel contesto della coroutine corrente, senza passare allo scheduler.

Quando una coroutine chiama un'operazione `SUSPEND()`, `scheduler_next_tick()` viene chiamata direttamente nel contesto della coroutine corrente --
una funzione che esegue un tick dello scheduler: microtask, reactor, controllo della coda.
Se c'è una coroutine pronta nella coda, lo `Scheduler` passa ad essa **direttamente**,
bypassando la propria coroutine. Questo è un `cambio di contesto` invece di due.
Inoltre, se la prossima coroutine nella coda non è ancora stata avviata e quella corrente è già terminata,
non è necessario alcun cambio -- la nuova coroutine riceve il contesto corrente.

Il passaggio alla coroutine dello `Scheduler` (tramite `switch_to_scheduler()`) avviene **solo** se:
- La coda delle coroutine è vuota e il reactor deve attendere eventi
- Il passaggio a un'altra coroutine è fallito
- È stato rilevato un deadlock

### Ciclo Principale

![Ciclo Principale dello Scheduler](/diagrams/it/architecture-scheduler-reactor/scheduler-loop.svg)

Ad ogni tick, lo scheduler esegue:

1. **Microtask** -- elaborazione della coda dei `microtask` (piccoli compiti senza cambio di contesto)
2. **Coda delle coroutine** -- estrazione della prossima coroutine dalla `coroutine_queue`
3. **Cambio di contesto** -- `zend_fiber_switch_context()` alla coroutine selezionata
4. **Gestione dei risultati** -- controllo dello stato della coroutine dopo il ritorno
5. **Reactor** -- se la coda è vuota, chiamata a `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### Microtask

Non ogni azione merita una coroutine. A volte è necessario fare qualcosa di veloce
tra i cambi: aggiornare un contatore, inviare una notifica, rilasciare una risorsa.
Creare una coroutine per questo è eccessivo, eppure l'azione deve essere eseguita il prima possibile.
Qui entrano in gioco i microtask -- handler leggeri che vengono eseguiti
direttamente nel contesto della coroutine corrente, senza cambio.

I microtask devono essere handler leggeri e veloci poiché ottengono accesso diretto
al ciclo dello scheduler. Nelle prime versioni di `TrueAsync`, i microtask potevano risiedere in PHP-land, ma
a causa di regole rigorose e considerazioni sulle prestazioni, si è deciso di mantenere questo meccanismo
solo per il codice C.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

In `TrueAsync`, i microtask vengono elaborati tramite una coda FIFO prima di ogni cambio di coroutine.
Se un microtask lancia un'eccezione, l'elaborazione viene interrotta.
Dopo l'esecuzione, il microtask viene immediatamente rimosso dalla coda e il suo conteggio di riferimenti attivi viene decrementato di uno.

I microtask vengono utilizzati in scenari come l'iteratore concorrente, che permette all'iterazione
di trasferirsi automaticamente a un'altra coroutine se la precedente è entrata in uno stato di attesa.

### Priorità delle Coroutine

Sotto il cofano, `TrueAsync` utilizza il tipo più semplice di coda: un buffer circolare. Questa è probabilmente la migliore soluzione
in termini di equilibrio tra semplicità, prestazioni e funzionalità.

Non c'è garanzia che l'algoritmo della coda non cambierà in futuro. Detto ciò, ci sono rare occasioni
in cui la priorità delle coroutine è importante.

Attualmente vengono utilizzate due priorità:

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

Le coroutine ad alta priorità vengono posizionate **in testa** alla coda durante l'`enqueue`.
L'estrazione avviene sempre dalla testa. Nessuno scheduling complesso,
solo ordine di inserimento. Questo è un approccio deliberatamente semplice: due livelli coprono
le esigenze del mondo reale, mentre code di priorità complesse (come negli `RTOS`) aggiungerebbero overhead
ingiustificato nel contesto delle applicazioni PHP.

### Suspend e Resume

![Operazioni Suspend e Resume](/diagrams/it/architecture-scheduler-reactor/suspend-resume.svg)

Le operazioni `Suspend` e `Resume` sono i compiti principali dello `Scheduler`.

Quando una coroutine chiama `suspend`, accade quanto segue:

1. Gli eventi `waker` della coroutine vengono avviati (`start_waker_events`).
   Solo in questo momento i timer iniziano a ticchettare e gli oggetti poll
   iniziano ad ascoltare sui descrittori. Prima di chiamare `suspend`, gli eventi non sono attivi --
   questo permette di preparare prima tutte le sottoscrizioni, poi avviare l'attesa con una singola chiamata.
2. **Senza cambio di contesto**, viene chiamata `scheduler_next_tick()`:
   - I microtask vengono elaborati
   - Viene eseguito un `reactor tick` (se è passato abbastanza tempo)
   - Se c'è una coroutine pronta nella coda, `execute_next_coroutine()` passa ad essa
   - Se la coda è vuota, `switch_to_scheduler()` passa alla coroutine dello `scheduler`
3. Quando il controllo ritorna, la coroutine si sveglia con l'oggetto `waker` che contiene il risultato del `suspend`.

**Percorso di ritorno rapido**: se durante `start_waker_events` un evento è già stato attivato
(ad es. un `Future` è già completato), la coroutine **non viene sospesa affatto** --
il risultato è disponibile immediatamente. Pertanto, `await` su un
`Future` completato non attiva `suspend` e non causa un cambio di contesto, restituendo il risultato direttamente.

## Pool di Contesti

Un contesto è un `C stack` completo (di default `EG(fiber_stack_size)`).
Poiché la creazione dello stack è un'operazione costosa, `TrueAsync` si impegna a ottimizzare la gestione della memoria.
Teniamo conto del pattern di utilizzo della memoria: le coroutine muoiono e vengono create costantemente.
Il pattern pool è ideale per questo scenario!

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // Fiber C nativo (stack + registri)
    zend_vm_stack vm_stack;         // Stack VM di Zend
    zend_execute_data *execute_data;// execute_data corrente
    uint8_t flags;                  // Stato della fiber
};
```

Invece di creare e distruggere costantemente memoria, lo Scheduler restituisce i contesti al pool
e li riutilizza continuamente.

Sono pianificati algoritmi intelligenti di gestione delle dimensioni del pool
che si adatteranno dinamicamente al carico di lavoro
per minimizzare sia la latenza di `mmap`/`mprotect` che il footprint complessivo di memoria.

### Switch Handler

In `PHP`, molti sottosistemi si basano su un'assunzione semplice:
il codice viene eseguito dall'inizio alla fine senza interruzione.
Il buffer di output (`ob_start`), i distruttori degli oggetti, le variabili globali --
tutto questo funziona linearmente: inizio -> fine.

Le coroutine rompono questo modello. Una coroutine può addormentarsi nel mezzo del suo lavoro
e svegliarsi dopo migliaia di altre operazioni. Tra `LEAVE` e `ENTER`
sullo stesso thread, decine di altre coroutine saranno state eseguite.

Gli `Switch Handler` sono hook legati a una **specifica coroutine**.
A differenza dei microtask (che si attivano ad ogni cambio),
uno `switch handler` viene chiamato solo all'entrata e all'uscita della "sua" coroutine:

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = entrata, false = uscita
    bool is_finishing // true = la coroutine sta terminando
    // ritorno: true = mantieni handler, false = rimuovi
);
```

Il valore di ritorno controlla la durata dell'handler:
* `true` -- l'`handler` rimane e verrà chiamato di nuovo.
* `false` -- lo `Scheduler` lo rimuoverà.

Lo `Scheduler` chiama gli handler in tre punti:

```c
ZEND_COROUTINE_ENTER(coroutine)  // La coroutine ha ricevuto il controllo
ZEND_COROUTINE_LEAVE(coroutine)  // La coroutine ha ceduto il controllo (suspend)
ZEND_COROUTINE_FINISH(coroutine) // La coroutine sta terminando definitivamente
```

#### Esempio: Buffer di Output

La funzione `ob_start()` utilizza uno stack di handler singolo.
Quando una coroutine chiama `ob_start()` e poi si addormenta, un'altra coroutine potrebbe vedere il buffer dell'altra se non si fa nulla.
(Tra l'altro, **Fiber** non gestisce `ob_start()` correttamente.)

Uno `switch handler` one-shot risolve questo all'avvio della coroutine:
sposta il globale `OG(handlers)` nel contesto della coroutine e pulisce lo stato globale.
Dopo questo, ogni coroutine lavora con il proprio buffer, e `echo` in una non si mescola con un'altra.

#### Esempio: Distruttori Durante lo Shutdown

Quando `PHP` si spegne, viene chiamata `zend_objects_store_call_destructors()` --
attraversamento dello store degli oggetti e chiamata dei distruttori. Normalmente questo è un processo lineare.

Ma un distruttore può contenere `await`. Per esempio, un oggetto connessione al database
vuole chiudere correttamente la connessione -- che è un'operazione di rete.
La coroutine chiama `await` dentro il distruttore e si addormenta.

I distruttori rimanenti devono continuare. Lo `switch handler` cattura il momento `LEAVE`
e genera una nuova coroutine ad alta priorità che continua l'attraversamento
dall'oggetto dove la precedente si era fermata.

#### Registrazione

```c
// Aggiungere handler a una specifica coroutine
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// Aggiungere alla coroutine corrente (o alla principale se lo Scheduler non è ancora avviato)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// Aggiungere handler che si attiva quando la coroutine principale si avvia
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

L'ultima macro è necessaria per i sottosistemi che si inizializzano prima dell'avvio dello `Scheduler`.
Registrano un handler globalmente, e quando lo `Scheduler` crea la coroutine `main`,
tutti gli handler globali vengono copiati in essa e si attivano come `ENTER`.

## Reactor

### Perché libuv?

`TrueAsync` utilizza `libuv`, la stessa libreria che alimenta `Node.js`.

La scelta è deliberata. `libuv` fornisce:
- Un'`API` unificata per `Linux` (`epoll`), macOS (`kqueue`), Windows (`IOCP`)
- Supporto integrato per timer, segnali, `DNS`, processi figli, I/O su file
- Una codebase matura testata da miliardi di richieste in produzione

Sono state considerate alternative (`libev`, `libevent`, `io_uring`),
ma `libuv` vince per usabilità.

### Struttura

```c
// Dati globali del Reactor (in ASYNC_G)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// Gestione dei segnali
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // Eventi processo SIGCHLD
```

### Tipi di Eventi e Wrapper

Ogni evento in `TrueAsync` ha una natura duale: una struttura `ABI` definita nel core `PHP`,
e un `handle libuv` che interagisce effettivamente con il `SO`. Il `Reactor` li "incolla" insieme,
creando wrapper dove entrambi i mondi coesistono:

| Tipo di Evento   | Struttura ABI                   | Handle libuv                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Segnale          | `zend_async_signal_event_t`     | `uv_signal_t` globale         |
| Filesystem       | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Processo         | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

Per maggiori dettagli sulla struttura degli eventi, vedere [Eventi e il Modello degli Eventi](/it/architecture/events.html).

### Async IO

Per le operazioni su stream, viene utilizzato un `async_io_t` unificato:

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI: evento + fd/socket + tipo + stato
    int crt_fd;             // Descrittore file CRT
    async_io_req_t *active_req;
    union {
        uv_stream_t stream;
        uv_pipe_t pipe;
        uv_tty_t tty;
        uv_tcp_t tcp;
        uv_udp_t udp;
        struct { zend_off_t offset; } file;
    } handle;
};
```

La stessa interfaccia (`ZEND_ASYNC_IO_READ/WRITE/CLOSE`) funziona con `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`.
L'implementazione specifica viene selezionata al momento della creazione dell'handle in base al `tipo`.

### Ciclo del Reactor

`reactor_execute(no_wait)` chiama un tick dell'`event loop` di `libuv`:
- `no_wait = true` -- chiamata non bloccante, elabora solo gli eventi pronti
- `no_wait = false` -- blocca fino al prossimo evento

Lo `Scheduler` utilizza entrambe le modalità. Tra i cambi di coroutine -- un tick non bloccante
per raccogliere gli eventi già attivati. Quando la coda delle coroutine è vuota --
una chiamata bloccante per evitare di sprecare CPU in un ciclo inattivo.

Questa è una strategia classica dal mondo dei server event-driven: `nginx`, `Node.js`
e `Tokio` utilizzano lo stesso principio: sondare senza attendere finché c'è lavoro da fare,
e dormire quando non c'è lavoro.

## Efficienza del Cambio: TrueAsync nel Contesto Industriale

### Stackful vs Stackless: Due Mondi

Esistono due approcci fondamentalmente diversi per implementare le coroutine:

**Stackful** (Go, Erlang, Java Loom, PHP Fibers) -- ogni coroutine ha il proprio stack C.
Il cambio comporta il salvataggio/ripristino dei registri e del puntatore allo stack.
Il vantaggio principale: **trasparenza**. Qualsiasi funzione a qualsiasi profondità di chiamata può invocare `suspend`
senza richiedere annotazioni speciali. Il programmatore scrive codice sincrono ordinario.

**Stackless** (Rust async/await, Kotlin, C# async) -- il compilatore trasforma una funzione `async`
in una macchina a stati. "Sospendere" è solo un `return` dalla funzione,
e "riprendere" è una chiamata di metodo con un nuovo numero di stato. Lo stack non viene cambiato affatto.
Il costo: **"function coloring"** (`async` infetta l'intera catena di chiamate).

| Proprietà                                 | Stackful                          | Stackless                             |
|-------------------------------------------|-----------------------------------|---------------------------------------|
| Sospensione da chiamate annidate          | Sì                                | No -- solo da funzioni `async`        |
| Costo del cambio                          | 15-200 ns (salvataggio registri)  | 10-50 ns (scrittura campi in oggetto) |
| Memoria per coroutine                     | 4-64 KiB (stack separato)         | Dimensione esatta della macchina a stati |
| Ottimizzazione del compilatore tramite yield | Non possibile (stack è opaco)   | Possibile (inline, HALO)              |

Le `coroutine PHP` sono coroutine **stackful** basate su `Boost.Context fcontext_t`.

### Compromesso Architetturale

`TrueAsync` sceglie il modello **stackful single-threaded**:

- **Stackful** -- perché l'ecosistema `PHP` è enorme, e "colorare" milioni di righe
  di codice esistente con `async` è costoso. Le coroutine stackful permettono l'uso di funzioni C regolari, che è un requisito critico per PHP.
- **Single-threaded** -- PHP è storicamente single-threaded (nessuno stato mutabile condiviso),
  e questa proprietà è più facile da preservare che affrontarne le conseguenze.
  I thread appaiono solo nel `ThreadPool` per compiti `CPU-bound`.

Poiché `TrueAsync` attualmente riutilizza l'`API Fiber` di basso livello,
il costo del cambio di contesto è relativamente alto e potrebbe essere migliorato in futuro.

## Graceful Shutdown

Uno script `PHP` può terminare in qualsiasi momento: un'eccezione non gestita, `exit()`,
un segnale del SO. Ma nel mondo asincrono, decine di coroutine possono mantenere connessioni aperte,
buffer non scritti e transazioni non committate.

`TrueAsync` gestisce questo attraverso uno spegnimento controllato:

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- imposta il flag
2. Tutte le coroutine ricevono una `CancellationException`
3. Le coroutine hanno l'opportunità di eseguire i blocchi `finally` -- chiudere connessioni, svuotare buffer
4. `finally_shutdown()` -- pulizia finale delle coroutine e microtask rimanenti
5. Il Reactor si ferma

```c
#define TRY_HANDLE_EXCEPTION() \
    if (UNEXPECTED(EG(exception) != NULL)) { \
        if (ZEND_ASYNC_GRACEFUL_SHUTDOWN) { \
            finally_shutdown(); \
            break; \
        } \
        start_graceful_shutdown(); \
    }
```
