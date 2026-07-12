---
layout: tutorial
lang: de
path_key: "/tutors-server/01-first-server.html"
nav_active: docs
permalink: /de/tutors-server/01-first-server.html
page_title: "Dein erster Server"
description: "Ein HTTP-Server innerhalb von PHP: HttpServer, HttpServerConfig und dein erster Handler."
---

# Dein erster Server

Erinnern wir uns daran, wie PHP eine Anfrage normalerweise bedient.
Nginx nimmt die Verbindung entgegen und reicht sie an PHP-FPM weiter.
FPM greift sich einen freien Prozess. Der Prozess wacht auf, lädt
Klassen, öffnet eine Datenbankverbindung, baut die Antwort zusammen,
schickt sie ab. Und stirbt. Alles, was er aufbauen konnte, jede
Verbindung, jeder Cache, all diese schön aufgewärmten Pools aus der
ersten Serie, landet im Müll. Eine Millisekunde später trifft die
nächste Anfrage ein, und die ganze Geschichte spielt sich von vorne
ab. Hundertmal pro Sekunde. Tausendmal.

Unterdessen haben wir in der ersten Serie ein ganzes Arsenal an
Dingen gebaut, denen ein solches Leben abträglich ist: ein
Verbindungspool ist gut, wenn er lange lebt, und ein memoisiertes
`Future` ist sinnlos, wenn es zusammen mit dem Prozess stirbt.

Der Plan für diese Serie ist also einfach: die Mittelsmänner
entfernen. `TrueAsync Server` ist eine Erweiterung, die einen
`HTTP`-Server direkt innerhalb des `PHP`-Prozesses laufen lässt:

```php
use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    new HttpServerConfig()->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response->setStatusCode(200)->setBody('Hello, World!');
});

$server->start();
```

```bash
$ php server.php &
$ curl -i http://localhost:8080/
HTTP/1.1 200 OK
Content-Length: 13

Hello, World!
```

`addListener` öffnet einen Port, `addHttpHandler` registriert eine
Handler-Funktion, und `start()` startet die Ereignisschleife und kehrt
nie zurück. Jede eingehende Anfrage führt den Handler aus.

## Ein Handler ist eine Koroutine

Jeder Handler-Aufruf läuft in seiner eigenen Koroutine (`spawn`). Was
bedeutet das in der Praxis? Machen wir ein Experiment. Wir fügen dem
Server eine absichtlich langsame Route hinzu:

```php
use function Async\delay;

$server->addHttpHandler(function ($request, $response) {
    if ($request->getPath() === '/slow') {
        delay(5000); // fünf Sekunden "schwere" I/O-Arbeit
        $response->setBody("was slow\n");
        return;
    }

    $response->setBody("fast\n");
});
```

Jetzt öffne zwei Terminals. Im ersten fragst du `/slow` an. Es hängt
und wartet seine fünf Sekunden ab. Ohne darauf zu warten, fragst du im
zweiten Terminal `/` an:

```bash
$ curl http://localhost:8080/
fast
```

Sofort.

Wenn du die erste Serie gelesen hast, verstehst du bereits, was
passiert ist. Die `/slow`-Koroutine schlief in `delay` ein, der
Scheduler gab die Kontrolle weiter, und der Server bediente in aller
Ruhe die zweite Anfrage. Das sind dieselben Zähler "A" und "B" aus dem
allerersten Kapitel, nur heißen sie jetzt HTTP-Anfragen. Ein Thread.
Eine Ereignisschleife. Tausende nebenläufige Clients.

Stell dir nun vor, was dasselbe `/slow` beim klassischen FPM anrichten
würde. Fünf Sekunden Schlaf sind fünf Sekunden, in denen ein ganzer
Worker außer Gefecht ist. Ein Dutzend solcher Anfragen und der
Worker-Pool ist erschöpft. Die ganze Seite steht und wartet, während
jemand sein Nickerchen zu Ende bringt.

## Ein Prozess, der nicht stirbt

Die zweite Folge ist interessanter als die erste, auch wenn sie
alltäglich aussieht. `start()` kehrt nie zurück. Das bedeutet, dass
alles, was davor erzeugt wurde, so lange lebt wie der Server:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX     => 10,
]);

$directory = new RegionsDirectory(); // Memoisierung aus Kapitel sechs

$server->addHttpHandler(function ($request, $response) use ($pdo, $directory) {
    // der Pool ist bereits warm, das Verzeichnis ist bereits geladen
});

$server->start();
```

Der Verbindungspool wird einmal geöffnet. Das Regionen-Verzeichnis
lädt einmal. Die Routen kompilieren einmal. Erinnerst du dich, wie
viel Mühe die erste Serie in Werkzeuge zur Wiederverwendung gesteckt
hat? Hier ist der Ort, an dem all das endlich Früchte trägt. Der
Kaltstart wurde nicht schneller. Er verschwand.

Fairerweise muss man sagen: ein langes Leben hat seinen Preis, und das
sollte man gleich vorweg erwähnen. Ein Speicherleck wird nicht mehr
durch den Tod des Prozesses nach der Anfrage verziehen. Eine globale
Variable gilt nicht mehr "für eine Anfrage", sondern für immer und für
alle. Kein Grund zur Panik: Scope, Pools und Kontext aus der ersten
Serie wurden genau dafür erfunden, und die serverspezifischen Details
behandeln wir in einem eigenen Kapitel.

Fürs Erste hat unser Server ein einfacheres Problem: Er antwortet auf
alles dasselbe. `GET /profile/42`, `POST /profile/42/address`, ein
Tippfehler in der URL, das macht keinen Unterschied. Ein echter
`ProfileService` muss lernen, die Anfrage zu lesen. Genau das nehmen
wir uns als Nächstes vor.
