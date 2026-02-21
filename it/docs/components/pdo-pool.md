---
layout: docs
lang: it
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /it/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- pool di connessioni database integrato per le coroutine: pooling trasparente, transazioni, rollback automatico."
---

# PDO Pool: Pool di Connessioni al Database

## Il Problema

Quando si lavora con le coroutine, sorge il problema della condivisione dei descrittori di I/O.
Se lo stesso socket viene usato da due coroutine che contemporaneamente scrivono o leggono
pacchetti diversi da esso, i dati si mescolano e il risultato è imprevedibile.
Pertanto, non puoi semplicemente usare lo stesso oggetto `PDO` in diverse coroutine!

D'altra parte, creare una connessione separata per ogni coroutine è una strategia molto dispendiosa.
Annulla i vantaggi dell'I/O concorrente. Pertanto, tipicamente si usano pool di connessioni
per interagire con API esterne, database e altre risorse.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Dieci coroutine usano contemporaneamente lo stesso $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Un'altra coroutine ha già chiamato COMMIT su questa stessa connessione!
        $pdo->commit(); // Caos
    });
}
```

Potresti creare una connessione separata in ogni coroutine, ma con mille coroutine otterresti mille connessioni TCP.
MySQL permette 151 connessioni simultanee per impostazione predefinita. PostgreSQL -- 100.

## La Soluzione: PDO Pool

**PDO Pool** -- un pool di connessioni al database integrato nel core di PHP.
Dà automaticamente a ogni coroutine la propria connessione da un set pre-preparato
e la restituisce quando la coroutine ha finito di lavorare.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Dieci coroutine -- ognuna ottiene la propria connessione
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Il pool alloca automaticamente una connessione per questa coroutine
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // La connessione viene restituita al pool
    });
}
```

Dall'esterno, il codice appare come se si stesse lavorando con un normale `PDO`. Il pool è completamente trasparente.

## Come Abilitarlo

Il pool viene abilitato tramite gli attributi del costruttore `PDO`:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Abilita il pool
    PDO::ATTR_POOL_MIN                  => 0,     // Connessioni minime (predefinito 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Connessioni massime (predefinito 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Intervallo di health check (sec, 0 = disabilitato)
]);
```

| Attributo                   | Significato                                                          | Predefinito |
|-----------------------------|----------------------------------------------------------------------|-------------|
| `POOL_ENABLED`              | Abilita il pool                                                      | `false`     |
| `POOL_MIN`                  | Numero minimo di connessioni mantenute aperte dal pool               | `0`         |
| `POOL_MAX`                  | Numero massimo di connessioni simultanee                             | `10`        |
| `POOL_HEALTHCHECK_INTERVAL` | Quanto spesso verificare che una connessione sia attiva (in secondi) | `0`         |

## Associazione delle Connessioni alle Coroutine

Ogni coroutine ottiene la **propria** connessione dal pool. Tutte le chiamate a `query()`, `exec()`, `prepare()`
all'interno di una singola coroutine passano attraverso la stessa connessione.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Tutte e tre le query passano attraverso la connessione #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Coroutine terminata -- la connessione #1 torna al pool
});

$coro2 = spawn(function() use ($pdo) {
    // Tutte le query passano attraverso la connessione #2
    $pdo->query("SELECT 4");
    // Coroutine terminata -- la connessione #2 torna al pool
});
```

Se una coroutine non sta più usando la connessione (nessuna transazione o statement attivo),
il pool potrebbe restituirla prima -- senza attendere la fine della coroutine.

## Transazioni

Le transazioni funzionano come nel PDO normale. Ma il pool garantisce
che finché una transazione è attiva, la connessione è **vincolata** alla coroutine e non tornerà al pool.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Solo dopo il commit la connessione può tornare al pool
});
```

### Rollback Automatico

Se una coroutine termina senza chiamare `commit()`, il pool esegue automaticamente il rollback della transazione
prima di restituire la connessione al pool. Questa è una protezione contro la perdita accidentale di dati.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Dimenticato commit()
    // Coroutine terminata -- il pool chiamerà ROLLBACK automaticamente
});
```

## Ciclo di Vita della Connessione

![Ciclo di vita della connessione nel pool](/diagrams/it/components-pdo-pool/connection-lifecycle.svg)

Un diagramma tecnico dettagliato con le chiamate interne si trova in [Architettura del PDO Pool](/it/architecture/pdo-pool.html).

## Accesso all'Oggetto Pool

Il metodo `getPool()` restituisce l'oggetto `Async\Pool` attraverso il quale puoi ottenere statistiche:

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool attivo: " . get_class($pool) . "\n"; // Async\Pool
}
```

Se il pool non è abilitato, `getPool()` restituisce `null`.

## Quando Usarlo

**Usa PDO Pool quando:**
- L'applicazione funziona in modalità asincrona con TrueAsync
- Più coroutine accedono contemporaneamente al database
- Devi limitare il numero di connessioni al database

**Non necessario quando:**
- L'applicazione è sincrona (PHP classico)
- Solo una coroutine lavora con il database
- Vengono usate connessioni persistenti (sono incompatibili con il pool)

## Driver Supportati

| Driver       | Supporto Pool |
|--------------|---------------|
| `pdo_mysql`  | Si            |
| `pdo_pgsql`  | Si            |
| `pdo_sqlite` | Si            |
| `pdo_odbc`   | No            |

## Gestione degli Errori

Se il pool non riesce a creare una connessione (credenziali errate, server non disponibile),
l'eccezione viene propagata alla coroutine che ha richiesto la connessione:

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
        echo "Connessione fallita: " . $e->getMessage() . "\n";
    }
});
```

Nota `POOL_MIN => 0`: se imposti il minimo superiore a zero, il pool tenterà
di creare le connessioni in anticipo, e l'errore si verificherà alla creazione dell'oggetto PDO.

## Esempio Reale: Elaborazione Parallela degli Ordini

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Ottieni la lista degli ordini da elaborare
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Ogni coroutine ottiene la propria connessione dal pool
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

// Attendi il completamento di tutte le coroutine
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Ordine #$processedId elaborato\n";
}
```

Dieci ordini vengono elaborati concorrentemente, ma attraverso un massimo di cinque connessioni al database.
Ogni transazione è isolata. Le connessioni vengono riutilizzate tra le coroutine.

## Cosa Leggere Dopo?

- [Demo Interattiva PDO Pool](/it/interactive/pdo-pool-demo.html) -- una dimostrazione visiva del funzionamento del pool di connessioni
- [Architettura PDO Pool](/it/architecture/pdo-pool.html) -- internals del pool, diagrammi, ciclo di vita delle connessioni
- [Coroutine](/it/docs/components/coroutines.html) -- come funzionano le coroutine
- [Scope](/it/docs/components/scope.html) -- gestione di gruppi di coroutine
- [spawn()](/it/docs/reference/spawn.html) -- lancio delle coroutine
- [await()](/it/docs/reference/await.html) -- attesa dei risultati
