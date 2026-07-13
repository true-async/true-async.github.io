---
layout: tutorial
lang: it
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /it/tutors-laravel/01-start.html
page_title: "Eseguire Laravel dentro un server a coroutine"
description: "Passo per passo: eseguire Laravel sotto TrueAsync Server e la tua prima API, dalle route al database."
---

# Eseguire Laravel dentro un server a coroutine

Il framework `Laravel` non è stato originariamente costruito per i server a coroutine,
quindi non puoi semplicemente prenderlo e farlo girare su `TrueAsync`.

Tuttavia, il progetto [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
ha risolto questo problema con una serie di adattatori dedicati.

## Passo 1. Installa il pacchetto

```bash
composer require yangusik/laravel-spawn
```

Il service provider si registra automaticamente. Pubblica la config
del server:

```bash
php artisan vendor:publish --tag=async-config
```

Questo crea `config/async.php`, che contiene i listener, il numero
di worker, il pool di connessioni al database e una lista di servizi
che devono essere ri-risolti a ogni richiesta.

## Passo 2. Avvia il server

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Questo comando avvia `TrueAsync Server` e collega il router di Laravel.

```bash
$ curl http://localhost:8080/
```

Se vedi la pagina di benvenuto predefinita di Laravel, tutto è partito
correttamente. Da qui costruiamo una vera `API` sopra di essa.

## Passo 3. Route

Niente di insolito, un semplice `routes/api.php`:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` funzionano tutte come
al solito. Il router viene costruito una sola volta all'avvio del
worker e sopravvive a ogni richiesta successiva.

## Passo 4. Controller

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

Validazione, `Eloquent`, `findOrFail`, un `404` automatico lanciato come
eccezione, tutto esattamente come nel Laravel sincrono. La differenza è
nascosta più in profondità: mentre questo handler attende una risposta
dal database, il worker sta già servendo la richiesta successiva in una
coroutine vicina.

## Passo 5. Autenticazione e sessione

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` funzionano
tutti invariati. Il pacchetto già garantisce che ogni richiesta veda il
proprio utente e la propria sessione, anche mentre centinaia di altre
richieste vengono gestite concorrentemente proprio accanto. Come
funzioni esattamente questo sotto il cofano è l'argomento del prossimo
capitolo, ma dal punto di vista del controller funziona e basta.

## Passo 6. Database

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

Le query `Eloquent`, le transazioni, `DB::transaction(...)`, tutto
scritto esattamente come al solito. Sotto il cofano, ogni richiesta
riceve una propria connessione fisica dal `PDO Pool` integrato invece
di condividerne una tra tutti. Hai già visto i meccanismi del pool
nella serie sui fondamenti.

## Cosa viene dopo

L'`API` costruita in questi sei passi è già una vera applicazione
Laravel in esecuzione sotto `TrueAsync Server`: route, controller,
autenticazione, un database. I prossimi capitoli spiegano esattamente
cosa succede sotto il cofano quando centinaia di richieste di questo
tipo girano concorrentemente in un unico processo: come funzionano il
pool di connessioni e le transazioni, quali pattern di codice sono
pericolosi dentro una coroutine, e come si comportano pacchetti popolari
come `Telescope` e `spatie/laravel-permission`.
