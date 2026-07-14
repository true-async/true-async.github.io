---
layout: tutorial
lang: fr
path_key: "/tutors/05-timeout.html"
nav_active: docs
permalink: /fr/tutors/05-timeout.html
page_title: "Délais d'expiration"
description: "Limiter la durée d'attente de await(), à l'aide de timeout()."
---

# Limiter la durée d'attente de await

Il est fréquent d'avoir besoin de garantir qu'une opération ne prendra pas plus longtemps qu'un temps donné.
Par exemple, si `UserDirectory` ne répond pas pendant trop longtemps, cela peut donner l'impression que l'`API` est cassée.
Il y a ici deux solutions possibles :
1. Définir un délai d'expiration au niveau de l'opération `file_get_contents` et modifier le code de la fonction.
2. Ajouter une limite directement à `await`.

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
} catch (RemoteApiException $e) {
    
}
```

L'avantage de limiter `await`, c'est qu'il n'est pas nécessaire de modifier le code de `validateToken`. En
même temps, remarquez le `catch (OperationCanceledException $e)`, et non `catch (TimeoutException $e)` comme on
pourrait s'y attendre.

## OperationCanceledException

`timeout()` ne lève rien par lui-même. Il renvoie un **jeton d'annulation** — un objet `Async\Timeout`.
Le code ci-dessous ne lèvera jamais d'exception, quelle que soit la durée du script :

```php
use function Async\timeout;

$token = timeout(2000);   // just an object; nothing happens
```

The token only takes effect once it is handed to an operation as a cancellation argument:

```php
use function Async\timeout;
use Async\OperationCanceledException;

try {
    $isValid = await($validation, timeout(2000));
} catch (OperationCanceledException $e) {
    $validation->cancel();
    echo $e->getPrevious()->getMessage(); // message provenant de TimeoutException
}
```

Notez que lorsque le jeton se déclenche, vous recevez une `OperationCanceledException`, et non une
`TimeoutException`. Le timeout lui-même se trouve à l'intérieur, dans `getPrevious()`. C'est intentionnel, afin de simplifier la logique de gestion `try-catch` pour
`await` et de distinguer clairement une attente annulée d'une exception levée à l'intérieur de la coroutine.
Les coroutines ne devraient normalement pas lever elles-mêmes d'`OperationCanceledException`.

L'élément utilisé pour limiter une attente `await` ne doit pas nécessairement être `timeout()` ; il peut aussi s'agir de n'importe quelle autre
coroutine, ou d'un `Future`, un contrat logique représentant l'achèvement d'une opération arbitraire.
