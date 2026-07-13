---
layout: tutorial
lang: de
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /de/tutors-server/03-concurrency-inside.html
page_title: "Nebenläufigkeit innerhalb einer Anfrage"
description: "TaskGroup in einem Handler, der PDO Pool unter Last und request_context()."
---

# Nebenläufigkeit innerhalb einer Anfrage

Im vorherigen Kapitel lud `showProfile` das Profil in einer einzigen
Zeile, und ich habe ehrlich so getan, als stünde nichts dahinter.
Zeit, reinen Tisch zu machen. Dahinter stehen drei Quellen:
Benutzerdaten aus der Datenbank, Bestellungen aus der Datenbank,
Bewertungen von einer externen API. Drei unabhängige Reisen nach
Daten.

Ein bekanntes Problem? Natürlich. Das ist Kapitel zehn der ersten
Serie Wort für Wort, und die Lösung überträgt sich ohne eine einzige
Änderung:

```php
use Async\TaskGroup;

function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $group = new TaskGroup();

    $group->spawnWithKey('user',    fn() => fetchUser($userId));
    $group->spawnWithKey('orders',  fn() => fetchOrders($userId));
    $group->spawnWithKey('reviews', fn() => fetchReviews($userId));

    $res->json($group->all()->await(timeout(2000)));
}
```

Die drei Anfragen gehen nebenläufig hinaus. Die Seite wird in der Zeit
der langsamsten Quelle zusammengebaut, nicht in der Summe aller drei.
Es gibt einen Timeout, es gibt fail-together, es gibt
`CompositeException`.

Hier ist es wichtig, eines zu spüren: Der Server hat keine eigenen
Nebenläufigkeitsregeln eingeführt. Nicht die geringsten. Der Handler
ist eine gewöhnliche Koroutine, und darin funktioniert alles, was du
bereits kennst. Der Server hat lediglich eine Tür geöffnet, durch die
HTTP-Anfragen in die Welt treten, die du bereits kennst.

## Der Pool unter echter Last

Erinnerst du dich an Kapitel neun der ersten Serie? Zehn
Import-Worker, ein `PDO`-Objekt, verhedderte Transaktionen, Chaos.
Damals war das ein Lehrbeispiel mit zehn Koroutinen. Nun, vergiss die
zehn.

In einem Server gibt es so viele nebenläufige Datenbanknutzer, wie es
gerade Anfragen in Bearbeitung gibt. Zwanzig. Fünfhundert. So viele,
wie der Verkehr hereintreibt, und diese Zahl kontrollierst du nicht.
Das Einzige, was dich rettet, kennst du bereits:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

Die Mechanik ist dieselbe wie zuvor: Jede Koroutine besitzt in ihrem
Moment exklusiv eine Verbindung, Transaktionen sind angepinnt, und
eine abgebrochene Verbindung wird still durch eine frische ersetzt.
Aber `POOL_MAX` hat nun eine neue Aufgabe. Es ist jetzt eine Sicherung
zwischen dem Sturm und der Datenbank: Tausend nebenläufige Anfragen
stellen sich in einer Warteschlange für sechzehn Verbindungen an.
Zugegeben, das ist besser, als wenn tausend Verbindungen auf einmal
bei PostgreSQL eintreffen.

## Wessen Anfrage ist das?

Kapitel fünfzehn der ersten Serie endete mit der Frage, wo man das
"Aktuelle" speichert: den Benutzer, die Locale, den Anfrage-Bezeichner.
Damals bauten wir die Antwort auf Kontexten auf. Der Server führt diese
Geschichte zu Ende, und das auf schöne Weise.

Jeder Handler läuft in seinem eigenen Scope. Und der Anfrage-Scope hat
einen Kontext, der über den gesamten Koroutinenbaum dieser Anfrage
geteilt wird:

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... selbst zehn Aufrufebenen tiefer ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` kann aus dem Handler aufgerufen werden. Aus einer Koroutine,
die er erzeugt hat. Aus einer Koroutine innerhalb einer `TaskGroup`
innerhalb eines Service innerhalb eines Repository. Es spielt keine
Rolle: `request_context()` ist überall ein und dasselbe, solange wir
uns innerhalb dieser Anfrage befinden. Und die benachbarte Anfrage,
die gerade verschränkt mit unserer verarbeitet wird? Sie hat ihre
eigene. Dreihundert nebenläufige Anfragen, dreihundert unabhängige
`request_id`s, null globale Variablen.

Der Unterschied zu `current_context()` lässt sich nun in einer Zeile
formulieren: Jener bezieht sich auf eine einzelne Koroutine, dieser
auf die ganze Anfrage.

## Der Scope räumt nach der Anfrage auf

Und die letzte Folge, die unsichtbarste und die wertvollste. Weil der
Handler in einem Scope lebt, gilt das gesamte Kapitel acht der ersten
Serie automatisch für die Anfrage, ohne eine einzige Aktion deinerseits.

Eine Koroutine erzeugt und vergessen, sie abzuwarten? Die Anfrage
endet, der Scope räumt auf. Der Client hat die Verbindung auf halbem
Weg abgebrochen? Der Server bricht den Anfrage-Scope ab, die
Cancellation erreicht kooperativ jede Kind-Koroutine, und jedes
`finally` gibt das Seine frei. Erinnerst du dich, wie viel Disziplin
strukturierte Nebenläufigkeit verlangte? Hier hörte sie auf, Disziplin
zu sein. Sie ist jetzt eine Eigenschaft der Plattform: Das Leben jeder
Anfrage-Koroutine ist durch die Anfrage selbst begrenzt. Punkt.

Das war es für den unsichtbaren Teil des Servers. Als Nächstes kommen
Bytes, und zwar reichlich: Der Client lädt eine Gigabyte-Datei hoch,
und wir reichen einen Zwei-Gigabyte-Bericht zurück. Wohin mit all dem,
damit wir nicht den OOM-Killer wecken? Genau darum geht es im nächsten
Kapitel.
