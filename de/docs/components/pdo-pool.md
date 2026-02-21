---
layout: docs
lang: de
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /de/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- integrierter Datenbankverbindungspool für Koroutinen: transparentes Pooling, Transaktionen, automatisches Rollback."
---

# PDO Pool: Datenbankverbindungspool

## Das Problem

Bei der Arbeit mit Koroutinen entsteht das Problem der gemeinsamen Nutzung von I/O-Deskriptoren.
Wenn derselbe Socket von zwei Koroutinen verwendet wird, die gleichzeitig verschiedene Pakete schreiben oder lesen,
werden die Daten durcheinander gebracht und das Ergebnis ist unvorhersehbar.
Daher können Sie nicht einfach dasselbe `PDO`-Objekt in verschiedenen Koroutinen verwenden!

Andererseits ist das wiederholte Erstellen einer separaten Verbindung für jede Koroutine eine sehr verschwenderische Strategie.
Dadurch werden die Vorteile der gleichzeitigen I/O zunichte gemacht. Deshalb werden üblicherweise Verbindungspools
für die Interaktion mit externen APIs, Datenbanken und anderen Ressourcen verwendet.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Zehn Koroutinen verwenden gleichzeitig dasselbe $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Eine andere Koroutine hat bereits COMMIT auf derselben Verbindung aufgerufen!
        $pdo->commit(); // Chaos
    });
}
```

Sie könnten in jeder Koroutine eine separate Verbindung erstellen, aber bei tausend Koroutinen hätten Sie tausend TCP-Verbindungen.
MySQL erlaubt standardmäßig 151 gleichzeitige Verbindungen. PostgreSQL -- 100.

## Die Lösung: PDO Pool

**PDO Pool** -- ein in den PHP-Kern integrierter Datenbankverbindungspool.
Er gibt jeder Koroutine automatisch eine eigene Verbindung aus einem vorbereiteten Satz
und gibt sie zurück, wenn die Koroutine fertig ist.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Zehn Koroutinen -- jede bekommt ihre eigene Verbindung
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Pool weist dieser Koroutine automatisch eine Verbindung zu
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // Verbindung wird an den Pool zurückgegeben
    });
}
```

Von außen sieht der Code so aus, als würden Sie mit einem regulären `PDO` arbeiten. Der Pool ist vollständig transparent.

## Aktivierung

Der Pool wird über Attribute des `PDO`-Konstruktors aktiviert:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Pool aktivieren
    PDO::ATTR_POOL_MIN                  => 0,     // Mindestverbindungen (Standard 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Maximale Verbindungen (Standard 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Gesundheitsprüfungsintervall (Sek., 0 = deaktiviert)
]);
```

| Attribut                    | Bedeutung                                                            | Standard |
|-----------------------------|----------------------------------------------------------------------|----------|
| `POOL_ENABLED`              | Pool aktivieren                                                      | `false`  |
| `POOL_MIN`                  | Mindestanzahl an Verbindungen, die der Pool offen hält               | `0`      |
| `POOL_MAX`                  | Maximale Anzahl gleichzeitiger Verbindungen                          | `10`     |
| `POOL_HEALTHCHECK_INTERVAL` | Wie oft geprüft wird, ob eine Verbindung noch aktiv ist (in Sekunden)| `0`      |

## Bindung von Verbindungen an Koroutinen

Jede Koroutine bekommt **ihre eigene** Verbindung aus dem Pool. Alle Aufrufe von `query()`, `exec()`, `prepare()`
innerhalb einer einzelnen Koroutine gehen über dieselbe Verbindung.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Alle drei Abfragen gehen über Verbindung #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Koroutine beendet -- Verbindung #1 kehrt zum Pool zurück
});

$coro2 = spawn(function() use ($pdo) {
    // Alle Abfragen gehen über Verbindung #2
    $pdo->query("SELECT 4");
    // Koroutine beendet -- Verbindung #2 kehrt zum Pool zurück
});
```

Wenn eine Koroutine die Verbindung nicht mehr verwendet (keine aktiven Transaktionen oder Statements),
kann der Pool sie früher zurückgeben -- ohne auf das Ende der Koroutine zu warten.

## Transaktionen

Transaktionen funktionieren genauso wie bei regulärem PDO. Aber der Pool garantiert,
dass die Verbindung während einer aktiven Transaktion an die Koroutine **gebunden** bleibt und nicht zum Pool zurückkehrt.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Erst nach dem Commit kann die Verbindung zum Pool zurückkehren
});
```

### Automatisches Rollback

Wenn eine Koroutine endet, ohne `commit()` aufzurufen, führt der Pool automatisch ein Rollback der Transaktion durch,
bevor die Verbindung an den Pool zurückgegeben wird. Dies ist eine Sicherheitsmaßnahme gegen versehentlichen Datenverlust.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // commit() vergessen
    // Koroutine beendet -- Pool ruft automatisch ROLLBACK auf
});
```

## Verbindungslebenszyklus

![Verbindungslebenszyklus im Pool](/diagrams/de/components-pdo-pool/connection-lifecycle.svg)

Ein detailliertes technisches Diagramm mit internen Aufrufen finden Sie in der [PDO Pool-Architektur](/de/architecture/pdo-pool.html).

## Zugriff auf das Pool-Objekt

Die Methode `getPool()` gibt das `Async\Pool`-Objekt zurück, über das Sie Statistiken abrufen können:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool ist aktiv: " . get_class($pool) . "\n"; // Async\Pool
}
```

Wenn der Pool nicht aktiviert ist, gibt `getPool()` `null` zurück.

## Wann verwenden

**PDO Pool verwenden, wenn:**
- Die Anwendung im asynchronen Modus mit TrueAsync läuft
- Mehrere Koroutinen gleichzeitig auf die Datenbank zugreifen
- Die Anzahl der Verbindungen zur Datenbank begrenzt werden soll

**Nicht benötigt, wenn:**
- Die Anwendung synchron arbeitet (klassisches PHP)
- Nur eine Koroutine mit der Datenbank arbeitet
- Persistente Verbindungen verwendet werden (sie sind mit dem Pool inkompatibel)

## Unterstützte Treiber

| Treiber       | Pool-Unterstützung |
|---------------|-------------------|
| `pdo_mysql`   | Ja                |
| `pdo_pgsql`   | Ja                |
| `pdo_sqlite`  | Ja                |
| `pdo_odbc`    | Nein              |

## Fehlerbehandlung

Wenn der Pool keine Verbindung erstellen kann (falsche Anmeldedaten, nicht erreichbarer Server),
wird die Ausnahme an die Koroutine weitergeleitet, die die Verbindung angefordert hat:

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Verbindung fehlgeschlagen: " . $e->getMessage() . "\n";
    }
});
```

Beachten Sie `POOL_MIN => 0`: Wenn Sie das Minimum höher als null setzen, versucht der Pool
im Voraus Verbindungen zu erstellen, und der Fehler tritt beim Erstellen des PDO-Objekts auf.

## Praxisbeispiel: Parallele Bestellverarbeitung

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Liste der zu verarbeitenden Bestellungen abrufen
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Jede Koroutine bekommt ihre eigene Verbindung aus dem Pool
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// Auf den Abschluss aller Koroutinen warten
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Bestellung #$processedId verarbeitet\n";
}
```

Zehn Bestellungen werden gleichzeitig verarbeitet, aber über maximal fünf Datenbankverbindungen.
Jede Transaktion ist isoliert. Verbindungen werden zwischen Koroutinen wiederverwendet.

## Wie geht es weiter?

- [Interaktive PDO Pool-Demo](/de/interactive/pdo-pool-demo.html) -- eine visuelle Demonstration der Verbindungspool-Funktionsweise
- [PDO Pool-Architektur](/de/architecture/pdo-pool.html) -- Pool-Interna, Diagramme, Verbindungslebenszyklus
- [Koroutinen](/de/docs/components/coroutines.html) -- wie Koroutinen funktionieren
- [Scope](/de/docs/components/scope.html) -- Verwaltung von Koroutinen-Gruppen
- [spawn()](/de/docs/reference/spawn.html) -- Koroutinen starten
- [await()](/de/docs/reference/await.html) -- Ergebnisse abwarten
