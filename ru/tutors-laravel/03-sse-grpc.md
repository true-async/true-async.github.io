---
layout: tutorial
lang: ru
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /ru/tutors-laravel/03-sse-grpc.html
page_title: "SSE и gRPC с Laravel"
description: "trueasync_response(), Sse и grpc_handlers: как выйти за пределы буферизованного Illuminate Response прямо из контроллера."
---

# SSE и gRPC с Laravel

`TrueAsyncServer` внутри `laravel-spawn` устроен просто: принял
`HttpRequest`, собрал из него `Illuminate\Http\Request`, прогнал через
`Kernel::handle()`, получил `Illuminate\Http\Response`, буферизовал
её целиком в `HttpResponse` и отправил. Один запрос — один ответ,
всё содержимое сразу. Ровно то, к чему Laravel привык за всю свою
историю.

Но во второй серии этого сайта был прогресс-бар на `SSE` и был `gRPC`
на том же порту — оба живут не по формуле «один ответ», а по формуле
«поток сообщений». Буферизованный `Illuminate\Response` для них не
подходит по конструкции: у него нет ни `sseEvent()`, ни
`writeMessage()`. Значит, контроллеру нужен способ дотянуться до
настоящего, сырого `HttpResponse` в обход буфера.

## Сырой ответ по первому требованию

`laravel-spawn` кладёт `HttpRequest` и `HttpResponse` текущего запроса
в `request_context()` ещё до того, как передать управление
Laravel-роутеру — тем же приёмом, которым сам Laravel кладёт туда
`auth` и `session` из первой главы. Достать их можно двумя функциями:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Как только контроллер написал в сырой ответ и закрыл его сам
(`$res->end()`), обычный путь через `Illuminate\Response` больше не
нужен: `TrueAsyncServer` перед буферизацией проверяет `isClosed()`
и, если ответ уже отправлен вручную, ничего сверху не досылает.
Контроллер по-прежнему обязан что-то вернуть — Laravel таков, — но
содержимое этого возврата уже никого не интересует.

## SSE: прогресс-бар внутри Laravel-маршрута

Раскрывать `sseStart()`/`sseEvent()`/`sseComment()` каждый раз через
`trueasync_response()` неудобно, поэтому в пакете есть тонкая
обёртка:

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
            break; // вкладку закрыли
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Узнаёте код? Это дословно прогресс-бар из шестой главы серверной
серии, только `$res->sseEvent()` заменился на `Sse::event()`. Внутри
маршрута доступны и `Auth::user()`, и `session()`, и `Eloquent` — это
обычный Laravel-обработчик, просто отвечает он не один раз, а потоком.
Middleware, авторизация через `Route::middleware('auth:sanctum')`,
`current_context()` для per-request состояния из первой главы — всё
работает как обычно, потому что `Kernel::handle()` вокруг этого кода
не изменился ни на строчку.

Одна деталь конфигурации не про Laravel, а про сам сервер: долгий
стрим не должен упираться в таймаут записи, который у обычных ответов
как раз и нужен, поэтому для сервисов со стримами его отключают
глобально, `ASYNC_WRITE_TIMEOUT=0` в `.env`, — тот же рычаг, что
и в главе про продакшен серверной серии.

## gRPC: контракт вместо маршрута

С `gRPC` компромисс жёстче. Протокол общается сообщениями
в протобуф-кодировке, у которых нет осмысленного отображения ни
в `Illuminate\Http\Request`, ни тем более в `Response`. Городить
поддельный HTTP-запрос ради того, чтобы протащить его через роутинг
и middleware, бессмысленно: gRPC-клиент не пришлёт ни cookie, ни
CSRF-токен, ни тело формы. Поэтому `gRPC` в `laravel-spawn` идёт
в обход `Kernel` целиком, отдельным путём, настроенным через конфиг:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

Сам обработчик резолвится через контейнер (значит, обычная DI-инъекция
в конструкторе работает), а сигнатура метода — та же пара сырых
объектов, что и в десятой главе серверной серии:

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
        // чистый return: сервер сам допишет grpc-status: 0 (OK)
    }
}
```

`$this->users` пришёл через конструктор, как в любом Laravel-сервисе:
контейнер и DI по-прежнему на месте, хотя маршрутизация Laravel
для этого пути не участвовала вовсе. Ошибки передаются так же, как
в чистом `TrueAsync Server`: трейлером `grpc-status`, а не HTTP-кодом.

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

Исключение, вылетевшее из обработчика, `laravel-spawn` сам превращает
в `grpc-status: 13` (`INTERNAL`) — то же поведение, которое было
у голого сервера, просто теперь оно укрыто внутри адаптера.

## Что из этого настоящее, а что нет

Оба пути — не эмуляция и не хак поверх Symfony `StreamedResponse`,
а прямой доступ к тем же примитивам `HttpRequest`/`HttpResponse`, что
и в серверной серии, прямо из-под Laravel-маршрута. Плата за это
предсказуема: SSE-обработчик отвечает не через привычный
`return response()->json(...)`, а пишет сам и сам решает, когда
закрыть соединение; gRPC-обработчик вообще не видит ни middleware, ни
роутинг Laravel, только контейнер для DI. Здесь нет черной магии,
но нет и притворства — если нужен настоящий поток, придётся выйти
из уютного мира буферизованного `Response` туда, где живёт сам
сервер.

Мы разобрали, что Laravel умеет: обычные запросы, стримы, gRPC.
Осталось разобраться, чего Laravel не умеет сам по себе и что стоит
особенно внимательно проверять в собственном и чужом коде, прежде
чем доверить его конкурентным корутинам. Туда и пойдём в следующей
главе.
