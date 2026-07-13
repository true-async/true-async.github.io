---
layout: tutorial
lang: it
path_key: "/tutors-server/03-concurrency-inside.html"
nav_active: docs
permalink: /it/tutors-server/03-concurrency-inside.html
page_title: "Concorrenza dentro una richiesta"
description: "TaskGroup in un handler, il PDO Pool sotto carico e request_context()."
---

# Concorrenza dentro una richiesta

Nel capitolo precedente `showProfile` caricava il profilo in una sola
riga, e ho onestamente finto che dietro non ci fosse nulla. È ora di
confessare. Dietro ci sono tre fonti: i dati utente dal database, gli
ordini dal database, le recensioni da un'API esterna. Tre viaggi
indipendenti per i dati.

Un problema familiare? Certo. È il capitolo dieci della prima serie
parola per parola, e la soluzione si trasporta senza una singola
modifica:

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

Le tre richieste partono in modo concorrente. La pagina si assembla nel
tempo della fonte più lenta, non nella somma di tutte e tre. C'è un
timeout, c'è il fail-together, c'è `CompositeException`.

Qui è importante cogliere una cosa: il server non ha introdotto nessuna
regola di concorrenza propria. Nessunissima. L'handler è una coroutine
ordinaria, e al suo interno funziona tutto ciò che già conosci. Il
server ha solo aperto una porta attraverso cui le richieste HTTP entrano
nel mondo che già conosci.

## Il pool sotto carico reale

Ricordi il capitolo nove della prima serie? Dieci worker di import, un
oggetto `PDO`, transazioni aggrovigliate, caos. Allora era un esempio
didattico con dieci coroutine. Bene, dimenticati dei dieci.

In un server, ci sono tanti utenti concorrenti del database quante sono
le richieste attualmente in volo. Venti. Cinquecento. Quante ne porta
il traffico, e quel numero non lo controlli tu. L'unica cosa che ti
salva, la conosci già:

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 4,
    PDO::ATTR_POOL_MAX     => 16,
]);
```

La meccanica è la stessa di prima: ogni coroutine possiede una
connessione in modo esclusivo nel suo momento, le transazioni sono
vincolate, e una connessione caduta viene silenziosamente sostituita con
una nuova. Ma `POOL_MAX` ha un nuovo compito ora. È diventato un
fusibile tra la tempesta e il database: mille richieste concorrenti si
metteranno in coda per sedici connessioni. Concordi, è meglio di mille
connessioni che arrivano a PostgreSQL tutte insieme.

## Di chi è questa richiesta?

Il capitolo quindici della prima serie si concludeva con la domanda su
dove memorizzare il "corrente": l'utente, la locale, l'identificatore
della richiesta. Allora costruimmo la risposta sui context. Il server
porta questa storia fino in fondo, e lo fa splendidamente.

Ogni handler viene eseguito nel proprio scope. E lo scope della
richiesta ha un context condiviso su tutto l'albero di coroutine di
quella richiesta:

```php
use function Async\request_context;
use function Async\spawn;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    request_context()
        ->set('request_id', $req->getHeader('x-request-id') ?? bin2hex(random_bytes(8)))
        ->set('user_id', authenticate($req));

    // ... anche dieci livelli di chiamate più in profondità ...
});

function logInfo(string $message): void
{
    $requestId = request_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

`logInfo` può essere chiamata dall'handler. Da una coroutine che ha
generato. Da una coroutine dentro un `TaskGroup` dentro un service dentro
un repository. Non importa: `request_context()` è una sola e la stessa
ovunque, finché siamo dentro questa richiesta. E la richiesta vicina, in
elaborazione intercalata con la nostra proprio ora? Ha la sua. Trecento
richieste concorrenti, trecento `request_id` indipendenti, zero
variabili globali.

La differenza rispetto a `current_context()` ora si può esprimere in una
riga: quello riguarda una singola coroutine, questo riguarda l'intera
richiesta.

## Lo scope pulisce dopo la richiesta

E l'ultima conseguenza, la più invisibile e la più preziosa. Poiché
l'handler vive in uno scope, tutto il capitolo otto della prima serie si
applica alla richiesta automaticamente, senza una singola azione da
parte tua.

Hai generato una coroutine e ti sei dimenticato di attenderla? La
richiesta termina, lo scope pulisce. Il client ha interrotto la
connessione a metà? Il server cancella lo scope della richiesta, la
cancellazione raggiunge in modo cooperativo ogni coroutine figlia, e
ogni `finally` rilascia il proprio. Ricordi quanta disciplina esigeva la
concorrenza strutturata? Qui ha smesso di essere disciplina. Ora è una
proprietà della piattaforma: la vita di qualsiasi coroutine di richiesta
è delimitata dalla richiesta stessa. Punto e basta.

Questo è tutto per la parte invisibile del server. Poi vengono i byte, e
in gran quantità: il client carica un file da un gigabyte, e noi
restituiamo un report da due gigabyte. Dove mettiamo tutto questo per
non svegliare l'OOM killer? Il prossimo capitolo è esattamente su
questo.
