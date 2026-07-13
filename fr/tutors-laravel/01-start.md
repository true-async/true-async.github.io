---
layout: tutorial
lang: fr
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /fr/tutors-laravel/01-start.html
page_title: "Faire Tourner Laravel Dans un Serveur à Coroutines"
description: "Pas à pas : faire tourner Laravel sous TrueAsync Server et votre première API, des routes jusqu'à la base de données."
---

# Faire Tourner Laravel Dans un Serveur à Coroutines

Le framework `Laravel` n'a pas été conçu à l'origine pour les serveurs
à coroutines, vous ne pouvez donc pas simplement le prendre tel quel
et le lancer sur `TrueAsync`.

Cependant, le projet [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
a résolu ce problème avec un ensemble d'adaptateurs dédiés.

## Étape 1. Installer le Package

```bash
composer require yangusik/laravel-spawn
```

Le service provider s'enregistre automatiquement. Publiez la
configuration du serveur :

```bash
php artisan vendor:publish --tag=async-config
```

Cela crée `config/async.php`, qui contient les listeners, le nombre
de workers, le pool de connexions à la base de données, et une liste
de services qui doivent être résolus de nouveau à chaque requête.

## Étape 2. Démarrer le Serveur

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Cette commande démarre `TrueAsync Server` et connecte le routeur de
Laravel.

```bash
$ curl http://localhost:8080/
```

Si vous voyez la page d'accueil par défaut de Laravel, tout fonctionne
correctement. À partir de là, nous construisons une vraie `API`
par-dessus.

## Étape 3. Routes

Rien d'inhabituel, un simple `routes/api.php` :

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` fonctionnent tous
comme d'habitude. Le routeur est construit une seule fois au
démarrage du worker et survit à chaque requête qui suit.

## Étape 4. Contrôleur

```php
class ProfileController extends Controller
{
    public function show(int $id)
    {
        $user = User::with(['orders', 'reviews'])->findOrFail($id);

        return response()->json($user);
    }

    public function updateAddress(int $id, Request $request)
    {
        $request->validate(['address' => 'required|array']);

        $user = User::findOrFail($id);
        $user->update(['address' => $request->input('address')]);

        return response()->json(['ok' => true]);
    }
}
```

Validation, `Eloquent`, `findOrFail`, un `404` automatique levé comme
exception, exactement comme dans un `Laravel` synchrone. La différence
se cache plus profondément : pendant que ce handler attend une réponse
de la base de données, le worker sert déjà la requête suivante dans
une coroutine voisine.

## Étape 5. Authentification et Session

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)`
fonctionnent tous sans changement. Le package s'assure déjà que
chaque requête voit son propre utilisateur et sa propre session, même
pendant que des centaines d'autres requêtes sont traitées de manière
concurrente juste à côté. Comment cela fonctionne exactement en
coulisses est le sujet du chapitre suivant, mais du point de vue du
contrôleur, ça fonctionne, tout simplement.

## Étape 6. Base de Données

```env
DB_CONNECTION=pgsql
```

```php
// config/async.php
'db_pool' => [
    'enabled' => true,
    'min'     => 2,
    'max'     => 10,
],
```

Les requêtes `Eloquent`, les transactions, `DB::transaction(...)`,
tout s'écrit exactement comme d'habitude. En coulisses, chaque
requête obtient sa propre connexion physique depuis le `PDO Pool`
intégré au lieu d'en partager une entre tout le monde. Vous avez déjà
vu la mécanique du pool dans la série de base.

## Et Ensuite

L'`API` construite à travers ces six étapes est déjà une véritable
application Laravel tournant sous `TrueAsync Server` : routes,
contrôleurs, authentification, base de données. Les chapitres suivants
expliquent exactement ce qui se passe en coulisses quand des centaines
de telles requêtes tournent de manière concurrente dans un seul
processus : comment fonctionnent le pool de connexions et les
transactions, quels motifs de code sont dangereux à l'intérieur d'une
coroutine, et comment se comportent des packages populaires comme
`Telescope` et `spatie/laravel-permission`.
