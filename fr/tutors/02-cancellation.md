---
layout: tutorial
lang: fr
path_key: "/tutors/02-cancellation.html"
nav_active: docs
permalink: /fr/tutors/02-cancellation.html
page_title: "Annulation"
description: "Comment fonctionne cancel(), et l'annulation coopérative des coroutines."
---

# Annulation

Dans l'exemple précédent, il y avait un appel intéressant à la fonction `cancel`,
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

Que se passe-t-il si nous le supprimons ? Essayez par vous-même.
La coroutine `$progress` tourne dans une boucle infinie avec un délai d'une seconde.
Lorsque `processUsers` se termine, le contrôle passe à la suite. La coroutine `$progress` continue de s'exécuter.
Indéfiniment. Elle ne s'arrêtera jamais. Le processus PHP ne s'arrêtera jamais (à moins d'être tué de l'extérieur).

`$progress->cancel()` arrête la coroutine `$progress`. Mais comment ?

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

Modifions le code autour de `delay(1000)` et voyons ce qui se passe :
```bash
Async\AsyncCancellation
```

Lorsque la coroutine `$progress` était endormie à l'intérieur de `delay(1000)` et que `cancel()` a alors été appelé,
`delay` a levé une exception `Async\AsyncCancellation`. Il en va de même avec un simple `sleep(1)` :
sous TrueAsync, `sleep()` devient lui aussi asynchrone et constitue également un point d'annulation — il lève
`Async\AsyncCancellation` exactement comme `delay`.

On pourrait dire qu'utiliser `delay` dans votre code établit en pratique un contrat qui permet à d'autres portions de code
d'interrompre l'exécution de la coroutine. C'est très pratique, car cela sépare une fois de plus les responsabilités
entre différents modules :
1. La coroutine ne sait pas quand son exécution sera interrompue.
2. Le code qui annule la coroutine ne sait pas exactement comment la coroutine sera interrompue.

Une coroutine ne s'arrête pas par une quelconque magie, elle s'arrête via une exception.
Une coroutine ne peut pas être annulée au milieu d'une opération arbitraire, uniquement à un point où elle
choisit elle-même de céder la main. Ce type d'annulation est appelé « coopératif ».
