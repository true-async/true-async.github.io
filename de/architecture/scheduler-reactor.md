---
layout: architecture
lang: de
path_key: "/architecture/scheduler-reactor.html"
nav_active: architecture
permalink: /de/architecture/scheduler-reactor.html
page_title: "Scheduler und Reactor"
description: "Internes Design des Coroutine-Schedulers und Event-Reactors -- Warteschlangen, Kontextwechsel, libuv, Fiber-Pool."
---

# Coroutinen, Scheduler und Reactor

`Scheduler` und `Reactor` sind die beiden Hauptkomponenten der Laufzeitumgebung.
Der `Scheduler` verwaltet die Coroutine-Warteschlange und den Kontextwechsel,
während der `Reactor` `I/O`-Events über den `Event loop` verarbeitet.

![Interaktion von Scheduler und Reactor](/diagrams/de/architecture-scheduler-reactor/architecture.svg)

## Scheduler

### Scheduler-Coroutine und Minimierung von Kontextwechseln

In vielen Coroutine-Implementierungen verwendet der `Scheduler` einen separaten Thread
oder zumindest einen separaten Ausführungskontext. Eine Coroutine ruft `yield` auf,
die Kontrolle geht an den `Scheduler`, der die nächste Coroutine auswählt und zu ihr wechselt.
Das ergibt **zwei** Kontextwechsel pro `suspend`/`resume`: Coroutine -> Scheduler -> Coroutine.

In `TrueAsync` hat der `Scheduler` **seine eigene Coroutine** (`ZEND_ASYNC_SCHEDULER`)
mit einem dedizierten Kontext. Wenn alle Benutzer-Coroutinen schlafen und die Warteschlange leer ist,
wird die Kontrolle an diese Coroutine übergeben, in der die Hauptschleife läuft: `Reactor-Tick`, `Microtasks`.

Da Coroutinen einen vollständigen Ausführungskontext (Stack + Register) verwenden,
dauert ein Kontextwechsel auf modernem `x86` etwa 10-20 ns.
Daher optimiert `TrueAsync` die Anzahl der Wechsel,
indem einige Operationen direkt im Kontext der aktuellen Coroutine ausgeführt werden können, ohne zum Scheduler zu wechseln.

Wenn eine Coroutine eine `SUSPEND()`-Operation aufruft, wird `scheduler_next_tick()` direkt im Kontext der aktuellen Coroutine aufgerufen --
eine Funktion, die einen Scheduler-Tick ausführt: Microtasks, Reactor, Warteschlangenprüfung.
Wenn eine bereite Coroutine in der Warteschlange ist, wechselt der `Scheduler` **direkt** zu ihr,
unter Umgehung seiner eigenen Coroutine. Das ist ein `Kontextwechsel` statt zwei.
Wenn außerdem die nächste Coroutine in der Warteschlange noch nicht gestartet wurde und die aktuelle bereits beendet ist,
ist kein Wechsel nötig -- die neue Coroutine erhält den aktuellen Kontext.

Der Wechsel zur `Scheduler`-Coroutine (über `switch_to_scheduler()`) erfolgt **nur**, wenn:
- Die Coroutine-Warteschlange leer ist und der Reactor auf Events warten muss
- Der Wechsel zu einer anderen Coroutine fehlgeschlagen ist
- Ein Deadlock erkannt wurde

### Hauptschleife

![Scheduler-Hauptschleife](/diagrams/de/architecture-scheduler-reactor/scheduler-loop.svg)

Bei jedem Tick führt der Scheduler Folgendes aus:

1. **Microtasks** -- Verarbeitung der `Microtasks`-Warteschlange (kleine Aufgaben ohne Kontextwechsel)
2. **Coroutine-Warteschlange** -- Entnahme der nächsten Coroutine aus der `coroutine_queue`
3. **Kontextwechsel** -- `zend_fiber_switch_context()` zur ausgewählten Coroutine
4. **Ergebnisverarbeitung** -- Überprüfung des Coroutine-Status nach der Rückkehr
5. **Reactor** -- wenn die Warteschlange leer ist, Aufruf von `ZEND_ASYNC_REACTOR_EXECUTE(no_wait)`

### Microtasks

Nicht jede Aktion verdient eine Coroutine. Manchmal muss zwischen Wechseln etwas Schnelles erledigt werden:
einen Zähler aktualisieren, eine Benachrichtigung senden, eine Ressource freigeben.
Dafür eine Coroutine zu erstellen ist übertrieben, dennoch muss die Aktion so schnell wie möglich ausgeführt werden.
Hier kommen Microtasks ins Spiel -- leichtgewichtige Handler, die direkt
im Kontext der aktuellen Coroutine ausgeführt werden, ohne Wechsel.

Microtasks müssen leichtgewichtige, schnelle Handler sein, da sie direkten Zugriff
auf die Schleife des Schedulers erhalten. In frühen Versionen von `TrueAsync` konnten Microtasks in PHP-Land residieren, aber
aufgrund strenger Regeln und Leistungsüberlegungen wurde entschieden, diesen Mechanismus
nur für C-Code beizubehalten.

```c
struct _zend_async_microtask_s {
    zend_async_microtask_handler_t handler;
    zend_async_microtask_handler_t dtor;
    bool is_cancelled;
    uint32_t ref_count;
};
```

In `TrueAsync` werden Microtasks über eine FIFO-Warteschlange vor jedem Coroutine-Wechsel verarbeitet.
Wenn ein Microtask eine Exception wirft, wird die Verarbeitung unterbrochen.
Nach der Ausführung wird der Microtask sofort aus der Warteschlange entfernt und sein aktiver Referenzzähler um eins dekrementiert.

Microtasks werden in Szenarien wie dem gleichzeitigen Iterator verwendet, der es ermöglicht, die Iteration
automatisch an eine andere Coroutine zu übertragen, wenn die vorherige in einen Wartezustand eingetreten ist.

### Coroutine-Prioritäten

Unter der Haube verwendet `TrueAsync` den einfachsten Warteschlangentyp: einen Ringpuffer. Das ist wahrscheinlich die beste Lösung
in Bezug auf das Gleichgewicht zwischen Einfachheit, Leistung und Funktionalität.

Es gibt keine Garantie, dass sich der Warteschlangenalgorithmus in Zukunft nicht ändern wird. Allerdings gibt es seltene Fälle,
in denen die Coroutine-Priorität eine Rolle spielt.

Derzeit werden zwei Prioritäten verwendet:

```c
typedef enum {
    ZEND_COROUTINE_NORMAL = 0,
    ZEND_COROUTINE_HI_PRIORITY = 255
} zend_coroutine_priority;
```

Hochprioritäre Coroutinen werden beim `enqueue` **am Kopf** der Warteschlange platziert.
Die Entnahme erfolgt immer vom Kopf. Kein komplexes Scheduling,
nur Einfügereihenfolge. Das ist ein bewusst einfacher Ansatz: Zwei Ebenen decken
reale Anforderungen ab, während komplexe Prioritätswarteschlangen (wie in `RTOS`) Overhead hinzufügen würden,
der im Kontext von PHP-Anwendungen nicht gerechtfertigt ist.

### Suspend und Resume

![Suspend- und Resume-Operationen](/diagrams/de/architecture-scheduler-reactor/suspend-resume.svg)

`Suspend`- und `Resume`-Operationen sind die Kernaufgaben des `Schedulers`.

Wenn eine Coroutine `suspend` aufruft, geschieht Folgendes:

1. Die `Waker`-Events der Coroutine werden gestartet (`start_waker_events`).
   Erst zu diesem Zeitpunkt beginnen Timer zu ticken und Poll-Objekte
   beginnen auf Deskriptoren zu lauschen. Vor dem Aufruf von `suspend` sind Events nicht aktiv --
   dies ermöglicht es, erst alle Abonnements vorzubereiten und dann mit einem einzigen Aufruf das Warten zu starten.
2. **Ohne Kontextwechsel** wird `scheduler_next_tick()` aufgerufen:
   - Microtasks werden verarbeitet
   - Ein `Reactor-Tick` wird ausgeführt (wenn genug Zeit vergangen ist)
   - Wenn eine bereite Coroutine in der Warteschlange ist, wechselt `execute_next_coroutine()` zu ihr
   - Wenn die Warteschlange leer ist, wechselt `switch_to_scheduler()` zur `Scheduler`-Coroutine
3. Wenn die Kontrolle zurückkehrt, wacht die Coroutine mit dem `Waker`-Objekt auf, das das `Suspend`-Ergebnis enthält.

**Schneller Rückgabepfad**: Wenn während `start_waker_events` ein Event bereits ausgelöst wurde
(z.B. ein `Future` ist bereits abgeschlossen), wird die Coroutine **überhaupt nicht suspendiert** --
das Ergebnis ist sofort verfügbar. Daher löst `await` auf ein abgeschlossenes
`Future` kein `suspend` aus und verursacht keinen Kontextwechsel, sondern gibt das Ergebnis direkt zurück.

## Kontext-Pool

Ein Kontext ist ein vollständiger `C-Stack` (standardmäßig `EG(fiber_stack_size)`).
Da die Stack-Erstellung eine aufwendige Operation ist, strebt `TrueAsync` an, die Speicherverwaltung zu optimieren.
Wir berücksichtigen das Speichernutzungsmuster: Coroutinen sterben und werden ständig erstellt.
Das Pool-Pattern ist ideal für dieses Szenario!

```c
struct _async_fiber_context_s {
    zend_fiber_context context;     // Nativer C-Fiber (Stack + Register)
    zend_vm_stack vm_stack;         // Zend VM-Stack
    zend_execute_data *execute_data;// Aktuelle execute_data
    uint8_t flags;                  // Fiber-Zustand
};
```

Anstatt ständig Speicher zu erstellen und zu zerstören, gibt der Scheduler Kontexte an den Pool zurück
und verwendet sie immer wieder.

Intelligente Pool-Größenverwaltungsalgorithmen sind geplant,
die sich dynamisch an die Arbeitslast anpassen,
um sowohl die `mmap`/`mprotect`-Latenz als auch den gesamten Speicherverbrauch zu minimieren.

### Switch-Handler

In `PHP` verlassen sich viele Subsysteme auf eine einfache Annahme:
Code wird von Anfang bis Ende ohne Unterbrechung ausgeführt.
Der Ausgabepuffer (`ob_start`), Objekt-Destruktoren, globale Variablen --
all das funktioniert linear: Start -> Ende.

Coroutinen brechen dieses Modell. Eine Coroutine kann mitten in ihrer Arbeit schlafen gehen
und nach Tausenden anderer Operationen aufwachen. Zwischen `LEAVE` und `ENTER`
auf demselben Thread werden Dutzende anderer Coroutinen gelaufen sein.

`Switch Handler` sind Hooks, die an eine **bestimmte Coroutine** gebunden sind.
Im Gegensatz zu Microtasks (die bei jedem Wechsel feuern),
wird ein `Switch Handler` nur beim Eintritt und Austritt "seiner" Coroutine aufgerufen:

```c
typedef bool (*zend_coroutine_switch_handler_fn)(
    zend_coroutine_t *coroutine,
    bool is_enter,    // true = Eintritt, false = Austritt
    bool is_finishing // true = Coroutine beendet sich
    // Rückgabe: true = Handler behalten, false = entfernen
);
```

Der Rückgabewert steuert die Lebensdauer des Handlers:
* `true` -- der `Handler` bleibt und wird erneut aufgerufen.
* `false` -- der `Scheduler` wird ihn entfernen.

Der `Scheduler` ruft Handler an drei Punkten auf:

```c
ZEND_COROUTINE_ENTER(coroutine)  // Coroutine hat Kontrolle erhalten
ZEND_COROUTINE_LEAVE(coroutine)  // Coroutine hat Kontrolle abgegeben (suspend)
ZEND_COROUTINE_FINISH(coroutine) // Coroutine beendet sich endgültig
```

#### Beispiel: Ausgabepuffer

Die Funktion `ob_start()` verwendet einen einzelnen Handler-Stack.
Wenn eine Coroutine `ob_start()` aufruft und dann schlafen geht, könnte eine andere Coroutine den Puffer der anderen sehen, wenn nichts unternommen wird.
(Übrigens behandelt **Fiber** `ob_start()` nicht korrekt.)

Ein einmaliger `Switch Handler` löst dies beim Start der Coroutine:
Er verschiebt den globalen `OG(handlers)` in den Kontext der Coroutine und leert den globalen Zustand.
Danach arbeitet jede Coroutine mit ihrem eigenen Puffer, und `echo` in einer vermischt sich nicht mit einer anderen.

#### Beispiel: Destruktoren beim Herunterfahren

Wenn `PHP` herunterfährt, wird `zend_objects_store_call_destructors()` aufgerufen --
Durchlaufen des Objektspeichers und Aufrufen von Destruktoren. Normalerweise ist dies ein linearer Prozess.

Aber ein Destruktor kann `await` enthalten. Zum Beispiel möchte ein Datenbankverbindungsobjekt
die Verbindung ordnungsgemäß schließen -- was eine Netzwerkoperation ist.
Die Coroutine ruft `await` innerhalb des Destruktors auf und geht schlafen.

Die verbleibenden Destruktoren müssen fortgesetzt werden. Der `Switch Handler` fängt den `LEAVE`-Moment
und erzeugt eine neue hochprioritäre Coroutine, die die Durchquerung
ab dem Objekt fortsetzt, bei dem die vorherige stoppte.

#### Registrierung

```c
// Handler zu einer bestimmten Coroutine hinzufügen
ZEND_COROUTINE_ADD_SWITCH_HANDLER(coroutine, handler);

// Zur aktuellen Coroutine hinzufügen (oder zur Haupt-, wenn der Scheduler noch nicht gestartet ist)
ZEND_ASYNC_ADD_SWITCH_HANDLER(handler);

// Handler hinzufügen, der feuert, wenn die Haupt-Coroutine startet
ZEND_ASYNC_ADD_MAIN_COROUTINE_START_HANDLER(handler);
```

Das letzte Makro wird von Subsystemen benötigt, die sich vor dem Start des `Schedulers` initialisieren.
Sie registrieren einen Handler global, und wenn der `Scheduler` die `main`-Coroutine erstellt,
werden alle globalen Handler in sie kopiert und als `ENTER` ausgelöst.

## Reactor

### Warum libuv?

`TrueAsync` verwendet `libuv`, dieselbe Bibliothek, die `Node.js` antreibt.

Die Wahl ist bewusst. `libuv` bietet:
- Eine einheitliche `API` für `Linux` (`epoll`), macOS (`kqueue`), Windows (`IOCP`)
- Integrierte Unterstützung für Timer, Signale, `DNS`, Kindprozesse, Datei-I/O
- Eine ausgereifte Codebasis, getestet durch Milliarden von Anfragen in Produktion

Alternativen (`libev`, `libevent`, `io_uring`) wurden in Betracht gezogen,
aber `libuv` gewinnt in Bezug auf Benutzerfreundlichkeit.

### Struktur

```c
// Globale Reactor-Daten (in ASYNC_G)
uv_loop_t uvloop;
bool reactor_started;
uint64_t last_reactor_tick;

// Signalverwaltung
HashTable *signal_handlers;  // signum -> uv_signal_t*
HashTable *signal_events;    // signum -> HashTable* (events)
HashTable *process_events;   // SIGCHLD Prozess-Events
```

### Event-Typen und Wrapper

Jedes Event in `TrueAsync` hat eine duale Natur: eine `ABI`-Struktur, die im `PHP`-Kern definiert ist,
und ein `libuv-Handle`, das tatsächlich mit dem `OS` interagiert. Der `Reactor` "verklebt" sie,
indem er Wrapper erstellt, in denen beide Welten koexistieren:

| Event-Typ        | ABI-Struktur                    | libuv-Handle                  |
|------------------|---------------------------------|-------------------------------|
| Poll (fd/socket) | `zend_async_poll_event_t`       | `uv_poll_t`                   |
| Timer            | `zend_async_timer_event_t`      | `uv_timer_t`                  |
| Signal           | `zend_async_signal_event_t`     | Globales `uv_signal_t`        |
| Dateisystem      | `zend_async_filesystem_event_t` | `uv_fs_event_t`               |
| DNS              | `zend_async_dns_addrinfo_t`     | `uv_getaddrinfo_t`            |
| Prozess          | `zend_async_process_event_t`    | `HANDLE` (Win) / `waitpid`    |
| Thread           | `zend_async_thread_event_t`     | `uv_thread_t`                 |
| Exec             | `zend_async_exec_event_t`       | `uv_process_t` + `uv_pipe_t` |
| Trigger          | `zend_async_trigger_event_t`    | `uv_async_t`                  |

Weitere Details zur Event-Struktur finden Sie unter [Events und das Event-Modell](/de/architecture/events.html).

### Async IO

Für Stream-Operationen wird ein einheitliches `async_io_t` verwendet:

```c
struct _async_io_t {
    zend_async_io_t base;   // ABI: Event + fd/socket + Typ + Zustand
    int crt_fd;             // CRT-Dateideskriptor
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

Dieselbe Schnittstelle (`ZEND_ASYNC_IO_READ/WRITE/CLOSE`) funktioniert mit `PIPE`, `FILE`, `TCP`, `UDP`, `TTY`.
Die spezifische Implementierung wird bei der Handle-Erstellung basierend auf dem `Typ` ausgewählt.

### Reactor-Schleife

`reactor_execute(no_wait)` ruft einen Tick des `libuv` `Event loop` auf:
- `no_wait = true` -- nicht-blockierender Aufruf, nur bereite Events verarbeiten
- `no_wait = false` -- blockieren bis zum nächsten Event

Der `Scheduler` verwendet beide Modi. Zwischen Coroutine-Wechseln -- ein nicht-blockierender Tick
um Events zu sammeln, die bereits ausgelöst wurden. Wenn die Coroutine-Warteschlange leer ist --
ein blockierender Aufruf, um CPU-Verschwendung in einer Leerlaufschleife zu vermeiden.

Das ist eine klassische Strategie aus der Welt der ereignisgesteuerten Server: `nginx`, `Node.js`
und `Tokio` verwenden dasselbe Prinzip: Abfragen ohne Warten, solange es Arbeit gibt,
und schlafen, wenn es keine Arbeit gibt.

## Wechseleffizienz: TrueAsync im Branchenkontext

### Stackful vs Stackless: Zwei Welten

Es gibt zwei grundlegend verschiedene Ansätze zur Implementierung von Coroutinen:

**Stackful** (Go, Erlang, Java Loom, PHP Fibers) -- jede Coroutine hat ihren eigenen C-Stack.
Das Wechseln beinhaltet das Speichern/Wiederherstellen von Registern und dem Stack-Pointer.
Der Hauptvorteil: **Transparenz**. Jede Funktion in beliebiger Aufruftiefe kann `suspend` aufrufen,
ohne spezielle Annotationen zu benötigen. Der Programmierer schreibt gewöhnlichen synchronen Code.

**Stackless** (Rust async/await, Kotlin, C# async) -- der Compiler transformiert eine `async`-Funktion
in eine Zustandsmaschine. "Suspendieren" ist nur ein `return` aus der Funktion,
und "Fortsetzen" ist ein Methodenaufruf mit einer neuen Zustandsnummer. Der Stack wird überhaupt nicht gewechselt.
Die Kosten: **"Function Coloring"** (`async` infiziert die gesamte Aufrufkette).

| Eigenschaft                               | Stackful                          | Stackless                         |
|-------------------------------------------|-----------------------------------|-----------------------------------|
| Suspendierung aus verschachtelten Aufrufen | Ja                                | Nein -- nur aus `async`-Funktionen |
| Wechselkosten                             | 15-200 ns (Register speichern)    | 10-50 ns (Felder in Objekt schreiben) |
| Speicher pro Coroutine                    | 4-64 KiB (separater Stack)        | Exakte Zustandsmaschinen-Größe    |
| Compiler-Optimierung durch yield          | Nicht möglich (Stack ist opak)    | Möglich (inline, HALO)            |

`PHP-Coroutinen` sind **Stackful**-Coroutinen basierend auf `Boost.Context fcontext_t`.

### Architektonischer Kompromiss

`TrueAsync` wählt das **Stackful-Single-Threaded**-Modell:

- **Stackful** -- weil das `PHP`-Ökosystem riesig ist und das "Einfärben" von Millionen Zeilen
  bestehenden Codes mit `async` teuer ist. Stackful-Coroutinen ermöglichen die Verwendung regulärer C-Funktionen, was eine kritische Anforderung für PHP ist.
- **Single-Threaded** -- PHP ist historisch single-threaded (kein gemeinsam genutzter veränderbarer Zustand),
  und diese Eigenschaft ist leichter zu bewahren als mit ihren Konsequenzen umzugehen.
  Threads erscheinen nur im `ThreadPool` für `CPU-bound`-Aufgaben.

Da `TrueAsync` derzeit die Low-Level-`Fiber API` wiederverwendet,
sind die Kontextwechselkosten relativ hoch und können in Zukunft verbessert werden.

## Graceful Shutdown

Ein `PHP`-Skript kann jederzeit beendet werden: eine unbehandelte Exception, `exit()`,
ein OS-Signal. Aber in der asynchronen Welt können Dutzende von Coroutinen offene Verbindungen halten,
ungeschriebene Puffer und nicht festgeschriebene Transaktionen.

`TrueAsync` handhabt dies durch ein kontrolliertes Herunterfahren:

1. `ZEND_ASYNC_SHUTDOWN()` -> `start_graceful_shutdown()` -- setzt das Flag
2. Alle Coroutinen erhalten eine `CancellationException`
3. Coroutinen bekommen die Möglichkeit, `finally`-Blöcke auszuführen -- Verbindungen schließen, Puffer leeren
4. `finally_shutdown()` -- endgültige Bereinigung verbleibender Coroutinen und Microtasks
5. Der Reactor stoppt

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
