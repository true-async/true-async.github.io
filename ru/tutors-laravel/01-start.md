---
layout: tutorial
lang: ru
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /ru/tutors-laravel/01-start.html
page_title: "Работа с Laravel в корутинном сервере"
description: "Пошагово: запуск Laravel под TrueAsync Server и первый API — от маршрутов до базы данных."
---

# Работа с Laravel в корутинном сервере

Фреймворк `Laravel` изначально не создавался под корутинные-серверы, 
поэтому его нельзя просто так взять и запустить на `TrueAsync`.

Однако проект [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn) решил эту задачу, через 
специальные адаптеры.

## Шаг 1. Подключаем пакет

```bash
composer require yangusik/laravel-spawn
```

Сервис-провайдер подключается автоматически. Публикуем конфиг сервера:

```bash
php artisan vendor:publish --tag=async-config
```

Появится `config/async.php` — в нём слушатели, число воркеров, пул
соединений к базе и список сервисов, которые нужно резолвить заново
на каждый запрос.

## Шаг 2. Запускаем сервер

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Команда запускает `TrueAsync Server` и подключает маршрутизатор Laravel.

```bash
$ curl http://localhost:8080/
```

Если стоит заглушка Laravel по умолчанию, всё завелось. Дальше строим
поверх неё настоящий `API`.

## Шаг 3. Маршруты

Ничего непривычного, обычный `routes/api.php`:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` — работают как обычно.
Маршрутизатор строится один раз при старте воркера и переживает
все последующие запросы.

## Шаг 4. Контроллер

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

Валидация, `Eloquent`, `findOrFail`, автоматический `404` через
исключение — всё как в синхронном `Laravel`. Разница спрятана глубже:
пока этот обработчик ждёт ответ от базы, воркер уже обслуживает
следующий запрос в соседней корутине.

## Шаг 5. Аутентификация и сессия

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` — используются
без изменений. Пакет уже позаботился о том, чтобы каждый запрос видел
своего пользователя и свою сессию, даже когда рядом конкурентно
обрабатываются ещё сотни чужих запросов. Как именно это устроено
внутри — тема следующей главы, но с точки зрения кода контроллера
это просто работает.

## Шаг 6. База данных

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

`Eloquent`-запросы, транзакции, `DB::transaction(...)` пишутся как
обычно. Под капотом каждый запрос получает своё физическое соединение
из встроенного `PDO Pool`, а не делит одно на всех, — механику пула
вы уже видели в основной серии.

## Что дальше

Собранный на этих шести шагах `API` — это уже настоящее Laravel-приложение,
работающее под `TrueAsync Server`: маршруты, контроллеры, аутентификация,
база. Следующие главы объясняют, что именно происходит под капотом,
когда сотни таких запросов выполняются в одном процессе одновременно:
как устроен пул соединений и транзакции, какие паттерны кода опасны
в корутине, и как ведут себя популярные пакеты вроде `Telescope`
и `spatie/laravel-permission`.
