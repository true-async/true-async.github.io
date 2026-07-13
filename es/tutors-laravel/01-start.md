---
layout: tutorial
lang: es
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /es/tutors-laravel/01-start.html
page_title: "Ejecutar Laravel dentro de un servidor de corrutinas"
description: "Paso a paso: ejecutar Laravel bajo TrueAsync Server y tu primera API, desde las rutas hasta la base de datos."
---

# Ejecutar Laravel dentro de un servidor de corrutinas

El framework `Laravel` no se creó originalmente para servidores de corrutinas,
así que no puedes simplemente tomarlo y ejecutarlo tal cual sobre `TrueAsync`.

Sin embargo, el proyecto [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
resolvió este problema con un conjunto de adaptadores dedicados.

## Paso 1. Instalar el paquete

```bash
composer require yangusik/laravel-spawn
```

El service provider se registra automáticamente. Publica la configuración
del servidor:

```bash
php artisan vendor:publish --tag=async-config
```

Esto crea `config/async.php`, que contiene los listeners, el número de
workers, el pool de conexiones a la base de datos y una lista de servicios
que deben resolverse de nuevo en cada petición.

## Paso 2. Iniciar el servidor

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Este comando inicia `TrueAsync Server` y conecta el router de Laravel.

```bash
$ curl http://localhost:8080/
```

Si ves la página de bienvenida por defecto de Laravel, todo funciona bien.
A partir de aquí construimos una `API` real sobre ella.

## Paso 3. Rutas

Nada fuera de lo común, un `routes/api.php` corriente:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` funcionan como siempre.
El router se construye una sola vez cuando arranca el worker y sobrevive a
todas las peticiones que le siguen.

## Paso 4. Controlador

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

Validación, `Eloquent`, `findOrFail`, un `404` automático lanzado como
excepción, todo exactamente igual que en el Laravel síncrono. La diferencia
está escondida más adentro: mientras este handler espera una respuesta de
la base de datos, el worker ya está atendiendo la siguiente petición en una
corrutina vecina.

## Paso 5. Autenticación y sesión

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` funcionan sin
cambios. El paquete ya se encarga de que cada petición vea su propio
usuario y su propia sesión, incluso mientras cientos de otras peticiones se
manejan de forma concurrente justo al lado. Cómo funciona esto exactamente
por debajo es el tema del próximo capítulo, pero desde el punto de vista
del controlador simplemente funciona.

## Paso 6. Base de datos

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

Las consultas `Eloquent`, las transacciones, `DB::transaction(...)`, todo
se escribe exactamente igual que siempre. Por debajo, cada petición recibe
su propia conexión física del `PDO Pool` integrado en lugar de compartir
una entre todos. Ya has visto el mecanismo del pool en la serie del núcleo.

## Qué sigue

La `API` construida a lo largo de estos seis pasos ya es una aplicación
Laravel real corriendo bajo `TrueAsync Server`: rutas, controladores,
autenticación, una base de datos. Los próximos capítulos explican
exactamente qué ocurre por debajo cuando cientos de peticiones así se
ejecutan de forma concurrente en un solo proceso: cómo funcionan el pool de
conexiones y las transacciones, qué patrones de código son peligrosos
dentro de una corrutina, y cómo se comportan paquetes populares como
`Telescope` y `spatie/laravel-permission`.
