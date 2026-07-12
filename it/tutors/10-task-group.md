---
layout: tutorial
lang: it
path_key: "/tutors/10-task-group.html"
nav_active: docs
permalink: /it/tutors/10-task-group.html
page_title: "TaskGroup"
description: "TaskGroup: un gruppo di task con risultati, e le strategie di attesa all, race, any."
---

# TaskGroup

Supponiamo che la pagina del profilo di un utente sia assemblata da tre fonti: i dati utente dal
database, gli ordini dal database e le recensioni da un'API esterna. Le
fonti non dipendono l'una dall'altra, quindi dovrebbero essere richieste in modo concorrente.
Sappiamo già come farlo:

```php
$user    = spawn(fetchUser(...), $userId);
$orders  = spawn(fetchOrders(...), $userId);
$reviews = spawn(fetchReviews(...), $userId);

$profile = new UserProfile(await($user), await($orders), await($reviews));
```

Tollerabile per tre task. Ma guarda da vicino: questa è di nuovo la contabilità
manuale del capitolo su `Scope`, solo che ora ci servono anche i risultati.
Ogni coroutine deve essere ricordata e attesa, e se `fetchUser` lancia
un'eccezione, `fetchOrders` e `fetchReviews` continueranno a girare per niente:
dovrebbero essere cancellate "a mano" in un `catch`.

E ci sono task in cui l'approccio manuale diventa davvero doloroso. Per
esempio, prendere il risultato della coroutine che finisce per prima e cancellare
le altre. Prova a scriverlo con `await` in un ciclo e finirai con un
groviglio di controlli e cancellazioni.

Neanche `Scope` è di grande aiuto qui: gestisce la durata di vita delle coroutine, ma
non sa nulla dei loro risultati. Ci serve una primitiva di livello superiore.

## Un gruppo di task

`TaskGroup` raggruppa i task in un unico insieme: li esegue nel proprio `Scope`,
memorizza i loro risultati, e ti permette di attendere il gruppo come un'unica unità:

```php
use Async\TaskGroup;

$group = new TaskGroup();

$group->spawnWithKey('user',    fn() => fetchUser($userId));
$group->spawnWithKey('orders',  fn() => fetchOrders($userId));
$group->spawnWithKey('reviews', fn() => fetchReviews($userId));

$data = $group->all()->await();

$profile = new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Il metodo `all()` restituisce un familiare `Future`, che si risolve in un array di
risultati una volta che ogni task è finito. Abbiamo assegnato le chiavi noi stessi tramite
`spawnWithKey`, così l'array contiene voci con nome invece di semplici indici.

E dato che è un `Future`, un timeout arriva gratis, tramite lo stesso token di
sempre:

```php
$data = $group->all()->await(timeout(5000));
```

Se anche solo un task lancia un'eccezione, il gruppo si comporta come lo Scope del
capitolo otto: i task rimanenti vengono cancellati, e `await` lancia una
`CompositeException` che contiene tutti gli errori. Il gruppo o raccoglie
tutto, o non raccoglie nulla: non c'è uno stato intermedio.

## Il primo a finire: race

`all()` è solo una delle strategie di attesa. Ripensa a `GeoDirectory`:
ha tre repliche, e una di loro a volte è lenta. Il trucco classico:
invia la richiesta a tutte le repliche e prendi la prima risposta:

```php
$group = new TaskGroup();

foreach (['geo-1', 'geo-2', 'geo-3'] as $host) {
    $group->spawn(fn() => checkAddressAt($host, $address));
}

$verdict = $group->race()->await();
```

`race()` si risolve con il risultato del task che finisce per primo, che sia
un successo o un fallimento. Esattamente lo scenario "prendi il primo e non aspettare
il resto" che è così doloroso da scrivere a mano.

## Il primo a riuscire: any

`race()` ha un lato tagliente: se il primo task a finire risulta essere uno
fallito, ottieni la sua eccezione. A volte ti serve qualcosa di più gentile: provare più
provider e prendere la prima risposta riuscita, chiudendo un occhio sui
fallimenti:

```php
$group = new TaskGroup();

$group->spawn(fn() => geocodeViaGoogle($address));
$group->spawn(fn() => geocodeViaOsm($address));
$group->spawn(fn() => geocodeViaYandex($address));

$coords = $group->any()->await();
$group->suppressErrors();
```

`any()` ignora i fallimenti e restituisce il primo vincitore. Ottieni
un'eccezione solo se ogni task fallisce, e sarà una `CompositeException` con l'elenco
completo delle cause. Nota la chiamata a `suppressErrors()`: nessuno ha gestito gli
errori dei provider perdenti, e il gruppo vuole una conferma esplicita
che questo fosse intenzionale. Un principio familiare dal capitolo sulle
eccezioni: un errore non può semplicemente sparire in silenzio.

## Limite di concorrenza

E ora qualcosa di inaspettato. Ricorda il pool di worker del capitolo
sui canali: un canale, dieci coroutine, un ciclo di `recv`? `TaskGroup` può fare la
stessa cosa in poche righe:

```php
$group = new TaskGroup(concurrency: 10);

while (($row = fgetcsv($handle)) !== false) {
    $group->spawn(fn() => checkAddress($row[$addressIndex]));
}

$group->close();

foreach ($group as $key => [$result, $error]) {
    // i risultati arrivano man mano che diventano pronti
}
```

Il parametro `concurrency: 10` limita quanti task girano contemporaneamente: il resto
aspetta in fila e non avvia nemmeno una coroutine finché non si libera un posto.
`close()` gioca lo stesso ruolo che ha per un canale: annuncia che non arriveranno nuovi
task. E `foreach` distribuisce i risultati man mano che diventano pronti,
senza aspettare che l'intero gruppo finisca.

Vuol dire che il canale non serviva dopotutto? No. Un canale è una primitiva di
sincronizzazione con cui puoi costruire qualsiasi cosa. `TaskGroup` è un assemblaggio
già pronto per il caso più comune: "esegui un insieme di task e ottieni i
risultati". Quando un task rientra in questo schema, ricorri a `TaskGroup`; quando ti serve
una topologia non standard, i canali e Scope restano nelle tue mani.

In conclusione: `TaskGroup` è uno Scope più i risultati. Un gruppo di task si trasforma in
un singolo valore a cui puoi chiedere tutto in una volta, il primo a finire, o
il primo a riuscire.

Un ultimo dettaglio: `TaskGroup` conserva accuratamente tutti i risultati. Chiama
`race()` due volte, e otterrai la stessa risposta entrambe le volte. Itera il gruppo
con `foreach` di nuovo, e distribuisce tutto dall'inizio un'altra volta.
Per una pagina di profilo, è comodo. Ora immagina una pipeline che esegue
centomila task attraverso un gruppo. Tutto ciò che il gruppo ricorda vive
in memoria. Vedi il tranello? Di questo parleremo nel prossimo capitolo.
