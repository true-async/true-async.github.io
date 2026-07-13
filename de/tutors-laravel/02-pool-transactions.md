---
layout: tutorial
lang: de
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /de/tutors-laravel/02-pool-transactions.html
page_title: "Connection Pool und Transaktionen"
description: "PDO Pool unter Eloquent und CoroutineTransactions: warum der Zähler für verschachtelte Transaktionen nicht auf einer Connection-Eigenschaft bleiben kann."
---

# Connection Pool und Transaktionen

`Auth`, `session`, `request`: das haben wir im vorherigen Kapitel geklärt,
Kontext plus ein Proxy, und das Framework hat aufgehört, Anfragen zu
verwechseln. Die Datenbank wirkt sogar noch einfacher: Kapitel neun der
Core-Serie hat das bereits gelöst, der `PDO Pool` gibt jeder Coroutine
ihre eigene Verbindung und nimmt sie von selbst wieder zurück. Was könnte
hier für `Eloquent` schon schiefgehen?

Es kann etwas schiefgehen. Der Pool verwaltet die Verbindung transparent.
Aber er weiß nichts über ein anderes Stück Zustand, das `Laravel` direkt
neben dieser Verbindung aufbewahrt: den Zähler für die
Transaktionsverschachtelung.

## Wo `transactionLevel()` lebt

Innerhalb von `Illuminate\Database\Connection` gibt es eine ganz
gewöhnliche Instanz-Eigenschaft:

```php
protected $transactions = 0;
```

`beginTransaction()` erhöht sie, `commit()` und `rollBack()` verringern
sie. Solange eine `Connection` einen Prozess bedient, ergibt das
vollkommen Sinn: eine Eigenschaft, eine Transaktion. Aber `PDO Pool`
arbeitet eine Ebene unter `Connection`. Er tauscht die physische
Verbindung unter dem Objekt aus, während das `Connection`-Objekt selbst,
an dem `$this->transactions` hängt, weiterhin eine einzige Instanz ist,
die vom gesamten `DatabaseManager` geteilt wird.

Spielen wir das Szenario aus dem vorherigen Kapitel noch einmal durch,
diesmal mit der Datenbank:

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // die Coroutine schläft genau innerhalb der Transaktion ein
    });

    $response->json(['ok' => true]);
});
```

Zwei Anfragen betreten `DB::transaction()` nebenläufig. Beide physischen
Verbindungen werden vom Pool ehrlich vergeben, jede ihre eigene. Aber
`$this->transactions` ist für beide dieselbe Zahl auf demselben
`Connection`-Objekt. Die erste Coroutine erhöht den Zähler auf `1`, dann
schläft sie ein. Die zweite erhöht ihn ebenfalls, aber jetzt auf `2`,
obwohl es für sie eigentlich eine äußere Transaktion auf Ebene `1` hätte
sein sollen. `commit()` in der ersten Coroutine multipliziert gegen die
falsche Verschachtelungsebene, und Laravel gibt still ein `SAVEPOINT`
aus, wo es keins geben sollte, oder committet vorzeitig eine Transaktion,
die eine benachbarte Coroutine noch offen hält.

## Gleiches Rezept, anderer Geltungsbereich: Coroutine, nicht der Anfragebaum

Im vorherigen Kapitel lebte der `auth`-Zustand im Scope-Kontext, weil er
über alle Coroutinen einer Anfrage geteilt wird. Der Transaktionszähler
ist anders aufgebaut: `PDO Pool` vergibt eine physische Verbindung pro
*Coroutine*, nicht pro gesamter Anfrage (eine parallele `TaskGroup`
innerhalb eines Handlers bekommt zwei separate Verbindungen aus dem
Pool). Der Zähler muss also im Coroutine-Kontext leben, nicht im
Scope-Kontext:

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack() und die Fehlerbehandler
    // werden auf dieselbe Weise überschrieben: statt $this->transactions
    // zu lesen und zu schreiben, gehen sie über
    // setTransactionLevel()/transactionLevel().
}
```

`coroutine_context()` versus `current_context()`, das ist genau die
Grenze, die schon im `Context`-Kapitel der Core-Serie besprochen wurde:
der erste ist privat für eine einzelne Coroutine, der zweite wird über
den gesamten Coroutine-Baum einer Anfrage geteilt. Die Wahl hier ist
keine Stilfrage, sie ist zwingend: vertauscht man sie, teilen sich zwei
parallele Datenbankausflüge innerhalb einer Anfrage wieder den
Transaktionszähler eines anderen, das Loch wandert nur eine Etage höher.

Der Trait schreibt `Connection` nicht komplett um, er greift chirurgisch
in die Methoden ein, die `$this->transactions` berühren, und er wird an
eine bestimmte Connection-Klasse angehängt:

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

Es gibt eine separate Klasse pro `DBMS`, `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`, `AsyncSqliteConnection`,
`AsyncSqlServerConnection`, weil sich Laravels Elternklassen bereits
unterscheiden, während der Trait zur Zähler-Isolierung für alle derselbe
ist.

## Warum man nicht einfach den gesamten `DatabaseManager` scopen kann

Die Versuchung liegt nahe: da wir schon wissen, wie man einen Dienst
hinter Kontext verbirgt (`ScopedServiceProxy` aus dem vorherigen
Kapitel), warum nicht dasselbe für `db` tun? Der Grund, warum das nicht
geschieht, ist ziemlich unerfreulich. `DatabaseServiceProvider::boot()`
schreibt beim Start einmal Folgendes:

```php
Model::setConnectionResolver($app['db']);
```

Das ist eine statische Eigenschaft auf der `Model`-Klasse selbst, geteilt
von jedem Model und jeder Anfrage. Würde `db` für jeden Scope
unterschiedlich aufgelöst, würde diese statische Referenz weiterhin auf
den `DatabaseManager` derjenigen Anfrage zeigen, die ihn zuerst erstellt
hat. Sobald der Scope dieser Anfrage endet und aufgeräumt wird, wird das
Objekt, auf das `Model::$resolver` zeigt, vom Garbage Collector
eingesammelt, und die statische Eigenschaft zeigt ins Leere. Das
Ergebnis sind nicht "falsche Daten", sondern der Absturz des gesamten
Prozesses.

Also bleibt `db` ein Singleton, wie es immer war. Die Isolierung der
physischen Verbindung ist die Aufgabe von `PDO Pool` auf `C`-Ebene, nicht
die des Dependency-Containers. Die Isolierung des Transaktionszählers ist
die Aufgabe des Traits auf der Ebene einer einzelnen Coroutine. Zwei
schmale, präzise Werkzeuge statt eines großen Refactorings, das
obendrein den Server zum Absturz bringen würde.

Wir haben uns mit Anfragezustand und Transaktionszustand befasst. Laravel
behandelt gewöhnliche HTTP-Antworten selbst, indem es sie komplett
puffert. Aber was, wenn die Antwort kein einmaliges Ereignis ist, sondern
ein Strom: ein Fortschrittsbalken zum Browser, oder ein Aufruf von einem
benachbarten Dienst über gRPC? Dorthin geht es im nächsten Kapitel.
