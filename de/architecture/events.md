---
layout: architecture
lang: de
path_key: "/architecture/events.html"
nav_active: architecture
permalink: /de/architecture/events.html
page_title: "Events und das Event-Modell"
description: "Die Basisstruktur zend_async_event_t -- Grundlage aller asynchronen Operationen, Callback-System, Flags, Event-Hierarchie."
---

# Events und das Event-Modell

Ein Event (`zend_async_event_t`) ist eine universelle Struktur,
von der **alle** asynchronen Primitive erben:
Koroutinen, `Future`, Channels, Timer, `Poll`-Events, Signale und andere.

Die einheitliche Event-Schnittstelle ermoeglicht:
- Abonnieren jedes Events ueber Callback
- Kombinieren heterogener Events in einem einzigen Wait
- Verwaltung des Lebenszyklus durch Ref-Counting

## Basisstruktur

```c
struct _zend_async_event_s {
    uint32_t flags;
    uint32_t extra_offset;           // Offset zu zusaetzlichen Daten

    union {
        uint32_t ref_count;          // Fuer C-Objekte
        uint32_t zend_object_offset; // Fuer Zend-Objekte
    };

    uint32_t loop_ref_count;         // Event-Loop-Referenzzaehler

    zend_async_callbacks_vector_t callbacks;

    // Methoden
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

### Virtuelle Methoden eines Events

Jedes Event hat einen kleinen Satz virtueller Methoden.

| Methode          | Zweck                                              |
|------------------|----------------------------------------------------|
| `add_callback`   | Callback fuer das Event abonnieren                 |
| `del_callback`   | Callback abbestellen                               |
| `start`          | Event im Reactor aktivieren                        |
| `stop`           | Event deaktivieren                                 |
| `replay`         | Ergebnis erneut liefern (fuer Futures, Koroutinen) |
| `dispose`        | Ressourcen freigeben                               |
| `info`           | Textbeschreibung des Events (fuer Debugging)       |
| `notify_handler` | Hook, der vor der Benachrichtigung der Callbacks aufgerufen wird |

#### `add_callback`

Fuegt einen Callback zum dynamischen `callbacks`-Array des Events hinzu.
Ruft `zend_async_callbacks_push()` auf,
das den `ref_count` des Callbacks inkrementiert und den Zeiger zum Vektor hinzufuegt.

#### `del_callback`

Entfernt einen Callback aus dem Vektor (O(1) durch Tausch mit dem letzten Element)
und ruft `callback->dispose` auf.

Typisches Szenario: Bei einem `select`-Wait auf mehrere Events,
wenn eines ausgeloest wird, werden die anderen ueber `del_callback` abgemeldet.

#### `start`

Die Methoden `start` und `stop` sind fuer Events gedacht, die in die `EventLoop` eingefuegt werden koennen.
Daher implementieren nicht alle Primitive diese Methode.

Fuer EventLoop-Events inkrementiert `start` den `loop_ref_count`, was es dem Event
ermoeglicht, so lange in der EventLoop zu verbleiben, wie es von jemandem benoetigt wird.

| Typ                                            | Was `start` tut                                                          |
|------------------------------------------------|--------------------------------------------------------------------------|
| Koroutine, `Future`, `Channel`, `Pool`, `Scope` | Nichts                                                                  |
| Timer                                          | `uv_timer_start()` + inkrementiert `loop_ref_count` und `active_event_count` |
| Poll                                           | `uv_poll_start()` mit Event-Maske (READABLE/WRITABLE)                   |
| Signal                                         | Registriert das Event in der globalen Signaltabelle                      |
| IO                                             | Inkrementiert `loop_ref_count` -- libuv-Stream startet ueber read/write  |

#### `stop`

Die Spiegelmethode von `start`. Dekrementiert den `loop_ref_count` fuer EventLoop-Typ-Events.
Der letzte `stop`-Aufruf (wenn `loop_ref_count` 0 erreicht) stoppt tatsaechlich den `handle`.

#### `replay`

Ermoeglicht spaeten Abonnenten, das Ergebnis eines bereits abgeschlossenen Events zu erhalten.
Nur von Typen implementiert, die ein Ergebnis speichern.

| Typ          | Was `replay` zurueckgibt                         |
|--------------|--------------------------------------------------|
| **Koroutine** | `coroutine->result` und/oder `coroutine->exception` |
| **Future**   | `future->result` und/oder `future->exception`     |

Wenn ein `callback` angegeben wird, wird er synchron mit dem Ergebnis aufgerufen.
Wenn `result`/`exception` angegeben wird, werden Werte zu den Zeigern kopiert.
Ohne `replay` erzeugt das Warten auf ein geschlossenes Event eine Warnung.

#### `dispose`

Diese Methode versucht, das Event freizugeben, indem sein `ref_count` dekrementiert wird.
Wenn der Zaehler Null erreicht, wird die tatsaechliche Ressourcenfreigabe ausgeloest.

#### `info`

Ein menschenlesbarer String fuer Debugging und Protokollierung.

| Typ                  | Beispielstring                                                           |
|----------------------|--------------------------------------------------------------------------|
| **Koroutine**        | `"Coroutine 42 spawned at foo.php:10, suspended at bar.php:20 (myFunc)"` |
| **Scope**            | `"Scope #5 created at foo.php:10"`                                       |
| **Future**           | `"FutureState(completed)"` oder `"FutureState(pending)"`                 |
| **Iterator**         | `"iterator-completion"`                                                  |


#### `notify_handler`

Ein Hook, der die Benachrichtigung abfaengt, **bevor** Callbacks das Ergebnis erhalten.
Standardmaessig `NULL` fuer alle Events. Verwendet in `Async\Timeout`:

## Event-Lebenszyklus

![Event-Lebenszyklus](/diagrams/de/architecture-events/lifecycle.svg)

Ein Event durchlaeuft mehrere Zustaende:
- **Created** -- Speicher alloziert, `ref_count = 1`, Callbacks koennen abonniert werden
- **Active** -- in der `EventLoop` registriert (`start()`), inkrementiert `active_event_count`
- **Fired** -- `libuv` hat den Callback aufgerufen. Fuer periodische Events (Timer, Poll) -- Rueckkehr zu **Active**. Fuer einmalige Events (DNS, exec, Future) -- Uebergang zu **Closed**
- **Stopped** -- voruebergehend aus der `EventLoop` entfernt (`stop()`), kann reaktiviert werden
- **Closed** -- `flags |= F_CLOSED`, Abonnement nicht moeglich, wenn `ref_count = 0` erreicht wird, wird `dispose` aufgerufen

## Interaktion: Event, Callback, Koroutine

![Event -> Callback -> Koroutine](/diagrams/de/architecture-events/callback-flow.svg)

## Doppelleben: C-Objekt und Zend-Objekt

Events leben oft gleichzeitig in zwei Welten.
Ein Timer, `Poll`-Handle oder `DNS`-Abfrage ist ein internes `C`-Objekt, das vom `Reactor` verwaltet wird.
Aber eine Koroutine oder `Future` ist auch ein `PHP`-Objekt, das vom Benutzercode zugaenglich ist.

C-Strukturen in der `EventLoop` koennen laenger leben als die `PHP`-Objekte, die auf sie verweisen, und umgekehrt.
C-Objekte verwenden `ref_count`, waehrend `PHP`-Objekte `GC_ADDREF/GC_DELREF`
mit dem Garbage Collector verwenden.

Daher unterstuetzt `TrueAsync` mehrere Arten von Bindungen zwischen PHP-Objekten und C-Objekten.

### C-Objekt

Interne Events, die vom PHP-Code unsichtbar sind, verwenden das `ref_count`-Feld.
Wenn der letzte Besitzer die Referenz freigibt, wird `dispose` aufgerufen:

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)    // ++ref_count
ZEND_ASYNC_EVENT_DEL_REF(ev)    // --ref_count
ZEND_ASYNC_EVENT_RELEASE(ev)    // DEL_REF + dispose bei Erreichen von 0
```

### Zend-Objekt

Eine Koroutine ist ein `PHP`-Objekt, das die `Awaitable`-Schnittstelle implementiert.
Anstelle von `ref_count` verwenden sie das `zend_object_offset`-Feld,
das auf den Offset der `zend_object`-Struktur zeigt.

Die `ZEND_ASYNC_EVENT_ADD_REF`/`ZEND_ASYNC_EVENT_RELEASE`-Makros funktionieren in allen Faellen korrekt.

```c
ZEND_ASYNC_EVENT_ADD_REF(ev)
    -> is_zend_obj ? GC_ADDREF(obj) : ++ref_count

ZEND_ASYNC_EVENT_RELEASE(ev)
    -> is_zend_obj ? OBJ_RELEASE(obj) : dispose(ev)
```

Das `zend_object` ist Teil der C-Struktur des Events
und kann ueber `ZEND_ASYNC_EVENT_TO_OBJECT`/`ZEND_ASYNC_OBJECT_TO_EVENT` wiederhergestellt werden.

```c
// Event aus PHP-Objekt abrufen (unter Beruecksichtigung der Event-Referenz)
zend_async_event_t *ev = ZEND_ASYNC_OBJECT_TO_EVENT(obj);

// PHP-Objekt aus Event abrufen
zend_object *obj = ZEND_ASYNC_EVENT_TO_OBJECT(ev);
```

## Event-Referenz

Einige Events stehen vor einem architektonischen Problem: Sie koennen nicht direkt `Zend`-Objekte sein.

Zum Beispiel ein Timer. `PHP GC` kann jederzeit entscheiden, das Objekt zu sammeln, aber `libuv` erfordert
ein asynchrones Schliessen des Handles ueber `uv_close()` mit einem Callback. Wenn `GC` den Destruktor aufruft,
waehrend `libuv` noch nicht mit dem Handle fertig ist, erhalten wir `use-after-free`.

In diesem Fall wird der **Event-Referenz**-Ansatz verwendet: Das `PHP`-Objekt speichert nicht das Event selbst, sondern einen Zeiger darauf:

```c
typedef struct {
    uint32_t flags;               // = ZEND_ASYNC_EVENT_REFERENCE_PREFIX
    uint32_t zend_object_offset;
    zend_async_event_t *event;    // Zeiger auf das tatsaechliche Event
} zend_async_event_ref_t;
```

Mit diesem Ansatz sind die Lebenszeiten des `PHP`-Objekts und des C-Events **unabhaengig**.
Das `PHP`-Objekt kann vom `GC` gesammelt werden, ohne den `handle` zu beeinflussen,
und der `handle` wird asynchron geschlossen, wenn er bereit ist.

Das `ZEND_ASYNC_OBJECT_TO_EVENT()`-Makro erkennt automatisch eine Referenz
anhand des `flags`-Praefix und folgt dem Zeiger.

## Callback-System

Das Abonnieren von Events ist der primaere Mechanismus der Interaktion zwischen Koroutinen und der Aussenwelt.
Wenn eine Koroutine auf einen Timer, Daten von einem Socket oder den Abschluss einer anderen Koroutine warten moechte,
registriert sie einen `Callback` beim entsprechenden Event.

Jedes Event speichert ein dynamisches Array von Abonnenten:

```c
typedef struct {
    uint32_t length;
    uint32_t capacity;
    zend_async_event_callback_t **data;

    // Zeiger auf den aktiven Iterator-Index (oder NULL)
    uint32_t *current_iterator;
} zend_async_callbacks_vector_t;
```

`current_iterator` loest das Problem des sicheren Entfernens von Callbacks waehrend der Iteration.

### Callback-Struktur

```c
struct _zend_async_event_callback_s {
    uint32_t ref_count;
    zend_async_event_callback_fn callback;
    zend_async_event_callback_dispose_fn dispose;
};
```

Ein Callback ist ebenfalls eine ref-counted Struktur. Dies ist notwendig, da ein einzelner `Callback`
gleichzeitig sowohl vom Vektor des Events als auch vom `Waker` der Koroutine referenziert werden kann.
`ref_count` stellt sicher, dass der Speicher erst freigegeben wird, wenn beide Seiten ihre Referenz freigeben.

### Koroutinen-Callback

Die meisten Callbacks in `TrueAsync` werden verwendet, um eine Koroutine aufzuwecken.
Daher speichern sie Informationen ueber die Koroutine und das Event, bei dem sie sich angemeldet haben:

```c
struct _zend_coroutine_event_callback_s {
    zend_async_event_callback_t base;    // Vererbung
    zend_coroutine_t *coroutine;         // Wen aufwecken
    zend_async_event_t *event;           // Woher es kam
};
```

Diese Bindung ist die Grundlage fuer den [Waker](/de/architecture/waker.html)-Mechanismus:

## Event-Flags

Bitflags im `flags`-Feld steuern das Verhalten des Events in jeder Phase seines Lebenszyklus:

| Flag                  | Zweck                                                                            |
|-----------------------|----------------------------------------------------------------------------------|
| `F_CLOSED`            | Event ist abgeschlossen. `start`/`stop` funktionieren nicht mehr, Abonnement nicht moeglich |
| `F_RESULT_USED`       | Jemand wartet auf das Ergebnis -- keine Warnung wegen ungenutztem Ergebnis noetig |
| `F_EXC_CAUGHT`        | Der Fehler wird abgefangen -- Warnung wegen unbehandelter Ausnahme unterdruecken |
| `F_ZVAL_RESULT`       | Das Ergebnis im Callback ist ein Zeiger auf `zval` (nicht `void*`)               |
| `F_ZEND_OBJ`          | Das Event ist ein `Zend`-Objekt -- schaltet `ref_count` auf `GC_ADDREF` um       |
| `F_NO_FREE_MEMORY`    | `dispose` soll keinen Speicher freigeben (Objekt wurde nicht ueber `emalloc` alloziert) |
| `F_EXCEPTION_HANDLED` | Ausnahme wurde behandelt -- kein erneutes Werfen noetig                          |
| `F_REFERENCE`         | Die Struktur ist eine `Event-Referenz`, kein tatsaechliches Event                |
| `F_OBJ_REF`           | Bei `extra_offset` befindet sich ein Zeiger auf `zend_object`                    |
| `F_CLOSE_FD`          | Dateideskriptor bei Zerstoerung schliessen                                       |
| `F_HIDDEN`            | Verstecktes Event -- nimmt nicht an `Deadlock Detection` teil                     |

### Deadlock-Erkennung

`TrueAsync` verfolgt die Anzahl aktiver Events in der `EventLoop` ueber `active_event_count`.
Wenn alle Koroutinen suspendiert sind und keine aktiven Events vorhanden sind -- ist dies ein `Deadlock`:
Kein Event kann irgendeine Koroutine aufwecken.

Aber einige Events sind immer in der `EventLoop` vorhanden und haben nichts mit der Benutzerlogik zu tun:
Hintergrund-`Healthcheck`-Timer, System-Handler. Wenn sie als "aktiv" gezaehlt werden,
wird die `Deadlock-Erkennung` nie ausgeloest.

Fuer solche Events wird das `F_HIDDEN`-Flag verwendet:

```c
ZEND_ASYNC_EVENT_SET_HIDDEN(ev)     // Als versteckt markieren
ZEND_ASYNC_INCREASE_EVENT_COUNT(ev) // +1, aber nur wenn NICHT versteckt
ZEND_ASYNC_DECREASE_EVENT_COUNT(ev) // -1, aber nur wenn NICHT versteckt
```

## Event-Hierarchie

In `C` gibt es keine Klassenvererbung, aber es gibt eine Technik: Wenn das erste Feld einer Struktur
`zend_async_event_t` ist, kann ein Zeiger auf die Struktur sicher
zu einem Zeiger auf `zend_async_event_t` gecastet werden. Genau so "erben" alle spezialisierten Events
von der Basis:

```
zend_async_event_t
|-- zend_async_poll_event_t      -- fd/Socket-Polling
|   \-- zend_async_poll_proxy_t  -- Proxy fuer Event-Filterung
|-- zend_async_timer_event_t     -- Timer (einmalig und periodisch)
|-- zend_async_signal_event_t    -- POSIX-Signale
|-- zend_async_process_event_t   -- Warten auf Prozessbeendigung
|-- zend_async_thread_event_t    -- Hintergrund-Threads
|-- zend_async_filesystem_event_t -- Dateisystemaenderungen
|-- zend_async_dns_nameinfo_t    -- Reverse-DNS
|-- zend_async_dns_addrinfo_t    -- DNS-Aufloesung
|-- zend_async_exec_event_t      -- exec/system/passthru/shell_exec
|-- zend_async_listen_event_t    -- TCP-Server-Socket
|-- zend_async_trigger_event_t   -- Manuelles Aufwecken (thread-sicher)
|-- zend_async_task_t            -- Thread-Pool-Aufgabe
|-- zend_async_io_t              -- Einheitliches I/O
|-- zend_coroutine_t             -- Koroutine
|-- zend_future_t                -- Future
|-- zend_async_channel_t         -- Channel
|-- zend_async_group_t           -- Aufgabengruppe
|-- zend_async_pool_t            -- Ressourcenpool
\-- zend_async_scope_t           -- Scope
```

Dank dessen kann ein `Waker` sich bei **jedem** dieser Events
mit demselben `event->add_callback`-Aufruf anmelden, ohne den spezifischen Typ zu kennen.

### Beispiele fuer spezialisierte Strukturen

Jede Struktur fuegt zum Basis-Event nur die Felder hinzu,
die fuer ihren Typ spezifisch sind:

**Timer** -- minimale Erweiterung:
```c
struct _zend_async_timer_event_s {
    zend_async_event_t base;
    unsigned int timeout;    // Millisekunden
    bool is_periodic;
};
```

**Poll** -- I/O-Ueberwachung auf einem Deskriptor:
```c
struct _zend_async_poll_event_s {
    zend_async_event_t base;
    bool is_socket;
    union { zend_file_descriptor_t file; zend_socket_t socket; };
    async_poll_event events;           // Was ueberwacht werden soll: READABLE|WRITABLE|...
    async_poll_event triggered_events; // Was tatsaechlich passiert ist
};
```

**Filesystem** -- Dateisystemueberwachung:
```c
struct _zend_async_filesystem_event_s {
    zend_async_event_t base;
    zend_string *path;
    unsigned int flags;                // ZEND_ASYNC_FS_EVENT_RECURSIVE
    unsigned int triggered_events;     // RENAME | CHANGE
    zend_string *triggered_filename;   // Welche Datei sich geaendert hat
};
```

**Exec** -- Ausfuehrung externer Befehle:
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

Stellen Sie sich eine Situation vor: Zwei Koroutinen auf einem einzigen TCP-Socket -- eine liest, die andere schreibt.
Sie benoetigen verschiedene Events (`READABLE` vs `WRITABLE`), aber der Socket ist einer.

`Poll Proxy` loest dieses Problem. Anstatt zwei `uv_poll_t`-Handles
fuer denselben fd zu erstellen (was in `libuv` unmoeglich ist), wird ein einzelnes `poll_event` erstellt
zusammen mit mehreren Proxies mit unterschiedlichen Masken:

```c
struct _zend_async_poll_proxy_s {
    zend_async_event_t base;
    zend_async_poll_event_t *poll_event;  // Eltern-Poll
    async_poll_event events;               // Event-Teilmenge fuer diesen Proxy
    async_poll_event triggered_events;     // Was ausgeloest wurde
};
```

Der `Reactor` aggregiert Masken von allen aktiven Proxies und uebergibt die kombinierte Maske an `uv_poll_start`.
Wenn `libuv` ein Event meldet, prueft der `Reactor` jeden Proxy
und benachrichtigt nur diejenigen, deren Maske uebereinstimmte.

## Async IO

Fuer Stream-I/O-Operationen (Lesen aus einer Datei, Schreiben in einen Socket, Arbeiten mit Pipes)
bietet `TrueAsync` ein einheitliches `Handle`:

```c
struct _zend_async_io_s {
    zend_async_event_t event;
    union {
        zend_file_descriptor_t fd;   // Fuer PIPE/FILE
        zend_socket_t socket;        // Fuer TCP/UDP
    } descriptor;
    zend_async_io_type type;         // PIPE, FILE, TCP, UDP, TTY
    uint32_t state;                  // READABLE | WRITABLE | CLOSED | EOF | APPEND
};
```

Dieselbe `ZEND_ASYNC_IO_READ/WRITE/CLOSE`-Schnittstelle funktioniert mit jedem Typ,
und die spezifische Implementierung wird bei der Erstellung des `Handle` basierend auf `type` ausgewaehlt.

Alle I/O-Operationen sind asynchron und geben ein `zend_async_io_req_t` zurueck -- eine einmalige Anfrage:

```c
struct _zend_async_io_req_s {
    union { ssize_t result; ssize_t transferred; };
    zend_object *exception;    // Operationsfehler (oder NULL)
    char *buf;                 // Datenpuffer
    bool completed;            // Operation abgeschlossen?
    void (*dispose)(zend_async_io_req_t *req);
};
```

Eine Koroutine ruft `ZEND_ASYNC_IO_READ` auf, erhaelt ein `req`,
abonniert dessen Abschluss ueber den `Waker` und geht schlafen.
Wenn `libuv` die Operation abschliesst, wird `req->completed` zu `true`,
der Callback weckt die Koroutine auf, und sie holt Daten aus `req->buf`.
