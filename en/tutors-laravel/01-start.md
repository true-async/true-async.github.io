---
layout: tutorial
lang: en
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /en/tutors-laravel/01-start.html
page_title: "Running Laravel Inside a Coroutine Server"
description: "Step by step: running Laravel under TrueAsync Server and your first API, from routes to the database."
---

# Running Laravel Inside a Coroutine Server

The `Laravel` framework wasn't originally built for coroutine servers,
so you can't just pick it up and run it on `TrueAsync`.

However, the [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
project solved this problem with a set of dedicated adapters.

## Step 1. Install the Package

```bash
composer require yangusik/laravel-spawn
```

The service provider registers itself automatically. Publish the server
config:

```bash
php artisan vendor:publish --tag=async-config
```

This creates `config/async.php`, which holds the listeners, the number
of workers, the database connection pool, and a list of services that
need to be re-resolved on every request.

## Step 2. Start the Server

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

This command starts `TrueAsync Server` and wires up Laravel's router.

```bash
$ curl http://localhost:8080/
```

If you see Laravel's default welcome page, everything came up fine.
From here we build a real `API` on top of it.

## Step 3. Routes

Nothing unusual, a plain `routes/api.php`:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` all work as usual.
The router is built once when the worker starts and survives every
request that follows.

## Step 4. Controller

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

Validation, `Eloquent`, `findOrFail`, an automatic `404` thrown as an
exception, all exactly like synchronous `Laravel`. The difference is
hidden deeper: while this handler waits for a response from the
database, the worker is already serving the next request in a
neighboring coroutine.

## Step 5. Authentication and Session

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` all work
unchanged. The package already makes sure every request sees its own
user and its own session, even while hundreds of other requests are
being handled concurrently right next to it. How exactly this works
under the hood is the topic of the next chapter, but from the
controller's point of view it just works.

## Step 6. Database

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

`Eloquent` queries, transactions, `DB::transaction(...)`, all written
exactly as usual. Under the hood, each request gets its own physical
connection from the built-in `PDO Pool` instead of sharing one across
everyone. You've already seen the pool's mechanics in the core series.

## What's Next

The `API` built across these six steps is already a real Laravel
application running under `TrueAsync Server`: routes, controllers,
authentication, a database. The next chapters explain exactly what
happens under the hood when hundreds of such requests run in a single
process concurrently: how the connection pool and transactions work,
which code patterns are dangerous inside a coroutine, and how popular
packages like `Telescope` and `spatie/laravel-permission` behave.
