---
layout: architecture
lang: it
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /it/architecture/frankenphp.html
page_title: "Integrazione FrankenPHP"
description: "Come TrueAsync trasforma FrankenPHP in un server completamente asincrono -- una coroutine per richiesta, risposte zero-copy, doppio percorso di notifica."
---

# TrueAsync + FrankenPHP: Molte Richieste, Un Thread

In questo articolo, esaminiamo l'esperienza dell'integrazione di `FrankenPHP` con `TrueAsync`.
`FrankenPHP` è un server basato su `Caddy` che esegue codice `PHP` all'interno di un processo `Go`.
Abbiamo aggiunto il supporto `TrueAsync` a `FrankenPHP`, permettendo a ogni thread `PHP` di gestire più richieste contemporaneamente,
utilizzando le coroutine `TrueAsync` per l'orchestrazione.

## Come Funziona FrankenPHP

`FrankenPHP` è un processo che unisce il mondo `Go` (`Caddy`) e `PHP` insieme.
`Go` possiede il processo, mentre `PHP` agisce come un "plugin" con cui `Go` interagisce attraverso `SAPI`.
Per far funzionare questo, la macchina virtuale `PHP` viene eseguita in un thread separato. `Go` crea questi thread
e chiama le funzioni `SAPI` per eseguire il codice `PHP`.

Per ogni richiesta, `Caddy` crea una goroutine separata che gestisce la richiesta HTTP.
La goroutine seleziona un thread `PHP` libero dal pool e invia i dati della richiesta tramite un canale,
poi entra in uno stato di attesa.

Quando `PHP` finisce di formare la risposta, la goroutine la riceve tramite il canale e la passa a `Caddy`.

Abbiamo cambiato questo approccio in modo che le goroutine ora inviano più richieste allo stesso thread `PHP`,
e il thread `PHP` impara a gestire tali richieste in modo asincrono.

### Architettura Generale

![Architettura Generale FrankenPHP + TrueAsync](/diagrams/it/architecture-frankenphp/architecture.svg)

Il diagramma mostra tre livelli. Esaminiamoli uno per uno.

### Integrare Go nello Scheduler di TrueAsync

Affinché l'applicazione funzioni, il `Reactor` e lo `Scheduler` di PHP devono essere integrati con `Caddy`.
Pertanto, abbiamo bisogno di un meccanismo di comunicazione tra thread che sia compatibile
con entrambi i mondi `Go` e `PHP`. I canali `Go` sono eccellenti per il trasferimento dati tra thread
e sono accessibili da `C-Go`. Ma non sono sufficienti, poiché il ciclo dell'`EventLoop` potrebbe addormentarsi.

Esiste un vecchio approccio ben noto
che si trova in quasi tutti i web server: una combinazione di un canale di trasferimento
e un `fdevent` (su macOS/Windows si usa una `pipe`).

Se il canale non è vuoto, `PHP` lo starà leggendo, quindi aggiungiamo semplicemente un altro valore.
Se il canale è vuoto, il thread `PHP` sta dormendo e deve essere svegliato. A questo serve `Notify()`.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- l'opzione più veloce
        // ...
    }
    // Fallback: pipe per macOS/BSD
    syscall.Pipe(fds[:])
}
```

Sul lato `PHP`, il descrittore `eventfd` viene registrato nel `Reactor`:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

Il `Reactor` (basato su `libuv`) inizia a monitorare il descrittore. Non appena `Go` scrive
su `eventfd`, il `Reactor` si sveglia e chiama il callback di gestione delle richieste.

Ora, quando una goroutine impacchetta i dati della richiesta
in una struttura `contextHolder` e li passa al `Dispatcher` per la consegna al thread `PHP`.
Il `Dispatcher` cicla attraverso i thread `PHP` in round-robin
e tenta di inviare il contesto della richiesta al
canale `Go` bufferizzato (`requestChan`) legato a un thread specifico.
Se il buffer è pieno, il `Dispatcher` prova il thread successivo.
Se tutti sono occupati -- il client riceve `HTTP 503`.

```go
start := w.rrIndex.Add(1) % uint32(len(w.threads))
for i := 0; i < len(w.threads); i++ {
    idx := (start + uint32(i)) % uint32(len(w.threads))
    select {
    case thread.requestChan <- ch:
        if len(thread.requestChan) == 1 {
            thread.asyncNotifier.Notify()
        }
        return nil
    default:
        continue
    }
}
return ErrAllBuffersFull // HTTP 503
```

### Integrazione con lo Scheduler

Quando `FrankenPHP` si inizializza e crea i thread `PHP`,
si integra con il `Reactor`/`Scheduler` utilizzando la `True Async ABI` (`zend_async_API.h`).

La funzione `frankenphp_enter_async_mode()` è responsabile di questo processo e viene chiamata una volta
quando lo script `PHP` registra un callback tramite `HttpServer::onRequest()`:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Ottieni l'FD del notificatore da Go
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. Registra l'FD nel Reactor (percorso lento)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Avvia lo Scheduler
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Sostituisci l'handler dell'heartbeat (percorso veloce)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Sospendi la coroutine principale
    frankenphp_suspend_main_coroutine();

    // --- arriviamo qui solo allo shutdown ---

    // 6. Ripristina l'handler dell'heartbeat
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Rilascia le risorse
    close_request_event();
}
```

Utilizziamo un `heartbeat handler`, un callback speciale dello `Scheduler`, per aggiungere il nostro handler
per ogni tick dello `Scheduler`. Questo handler consente a `FrankenPHP` di creare nuove
coroutine per l'elaborazione delle richieste.

![Sistema di Doppia Notifica](/diagrams/it/architecture-frankenphp/notification.svg)

Ora lo `Scheduler` chiama l'`heartbeat handler` ad ogni tick. Questo handler
controlla il canale `Go` tramite `CGo`:

```c
void frankenphp_scheudler_tick_handler(void) {
    uint64_t request_id;
    while ((request_id = go_async_worker_check_requests(thread_index)) != 0) {
        if (request_id == UINT64_MAX) {
            ZEND_ASYNC_SHUTDOWN();
            return;
        }
        frankenphp_handle_request_async(request_id);
    }
    if (old_heartbeat_handler) old_heartbeat_handler();
}
```

Nessuna system call, nessun `epoll_wait`, una chiamata diretta a una funzione `Go` tramite `CGo`.
Ritorno istantaneo se il canale è vuoto.
L'operazione più economica possibile, che è un requisito obbligatorio per l'`heartbeat handler`.

Se tutte le coroutine sono addormentate, lo `Scheduler` passa il controllo al `Reactor`,
e l'`heartbeat` smette di scattare. Allora entra in gioco l'`AsyncNotifier`:
il `Reactor` attende su `epoll`/`kqueue` e si sveglia quando `Go` scrive sul descrittore.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

I due sistemi si completano a vicenda: l'`heartbeat` fornisce latenza minima sotto carico,
mentre il `poll event` garantisce zero consumo di `CPU` durante i periodi di inattività.

### Creazione della Coroutine di Richiesta

La funzione `frankenphp_request_coroutine_entry()` è responsabile della creazione della coroutine di gestione delle richieste:

![Ciclo di Vita della Richiesta](/diagrams/it/architecture-frankenphp/request-lifecycle.svg)

```c
void frankenphp_handle_request_async(uint64_t request_id) {
    zend_async_scope_t *request_scope =
        ZEND_ASYNC_NEW_SCOPE(ZEND_ASYNC_CURRENT_SCOPE);

    zend_coroutine_t *coroutine =
        ZEND_ASYNC_NEW_COROUTINE(request_scope);

    coroutine->internal_entry = frankenphp_request_coroutine_entry;
    coroutine->extended_data = (void *)(uintptr_t)request_id;

    ZEND_ASYNC_ENQUEUE_COROUTINE(coroutine);
}
```

Viene creato uno **`Scope` separato** per ogni richiesta. Questo è un contesto isolato
che consente di controllare il ciclo di vita della coroutine e delle sue risorse.
Quando uno `Scope` si completa, tutte le coroutine al suo interno vengono cancellate.

### Interazione con il Codice PHP

Per creare coroutine, `FrankenPHP` deve conoscere la funzione handler.
La funzione handler deve essere definita dal programmatore PHP.
Questo richiede del codice di inizializzazione sul lato `PHP`. La funzione `HttpServer::onRequest()`
serve come questo inizializzatore, registrando un callback `PHP` per la gestione delle richieste `HTTP`.

Dal lato `PHP`, tutto appare semplice:

```php
use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response) {
    $uri = $request->getUri();
    $body = $request->getBody();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['uri' => $uri]));
    $response->end();
});
```

L'inizializzazione avviene nella coroutine principale.
Il programmatore deve creare un oggetto `HttpServer`, chiamare `onRequest()` e "avviare" esplicitamente il server.
Dopo di che, `FrankenPHP` prende il controllo e blocca la coroutine principale fino allo shutdown del server.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // sempre false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Per inviare i risultati a `Caddy`, il codice `PHP` utilizza l'oggetto `Response`,
che fornisce i metodi `write()` e `end()`.
Internamente, la memoria viene copiata e i risultati vengono inviati al canale.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Codice Sorgente

Il repository dell'integrazione è un fork di `FrankenPHP` con il branch `true-async`:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- repository dell'integrazione

File chiave:

| File                                                                                                        | Descrizione                                                                 |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Integrazione con `Scheduler`/`Reactor`: heartbeat, poll event, creazione coroutine |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | Classi PHP `HttpServer`, `Request`, `Response`                               |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Lato Go: `round-robin`, `requestChan`, `responseChan`, esportazioni `CGo`   |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Documentazione dell'integrazione                                             |

ABI TrueAsync utilizzata dall'integrazione:

| File                                                                                                     | Descrizione                                       |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | Definizione API: macro, puntatori a funzione, tipi |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | Infrastruttura: registrazione, implementazioni stub |
