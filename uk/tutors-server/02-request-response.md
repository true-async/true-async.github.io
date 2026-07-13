---
layout: tutorial
lang: uk
path_key: "/tutors-server/02-request-response.html"
nav_active: docs
permalink: /uk/tutors-server/02-request-response.html
page_title: "Запит і відповідь"
description: "HttpRequest і HttpResponse: маршрутизація, json() та помилки через HttpException."
---

# Запит і відповідь

Обробник отримує два об'єкти. `HttpRequest` це все, що надіслав клієнт,
і він лише для читання. `HttpResponse` це все, що поїде назад. Між ними
ваш код. Зберемо на цій трійці мінімальний `API` профілів і дорогою
подивимося, що ці об'єкти вміють.

## Розбираємо запит

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

Багато що із запиту вже розібрано й доступно у зручній формі:

```php
// GET /profile/42?fields=name,address&debug=1
$req->getQuery();                    // ['fields' => 'name,address', 'debug' => '1']
$req->getQueryParam('debug', '0');   // '1', зі значенням за замовчуванням

// POST з формою: application/x-www-form-urlencoded або multipart
$req->getPost();                     // ['address' => ['city' => 'Berlin', ...]]

// заголовки, без урахування регістру
$req->getHeader('authorization');    // 'Bearer eyJ...' або null

// сире тіло, наприклад JSON
$data = json_decode($req->getBody(), true);
```

`getQuery()` і `getPost()` розуміють звичну PHP-нотацію масивів:
`address[city]`, `photos[]`. Перехід зі старих `$_GET`/`$_POST` майже
дослівний.

## Збираємо відповідь

Для `API` потрібен `JSON`, і у відповіді є готовий помічник для цього:

```php
function showProfile(int $userId, HttpRequest $req, HttpResponse $res): void
{
    $profile = loadProfile($userId);

    $res->json($profile);                    // 200, Content-Type: application/json
    $res->json($errors, status: 422);        // статус другим аргументом
}
```

Решта помічників у тому самому дусі:

```php
$res->html('<h1>Профіль оновлено</h1>');
$res->redirect('/profile/42', 303);
$res->setHeader('Cache-Control', 'no-store');
```

Кожен метод повертає `$this`, тож відповідь збирається ланцюжком. Явно
завершувати її не потрібно: обробник повернувся, відповідь пішла.

## Помилки: HttpException

Тепер `updateAddress`. Профілю може не бути. Адресу можуть не надіслати.
Валідація може не пройти. На кожен випадок писати `setStatusCode`
з раннім `return`? Можна. А можна так:

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

`HttpException` сервер розуміє без перекладача: код винятку стає статусом,
повідомлення стає тілом відповіді. Жодного 500 із трасуванням назовні.
Клас не фінальний, тож заведіть власну ієрархію й забудьте про магічні
числа:

```php
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
```

І ось тут я попрошу хвилину уваги, бо далі йде моя улюблена деталь цього
розділу. Погляньте на родовід класу:

`HttpException extends Async\AsyncCancellation`

Той самий виняток скасування. Із другого розділу першої серії. Збіг? Ні.
Подумайте, що має зробити сервер, коли клієнт обірвав з'єднання посеред
запиту: зупинити корутину обробника. А як у нас зупиняють корутини?
Кооперативним скасуванням. HTTP-помилка та скасування корутини виявилися
одним і тим самим механізмом, просто з різних боків.

Із цієї спорідненості випливає й старе правило, знайоме з розділу про
скасування: якщо ви впіймали `HttpException` випадково, разом
із `Throwable`, прокиньте його далі. Сервер знає, що з ним робити. Ви
не зобов'язані.

Отже, `API` відповідає за правилами й падає за правилами. Але обробники
в нас поки що підозріло прості: одна перевірка, один запит, одна
відповідь. А що буде, коли всередині знадобиться сходити в базу,
в `GeoDirectory` і в кеш, та бажано конкурентно? Це третій розділ. Там
перша серія нарешті вистрелить на повну.
