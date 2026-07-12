---
layout: tutorial
lang: uk
path_key: "/tutors-laravel/03-sse-grpc.html"
nav_active: docs
permalink: /uk/tutors-laravel/03-sse-grpc.html
page_title: "SSE і gRPC у Laravel"
description: "trueasync_response(), Sse і grpc_handlers: як дістатися буферизованого Illuminate Response прямо з контролера."
---

# SSE і gRPC у Laravel

`TrueAsyncServer` усередині `laravel-spawn` побудований просто: він
приймає `HttpRequest`, збирає з нього `Illuminate\Http\Request`,
проганяє його через `Kernel::handle()`, отримує
`Illuminate\Http\Response`, буферизує його цілком у `HttpResponse` і
відправляє. Один запит, одна відповідь, увесь вміст одразу. Саме те,
до чого Laravel звикав усю свою історію.

Але друга серія на цьому сайті мала індикатор прогресу через `SSE` і
`gRPC` на тому самому порту, і обидва живуть не за формулою "одна
відповідь", а за формулою "потік повідомлень". Буферизований
`Illuminate\Response` під це не пристосований: у нього немає ні
`sseEvent()`, ні `writeMessage()`. Тож контролеру потрібен спосіб
дістатися справжнього, сирого `HttpResponse`, оминаючи буфер.

## Сира відповідь на вимогу

`laravel-spawn` кладе `HttpRequest` і `HttpResponse` поточного запиту
в `request_context()` ще до того, як передасть керування
маршрутизатору Laravel, той самий трюк, яким сам Laravel користується
для `auth` і `session`, ще в першому розділі. Дістати їх можна двома
функціями:

```php
trueasync_request();   // TrueAsync\HttpRequest
trueasync_response();  // TrueAsync\HttpResponse
```

Щойно контролер сам записав у сиру відповідь і сам закрив її
(`$res->end()`), звичайний шлях `Illuminate\Response` вже не
потрібен: `TrueAsyncServer` перевіряє `isClosed()` перед
буферизацією, і якщо відповідь уже надіслано вручну, зверху нічого не
додається. Контролер усе одно зобов'язаний щось повернути, Laravel
цього вимагає, але вміст цього значення вже нікого не цікавить.

## SSE: індикатор прогресу всередині маршруту Laravel

Діставатися до `sseStart()`/`sseEvent()`/`sseComment()` через
`trueasync_response()` щоразу незручно, тож пакет постачає тонку
обгортку:

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
            break; // вкладку закрили
        }

        delay(1000);
    }

    Sse::event(event: 'finished', data: 'ok');
    Sse::end();

    return response()->noContent();
});
```

Впізнаєте цей код? Це той самий індикатор прогресу з шостого розділу
серверної серії, слово в слово, тільки `$res->sseEvent()` замінено на
`Sse::event()`. Усередині маршруту вам і далі доступні `Auth::user()`,
`session()`, `Eloquent`, це звичайний обробник Laravel, він просто
відповідає потоком замість одноразової відповіді. Middleware,
авторизація через `Route::middleware('auth:sanctum')`,
`current_context()` для стану, прив'язаного до запиту, з першого
розділу, усе це працює як завжди, тому що `Kernel::handle()` навколо
цього коду не змінився ні на рядок.

Одна деталь налаштування стосується не Laravel, а самого сервера:
довготривалий потік не повинен обриватися через таймаут запису,
потрібний звичайним відповідям, тож сервіси з потоками вимикають його
глобально, `ASYNC_WRITE_TIMEOUT=0` у `.env`, той самий важіль, що й у
розділі про продакшен серверної серії.

## gRPC: контракт замість маршруту

З `gRPC` компроміс жорсткіший. Протокол спілкується
protobuf-закодованими повідомленнями, які не мають осмисленого
відображення ні на `Illuminate\Http\Request`, ні тим паче на
`Response`. Фабрикувати фейковий HTTP-запит лише для того, щоб
протягнути його через маршрутизацію і middleware Laravel, було б
безглуздо: клієнт gRPC не надсилає ні кук, ні CSRF-токена, ні тіла
форми. Тож `gRPC` у `laravel-spawn` цілком оминає `Kernel`, ідучи
окремим шляхом, налаштованим через конфігураційний файл:

```php
// config/async.php
'grpc_handlers' => [
    '/profile.ProfileService/GetProfile' => [
        \App\Grpc\ProfileServiceHandler::class, 'getProfile',
    ],
],
```

Сам обробник резолвиться через контейнер (тож звичайний DI через
конструктор і далі працює), а сигнатура методу та сама пара сирих
об'єктів, яку ви вже бачили в десятому розділі серверної серії:

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
        // звичайний return: сервер сам додає grpc-status: 0 (OK)
    }
}
```

`$this->users` прийшов через конструктор, як і в будь-якому сервісі
Laravel: контейнер і DI усе так само повністю в грі, хоча
маршрутизація Laravel узагалі не торкалася цього шляху. Помилки
подорожують так само, як у голому `TrueAsync Server`: через трейлер
`grpc-status`, а не HTTP-код стану.

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

Виняток, кинутий з обробника, сам `laravel-spawn` перетворює на
`grpc-status: 13` (`INTERNAL`), таку саму поведінку мав голий сервер,
просто тепер вона захована всередині адаптера.

## Що тут справжнє, а що ні

Жоден із цих шляхів не є емуляцією чи хаком поверх Symfony
`StreamedResponse`, обидва це прямий доступ до тих самих примітивів
`HttpRequest`/`HttpResponse` із серверної серії, прямо з-під маршруту
Laravel. Ціна передбачувана: обробник SSE не відповідає через звичне
`return response()->json(...)`, він сам пише і сам вирішує, коли
закрити з'єднання; обробник gRPC узагалі не бачить middleware чи
маршрутизації Laravel, лише контейнер для DI. Тут немає жодної чорної
магії, але немає й вдавання: якщо вам потрібен справжній потік,
доведеться вийти з затишного світу буферизованого `Response` туди, де
живе сам сервер.

Ми розглянули, що Laravel уміє: звичайні запити, потоки, gRPC.
Лишилося те, чого Laravel не вміє сам, і що варте пильної уваги у
вашому власному коді й чужому, перш ніж віддавати його конкурентним
корутинам. Саме туди ми й прямуємо в наступному розділі.
