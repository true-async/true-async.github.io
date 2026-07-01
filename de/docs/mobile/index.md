---
layout: docs
lang: de
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /de/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge: eine persistente PHP-Laufzeit innerhalb einer nativen Android-App über JNI. Architektur, Event-Austausch, Aufruf von Kotlin aus PHP, Code-Generierung."
---

# TrueAsync Mobile

(Demo-Projekt, experimentell, Repository
[native-bridge](https://github.com/true-async/native-bridge), Android)

Asynchrones PHP passt hervorragend zu UI-Anwendungen: die Oberfläche darf nicht einfrieren,
während etwas mit dem Netzwerk spricht, von der Festplatte liest oder auf die nächste
Benutzeraktion wartet. TrueAsync hat dafür eine dedizierte C-API: das Trigger Event
(`ZEND_ASYNC_NEW_TRIGGER_EVENT()` in `zend_async_API.h`). Es ist ein Objekt mit einer einzigen
Methode, `trigger()`, die beliebiger C- oder C++-Code von einem anderen Thread aus aufrufen kann,
um den PHP-Reaktor thread-sicher aufzuwecken und ihm die Kontrolle zu übergeben, das Event zu
verarbeiten.

**native-bridge** implementiert genau diese Art von Integration für Android: PHP bettet sich als
persistenter Prozess in die App ein, startet einmalig auf einem Hintergrund-Thread, betreibt eine
Event-Loop (denselben TrueAsync-Reaktor, der im Rest des Ökosystems verwendet wird) und spricht
in beide Richtungen mit Kotlin.

## Warum ein persistenter Prozess statt Request/Response

Das übliche PHP-Szenario ist eine Web-Anfrage: der Prozess startet, bearbeitet eine Anfrage und
beendet sich. Das passt nicht zu einer mobilen App: PHP muss so lange am Leben bleiben, wie die
App geöffnet ist, und auf Benutzer-Events (Taps, Sensoren, Standort) genauso reagieren, wie ein
Handler auf eine HTTP-Anfrage reagiert. Genau das liefert native-bridge: PHP startet einmalig beim
App-Start und lebt in seinem eigenen Thread, bis es explizit gestoppt wird, während
TrueAsync-Coroutinen innerhalb dieses Threads Events und Hintergrundarbeit konkurrent bearbeiten.

## Bridge-Architektur

Die Bridge arbeitet in zwei Richtungen:

1. **Android zu PHP.** Kotlin schiebt Events (ein Tap, ein Sensorwert, Standort, ein beliebiges
   Custom-Event) in eine Queue, und PHP holt sie aus seiner eigenen Loop.
2. **PHP zu Kotlin.** PHP ruft Methoden auf, die auf der Kotlin-Seite implementiert sind (einen
   Toast anzeigen, vibrieren, Text in die Zwischenablage kopieren und so weiter).

Beide Richtungen laufen über **JNI (Java Native Interface)**, den Standard-Android-Mechanismus,
der C-Code den Aufruf von Kotlin-/Java-Code erlaubt und umgekehrt. Keine der beiden Richtungen
transportiert Daten über JSON oder ein anderes Textformat: Werte überqueren die Grenze bereits
typisiert, ohne zusätzliche Konvertierungen.

PHP läuft auf seinem eigenen OS-Thread und blockiert niemals den UI-Thread von Android. Wenn PHP
auf Daten wartet, bleibt der UI-Thread reaktionsfähig, und umgekehrt.

## Richtung 1: Events von Android zu PHP

Kotlin sendet Events über JNI in eine Queue, die PHP mit `NativeBridge::poll()` liest. Ist die
Queue leer, liefert `poll()` sofort `null`, und die PHP-Anwendung entscheidet selbst, ob sie auf
das nächste Event wartet oder in der Zwischenzeit etwas anderes tut (in der Demo-App ist das eine
kurze `usleep()`-Pause, während der TrueAsync Hintergrund-Coroutinen und Timer laufen lassen kann).

Es gibt vier Event-Typen: ein Bildschirm-Touch, Standortdaten, Sensordaten (Beschleunigungsmesser
und Ähnliches) und ein beliebiges Event mit einem Namen und einer Text-Payload. Letzteres nutzt
die Demo-App, um Button-Klicks zu markieren:

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

Die ersten drei Event-Typen (Touch, Standort, Sensoren) benötigen keine String-Allokation und
bleiben daher auch bei hoher Aufrufrate günstig (zum Beispiel für einen Strom von
Beschleunigungsmesser-Daten).

## Richtung 2: Aufrufe von PHP nach Kotlin

Wenn PHP eine Modulmethode aufruft, zum Beispiel `Toast::show('Hello', true)`, gibt es zwei Wege,
wie dieser Aufruf Kotlin erreichen kann:

### Der generische Pfad

Standardmäßig packt PHP die Argumente in einen kompakten typisierten Puffer (kein
String-Format wie JSON, sodass Kotlin ihn ohne Textparsing und ohne zusätzliche Allokationen
liest) und verschickt ihn über einen einzigen Aufruf von `NativeBridge::invoke()`. Ein neues Modul
oder eine neue Methode auf diesem Pfad hinzuzufügen, berührt nie C: nur Kotlin und der generierte
PHP-Wrapper ändern sich, ein Gradle-Rebuild der Kotlin-Seite genügt, kein Rebuild der nativen
Bibliothek nötig.

### Der schnelle Pfad: `#[FastPath]`

Für "heiße" Methoden, die sehr oft aufgerufen werden (zum Beispiel Sensordaten bei jedem Frame),
markiert die PHP-Spec die Methode mit dem `#[FastPath]`-Attribut. Für eine solche Methode erzeugt
der Generator eine dedizierte typisierte C-Funktion, die Kotlin direkt über JNI aufruft, ohne
Zwischenpuffer. Diese Art von Methode erfordert bei jeder Änderung einen Rebuild der nativen
Bibliothek (der `.so`-Datei), läuft aber schneller und ohne zusätzliche Allokationen. Das Verhalten
der Methode ändert sich nicht, nur die Art, wie der Aufruf die PHP/Kotlin-Grenze überquert.

## Ein Modul beschreiben: `#[BridgeModule]`

Der Vertrag eines Moduls wird auf der PHP-Seite als Interface mit dem `#[BridgeModule]`-Attribut
beschrieben:

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

- Der Modulname wird aus dem Interface-Namen abgeleitet (`ToastInterface` wird zum Modul `Toast`),
  oder explizit gesetzt: `#[BridgeModule('Clipboard')]`.
- `#[Ui]` an einer Methode bedeutet, dass die Kotlin-Implementierung auf dem UI-Thread von Android
  laufen muss (der Generator fügt den Thread-Wechsel für Sie hinzu).
- `#[FastPath]` an einer Methode aktiviert den oben beschriebenen schnellen Aufrufpfad.

## Was `tools/bridge/gen.php` generiert

Aus einer PHP-Spec (einem `#[BridgeModule]`-Interface) baut der Generator bei jedem Lauf neu:

- eine Kotlin-Klasse mit abstrakten Methoden (`ToastSpec`);
- den Call-Routing-Code (Kotlin);
- einen PHP-Wrapper (`Toast::show(...)`), den der restliche PHP-Anwendungscode aufruft;
- für mit `#[FastPath]` markierte Methoden typisierten C-Code, der Kotlin direkt aufruft.

## Lebenszyklus der PHP-Anwendung

1. Kotlin startet PHP auf einem Hintergrund-Thread und übergibt ihm den Pfad zum
   PHP-Einstiegsskript.
2. Das PHP-Skript ruft `NativeBridge::init()` auf; ab diesem Punkt ist die Bridge bereit, Events
   und Aufrufe entgegenzunehmen.
3. Von dort an läuft die Anwendung in einer Schleife: Events über `poll()` abholen, behandeln und
   bei Bedarf Hintergrund-TrueAsync-Coroutinen starten (zum Beispiel für Netzwerkanfragen).
4. Das Herunterfahren erfolgt geordnet: Kotlin ruft `NativeBridge.stop()` auf, die PHP-Schleife
   erkennt das über `NativeBridge::shouldStop()`, schließt ab und gibt ihre Ressourcen sauber frei.

## Beispiel: ein Zähler an einem Button

Ein vereinfachtes Beispiel basierend auf der Demo-App: ein Button startet und stoppt einen
endlosen Zähler, und sein Wert aktualisiert sich direkt in der UI. Start und Stopp werden mit dem
einfachen `spawn()`/`cancel()` einer TrueAsync-Coroutine implementiert, ohne den UI-Thread zu
blockieren:

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

Ein zweiter Klick bricht die `$counter`-Coroutine über `cancel()` ab, und der Zähler bleibt bei
dem Wert stehen, den er erreicht hat. Das vollständige Beispiel mit mehreren unabhängigen Zählern
befindet sich in `android/app.php` des Repositorys.

## Status und Einschränkungen

- Nur Android wird unterstützt; iOS-Unterstützung ist geplant, aber noch nicht implementiert.
- Die Bridge transportiert derzeit einfache Typen: Strings, Integers, Floats, Booleans. Das
  Übergeben zusammengesetzter Objekte (Feld für Feld, weiterhin ohne String-Format) ist geplant.
- Die Richtung PHP zu Kotlin ist synchron: eine Methode liefert ihr Ergebnis sofort; verzögerte
  (asynchrone) Ergebnisse werden auf dieser Seite noch nicht unterstützt.
- PHPs Opcache ist unter Android zwangsweise deaktiviert: die App-Sandbox erlaubt ihm nicht, die
  Lock-Datei und den ausführbaren Speicher zu nutzen, die es braucht.
- Ein thread-sicherer (ZTS) PHP-Build ist erforderlich, da PHP auf seinem eigenen OS-Thread läuft
  statt auf dem Haupt-Thread der App.

## Siehe auch

- [Roadmap: TrueAsync Mobile](/de/roadmap.html)
- [native-bridge-Repository auf GitHub](https://github.com/true-async/native-bridge)
