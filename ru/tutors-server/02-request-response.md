---
layout: docs
lang: ru
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /ru/tutors-server/02-request-response.html
page_title: "Запрос и ответ"
description: "HttpRequest и HttpResponse: маршрутизация, json(), и ошибки через HttpException."
---

# Запрос и ответ

Обработчик получает два объекта. `HttpRequest` — всё, что прислал
клиент, и только для чтения. `HttpResponse` — всё, что уедет обратно.
Между ними ваш код. Соберём на этой троице минимальный `API` профилей
и по дороге посмотрим, что эти объекты умеют.

## Разбираем запрос

```php
use TrueAsync\HttpRequest;
use TrueAsync\HttpResponse;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $method = $req->getMethod();   // GET, POST, ...
    $path   = $req->getPath();     // /profile/42, без query string

    if ($method === 'GET' && preg_match('#^/profile/(\d+)$#', $path, $m)) {
        showProfile((int) $m[1], $req, $res);
        return;
    }

    if ($method === 'POST' && preg_match('#^/profile/(\d+)/address$#', $path, $m)) {
        updateAddress((int) $m[1], $req, $res);
        return;
    }

    $res->setStatusCode(404)->setBody("Not found\n");
});
```

Многое из запроса уже разобрано и доступно в удобной форме:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', со значением по умолчанию

// POST с формой: application/x-www-form-urlencoded или multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// заголовки, без учёта регистра
$req->getHeader('authorization');    // 'Bearer eyJ...' или null

// сырое тело, например JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` и `getPost()` понимают привычную PHP-нотацию
массивов: `address[city]`, `photos[]`. Переезд со старых
`$_GET`/`$_POST` почти дословный.

## Собираем ответ

Для `API` нужен `JSON`, и у ответа есть готовый помощник:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // статус вторым аргументом
}
```

Остальные помощники в том же духе:

```php
$res->html('<h1>Профиль обновлён</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Все методы возвращают `$this`, ответ собирается цепочкой. Явно
завершать его не нужно: обработчик вернулся — ответ ушёл.

## Ошибки: HttpException

Теперь `updateAddress`. Профиль может не существовать. Адрес могут
не прислать. Валидация может не пройти. На каждый случай писать
`setStatusCode` с ранним `return`? Можно. А можно так:

```php
use TrueAsync\HttpException;

function updateAddress(int $userId, HttpRequest $req, HttpResponse $res): void
{
    if (!profileExists($userId)) {
        throw new HttpException('Profile not found', 404);
    }

    $address = $req->getPost()['address'] ?? null;

    if ($address === null) {
        throw new HttpException('Address is required', 422);
    }

    saveAddress($userId, $address);
    $res->json(['ok' => true]);
}
```

`HttpException` сервер понимает без переводчика: код исключения
становится статусом, сообщение — телом ответа. Никакого 500
с трассировкой наружу. Класс не финальный, так что заведите свою
иерархию и забудьте про магические числа:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

И вот здесь я попрошу минуту внимания, потому что дальше идёт моя
любимая деталь этой главы. Посмотрите на родословную класса:

`HttpException extends Async\AsyncCancellation`

То самое исключение отмены. Из второй главы первой серии. Совпадение?
Нет. Подумайте, что должен сделать сервер, когда клиент оборвал
соединение посреди запроса: остановить корутину обработчика. А как
у нас останавливают корутины? Кооперативной отменой. HTTP-ошибка
и отмена корутины оказались одним и тем же механизмом, просто
с разных сторон.

Из этого родства следует и старое правило, знакомое по главе
про отмену: поймали `HttpException` случайно, вместе с `Throwable`, —
пробросьте дальше. Сервер знает, что с ним делать. Вы — не обязаны.

Итак, `API` отвечает по правилам и падает по правилам. Но обработчики
у нас пока подозрительно простые: одна проверка, один запрос, один
ответ. А что будет, когда внутри понадобится сходить в базу,
в `GeoDirectory` и в кэш, и желательно одновременно? Будет третья
глава. В ней первая серия наконец выстрелит в полный рост.
