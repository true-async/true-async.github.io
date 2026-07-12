---
layout: tutorial
lang: fr
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /fr/tutors/04-exceptions.html
page_title: "Exceptions"
description: "Comment les exceptions d'une coroutine se propagent à travers await()."
---

# Exceptions dans les coroutines

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

La fonction `validateToken` du chapitre précédent présente quelques problèmes.
Si `UserDirectory` ne répond pas (délai dépassé, réseau coupé, DNS ne résolvant pas), `file_get_contents` retourne `false`.
`json_decode(false)` retourne `null`, et `null->valid` vaut aussi `null`. La fonction retourne quelque chose de faux,
le même résultat qu'avec un jeton réellement invalide. `validateToken` n'a aucun moyen de distinguer « le jeton a expiré »
de « `UserDirectory` n'a pas répondu », alors qu'il s'agit de deux situations complètement différentes.

La bonne approche consiste à lever une exception lorsque le service ne répond pas :

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

Mais que se passe-t-il si une exception est levée à l'intérieur d'une coroutine ?
Si une exception est levée dans du code `PHP` ordinaire et que personne ne l'attrape, `PHP` se termine avec un message
d'exception non gérée (Unhandled Exception). Et pour une coroutine ?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

À première vue, il semble qu'il n'y ait aucune différence. Mais c'est loin d'être le cas.
Les coroutines appartiennent au composant `Scheduler`, qui est responsable de la commutation entre elles. Chaque
coroutine s'exécute dans son propre fil logique. Si une exception non gérée atteint le gestionnaire final de la coroutine,
elle est stockée sur le handle de la coroutine.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

Autrement dit, l'exception ne terminera pas le programme tant que quelqu'un conserve une référence
à `$coroutine`. Cette logique garantit l'idempotence de l'opération `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Des appels répétés à `await` sur la même coroutine produisent le même comportement, que la
coroutine soit encore en cours d'exécution ou non. Cela vous permet de traiter une coroutine comme un `Future`, une promesse de résultat
qui pourra être obtenu à un moment donné dans le futur. Si le résultat existe déjà, `await` le retourne
immédiatement.

Nous pouvons maintenant améliorer le code qui valide le jeton et met à jour le profil en ajoutant la gestion des exceptions :

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // Peut-être vaudrait-il mieux réessayer l'opération plus tard ?
}
```

> Important !
> Après un appel à `await` ou à toute autre opération `await_*`,
> la coroutine est marquée comme gérée, et son exception ne provoquera plus
> la terminaison du programme PHP.
