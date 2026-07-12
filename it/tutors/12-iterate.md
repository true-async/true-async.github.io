---
layout: tutorial
lang: it
path_key: "/tutors/12-iterate.html"
nav_active: docs
permalink: /it/tutors/12-iterate.html
page_title: "Iteratore Concorrente"
description: "iterate(): percorrere una collezione in modo concorrente in una sola riga, generatori e uscita anticipata."
---

# Iteratore Concorrente

Contiamo quante volte abbiamo costruito lo stesso pattern. Nel capitolo sui canali: un canale,
dieci worker, un ciclo `recv`. Nel capitolo su TaskGroup: `concurrency: 10`, un ciclo `spawn`,
`close()`. Nel capitolo su TaskSet: la stessa cosa, ma consumando i risultati. Ogni volta, il
compito suonava uguale: percorrere una collezione, svolgere lavoro concorrente su ogni elemento e
non superare mai il limite.

Un pattern così comune merita una funzione tutta sua:

```php
use function Async\iterate;

iterate($addresses, checkAddress(...), concurrency: 10);
```

Ed ecco l'intero pool di worker. `iterate` chiama la funzione per ogni elemento della collezione
nella propria coroutine, si assicura che non ne girino più di dieci in modo concorrente, e
restituisce il controllo una volta che tutto è stato elaborato.

## Un generatore invece di un array

Un momento, e la lettura del file? Raccogliere centomila indirizzi in un array solo per chiamare
`iterate` sarebbe un passo indietro: la contropressione (back-pressure) del capitolo sui canali era
proprio ciò che ci risparmiava memoria. Nessun problema: `iterate` accetta non solo un array ma
qualsiasi `Traversable`, generatori inclusi:

```php
function addresses(string $path): Generator
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);
    $addressIndex = array_search('address', $header);

    while (($row = fgetcsv($handle)) !== false) {
        yield $row[$addressIndex];
    }

    fclose($handle);
}

iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
```

Il generatore legge il file in modo pigro, una riga alla volta. `iterate` preleva il prossimo
indirizzo solo quando si libera uno slot, così il file non viene mai tenuto in memoria tutto in
una volta. È la stessa contropressione che ti offre un canale con buffer, solo che ora è
invisibile: tutto ciò che resta è una singola riga che esprime l'intento.

## Uscita anticipata

La funzione gestore può fermare l'intero percorso restituendo `false`:

```php
$broken = 0;

iterate(addresses('users.csv'), function (string $address) use (&$broken) {
    if (!checkAddress($address)) {
        $broken++;
    }

    if ($broken >= 100) {
        return false; // il file è corrotto, inutile continuare
    }
}, concurrency: 10);
```

Cento indirizzi non validi di fila sono un segno affidabile che ci hanno passato il file
sbagliato. Nessun nuovo elemento parte dopo il `false`, le coroutine già in esecuzione finiscono
quello che stanno facendo, e `iterate` restituisce il controllo.

Le eccezioni sono più severe, e conosci già la regola da Scope: un errore in qualsiasi gestore
ferma il percorso, annulla le coroutine rimanenti e si propaga verso l'esterno. Fallire insieme
per impostazione predefinita:

```php
try {
    iterate(addresses('users.csv'), checkAddress(...), concurrency: 10);
} catch (RemoteApiException $e) {
    echo "Importazione interrotta: {$e->getMessage()}\n";
}
```

Non c'è alcuna magia dietro: dentro `iterate` vive un ordinario scope figlio dal capitolo otto, ed
è lui a tenere tutto in ordine.

## Una scala di astrazioni

Nel corso di sei capitoli ha preso forma un'intera scala, e vale la pena ripercorrerla ancora una
volta, dal basso verso l'alto:

- **Un canale + Scope** — le primitive. Qualsiasi topologia: pool, pipeline, rendezvous,
  supervisori. Massimo controllo, massimo codice.
- **`TaskGroup` / `TaskSet`** — assemblaggi già pronti per un insieme di task, quando ti servono
  i risultati: tutti, il primo, il primo che ha successo, oppure uno alla volta man mano che
  diventano pronti.
- **`iterate()`** — una sola riga, quando non ti serve il risultato e devi solo percorrere una
  collezione in modo concorrente.

Più in alto sulla scala, meno codice e più stretto lo scenario. Parti dall'alto: se `iterate`
basta, non c'è motivo di costruire un gruppo; se un gruppo non basta, scendi ai canali. In fondo
puoi assemblare qualsiasi costruzione ti piaccia; in cima, è già tutto assemblato per te.

Nota cosa è successo alla nostra importazione: capitolo dopo capitolo ha continuato a ridursi,
finché non è finalmente entrata in una sola riga. È esattamente come dovrebbe essere. La
concorrenza smette di essere un evento e diventa uno strumento ordinario, proprio come `foreach`.

Ma una domanda del capitolo nove è ancora in sospeso. Per PDO, il pool di connessioni è integrato
nel core, mentre `checkAddress` parla con `GeoDirectory` via HTTP. Anche le sue connessioni vale la
pena riutilizzarle, e non solo le sue: socket, client, oggetti pesanti in generale. Dobbiamo
davvero costruire a mano un pool da un canale ogni singola volta? Per fortuna no, e il prossimo
capitolo ti mostrerà perché.
