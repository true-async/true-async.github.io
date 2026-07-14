---
layout: tutorial
lang: it
path_key: "/tutors/09-pdo-pool.html"
nav_active: docs
permalink: /it/tutors/09-pdo-pool.html
page_title: "PDO Pool"
description: "Perché le coroutine non possono condividere un solo PDO, e come il pool di connessioni integrato risolve la cosa in modo trasparente."
---

# PDO Pool

L'importazione è quasi finita: i worker verificano gli indirizzi tramite `GeoDirectory`. Tutto
ciò che resta è salvare gli indirizzi verificati nel database. Sembra banale:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret');

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue, $pdo) {
        foreach ($queue as $address) {
                checkAddress($address);
                saveAddress($pdo, $address);
        }
    });
}
```

Un unico oggetto `PDO` condiviso da dieci coroutine. Nel capitolo sui canali abbiamo detto
che le corse critiche sui dati non avvengono in un singolo thread, quindi dovrebbe andare bene,
giusto?

No. Questo è vero per la memoria. Ma una connessione al database non è memoria, è un
protocollo su un socket: richiesta, risposta, richiesta, risposta, rigorosamente
in ordine. Ogni query al database è un punto di attesa in cui una coroutine va a
dormire e il controllo passa a un'altra. E quell'altra scrive la propria
query nello stesso identico socket:

```php
// Worker 1
$pdo->beginTransaction();
$pdo->exec("INSERT INTO addresses ...");
// punto di attesa: il worker 1 va a dormire, il worker 2 si sveglia

// Worker 2
$pdo->beginTransaction(); // sulla stessa connessione!
$pdo->exec("UPDATE ...");
$pdo->commit(); // esegue il commit sia della propria transazione sia di quella di un altro
```

Le risposte si mescolano, le transazioni fanno il commit del lavoro altrui. Le
corse sono tornate, solo che ora vivono nella connessione invece che in memoria.

Va bene, allora diamo a ogni coroutine la propria connessione?

```php
$workers->spawn(function () use ($queue) {
    $pdo = new PDO(/* ... */); // la propria connessione
    // ...
});
```

Va bene per dieci worker. Ma immagina non un lavoro di importazione, ma un server, dove una
coroutine viene creata per ogni richiesta. Mille coroutine significano
mille connessioni TCP. MySQL ne consente 151 per impostazione predefinita, PostgreSQL 100. E
aprire una connessione per pochi millisecondi di lavoro è semplicemente costoso: l'handshake
con il database può richiedere più tempo della query stessa.

Suona familiare? Il capitolo sui canali aveva lo stesso bivio sulla strada:
centomila connessioni a `GeoDirectory`, o una coda per dieci.

## Un pool: una coda al contrario

La soluzione si chiama pool di connessioni: apri N connessioni in anticipo
e le consegni alle coroutine per la durata del loro lavoro. Come si dà il caso,
sappiamo già come costruirne uno. Un pool è un canale che contiene connessioni:

```php
$pool = new Channel(5);

for ($i = 0; $i < 5; $i++) {
    $pool->send(new PDO(/* ... */));
}

// Dentro una coroutine:
$pdo = $pool->recv();   // prende una connessione
saveAddress($pdo, $address);
$pool->send($pdo);      // la restituisce
```

Le connessioni libere stanno nel buffer. Se sono tutte occupate, `recv` mette la
coroutine a dormire finché qualcuno non restituisce una connessione. La stessa
sincronizzazione del capitolo precedente, solo che la coda contiene risorse
invece di compiti.

Lo schema funziona, ma ha un punto debole: devi ricordarti di restituire la
connessione, qualunque cosa accada, incluse un'eccezione o una cancellazione.
E poi ci sono le transazioni, le connessioni interrotte, le riconnessioni. Per PDO,
di tutto questo si è già preso carico qualcuno, proprio nel core.

## PDO Pool

Il pool è integrato in `PDO` stesso e si attiva tramite attributi del
costruttore:

```php
$pdo = new PDO('mysql:host=localhost;dbname=profiles', 'app', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN     => 2,
    PDO::ATTR_POOL_MAX     => 10,
]);
```

Dall'esterno, nulla è cambiato: quel primissimo esempio, dove un singolo
`$pdo` va a dieci worker, ora è corretto. L'oggetto `$pdo` non è
più una connessione, è una facciata per il pool. Quando una coroutine esegue la sua
prima query, il pool le consegna una connessione dedicata, e tutte le query di quella
coroutine passano attraverso di essa. Una volta che la coroutine finisce, la
connessione torna al pool, pronta per la prossima coroutine.

Nessun `recv` e `send` manuale: l'acquisizione e la restituzione avvengono da sole, nei
momenti giusti, qualunque cosa succeda. Il codice sembra
normale PHP sincrono con un normale PDO, ed era proprio questa l'idea.

## Transazioni

Una transazione è uno stato che appartiene a una connessione, quindi il pool la tratta
in modo speciale: mentre una transazione è aperta, la connessione è vincolata alla sua
coroutine e non torna al pool:

```php
$workers->spawn(function () use ($pdo, $queue) {
    // ...
    $pdo->beginTransaction();
    $pdo->exec("INSERT INTO addresses (user_id, region) VALUES (...)");
    $pdo->exec("UPDATE users SET address_checked = 1 WHERE id = ...");
    $pdo->commit();
    // solo ora la connessione può tornare al pool
});
```

Cosa succede se una coroutine finisce senza chiamare `commit`? Ricorda il capitolo su
Scope: un worker potrebbe essere cancellato proprio nel mezzo di una transazione, e
questo è uno scenario normale, non una catastrofe. Prima di restituire la connessione,
il pool esegue automaticamente un `ROLLBACK`. Una transazione non terminata non trapelerà
nella prossima coroutine né rimarrà in giro nel database.

## Quando una connessione cade

Un'importazione può durare un'ora. Nel giro di un'ora, il database potrebbe riavviarsi,
la rete potrebbe avere un singhiozzo, o un DBA potrebbe terminare una sessione. Nel PHP classico lo
script semplicemente andrebbe in crash, ma un'applicazione a lunga esecuzione deve essere in grado
di continuare.

Il pool controlla le connessioni quando vengono restituite: una difettosa viene
distrutta invece di essere consegnata alla prossima coroutine. E se una query
fallisce a causa di una connessione caduta, basta riprovarla sullo stesso
`$pdo`, il pool consegnerà alla coroutine una connessione fresca:

```php
try {
    saveAddress($pdo, $address);
} catch (PDOException $e) {
    saveAddress($pdo, $address); // il pool ha già sostituito con una nuova connessione
}
```

Non serve scrivere logica di riconnessione, non serve ricreare l'oggetto `PDO`. Basta
riprovare la query, il pool si occupa di tutto il resto.

Alla fine, il codice funziona come se ogni coroutine avesse la propria connessione al
database. In realtà ci sono solo dieci connessioni, e il pool
le passa costantemente di mano in mano, tiene d'occhio le transazioni e
scarta quelle morte. Ma niente di tutto questo lavoro di cucina si vede
dall'esterno, ed è questo il beneficio principale: scriviamo semplicemente codice ordinario con PDO.

A proposito, i nostri worker lavorano ancora mezzi ciechi: verificano gli indirizzi
e li salvano, ma nessuno conta quanti indirizzi si sono rivelati sbagliati,
o quali. Come otteniamo i risultati dalle coroutine e li raccogliamo
comodamente? Questo è ciò che affronteremo nel prossimo capitolo.
