---
layout: tutorial
lang: fr
path_key: "/tutors/01-coroutines.html"
nav_active: docs
permalink: /fr/tutors/01-coroutines.html
page_title: "Coroutines"
description: "Un premier aperçu des coroutines : spawn() et l'exécution concurrente."
---

# Créer des coroutines

```php
function counter(string $name): void {
    for ($i = 1; $i <= 5; $i++) {
        echo "$name: $i\n";
        sleep(1);
    }
}

counter('A');
```

La fonction `counter` affiche un compteur à l'écran avec une pause d'une seconde :

```bash
A: 1
A: 2
A: 3
A: 4
A: 5
```

Chaque fois que `sleep` est appelé, le thread PHP se met en veille pendant la durée indiquée.
Pendant ce temps, il ne fait littéralement rien.
Le script PHP s'exécute pendant 5 secondes, exactement le temps que la fonction elle-même attend.

Que se passe-t-il si nous exécutons la fonction `counter` à l'intérieur d'une coroutine ?

```php
use function Async\spawn;

spawn(counter(...), 'B');
counter('A');
```

La sortie alterne désormais :
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

Le temps d'exécution total du script est toujours d'environ 5 secondes, pourtant le script se comporte maintenant comme s'il exécutait deux fonctions « de manière concurrente ».
Alors, que se passe-t-il réellement ?

`spawn` crée un deuxième fil logique de contrôle, « B », à l'intérieur duquel s'exécute la fonction `counter`.
Lorsque le fil « A » atteint `sleep`, au lieu de bloquer tout PHP, il cède le contrôle à l'autre fil
logique, « B ». Et ainsi de suite :

```text
A sleep -> B
B sleep -> A
A sleep -> B
...
```

## Quel est l'intérêt ?

Imaginez que la fonction `counter` soit du code séquentiel ordinaire qui effectue des opérations d'E/S et
du travail de temporisation (`sleep`). Les opérations d'E/S sont gérées par le noyau du système d'exploitation, si bien que le code PHP doit
les attendre. Pendant ce temps, PHP pourrait faire autre chose.
Les coroutines vous permettent de remplir ce temps d'attente par du travail utile, sans créer de processus, de threads
distincts, sans synchronisation, sans accès concurrents aux données, ni les nombreuses autres horreurs de la programmation parallèle.

Regardons un exemple concret :

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

La fonction `processUsers` lit un fichier CSV et traite chaque ligne.
Le fichier est volumineux, et il n'est pas nécessaire d'afficher chaque ligne à l'écran, mais il serait agréable de voir la progression.
Nous pourrions redessiner la barre de progression à chaque itération, mais cela nuirait aux performances de traitement.
Nous pourrions la redessiner toutes les 100 itérations, mais les lignes peuvent prendre des durées de traitement différentes.
Comment afficher la progression de façon fluide, à intervalles à peu près réguliers ?

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

Cela peut être réalisé avec la coroutine `$progress`, qui affiche la progression actuelle une fois par seconde.
Elle s'appuie sur la variable `$counter`, qui est incrémentée à l'intérieur de la fonction `processUsers` et passée
à la coroutine par référence.

```bash
[====>                         ] 15%
```

La beauté de cette solution, c'est que `printProgress` ne sait rien de `processUsers`, et vice versa.
Elles ne dépendent pas l'une de l'autre, et pourtant elles fonctionnent ensemble.

Autrement dit, les coroutines ne créent pas seulement l'illusion d'une exécution concurrente, elles aident aussi
à séparer les responsabilités.

Avez-vous remarqué `$progress->cancel()` ? À quoi sert-il exactement ?
