---
layout: tutorial
lang: de
path_key: "/tutors-server/08-workers.html"
nav_active: docs
permalink: /de/tutors-server/08-workers.html
page_title: "Worker und HTTP/3"
description: "setWorkers(): die Threads der ersten Serie unter der Haube des Servers, der Bootloader und HTTP/3 auf demselben Port."
---

# Worker und HTTP/3

Öffne mal ein htop auf dem Server unter Last. Unser Prozess schuftet vor
sich hin, Tausende von Anfragen im Flug... und von acht Kernen ist einer
beschäftigt. Sieben im Leerlauf. Ärgerlich? Ärgerlich.

Daran ist nichts Neues, wir haben das im Kapitel über Threads behandelt:
Solange Aufgaben auf I/O warten, reicht ein Kern für alle. Aber unter
echtem Verkehr wartet der Server nicht nur. HTTP-Parsing,
TLS-Handshakes, JSON-Serialisierung, das sind Berechnungen, und sie
stoßen an diesen einen einzigen Kern.

Das Rezept aus demselben Kapitel: Gib der Berechnung Threads. Der Server
wendet es in einer einzigen Zeile an:

```php
$config = (new HttpServerConfig())
    ->addListener('0.0.0.0', 8080)
    ->setWorkers(Async\available_parallelism());
```

`setWorkers(N)` startet N Worker, und es ist buchstäblich
`Async\ThreadPool` aus dem vierzehnten Kapitel. Kein "ähnlicher
Mechanismus", sondern genau derselbe. Was bedeutet, dass du auch die
Regeln schon kennst: Jeder Worker ist ein eigener
Betriebssystem-Thread mit eigener PHP-Umgebung, eigener Event-Loop,
eigenen Pools. Die Konfiguration und die Handler werden nach den
üblichen Regeln zur Übergabe zwischen Threads in jeden Worker kopiert.
`start()` im Elternprozess wartet auf sie alle.

Eine Frage bleibt: Wer übergibt eingehende Verbindungen an die Worker?
Und hier kommt das Schönste. Niemand. Jeder Worker öffnet denselben Port
mit dem Flag `SO_REUSEPORT`, und von da an verteilt der Linux-Kernel
selbst die Verbindungen unter ihnen. Kein Dispatcher, keine
Warteschlange, keine Locks. Acht unabhängige Server, hinter einem Port
verborgen.

## Bootloader: Jeden Worker aufwärmen

In der ersten Serie hatte ThreadPool einen Bootloader, und dort sah er
wie eine optionale Bequemlichkeit aus. Hier wird er zur zentralen Figur.
Und zwar deshalb: Alles, was wir im ersten Kapitel "einmal, vor
`start()`" gemacht haben, muss jetzt in jedem Worker passieren. Jeder
hat schließlich seinen eigenen Speicher.

```php
$config
    ->setWorkers(8)
    ->setBootloader(function () {
        require __DIR__ . '/vendor/autoload.php';

        Database::initPool(min: 4, max: 16); // ein eigener PDO-Pool in jedem Worker
        Router::compile();
    });
```

Die Closure läuft einmal pro Worker, vor der ersten Anfrage. Eine
Ausnahme darin stoppt den ganzen Pool. Hart? Richtig: Ein Server mit
einem von acht schlecht aufgewärmten Workern ist eine Maschine, die
jedem achten Client Fehler entgegenschleudert. Besser, er startet gar
nicht erst.

## Der Chat trifft auf Worker

Und jetzt die versprochene Explosion. Im vorigen Kapitel haben wir einen
Chat auf der Formel "geteilter Zustand im Speicher des Prozesses"
gebaut. Lies die Formel langsam. Im Speicher. Des Prozesses.

Welcher von den acht?

Der Kernel streut die Verbindungen, wie es ihm gefällt. Alice landete in
Worker 3, Bob in Worker 5. Jeder Worker hat seinen eigenen Speicher und
damit sein eigenes `$room`. Zwei Räume mit demselben Namen, die
voneinander nie erfahren werden. Alice schreibt ins Leere, Bob schweigt
in einem anderen Leeren. Keine Races, keine Fehler, der Chat hat einfach
still aufgehört, ein Chat zu sein.

Was tun? Die Standardauswege sind diese. Für ein kleines System ein
ehrliches `setWorkers(1)`: Ein Worker hält Tausende von
WebSocket-Verbindungen ohne Weiteres, da sie meistens warten. Für ein
großes verlege den geteilten Zustand nach außen, üblicherweise in Redis
pub/sub, und lass die Worker darüber miteinander reden. Eine Regel zum
Merken: Anfragezustand lebt im Anfrage-Scope, Prozesszustand im Worker,
geteilter Zustand in externem Speicher.

## HTTP/3: Dieselben Handler, ein anderer Transport

Da wir gerade skalieren, bringen wir den Stack auf den modernen Stand.
Über HTTP/3 genügt es, drei Dinge zu wissen. Es funktioniert nicht über
TCP, sondern über QUIC auf UDP. Es baut eine Verbindung schneller auf
und lässt nicht zu, dass ein einzelnes verlorenes Paket gleich alle
Ströme auf einmal blockiert. Und man muss es zwingend lernen, weil
Browser es bereits bevorzugen.

Klingt nach einem großen Bauprojekt? Schau:

```php
$config = (new HttpServerConfig())
    ->setWorkers(Async\available_parallelism())
    ->setCertificate('/etc/tls/profile.crt')
    ->setPrivateKey('/etc/tls/profile.key')
    ->addListener('0.0.0.0', 443, tls: true)  // TCP: HTTP/1.1 und HTTP/2
    ->addHttp3Listener('0.0.0.0', 443);       // UDP: HTTP/3
```

Eine Zeile, `addHttp3Listener`. Derselbe Port, und es gibt keinen
Konflikt: 443/TCP lauscht auf HTTP/1.1 und HTTP/2, während 443/UDP an
QUIC geht. Es hat kein separates TLS-Flag, denn laut Spezifikation
existiert QUIC nicht ohne TLS; die Zertifikate werden vom Server
genommen.

Wie erfahren die Clients vom UDP-Eingang? Von selbst. Zu jeder Antwort
über TCP fügt der Server einen `Alt-Svc: h3=":443"`-Header hinzu. Der
Browser sieht ihn und sendet die nächsten Anfragen über HTTP/3. Erster
Besuch über HTTP/2, dann QUIC, und niemand hat irgendetwas
konfiguriert.

```bash
$ curl --http3 -I https://profile.example.com/
HTTP/3 200
alt-svc: h3=":443"; ma=86400
```

Weißt du, was mir an diesem Kapitel am besten gefällt? Was nicht darin
ist. Wir haben acht Threads und die dritte Version von HTTP
eingeschaltet, und keine einzige Zeile hat sich in den Handlern
geändert. Das Routing aus dem zweiten Kapitel, das SSE aus dem sechsten
Kapitel, der Chat aus dem siebten Kapitel, keiner von ihnen bemerkt,
dass die Welt um sie herum mehrthreadig wurde und QUIC zu sprechen
begann. Das Skalieren zog sich in die Konfiguration zurück, wohin es
gehört.

Der Server wurde schnell. Der nächste Schritt ist, ihn unsinkbar zu
machen: Was tun bei Überlast, bei langsamen Clients, beim Deployen
mitten im dichtesten Verkehr. Ein Kapitel über schlechte Tage.
