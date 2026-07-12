---
layout: tutorial
lang: fr
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /fr/tutors-server/02-request-response.html
page_title: "Requête et réponse"
description: "HttpRequest et HttpResponse : routage, json() et erreurs via HttpException."
---

# Requête et réponse

Le gestionnaire reçoit deux objets. `HttpRequest`, c'est tout ce que le
client a envoyé, et il est en lecture seule. `HttpResponse`, c'est tout
ce qui repart. Entre les deux se trouve votre code. Construisons une
`API` de profil minimale sur ce trio, et voyons au passage ce dont ces
objets sont capables.

## Analyser la requête

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, sans la chaîne de requête

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

Une grande partie de la requête est déjà analysée et disponible sous une
forme pratique :

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', avec une valeur par défaut

// POST avec un formulaire : application/x-www-form-urlencoded ou multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// en-têtes, insensibles à la casse
$req->getHeader('authorization');    // 'Bearer eyJ...' ou null

// corps brut, par exemple JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` et `getPost()` comprennent la notation de tableau PHP
familière : `address[city]`, `photos[]`. Le passage depuis les anciens
`$_GET`/`$_POST` se fait presque mot pour mot.

## Assembler la réponse

Une `API` a besoin de `JSON`, et la réponse dispose d'un assistant tout
prêt pour cela :

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // le statut comme second argument
}
```

Les autres assistants suivent le même esprit :

```php
$res->html('<h1>Profile updated</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Chaque méthode retourne `$this`, si bien que la réponse s'assemble en
chaîne. Vous n'avez pas besoin de la terminer explicitement : le
gestionnaire a retourné, la réponse est partie.

## Erreurs : HttpException

Passons maintenant à `updateAddress`. Le profil peut ne pas exister.
L'adresse peut ne pas être envoyée. La validation peut échouer.
Écrivons-nous un `setStatusCode` avec un `return` anticipé pour chaque
cas ? Nous le pourrions. Ou bien nous pourrions faire ceci :

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

Le serveur comprend `HttpException` sans traducteur : le code de
l'exception devient le statut, le message devient le corps de la
réponse. Pas de 500 avec une trace de pile qui fuit au-dehors. La classe
n'est pas `final`, donc construisez votre propre hiérarchie et oubliez
les nombres magiques :

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

Et ici je vais vous demander une minute d'attention, car ce qui suit est
mon détail préféré de ce chapitre. Regardez l'ascendance de la classe :

`HttpException extends Async\AsyncCancellation`

Cette même exception d'annulation. Du deuxième chapitre de la première
série. Une coïncidence ? Non. Réfléchissez à ce que le serveur devrait
faire quand un client coupe la connexion au milieu d'une requête :
arrêter la coroutine du gestionnaire. Et comment arrêtons-nous les
coroutines ? Par une annulation coopérative. Une erreur HTTP et une
annulation de coroutine se révèlent être le même mécanisme, vu
simplement sous deux angles différents.

De cette parenté découle la vieille règle, familière depuis le chapitre
sur l'annulation : si vous attrapez `HttpException` par accident, en même
temps qu'un `Throwable`, relancez-la. Le serveur sait quoi en faire.
Vous, non.

Ainsi l'`API` répond selon les règles et échoue selon les règles. Mais
nos gestionnaires restent encore suspicieusement simples : une
vérification, une requête, une réponse. Que se passe-t-il lorsqu'ils
doivent solliciter la base de données, le `GeoDirectory` et le cache en
leur sein, et de préférence de manière concurrente ? C'est le chapitre
trois. C'est là que la première série tourne enfin à plein régime.
