---
layout: tutorial
lang: it
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /it/tutors/01-coroutines.html
page_title: "Coroutine"
description: "Un primo sguardo alle coroutine: spawn() ed esecuzione concorrente."
---

# Creare le coroutine

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

La funzione `counter` stampa un contatore a schermo con una pausa di un secondo:

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

Ogni volta che viene chiamata `sleep`, il thread PHP si mette in pausa per la durata indicata.
Durante quel tempo, letteralmente non fa nulla.
Lo script PHP viene eseguito per 5 secondi, esattamente per il tempo in cui la funzione stessa attende.

Cosa succede se eseguiamo la funzione `counter` all'interno di una coroutine?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

Ora l'output si alterna:
```bash
A: 1
B: 1
A: 2
B: 2
A: 3
B: 3
A: 4
B: 4
A: 5
B: 5
```

Il tempo totale di esecuzione dello script è ancora circa 5 secondi, eppure ora lo script si comporta come se stesse eseguendo due funzioni "in modo concorrente".
Quindi cosa sta succedendo davvero?

`spawn` crea un secondo flusso logico di controllo, "B", all'interno del quale viene eseguita la funzione `counter`.
Quando il flusso "A" raggiunge `sleep`, invece di bloccare tutto PHP, cede il controllo all'altro flusso
logico, "B". E così via:

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## Qual è il vantaggio?

Immagina che la funzione `counter` sia normale codice sequenziale che esegue operazioni di I/O e
lavoro con timer (`sleep`). Le operazioni di I/O sono gestite dal kernel del sistema operativo, quindi il codice PHP deve
attenderle. Nel frattempo, PHP potrebbe fare qualcos'altro.
Le coroutine ti permettono di riempire quel tempo di attesa con lavoro utile, senza creare processi, thread,
sincronizzazione, corse critiche e i molti altri orrori della programmazione parallela.

Vediamo un esempio pratico:

```php
function processUsers(string $path, &$counter): void 
{
    $handle = fopen($path, 'r');
    $header = fgetcsv($handle);

    $loginIndex = array_search('login', $header);
    $emailIndex = array_search('email', $header);

    while (($row = fgetcsv($handle)) !== false) {
        $login = $row[$loginIndex];
        $email = $row[$emailIndex];        
        $counter++;
    }

    fclose($handle);
}
```

La funzione `processUsers` legge un file CSV ed elabora ogni riga.
Il file è grande e non c'è bisogno di stampare ogni riga a schermo, ma sarebbe utile vedere l'avanzamento.
Potremmo ridisegnare la barra di avanzamento a ogni iterazione, ma questo penalizzerebbe le prestazioni di elaborazione.
Potremmo ridisegnarla ogni 100 iterazioni, ma le righe possono richiedere tempi di elaborazione diversi.
Come mostriamo l'avanzamento in modo fluido, a intervalli all'incirca uniformi?

```php
use function Async\spawn;
use function Async\delay;

function printProgress(int $current, int $total, int $width = 30): void
{
    $ratio = $total > 0 ? $current / $total : 1;
    $filled = (int) round($ratio * $width);

    $bar = str_repeat('=', $filled) . str_repeat(' ', $width - $filled);

    echo "\r[$bar] " . round($ratio * 100) . "%";
}

$counter = 0;
$total = 100_000;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Questo si può ottenere con la coroutine `$progress`, che mostra l'avanzamento corrente una volta al secondo.
Si basa sulla variabile `$counter`, che viene incrementata all'interno della funzione `processUsers` e passata
alla coroutine per riferimento.

```bash
[====>                         ] 15%
```

La bellezza di questa soluzione è che `printProgress` non sa nulla di `processUsers`, e viceversa.
Non dipendono l'una dall'altra, eppure lavorano insieme.

In altre parole, le coroutine non creano soltanto l'illusione di un'esecuzione concorrente, ma aiutano anche
a separare le responsabilità.

Hai notato `$progress->cancel()`? A cosa serve, esattamente?
