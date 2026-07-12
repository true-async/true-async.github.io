---
layout: tutorial
lang: fr
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /fr/tutors-laravel/03-sse-grpc.html
page_title: "SSE et gRPC avec Laravel"
description: "trueasync_response(), Sse, et grpc_handlers : atteindre ce qui se trouve derrière l'Illuminate Response bufferisé, directement depuis un contrôleur."
---

# SSE et gRPC avec Laravel

Le `TrueAsyncServer` à l'intérieur de `laravel-spawn` est construit
simplement : il accepte une `HttpRequest`, assemble une
`Illuminate\Http\Request` à partir de celle-ci, la fait passer par
`Kernel::handle()`, obtient une `Illuminate\Http\Response`, la
bufferise entièrement dans une `HttpResponse`, et l'envoie. Une
requête, une réponse, tout le contenu d'un coup. Exactement ce à quoi
Laravel est habitué depuis toute son histoire.

Mais la deuxième série de ce site avait une barre de progression via
`SSE` et `gRPC` sur le même port, et tous deux ne vivent pas selon la
formule « une réponse » mais selon la formule « un flux de messages ».
Une `Illuminate\Response` bufferisée n'est pas conçue pour cela : elle
n'a ni `sseEvent()` ni `writeMessage()`. Un contrôleur a donc besoin
d'un moyen d'atteindre la vraie `HttpResponse` brute, en contournant
le buffer.

## Une Réponse Brute à la Demande

`laravel-spawn` place la `HttpRequest` et la `HttpResponse` de la
requête courante dans `request_context()` avant de céder le contrôle
au routeur de Laravel, la même astuce que Laravel lui-même utilise
pour y placer `auth` et `session`, vue au premier chapitre. Vous
pouvez les récupérer avec deux fonctions :

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Une fois qu'un contrôleur a écrit dans la réponse brute et l'a fermée
lui-même (`$res->end()`), le chemin habituel d'`Illuminate\Response`
n'est plus nécessaire : `TrueAsyncServer` vérifie `isClosed()` avant
de bufferiser, et si la réponse a déjà été envoyée manuellement, il
n'ajoute rien par-dessus. Le contrôleur doit quand même retourner
quelque chose, Laravel l'exige, mais plus personne ne se soucie du
contenu de cette valeur de retour.

## SSE : Une Barre de Progression Dans une Route Laravel

Passer par `sseStart()`/`sseEvent()`/`sseComment()` via
`trueasync_response()` à chaque fois n'est pas pratique, aussi le
package fournit un léger wrapper :

```php
use Spawn\Laravel\Sse\Sse;
use function Async\delay;

Route::get('/import/progress', function () {
    Sse::start(retryMs: 3000);

    $import = currentImport();

    while (!$import->isFinished()) {
        Sse::event(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!Sse::connected()) {
            break; // l'onglet a été fermé
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Vous reconnaissez ce code ? C'est la barre de progression du sixième
chapitre de la série serveur, mot pour mot, avec `$res->sseEvent()`
remplacé par `Sse::event()`. À l'intérieur de la route vous avez
toujours `Auth::user()`, `session()`, `Eloquent`, tous disponibles,
c'est un handler Laravel ordinaire, il répond juste par un flux au
lieu d'une seule fois. Le middleware, l'autorisation via
`Route::middleware('auth:sanctum')`, `current_context()` pour l'état
par requête vu au premier chapitre, tout cela fonctionne comme
d'habitude, parce que `Kernel::handle()` autour de ce code n'a pas
changé d'une seule ligne.

Un détail de configuration ne concerne pas Laravel du tout, mais le
serveur lui-même : un flux à longue durée de vie ne devrait pas être
coupé par le timeout d'écriture dont les réponses ordinaires ont
réellement besoin, aussi les services avec des flux le désactivent
globalement, `ASYNC_WRITE_TIMEOUT=0` dans `.env`, le même levier
utilisé au chapitre production de la série serveur.

## gRPC : Un Contrat Plutôt Qu'une Route

Avec `gRPC`, le compromis est plus dur. Le protocole parle en messages
encodés en protobuf, qui n'ont pas de correspondance sensée avec
`Illuminate\Http\Request`, et encore moins avec `Response`. Fabriquer
une fausse requête HTTP juste pour la faire passer par le routage et
le middleware de Laravel serait sans intérêt : un client gRPC n'envoie
ni cookies, ni jeton CSRF, ni corps de formulaire. Donc `gRPC` dans
`laravel-spawn` contourne entièrement le `Kernel`, en prenant un
chemin séparé configuré via le fichier de configuration :

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

Le handler lui-même est résolu via le conteneur (ainsi l'injection de
dépendances ordinaire via le constructeur fonctionne toujours), et la
signature de la méthode est la même paire d'objets bruts vue au
dixième chapitre de la série serveur :

```php
namespace App\Grpc;

use Profile\GetProfileRequest;
use Profile\Profile;
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

class ProfileServiceHandler
{
    public function __construct(private readonly UserRepository $users) {}

    public function getProfile(HttpRequest $req, HttpResponse $res): void
    {
        $getProfile = new GetProfileRequest();
        $getProfile->mergeFromString($req->readMessage());

        $user = $this->users->find($getProfile->getUserId());

        $profile = (new Profile())
            ->setId($user->id)
            ->setName($user->name)
            ->setRegion($user->region);

        $res->writeMessage($profile->serializeToString());
        // un simple return : le serveur ajoute lui-même grpc-status: 0 (OK)
    }
}
```

`$this->users` est arrivé par le constructeur, comme dans n'importe
quel service Laravel : le conteneur et l'injection de dépendances
sont toujours pleinement à l'œuvre, même si le routage de Laravel n'a
jamais touché ce chemin. Les erreurs voyagent de la même façon que
dans le `TrueAsync Server` nu : via un trailer `grpc-status`, pas un
code de statut HTTP.

```php
public function getProfile(HttpRequest $req, HttpResponse $res): void
{
    if (!$this->authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        return;
    }

    // ...
}
```

Une exception levée hors d'un handler est transformée par
`laravel-spawn` lui-même en `grpc-status: 13` (`INTERNAL`), le même
comportement que celui du serveur nu, simplement dissimulé maintenant
à l'intérieur de l'adaptateur.

## Ce Qui Est Réel Ici Et Ce Qui Ne L'Est Pas

Aucun des deux chemins n'est une émulation ou un bricolage superposé
au `StreamedResponse` de Symfony, les deux sont un accès direct aux
mêmes primitives `HttpRequest`/`HttpResponse` de la série serveur,
directement depuis une route Laravel. Le coût est prévisible : un
handler SSE ne répond pas via le familier
`return response()->json(...)`, il s'écrit lui-même et décide
lui-même du moment de fermer la connexion ; un handler gRPC ne voit
ni le middleware ni le routage de Laravel, seulement le conteneur pour
l'injection de dépendances. Il n'y a aucune magie noire ici, mais pas
non plus de faux-semblant, si vous avez besoin d'un vrai flux, vous
devez sortir du monde confortable de la `Response` bufferisée pour
aller là où vit le serveur lui-même.

Nous avons couvert ce que Laravel peut faire : requêtes ordinaires,
flux, gRPC. Ce qui reste, c'est ce que Laravel ne peut pas faire tout
seul, et ce qui mérite un examen attentif dans votre propre code et
dans celui des autres avant de le confier à des coroutines
concurrentes. C'est là que nous allons dans le chapitre suivant.
