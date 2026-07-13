---
layout: tutorial
lang: de
path_key: "/tutors/13-pool.html"
nav_active: docs
permalink: /de/tutors/13-pool.html
page_title: "Pool"
description: "Async\\Pool: ein universeller Ressourcen-Pool mit Health-Checks und einem Circuit Breaker."
---

# Pool

Im Kapitel über den PDO-Pool haben wir in sechs Zeilen einen channelbasierten Pool skizziert und
sofort zugegeben, dass er für die Praxis naiv war: du musst daran denken, die Ressource
zurückzugeben, egal wie die Dinge ausgehen, kaputte Verbindungen erkennen und die toten ersetzen.
Für PDO hat der Kern all das für uns erledigt. Aber `checkAddress` spricht über HTTP mit
`GeoDirectory`, und bei jeder Anfrage eine frische Verbindung dorthin zu öffnen wäre ebenfalls
verschwenderisch. Und morgen kommt Redis fürs Caching und SMTP für E-Mails hinzu.

Wir werden doch nicht für jede einzelne Ressource von Hand einen Channel-Pool bauen. Richtig, es
gibt dafür ein fertiges Primitiv, genau das, das unter der Haube des PDO-Pools arbeitet:
`Async\Pool`.

## Factory und Destruktor

Der Pool weiß nicht, welche Art von Ressource er hält. Du sagst ihm zwei Dinge: wie man eine
Ressource erzeugt und wie man eine zerstört:

```php
use Async\Pool;

$geo = new Pool(
    factory:    fn() => new GeoConnection('geodirectory.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);
```

`min: 2` bedeutet, dass zwei Verbindungen von vornherein geöffnet werden, damit die ersten
Coroutinen nicht einen Handshake abwarten müssen. `max: 10` bedeutet, dass der Pool niemals mehr
als zehn Verbindungen erzeugt, egal wie viele Coroutinen eine anfordern. Es ist das vertraute
Nebenläufigkeitslimit, nur dass es jetzt an die Ressource selbst gebunden ist statt an eine Anzahl
von Workern.

Als Nächstes kommt der Zyklus, den wir schon von Hand mit einem Channel gebaut haben:

```php
$conn = $geo->acquire();

try {
    $verdict = $conn->request("/check?address=$address");
} finally {
    $geo->release($conn);
}
```

`acquire` gibt eine freie Ressource aus. Ist keine frei und das Limit noch nicht erreicht, erzeugt
die Factory eine neue. Ist das Limit erreicht, legt sich die Coroutine schlafen, bis jemand
anderes `release` aufruft: dieselbe Mechanik wie `recv` auf einem leeren Channel. Beachte das
`finally`: die Ressource wird zurückgegeben, egal wie die Dinge ausgehen, einschließlich einer
Ausnahme oder eines Abbruchs. Genau an dieser Stelle ist unser selbstgebauter Pool immer wieder
gestolpert.

Du kannst auch mit einem Limit warten, auf die übliche Weise:

```php
$conn = $geo->acquire(timeout: 3000); // TimeoutException, wenn sie nicht innerhalb von 3 Sekunden eintrifft
```

## Ressourcen sterben

Eine Verbindung, die eine halbe Stunde im Pool gelegen hat, kann still gestorben sein: der Server
hat sie nach einem Timeout geschlossen, das Netzwerk hatte einen Aussetzer. Wir haben im
PDO-Kapitel schon gesehen, wohin das führt: die nächste Coroutine bekommt aus dem Nichts einen
rätselhaften Fehler. Der Pool bekämpft das an drei Fronten:

```php
$geo = new Pool(
    factory:             fn() => new GeoConnection('geodirectory.example.com'),
    destructor:          fn($conn) => $conn->close(),
    healthcheck:         fn($conn) => $conn->ping(),
    beforeAcquire:       fn($conn) => $conn->isAlive(),
    beforeRelease:       fn($conn) => !$conn->isBroken(),
    min: 2,
    max: 10,
    healthcheckInterval: 30000,
);
```

- **`healthcheck`** — alle dreißig Sekunden geht der Pool von sich aus seine freien Ressourcen
  durch und prüft ihren Puls. Tote werden zerstört und durch neue ersetzt.
- **`beforeAcquire`** — eine letzte Prüfung, bevor eine Ressource ausgegeben wird. Schlägt sie
  fehl, wird die Ressource zerstört und die Coroutine bekommt die nächste.
- **`beforeRelease`** — eine Prüfung bei der Rückgabe. Eine Coroutine könnte die Verbindung
  mitten in einer Anfrage kaputtgemacht haben; eine solche Ressource wandert nicht zurück in den
  Pool.

Die Coroutinen wissen nichts von dieser Arbeit hinter den Kulissen: sie fordern eine Ressource an
und bekommen eine funktionierende. Die Gesundheitsverwaltung wird deklarativ im Konstruktor
ausgedrückt, statt als ein Haufen von `if`s über den Code verschmiert zu sein.

## Circuit Breaker

Stell dir nun vor, `GeoDirectory` fällt vollständig aus. Alle zehn Verbindungen sind tot, jede
Coroutine wartet pflichtbewusst einen Timeout ab, erzeugt eine neue Verbindung, wartet erneut. Die
Anwendung verbraucht ihre ganze Energie damit, einen bereits ausgefallenen Dienst zu bombardieren,
und hindert ihn dadurch daran, wieder hochzukommen.

Die Elektrotechnik hat für genau dies eine Lösung erfunden: einen Schutzschalter, der den
Stromkreis öffnet, bis der Fehler behoben ist. Das Muster ist danach benannt, Circuit Breaker, und
es ist in den Pool eingebaut. Der Pool hat drei Zustände: `ACTIVE`, alles funktioniert;
`INACTIVE`, der Dienst wurde für nicht verfügbar erklärt und `acquire` schlägt sofort fehl, ohne
irgendwelche Timeouts; `RECOVERING`, eine vorsichtige Prüfung, ob der Dienst wieder zum Leben
erwacht ist.

Du kannst die Zustände von Hand umschalten oder die Entscheidung an eine Strategie übergeben:

```php
use Async\CircuitBreakerStrategy;

final class FiveStrikes implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $pool): void
    {
        $this->failures = 0;
        $pool->activate();
    }

    public function reportFailure(mixed $pool, Throwable $error): void
    {
        if (++$this->failures >= 5) {
            $pool->deactivate();
        }
    }

    public function shouldRecover(): bool
    {
        return true; // Wiederherstellung bei der ersten Gelegenheit versuchen
    }
}

$geo->setCircuitBreakerStrategy(new FiveStrikes());
```

Der Pool selbst meldet der Strategie jeden Erfolg und jeden Fehlschlag einer Ressource und fragt
über `shouldRecover`, ob es Zeit ist, vorsichtig zu prüfen, ob der Dienst wieder da ist. Fünf
Fehlschläge hintereinander, und der Stromkreis öffnet sich: die Coroutinen bekommen einen schnellen
Fehlschlag statt einer langsamen Folter aus Timeouts, und `GeoDirectory` bekommt keine sinnlosen
Treffer mehr ab und darf sich in Ruhe erholen.

Rückblickend tut `Pool` genau das, was wir in Kapitel neun von Hand aus einem Channel gebaut haben,
plus alles, was man wirklich nicht von Hand bauen will: garantierte Rückgabe, Health-Checks, einen
Circuit Breaker. `PDO Pool` ist dasselbe Primitiv, nur hinter der `PDO`-Fassade verstaut. Und für
alles andere, HTTP-Clients, Redis, Sockets und schwere Objekte im Allgemeinen, gibt es `Async\Pool`.

An diesem Punkt sieht unser Arsenal beeindruckend aus: Coroutinen, Channels, Scopes, Task-Gruppen,
Pools. Aber all das läuft in einem einzigen Thread des Betriebssystems und teilt sich einen
einzigen CPU-Kern. Solange Tasks auf I/O warten, ist das niemandes Problem. Aber was, wenn die
Arbeit nicht durch Warten, sondern durch Berechnung begrenzt ist? Da ändert sich das ganze Bild,
und darum geht es im nächsten Kapitel.
