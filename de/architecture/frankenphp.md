---
layout: architecture
lang: de
path_key: "/architecture/frankenphp.html"
nav_active: architecture
permalink: /de/architecture/frankenphp.html
page_title: "FrankenPHP-Integration"
description: "Wie TrueAsync FrankenPHP in einen vollstaendig asynchronen Server verwandelt -- eine Koroutine pro Anfrage, Zero-Copy-Antworten, dualer Benachrichtigungspfad."
---

# TrueAsync + FrankenPHP: Viele Anfragen, ein Thread

In diesem Artikel untersuchen wir die Erfahrung der Integration von `FrankenPHP` mit `TrueAsync`.
`FrankenPHP` ist ein Server basierend auf `Caddy`, der `PHP`-Code innerhalb eines `Go`-Prozesses ausfuehrt.
Wir haben `TrueAsync`-Unterstuetzung zu `FrankenPHP` hinzugefuegt, sodass jeder `PHP`-Thread mehrere Anfragen gleichzeitig bearbeiten kann,
wobei `TrueAsync`-Koroutinen fuer die Orchestrierung verwendet werden.

## Wie FrankenPHP funktioniert

`FrankenPHP` ist ein Prozess, der die `Go`-Welt (`Caddy`) und `PHP` buendelt.
`Go` besitzt den Prozess, waehrend `PHP` als "Plugin" fungiert, mit dem `Go` ueber `SAPI` interagiert.
Damit dies funktioniert, laeuft die `PHP`-Virtual-Machine in einem separaten Thread. `Go` erstellt diese Threads
und ruft `SAPI`-Funktionen auf, um `PHP`-Code auszufuehren.

Fuer jede Anfrage erstellt `Caddy` eine separate Goroutine, die die HTTP-Anfrage bearbeitet.
Die Goroutine waehlt einen freien `PHP`-Thread aus dem Pool und sendet die Anfragedaten ueber einen Channel,
dann geht sie in einen Wartezustand.

Wenn `PHP` die Antwort fertig gebildet hat, empfaengt die Goroutine sie ueber den Channel und gibt sie an `Caddy` zurueck.

Wir haben diesen Ansatz geaendert, sodass Goroutines jetzt mehrere Anfragen an denselben `PHP`-Thread senden,
und der `PHP`-Thread lernt, solche Anfragen asynchron zu bearbeiten.

### Allgemeine Architektur

![Allgemeine FrankenPHP + TrueAsync Architektur](/diagrams/de/architecture-frankenphp/architecture.svg)

Das Diagramm zeigt drei Schichten. Untersuchen wir jede einzelne.

### Integration von Go in den TrueAsync-Scheduler

Damit die Anwendung funktioniert, muessen der PHP-`Reactor` und der `Scheduler` mit `Caddy` integriert werden.
Daher benoetigen wir einen threaduebergreifenden Kommunikationsmechanismus, der sowohl
mit der `Go`- als auch der `PHP`-Welt kompatibel ist. `Go`-Channels eignen sich hervorragend fuer den Datentransfer zwischen Threads
und sind ueber `C-Go` zugaenglich. Aber sie reichen nicht aus, da der `EventLoop`-Zyklus einschlafen kann.

Es gibt einen alten, bekannten Ansatz,
der in fast jedem Webserver zu finden ist: eine Kombination aus einem Transfer-Channel
und einem `fdevent` (unter macOS/Windows wird eine `Pipe` verwendet).

Wenn der Channel nicht leer ist, wird `PHP` daraus lesen, also fuegen wir einfach einen weiteren Wert hinzu.
Wenn der Channel leer ist, schlaeft der `PHP`-Thread und muss geweckt werden. Dafuer ist `Notify()` da.

```go
func NewAsyncNotifier() (*AsyncNotifier, error) {
    if runtime.GOOS == "linux" {
        fd, err := createEventFD()  // eventfd -- die schnellste Option
        // ...
    }
    // Fallback: Pipe fuer macOS/BSD
    syscall.Pipe(fds[:])
}
```

Auf der `PHP`-Seite wird der `eventfd`-Deskriptor im `Reactor` registriert:

```c
request_event = ZEND_ASYNC_NEW_POLL_EVENT_EX(
    (zend_file_descriptor_t) notifier_fd,
    0, ASYNC_READABLE, sizeof(uintptr_t)
);
request_event->base.start(&request_event->base);
```

Der `Reactor` (basierend auf `libuv`) beginnt den Deskriptor zu ueberwachen. Sobald `Go`
in `eventfd` schreibt, wacht der `Reactor` auf und ruft den Callback fuer die Anfragebearbeitung auf.

Wenn eine Goroutine Anfragedaten
in eine `contextHolder`-Struktur verpackt und sie an den `Dispatcher` zur Zustellung an den `PHP`-Thread uebergibt.
Der `Dispatcher` durchlaeuft `PHP`-Threads im Round-Robin-Verfahren
und versucht, den Anfragekontext an den
gepufferten `Go`-Channel (`requestChan`) zu senden, der an einen bestimmten Thread gebunden ist.
Wenn der Puffer voll ist, versucht der `Dispatcher` den naechsten Thread.
Wenn alle beschaeftigt sind -- erhaelt der Client `HTTP 503`.

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

### Integration mit dem Scheduler

Wenn `FrankenPHP` initialisiert und `PHP`-Threads erstellt,
integriert es sich mit dem `Reactor`/`Scheduler` ueber das `True Async ABI` (`zend_async_API.h`).

Die Funktion `frankenphp_enter_async_mode()` ist fuer diesen Prozess verantwortlich und wird einmal aufgerufen,
wenn das `PHP`-Skript einen Callback ueber `HttpServer::onRequest()` registriert:

```c
void frankenphp_enter_async_mode(void)
{
    // 1. Notifier-FD von Go abrufen
    notifier_fd = go_async_worker_get_notification_fd(thread_index);

    // 2. FD im Reactor registrieren (langsamer Pfad)
    frankenphp_register_request_notifier(notifier_fd, thread_index);

    // 3. Scheduler starten
    ZEND_ASYNC_SCHEDULER_LAUNCH();

    // 4. Heartbeat-Handler ersetzen (schneller Pfad)
    old_heartbeat_handler = zend_async_set_heartbeat_handler(
        frankenphp_scheudler_tick_handler
    );

    // 5. Hauptkoroutine suspendieren
    frankenphp_suspend_main_coroutine();

    // --- hierhin gelangen wir nur beim Herunterfahren ---

    // 6. Heartbeat-Handler wiederherstellen
    zend_async_set_heartbeat_handler(old_heartbeat_handler);

    // 7. Ressourcen freigeben
    close_request_event();
}
```

Wir verwenden einen `Heartbeat-Handler`, einen speziellen Callback vom `Scheduler`, um unseren eigenen Handler
fuer jeden `Scheduler`-Tick hinzuzufuegen. Dieser Handler ermoeglicht es `FrankenPHP`, neue
Koroutinen fuer die Anfragebearbeitung zu erstellen.

![Duales Benachrichtigungssystem](/diagrams/de/architecture-frankenphp/notification.svg)

Jetzt ruft der `Scheduler` den `Heartbeat-Handler` bei jedem Tick auf. Dieser Handler
prueft den `Go`-Channel ueber `CGo`:

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

Keine Systemaufrufe, kein `epoll_wait`, ein direkter Aufruf einer `Go`-Funktion ueber `CGo`.
Sofortige Rueckkehr, wenn der Channel leer ist.
Die guenstigstmoegliche Operation, was eine zwingende Anforderung fuer den `Heartbeat-Handler` ist.

Wenn alle Koroutinen schlafen, uebergibt der `Scheduler` die Kontrolle an den `Reactor`,
und der `Heartbeat` hoert auf zu ticken. Dann greift der `AsyncNotifier` ein:
Der `Reactor` wartet auf `epoll`/`kqueue` und wacht auf, wenn `Go` in den Deskriptor schreibt.

```c
static void frankenphp_async_check_requests_callback(
    zend_async_event_t *event, ...) {
    go_async_worker_clear_notification(thread_idx);
    while ((request_id = go_async_worker_check_requests(thread_idx)) != 0) {
        frankenphp_handle_request_async(request_id);
    }
}
```

Die beiden Systeme ergaenzen sich: `Heartbeat` bietet minimale Latenz unter Last,
waehrend das `Poll-Event` null `CPU`-Verbrauch in Leerlaufzeiten sicherstellt.

### Erstellen einer Anfrage-Koroutine

Die Funktion `frankenphp_request_coroutine_entry()` ist fuer die Erstellung der Koroutine zur Anfragebearbeitung verantwortlich:

![Anfrage-Lebenszyklus](/diagrams/de/architecture-frankenphp/request-lifecycle.svg)

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

Fuer jede Anfrage wird ein **separater `Scope`** erstellt. Dies ist ein isolierter Kontext,
der die Steuerung des Lebenszyklus der Koroutine und ihrer Ressourcen ermoeglicht.
Wenn ein `Scope` abgeschlossen wird, werden alle darin enthaltenen Koroutinen abgebrochen.

### Interaktion mit PHP-Code

Um Koroutinen zu erstellen, muss `FrankenPHP` die Handler-Funktion kennen.
Die Handler-Funktion muss vom PHP-Programmierer definiert werden.
Dies erfordert Initialisierungscode auf der `PHP`-Seite. Die Funktion `HttpServer::onRequest()`
dient als dieser Initialisierer und registriert einen `PHP`-Callback fuer die Bearbeitung von `HTTP`-Anfragen.

Von der `PHP`-Seite sieht alles einfach aus:

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

Die Initialisierung erfolgt in der Hauptkoroutine.
Der Programmierer muss ein `HttpServer`-Objekt erstellen, `onRequest()` aufrufen und den Server explizit "starten".
Danach uebernimmt `FrankenPHP` die Kontrolle und blockiert die Hauptkoroutine, bis der Server heruntergefahren wird.

```c
bool frankenphp_suspend_main_coroutine(void) {
    zend_async_event_t *event = ecalloc(1, sizeof(zend_async_event_t));
    event->start = frankenphp_server_wait_event_start;
    event->replay = frankenphp_server_wait_event_replay; // immer false

    zend_async_resume_when(coroutine, event, true, ...);
    ZEND_ASYNC_SUSPEND();
}
```

Um Ergebnisse an `Caddy` zurueckzusenden, verwendet `PHP`-Code das `Response`-Objekt,
das `write()`- und `end()`-Methoden bereitstellt.
Unter der Haube wird Speicher kopiert und Ergebnisse an den Channel gesendet.

```go
func go_async_response_write(...) {
    dataCopy := make([]byte, int(length))
    copy(dataCopy, unsafe.Slice((*byte)(data), int(length)))
    thread.responseChan <- responseWrite{requestID, dataCopy}
}
```

## Quellcode

Das Integrations-Repository ist ein Fork von `FrankenPHP` mit dem `true-async`-Branch:

- [**true-async/frankenphp**](https://github.com/true-async/frankenphp/tree/true-async) -- Integrations-Repository

Wichtige Dateien:

| Datei                                                                                                       | Beschreibung                                                                |
|-------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| [`frankenphp_trueasync.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_trueasync.c) | Integration mit `Scheduler`/`Reactor`: Heartbeat, Poll-Event, Koroutinen-Erstellung |
| [`frankenphp_extension.c`](https://github.com/true-async/frankenphp/blob/true-async/frankenphp_extension.c) | PHP-Klassen `HttpServer`, `Request`, `Response`                              |
| [`async_worker.go`](https://github.com/true-async/frankenphp/blob/true-async/async_worker.go)               | Go-Seite: `Round-Robin`, `requestChan`, `responseChan`, `CGo`-Exporte        |
| [`async_notifier.go`](https://github.com/true-async/frankenphp/blob/true-async/async_notifier.go)           | `AsyncNotifier`: `eventfd` (Linux) / `pipe` (macOS)                          |
| [`TRUE_ASYNC.README.md`](https://github.com/true-async/frankenphp/blob/true-async/TRUE_ASYNC.README.md)     | Integrationsdokumentation                                                    |

Von der Integration verwendetes TrueAsync ABI:

| Datei                                                                                                    | Beschreibung                                      |
|----------------------------------------------------------------------------------------------------------|---------------------------------------------------|
| [`Zend/zend_async_API.h`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.h) | API-Definition: Makros, Funktionszeiger, Typen    |
| [`Zend/zend_async_API.c`](https://github.com/true-async/php-src/blob/true-async/Zend/zend_async_API.c) | Infrastruktur: Registrierung, Stub-Implementierungen |
