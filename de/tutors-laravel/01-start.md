---
layout: tutorial
lang: de
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /de/tutors-laravel/01-start.html
page_title: "Laravel in einem Coroutine-Server ausführen"
description: "Schritt für Schritt: Laravel unter TrueAsync Server ausführen und deine erste API, von den Routen bis zur Datenbank."
---

# Laravel in einem Coroutine-Server ausführen

Das Framework `Laravel` wurde ursprünglich nicht für Coroutine-Server gebaut,
also kannst du es nicht einfach nehmen und unter `TrueAsync` laufen lassen.

Das Projekt [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
hat dieses Problem jedoch mit einem Satz spezieller Adapter gelöst.

## Schritt 1. Das Paket installieren

```bash
composer require yangusik/laravel-spawn
```

Der Service-Provider registriert sich automatisch. Veröffentliche die
Server-Konfiguration:

```bash
php artisan vendor:publish --tag=async-config
```

Dadurch entsteht `config/async.php`, die die Listener, die Anzahl der
Worker, den Datenbank-Connection-Pool und eine Liste der Dienste enthält,
die bei jeder Anfrage neu aufgelöst werden müssen.

## Schritt 2. Den Server starten

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Dieser Befehl startet `TrueAsync Server` und verdrahtet ihn mit dem Router
von Laravel.

```bash
$ curl http://localhost:8080/
```

Wenn du Laravels Standard-Willkommensseite siehst, ist alles in Ordnung.
Von hier aus bauen wir darauf eine echte `API` auf.

## Schritt 3. Routen

Nichts Ungewöhnliches, ein ganz normales `routes/api.php`:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` funktionieren wie gewohnt.
Der Router wird einmal beim Start des Workers aufgebaut und überlebt jede
darauf folgende Anfrage.

## Schritt 4. Controller

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

Validierung, `Eloquent`, `findOrFail`, ein automatisch als Exception
geworfener `404`, alles genau wie im synchronen `Laravel`. Der Unterschied
verbirgt sich tiefer: während dieser Handler auf eine Antwort von der
Datenbank wartet, bedient der Worker bereits die nächste Anfrage in einer
benachbarten Coroutine.

## Schritt 5. Authentifizierung und Session

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` funktionieren
alle unverändert. Das Paket stellt bereits sicher, dass jede Anfrage ihren
eigenen Benutzer und ihre eigene Session sieht, selbst während Hunderte
anderer Anfragen direkt daneben nebenläufig verarbeitet werden. Wie genau
das unter der Haube funktioniert, ist das Thema des nächsten Kapitels,
aber aus Sicht des Controllers funktioniert es einfach.

## Schritt 6. Datenbank

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

`Eloquent`-Abfragen, Transaktionen, `DB::transaction(...)`, alles genau
so geschrieben wie gewohnt. Unter der Haube erhält jede Anfrage ihre
eigene physische Verbindung aus dem eingebauten `PDO Pool`, statt sich
eine mit allen anderen zu teilen. Die Mechanik des Pools hast du bereits
in der Core-Serie gesehen.

## Was kommt als Nächstes

Die über diese sechs Schritte gebaute `API` ist bereits eine echte
Laravel-Anwendung, die unter `TrueAsync Server` läuft: Routen, Controller,
Authentifizierung, eine Datenbank. Die nächsten Kapitel erklären genau,
was unter der Haube passiert, wenn Hunderte solcher Anfragen nebenläufig
in einem einzigen Prozess laufen: wie der Connection-Pool und
Transaktionen funktionieren, welche Code-Muster innerhalb einer Coroutine
gefährlich sind und wie sich populäre Pakete wie `Telescope` und
`spatie/laravel-permission` verhalten.
