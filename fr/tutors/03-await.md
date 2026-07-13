---
layout: tutorial
lang: fr
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /fr/tutors/03-await.html
page_title: "Await"
description: "Pourquoi await() est nécessaire et comment il fonctionne avec les coroutines."
---

# Await

Imaginez un système backend distribué classique. Il y a une douzaine de services reliés entre eux via une autorisation `JWT`.
Un utilisateur se connecte à travers `UserDirectory` et atterrit dans `ProfileService` pour modifier certaines données métier dans son
profil, par exemple son adresse de domicile ou une adresse de livraison. Le rôle de l'API est de mettre à jour ces données :

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Si l'opération est jugée risquée, il peut être nécessaire de valider en plus le jeton JWT
via `UserDirectory` :

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}

if (profileExists($userId) && validateToken($token)) {
    updateProfile($userId, $changes);
}
```

Les fonctions `validateToken` et `profileExists` effectuent des E/S et prennent du temps, surtout `validateToken`.
Il serait judicieux d'exécuter `validateToken` dans une coroutine afin de réduire le temps d'attente total :

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Cependant, ce code ne fonctionnera pas, car `spawn` ne peut pas retourner un résultat immédiatement. Il nous faut un
moyen d'attendre la coroutine. C'est à cela que sert la fonction `await`.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

La fonction `await` met en pause le flux d'exécution jusqu'à ce que la coroutine se termine, ce qui vous permet de
synchroniser différentes coroutines les unes avec les autres.
