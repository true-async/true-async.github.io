---
layout: docs
lang: it
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /it/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge: un runtime PHP persistente dentro un'app Android nativa via JNI. Architettura, scambio di eventi, chiamare Kotlin da PHP, generazione di codice."
---

# TrueAsync Mobile

(progetto dimostrativo, sperimentale, repository
[native-bridge](https://github.com/true-async/native-bridge), Android)

Il PHP asincrono si adatta molto bene alle applicazioni con interfaccia utente: l'interfaccia non
deve bloccarsi mentre qualcosa parla con la rete, legge dal disco o attende la prossima azione
dell'utente. TrueAsync ha una API C dedicata per questo: il Trigger Event
(`ZEND_ASYNC_NEW_TRIGGER_EVENT()` in `zend_async_API.h`). È un oggetto con un unico metodo,
`trigger()`, che qualsiasi codice C o C++ può chiamare da un altro thread per risvegliare in modo
thread-safe il reactor PHP e passargli il controllo per elaborare l'evento.

**native-bridge** implementa esattamente questo tipo di integrazione per Android: PHP si integra
nell'app come processo persistente, avviandosi una sola volta su un thread in background, facendo
girare un event loop (lo stesso reactor TrueAsync usato nel resto dell'ecosistema) e comunicando
con Kotlin in entrambe le direzioni.

## Perché un processo persistente invece di request/response

Lo scenario PHP abituale è una richiesta web: il processo si avvia, gestisce una richiesta ed
esce. Questo non si adatta a un'app mobile: PHP deve restare vivo per tutto il tempo in cui l'app
è aperta, e reagire agli eventi dell'utente (tocchi, sensori, posizione) allo stesso modo in cui
un handler reagisce a una richiesta HTTP. È esattamente questo che offre native-bridge: PHP si
avvia una volta al lancio dell'app e vive nel proprio thread finché non viene fermato
esplicitamente, mentre le coroutine TrueAsync dentro quel thread gestiscono eventi e lavoro in
background in modo concorrente.

## Architettura del bridge

Il bridge funziona in due direzioni:

1. **Da Android a PHP.** Kotlin inserisce eventi (un tocco, una lettura di un sensore, la
   posizione, un evento personalizzato arbitrario) in una coda, e PHP li preleva dal proprio loop.
2. **Da PHP a Kotlin.** PHP chiama metodi implementati sul lato Kotlin (mostrare un Toast, far
   vibrare il dispositivo, copiare testo negli appunti, e così via).

Entrambe le direzioni passano attraverso **JNI (Java Native Interface)**, il meccanismo standard
di Android che permette al codice C di chiamare codice Kotlin/Java e viceversa. Nessuna delle due
direzioni fa passare i dati attraverso JSON o un altro formato testuale: i valori attraversano il
confine già tipizzati, senza conversioni aggiuntive.

PHP gira sul proprio thread del sistema operativo e non blocca mai il thread UI di Android. Se PHP
sta aspettando dati, il thread UI continua a rispondere, e viceversa.

## Direzione 1: eventi da Android a PHP

Kotlin invia eventi via JNI in una coda che PHP legge con `NativeBridge::poll()`. Quando la coda è
vuota, `poll()` restituisce subito `null`, e l'applicazione PHP decide da sola se attendere il
prossimo evento o fare qualcos'altro nel frattempo (nell'app demo si tratta di una breve pausa
`usleep()`, durante la quale TrueAsync riesce a far girare coroutine e timer in background).

Ci sono quattro tipi di eventi: un tocco sullo schermo, dati di posizione, dati di sensori
(accelerometro e simili), e un evento arbitrario con un nome e un payload testuale. Quest'ultimo
tipo è quello che l'app demo usa per segnalare la pressione dei pulsanti:

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

I primi tre tipi di evento (tocco, posizione, sensori) non richiedono allocazione di stringhe,
quindi restano economici anche ad alta frequenza di chiamata (ad esempio, per un flusso di dati
dell'accelerometro).

## Direzione 2: chiamate da PHP a Kotlin

Quando PHP chiama un metodo di un modulo, ad esempio `Toast::show('Hello', true)`, ci sono due
modi in cui quella chiamata può raggiungere Kotlin.

### Il percorso generico

Per impostazione predefinita, PHP impacchetta gli argomenti in un buffer tipizzato compatto
(nessun formato di stringa come JSON, quindi Kotlin lo legge senza analizzare testo e senza
allocazioni aggiuntive) e lo spedisce tramite un'unica chiamata a `NativeBridge::invoke()`.
Aggiungere un nuovo modulo o metodo su questo percorso non tocca mai il C: cambiano solo Kotlin e
il wrapper PHP generato, quindi basta un rebuild Gradle del lato Kotlin, senza bisogno di
ricompilare la libreria nativa.

### Il percorso veloce: `#[FastPath]`

Per i metodi "caldi" chiamati molto spesso (ad esempio, l'invio di dati dei sensori a ogni
frame), la spec PHP marca il metodo con l'attributo `#[FastPath]`. Per un metodo di questo tipo,
il generatore emette una funzione C tipizzata dedicata che chiama Kotlin direttamente via JNI,
senza buffer intermedio. Questo tipo di metodo richiede la ricompilazione della libreria nativa
(il file `.so`) a ogni modifica, ma è più veloce e senza allocazioni aggiuntive. Il comportamento
del metodo non cambia, cambia solo il modo in cui la chiamata attraversa il confine PHP/Kotlin.

## Descrivere un modulo: `#[BridgeModule]`

Il contratto di un modulo viene descritto lato PHP come un'interfaccia con l'attributo
`#[BridgeModule]`:

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- Il nome del modulo viene derivato dal nome dell'interfaccia (`ToastInterface` diventa il modulo
  `Toast`), oppure impostato esplicitamente: `#[BridgeModule('Clipboard')]`.
- `#[Ui]` su un metodo significa che l'implementazione Kotlin deve girare sul thread UI di Android
  (il generatore aggiunge il cambio di thread automaticamente).
- `#[FastPath]` su un metodo abilita il percorso di chiamata veloce descritto sopra.

## Cosa genera `tools/bridge/gen.php`

A partire da una spec PHP (un'interfaccia `#[BridgeModule]`), il generatore ricostruisce a ogni
esecuzione:

- una classe Kotlin con metodi astratti (`ToastSpec`);
- il codice di instradamento delle chiamate (Kotlin);
- un wrapper PHP (`Toast::show(...)`) che il resto del codice dell'app PHP chiama;
- per i metodi marcati `#[FastPath]`, codice C tipizzato che chiama Kotlin direttamente.

## Ciclo di vita dell'applicazione PHP

1. Kotlin avvia PHP su un thread in background e gli passa il percorso dello script PHP di
   ingresso.
2. Lo script PHP chiama `NativeBridge::init()`; da quel momento il bridge è pronto ad accettare
   eventi e chiamate.
3. Da lì l'applicazione gira in un loop: preleva eventi tramite `poll()`, li gestisce, e avvia
   coroutine TrueAsync in background quando serve (per le richieste di rete, ad esempio).
4. Lo shutdown è graduale: Kotlin chiama `NativeBridge.stop()`, il loop PHP lo vede tramite
   `NativeBridge::shouldStop()`, finisce il lavoro in corso e rilascia le proprie risorse in modo
   pulito.

## Esempio: un contatore su un pulsante

Un esempio semplificato basato sull'app demo: un pulsante avvia e ferma un contatore infinito, e
il suo valore si aggiorna direttamente nell'UI. Avvio e arresto sono implementati con un semplice
`spawn()`/`cancel()` di coroutine TrueAsync, senza bloccare il thread UI:

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

Un secondo click annulla la coroutine `$counter` tramite `cancel()`, e il contatore si ferma al
valore raggiunto. L'esempio completo, con diversi contatori indipendenti, si trova in
`android/app.php` nel repository.

## Stato e limitazioni

- È supportato solo Android; il supporto iOS è pianificato ma non ancora implementato.
- Il bridge attualmente porta solo tipi semplici: stringhe, interi, float, booleani. Il passaggio
  di oggetti composti (per campo, sempre senza formato di stringa) è pianificato.
- La direzione PHP-verso-Kotlin è sincrona: un metodo restituisce subito il proprio risultato; i
  risultati differiti (asincroni) non sono ancora supportati su questo lato.
- L'opcache di PHP è disattivato forzatamente su Android: il sandbox dell'app non gli permette di
  usare il file di lock e la memoria eseguibile di cui ha bisogno.
- È richiesta una build PHP thread-safe (ZTS), dato che PHP gira sul proprio thread del sistema
  operativo anziché sul thread principale dell'app.

## Vedi anche

- [Roadmap: TrueAsync Mobile](/it/roadmap.html)
- [Repository native-bridge su GitHub](https://github.com/true-async/native-bridge)
