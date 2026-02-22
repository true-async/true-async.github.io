---
layout: docs
lang: fr
path_key: "/docs/components/coroutines.html"
nav_active: docs
permalink: /fr/docs/components/coroutines.html
page_title: "Async\\Coroutine"
description: "La classe Async\\Coroutine -- creation, cycle de vie, etats, annulation, debogage et reference complete des methodes."
---

# La classe Async\Coroutine

(PHP 8.6+, True Async 1.0)

## Les coroutines dans TrueAsync

Lorsqu'une fonction ordinaire appelle une operation d'E/S comme `fread` ou `fwrite` (lecture de fichier ou requete reseau),
le controle est passe au noyau du systeme d'exploitation, et `PHP` se bloque jusqu'a ce que l'operation soit terminee.

Mais si une fonction est executee a l'interieur d'une coroutine et appelle une operation d'E/S,
seule la coroutine se bloque, pas l'ensemble du processus `PHP`.
Pendant ce temps, le controle est passe a une autre coroutine, s'il en existe une.

En ce sens, les coroutines sont tres similaires aux threads du systeme d'exploitation,
mais elles sont gerees dans l'espace utilisateur plutot que par le noyau du systeme d'exploitation.

Une autre difference importante est que les coroutines partagent le temps CPU en alternant,
cedant volontairement le controle, tandis que les threads peuvent etre preemptes a tout moment.

Les coroutines TrueAsync s'executent dans un seul thread
et ne sont pas paralleles. Cela entraine plusieurs consequences importantes :
- Les variables peuvent etre librement lues et modifiees depuis differentes coroutines sans verrous, car elles ne s'executent pas simultanement.
- Les coroutines ne peuvent pas utiliser simultanement plusieurs coeurs CPU.
- Si une coroutine effectue une longue operation synchrone, elle bloque l'ensemble du processus, car elle ne cede pas le controle aux autres coroutines.

## Creer une coroutine

Une coroutine est creee a l'aide de la fonction `spawn()` :

```php
use function Async\spawn;

// Creer une coroutine
$coroutine = spawn(function() {
    echo "Bonjour depuis une coroutine !\n";
    return 42;
});

// $coroutine est un objet de type Async\Coroutine
// La coroutine est deja planifiee pour execution
```

Une fois `spawn` appele, la fonction sera executee de maniere asynchrone par l'ordonnanceur des que possible.

## Passage de parametres

La fonction `spawn` accepte un `callable` et tous les parametres qui seront passes a cette fonction
lors de son demarrage.

```php
function fetchUser(int $userId) {
    return file_get_contents("https://api/users/$userId");
}

// Passer la fonction et les parametres
$coroutine = spawn(fetchUser(...), 123);
```

## Obtenir le resultat

Pour obtenir le resultat d'une coroutine, utilisez `await()` :

```php
$coroutine = spawn(function() {
    sleep(2);
    return "Termine !";
});

echo "Coroutine demarree\n";

// Attendre le resultat
$result = await($coroutine);

echo "Resultat : $result\n";
```

**Important :** `await()` bloque l'execution de la **coroutine courante**, mais pas l'ensemble du processus `PHP`.
Les autres coroutines continuent de s'executer.

## Cycle de vie d'une coroutine

Une coroutine passe par plusieurs etats :

1. **En file d'attente** -- creee via `spawn()`, en attente de demarrage par l'ordonnanceur
2. **En cours d'execution** -- en train de s'executer
3. **Suspendue** -- en pause, en attente d'E/S ou de `suspend()`
4. **Terminee** -- execution terminee (avec un resultat ou une exception)
5. **Annulee** -- annulee via `cancel()`

### Verification de l'etat

```php
$coro = spawn(longTask(...));

var_dump($coro->isQueued());     // true - en attente de demarrage
var_dump($coro->isStarted());   // false - n'a pas encore demarre

suspend(); // laisser la coroutine demarrer

var_dump($coro->isStarted());    // true - la coroutine a demarre
var_dump($coro->isRunning());    // false - ne s'execute pas actuellement
var_dump($coro->isSuspended());  // true - suspendue, en attente de quelque chose
var_dump($coro->isCompleted());  // false - n'a pas encore termine
var_dump($coro->isCancelled());  // false - non annulee
```

## Suspension : suspend

Le mot-cle `suspend` arrete la coroutine et passe le controle a l'ordonnanceur :

```php
spawn(function() {
    echo "Avant suspend\n";

    suspend(); // On s'arrete ici

    echo "Apres suspend\n";
});

echo "Code principal\n";

// Sortie :
// Avant suspend
// Code principal
// Apres suspend
```

La coroutine s'est arretee a `suspend`, le controle est revenu au code principal. Plus tard, l'ordonnanceur a repris la coroutine.

### suspend avec attente

Typiquement, `suspend` est utilise pour attendre un evenement :

```php
spawn(function() {
    echo "Envoi d'une requete HTTP\n";

    $data = file_get_contents('https://api.example.com/data');
    // A l'interieur de file_get_contents, suspend est appele implicitement
    // Pendant que la requete reseau est en cours, la coroutine est suspendue

    echo "Donnees recues : $data\n";
});
```

PHP suspend automatiquement la coroutine lors des operations d'E/S. Vous n'avez pas besoin d'ecrire manuellement `suspend`.

## Annuler une coroutine

```php
$coro = spawn(function() {
    try {
        echo "Demarrage d'un long travail\n";

        for ($i = 0; $i < 100; $i++) {
            Async\sleep(100); // Pause de 100ms
            echo "Iteration $i\n";
        }

        echo "Termine\n";
    } catch (Async\AsyncCancellation $e) {
        echo "J'ai ete annule pendant l'iteration\n";
    }
});

// Laisser la coroutine travailler pendant 1 seconde
Async\sleep(1000);

// L'annuler
$coro->cancel();

// La coroutine recevra AsyncCancellation au prochain await/suspend
```

**Important :** L'annulation fonctionne de maniere cooperative. La coroutine doit verifier l'annulation (via `await`, `sleep` ou `suspend`). Vous ne pouvez pas tuer de force une coroutine.

## Coroutines multiples

Lancez-en autant que vous voulez :

```php
$tasks = [];

for ($i = 0; $i < 10; $i++) {
    $tasks[] = spawn(function() use ($i) {
        $result = file_get_contents("https://api/data/$i");
        return $result;
    });
}

// Attendre toutes les coroutines
$results = array_map(fn($t) => await($t), $tasks);

echo "Charge " . count($results) . " resultats\n";
```

Les 10 requetes s'executent de maniere concurrente. Au lieu de 10 secondes (une seconde chacune), cela se termine en environ 1 seconde.

## Gestion des erreurs

Les erreurs dans les coroutines sont gerees avec les `try-catch` habituels :

```php
$coro = spawn(function() {
    throw new Exception("Oups !");
});

try {
    $result = await($coro);
} catch (Exception $e) {
    echo "Erreur interceptee : " . $e->getMessage() . "\n";
}
```

Si l'erreur n'est pas interceptee, elle remonte au scope parent :

```php
$scope = new Async\Scope();

$scope->spawn(function() {
    throw new Exception("Erreur dans la coroutine !");
});

try {
    $scope->awaitCompletion();
} catch (Exception $e) {
    echo "L'erreur a remonte au scope : " . $e->getMessage() . "\n";
}
```

## Coroutine = Objet

Une coroutine est un objet PHP a part entiere. Vous pouvez la passer partout :

```php
function startBackgroundTask(): Async\Coroutine {
    return spawn(function() {
        // Long travail
        Async\sleep(10000);
        return "Resultat";
    });
}

$task = startBackgroundTask();

// Passer a une autre fonction
processTask($task);

// Ou stocker dans un tableau
$tasks[] = $task;

// Ou dans une propriete d'objet
$this->backgroundTask = $task;
```

## Coroutines imbriquees

Les coroutines peuvent lancer d'autres coroutines :

```php
spawn(function() {
    echo "Coroutine parente\n";

    $child1 = spawn(function() {
        echo "Coroutine enfant 1\n";
        return "Resultat 1";
    });

    $child2 = spawn(function() {
        echo "Coroutine enfant 2\n";
        return "Resultat 2";
    });

    // Attendre les deux coroutines enfants
    $result1 = await($child1);
    $result2 = await($child2);

    echo "Le parent a recu : $result1 et $result2\n";
});
```

## Finally : nettoyage garanti

Meme si une coroutine est annulee, `finally` sera execute :

```php
spawn(function() {
    $file = fopen('data.txt', 'r');

    try {
        while ($line = fgets($file)) {
            processLine($line);
            suspend(); // Peut etre annule ici
        }
    } finally {
        // Le fichier sera ferme quoi qu'il arrive
        fclose($file);
        echo "Fichier ferme\n";
    }
});
```

## Debogage des coroutines

### Obtenir la pile d'appels

```php
$coro = spawn(function() {
    doSomething();
});

// Obtenir la pile d'appels de la coroutine
$trace = $coro->getTrace();
print_r($trace);
```

### Savoir ou une coroutine a ete creee

```php
$coro = spawn(someFunction(...));

// Ou spawn() a ete appele
echo "Coroutine creee a : " . $coro->getSpawnLocation() . "\n";
// Sortie : "Coroutine creee a : /app/server.php:42"

// Ou sous forme de tableau [filename, lineno]
[$file, $line] = $coro->getSpawnFileAndLine();
```

### Savoir ou une coroutine est suspendue

```php
$coro = spawn(function() {
    file_get_contents('https://api.example.com/data'); // se suspend ici
});

suspend(); // laisser la coroutine demarrer

echo "Suspendue a : " . $coro->getSuspendLocation() . "\n";
// Sortie : "Suspendue a : /app/server.php:45"

[$file, $line] = $coro->getSuspendFileAndLine();
```

### Informations d'attente

```php
$coro = spawn(function() {
    Async\delay(5000);
});

suspend();

// Decouvrir ce que la coroutine attend
$info = $coro->getAwaitingInfo();
print_r($info);
```

Tres utile pour le debogage -- vous pouvez immediatement voir d'ou vient une coroutine et ou elle s'est arretee.

## Coroutines vs Threads

| Coroutines                    | Threads                       |
|-------------------------------|-------------------------------|
| Legeres                       | Lourds                        |
| Creation rapide (<1us)        | Creation lente (~1ms)         |
| Un seul thread OS             | Plusieurs threads OS          |
| Multitache cooperatif         | Multitache preemptif          |
| Pas de conditions de course   | Conditions de course possibles|
| Necessite des points d'await  | Peut etre preempte partout    |
| Pour les operations d'E/S     | Pour les calculs CPU          |

## Annulation differee avec protect()

Si une coroutine est dans une section protegee via `protect()`, l'annulation est differee jusqu'a ce que le bloc protege soit termine :

```php
$coro = spawn(function() {
    $result = protect(function() {
        // Operation critique -- l'annulation est differee
        $db->beginTransaction();
        $db->execute('INSERT INTO logs ...');
        $db->commit();
        return "saved";
    });

    // L'annulation se produira ici, apres la sortie de protect()
    echo "Resultat : $result\n";
});

suspend();

$coro->cancel(); // L'annulation est differee -- protect() se terminera completement
```

Le drapeau `isCancellationRequested()` devient `true` immediatement, tandis que `isCancelled()` ne devient `true` qu'apres la terminaison effective de la coroutine.

## Vue d'ensemble de la classe

```php
final class Async\Coroutine implements Async\Completable {

    /* Identification */
    public getId(): int

    /* Priorite */
    public asHiPriority(): Coroutine

    /* Contexte */
    public getContext(): Async\Context

    /* Resultat et erreurs */
    public getResult(): mixed
    public getException(): mixed

    /* Etat */
    public isStarted(): bool
    public isQueued(): bool
    public isRunning(): bool
    public isSuspended(): bool
    public isCompleted(): bool
    public isCancelled(): bool
    public isCancellationRequested(): bool

    /* Controle */
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public finally(\Closure $callback): void

    /* Debogage */
    public getTrace(int $options = DEBUG_BACKTRACE_PROVIDE_OBJECT, int $limit = 0): ?array
    public getSpawnFileAndLine(): array
    public getSpawnLocation(): string
    public getSuspendFileAndLine(): array
    public getSuspendLocation(): string
    public getAwaitingInfo(): array
}
```

## Sommaire

- [Coroutine::getId](/fr/docs/reference/coroutine/get-id.html) -- Obtenir l'identifiant unique de la coroutine
- [Coroutine::asHiPriority](/fr/docs/reference/coroutine/as-hi-priority.html) -- Marquer la coroutine comme haute priorite
- [Coroutine::getContext](/fr/docs/reference/coroutine/get-context.html) -- Obtenir le contexte local de la coroutine
- [Coroutine::getResult](/fr/docs/reference/coroutine/get-result.html) -- Obtenir le resultat d'execution
- [Coroutine::getException](/fr/docs/reference/coroutine/get-exception.html) -- Obtenir l'exception de la coroutine
- [Coroutine::isStarted](/fr/docs/reference/coroutine/is-started.html) -- Verifier si la coroutine a demarre
- [Coroutine::isQueued](/fr/docs/reference/coroutine/is-queued.html) -- Verifier si la coroutine est en file d'attente
- [Coroutine::isRunning](/fr/docs/reference/coroutine/is-running.html) -- Verifier si la coroutine s'execute actuellement
- [Coroutine::isSuspended](/fr/docs/reference/coroutine/is-suspended.html) -- Verifier si la coroutine est suspendue
- [Coroutine::isCompleted](/fr/docs/reference/coroutine/is-completed.html) -- Verifier si la coroutine est terminee
- [Coroutine::isCancelled](/fr/docs/reference/coroutine/is-cancelled.html) -- Verifier si la coroutine a ete annulee
- [Coroutine::isCancellationRequested](/fr/docs/reference/coroutine/is-cancellation-requested.html) -- Verifier si l'annulation a ete demandee
- [Coroutine::cancel](/fr/docs/reference/coroutine/cancel.html) -- Annuler la coroutine
- [Coroutine::finally](/fr/docs/reference/coroutine/on-finally.html) -- Enregistrer un gestionnaire de fin
- [Coroutine::getTrace](/fr/docs/reference/coroutine/get-trace.html) -- Obtenir la pile d'appels d'une coroutine suspendue
- [Coroutine::getSpawnFileAndLine](/fr/docs/reference/coroutine/get-spawn-file-and-line.html) -- Obtenir le fichier et la ligne ou la coroutine a ete creee
- [Coroutine::getSpawnLocation](/fr/docs/reference/coroutine/get-spawn-location.html) -- Obtenir l'emplacement de creation sous forme de chaine
- [Coroutine::getSuspendFileAndLine](/fr/docs/reference/coroutine/get-suspend-file-and-line.html) -- Obtenir le fichier et la ligne ou la coroutine a ete suspendue
- [Coroutine::getSuspendLocation](/fr/docs/reference/coroutine/get-suspend-location.html) -- Obtenir l'emplacement de suspension sous forme de chaine
- [Coroutine::getAwaitingInfo](/fr/docs/reference/coroutine/get-awaiting-info.html) -- Obtenir les informations d'attente

## Et ensuite

- [Scope](/fr/docs/components/scope.html) -- gestion de groupes de coroutines
- [Annulation](/fr/docs/components/cancellation.html) -- details sur l'annulation et protect()
- [spawn()](/fr/docs/reference/spawn.html) -- documentation complete
- [await()](/fr/docs/reference/await.html) -- documentation complete
