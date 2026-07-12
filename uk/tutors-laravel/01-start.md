---
layout: tutorial
lang: uk
path_key: "/tutors-laravel/01-start.html"
nav_active: docs
permalink: /uk/tutors-laravel/01-start.html
page_title: "Запуск Laravel усередині корутинного сервера"
description: "Крок за кроком: запуск Laravel під TrueAsync Server і перший API, від маршрутів до бази даних."
---

# Запуск Laravel усередині корутинного сервера

Фреймворк `Laravel` спочатку не створювався під корутинні сервери,
тож просто так узяти й запустити його на `TrueAsync` не вийде.

Однак проєкт [`laravel-spawn`](https://github.com/YanGusik/laravel-spawn)
розв'язав цю задачу за допомогою набору спеціальних адаптерів.

## Крок 1. Встановлюємо пакет

```bash
composer require yangusik/laravel-spawn
```

Сервіс-провайдер реєструється автоматично. Публікуємо конфіг
сервера:

```bash
php artisan vendor:publish --tag=async-config
```

Це створює `config/async.php`, де зберігаються слухачі, кількість
воркерів, пул з'єднань до бази даних і список сервісів, які потрібно
резолвити заново на кожен запит.

## Крок 2. Запускаємо сервер

```bash
php artisan async:serve --host=0.0.0.0 --port=8080
```

Ця команда запускає `TrueAsync Server` і підключає маршрутизатор
Laravel.

```bash
$ curl http://localhost:8080/
```

Якщо ви бачите стандартну сторінку привітання Laravel, усе завелося
правильно. Далі будуємо поверх неї справжній `API`.

## Крок 3. Маршрути

Нічого незвичного, звичайний `routes/api.php`:

```php
use App\Http\Controllers\ProfileController;

Route::get('/profile/{id}', [ProfileController::class, 'show']);
Route::post('/profile/{id}/address', [ProfileController::class, 'updateAddress']);
```

`Route::get`, `Route::post`, `Route::apiResource` працюють як завжди.
Маршрутизатор будується один раз під час старту воркера й переживає
всі наступні запити.

## Крок 4. Контролер

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

Валідація, `Eloquent`, `findOrFail`, автоматичний `404`, кинутий як
виняток, усе точно так само, як у синхронному `Laravel`. Різниця
захована глибше: поки цей обробник чекає на відповідь від бази
даних, воркер уже обслуговує наступний запит у сусідній корутині.

## Крок 5. Автентифікація і сесія

```php
Route::middleware('auth:sanctum')->get('/me', function (Request $request) {
    return $request->user();
});
```

`Auth::user()`, `$request->user()`, `session()->get(...)` працюють
без змін. Пакет уже подбав про те, щоб кожен запит бачив свого
користувача і свою сесію, навіть коли поруч конкурентно обробляються
ще сотні чужих запитів. Як саме це влаштовано всередині, тема
наступного розділу, але з погляду контролера це просто працює.

## Крок 6. База даних

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

Запити `Eloquent`, транзакції, `DB::transaction(...)` пишуться точно
так само, як завжди. Під капотом кожен запит отримує власне фізичне
з'єднання з вбудованого `PDO Pool` замість того, щоб ділити одне на
всіх. Механіку пулу ви вже бачили в основній серії.

## Що далі

`API`, зібраний за ці шість кроків, це вже справжній застосунок
Laravel, що працює під `TrueAsync Server`: маршрути, контролери,
автентифікація, база даних. Наступні розділи пояснюють, що саме
відбувається під капотом, коли сотні таких запитів виконуються в
одному процесі конкурентно: як влаштовані пул з'єднань і транзакції,
які патерни коду небезпечні всередині корутини, і як поводяться
популярні пакети на кшталт `Telescope` і `spatie/laravel-permission`.
