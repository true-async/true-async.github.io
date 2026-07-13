---
layout: tutorial
lang: it
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /it/tutors/02-cancellation.html
page_title: "Cancellazione"
description: "Come funziona cancel() e la cancellazione cooperativa delle coroutine."
---

# Cancellazione

Nell'esempio precedente c'era un'interessante chiamata alla funzione `cancel`,
```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        delay(1000);
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Cosa succede se la rimuoviamo? Provalo tu stesso.
La coroutine `$progress` gira in un ciclo infinito con un ritardo di 1 secondo.
Quando `processUsers` termina, il controllo prosegue. La coroutine `$progress` continua a girare.
Per sempre. Non si fermerà mai. Il processo PHP non si fermerà mai (a meno che non venga terminato dall'esterno).

`$progress->cancel()` ferma la coroutine `$progress`. Ma come?

```php
use function Async\spawn;
use function Async\delay;

$progress = spawn(function() use (&$counter, $total) {
    while (true) {
        printProgress($counter, $total);
        
        try {
            delay(1000);
        } catch (Throwable $e) {
            echo get_class($e). PHP_EOL;
            throw $e;
        }
    }
});

processUsers('users.csv', $counter);
$progress->cancel();
```

Modifichiamo il codice attorno a `delay(1000)` e vediamo cosa succede:
```bash
Async\AsyncCancellation
```

Quando la coroutine `$progress` era addormentata dentro `delay(1000)` ed è stata poi chiamata `cancel()`,
`delay` ha lanciato un'eccezione `Async\AsyncCancellation`. È interessante notare che questo trucco non funziona con `sleep(1)`,
poiché `sleep(1)` non lancia un'eccezione, mentre `delay` sì, ed è esattamente su questo che ci basiamo qui.

Si potrebbe dire che usare `delay` nel tuo codice stabilisce di fatto un contratto che consente ad altro codice
di interrompere l'esecuzione della coroutine. Questo è molto comodo, poiché ancora una volta separa le responsabilità
tra i diversi moduli:
1. La coroutine non sa quando la sua esecuzione verrà interrotta.
2. Il codice che cancella la coroutine non sa esattamente come la coroutine verrà interrotta.

Una coroutine non si ferma per qualche magia, si ferma tramite un'eccezione.
Una coroutine non può essere cancellata nel mezzo di un'operazione arbitraria, ma solo in un punto in cui
essa stessa sceglie di cedere il controllo. Questo tipo di cancellazione è detto "cooperativo".
