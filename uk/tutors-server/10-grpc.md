---
layout: tutorial
lang: uk
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /uk/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unary і streaming, readMessage/writeMessage, trailers і deadlines."
---

# gRPC

Досі з нашим сервером говорили лише браузери. Але в `ProfileService`
є й інші співрозмовники: `UserDirectory`, `GeoDirectory`, білінг. Сервіси
давно спілкуються між собою не через REST, а через gRPC: суворі контракти,
стримінг в обидва боки, deadlines і коди помилок з коробки.

Зазвичай для gRPC піднімають окремий сервер на окремому порту. Запитайте
себе: навіщо, власне? gRPC, це протокол поверх HTTP/2 та HTTP/3. Поверх
того, що вже слухає для нас. Серверу лишається тільки розрізняти такі
запити за content-type `application/grpc` і передавати їх окремому обробнику.
Саме це він і робить.

## Спершу контракт

Розмова gRPC починається не з коду. Вона починається з контракту, і в цьому,
мабуть, головна культурна відмінність від REST. Опишімо сервіс профілю
в `profile.proto`:

```protobuf
syntax = "proto3";
package profile;

service ProfileService {
  rpc GetProfile (GetProfileRequest) returns (Profile);
}

message GetProfileRequest { int64 user_id = 1; }

message Profile {
  int64  id     = 1;
  string name   = 2;
  string region = 3;
}
```

Компілятор protobuf генерує з цього PHP-класи, а рантайм установлюється
через Composer:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Тепер у проєкті є `Profile\GetProfileRequest` і `Profile\Profile`:
типізовані гетери, сетери, серіалізація. І protoc згенерує рівно такі самі
класи для клієнта на Go, Java чи Python. У цьому весь сенс: один контракт,
будь-які мови.

## Повідомлення замість тіл

Чим gRPC-обробник відрізняється від HTTP-обробника? Одиницею спілкування.
Там у нас було «тіло запиту» й «тіло відповіді», по одному. Тут це потік
повідомлень у кожному напрямку: `readMessage()` повертає байти наступного
вхідного або `null` наприкінці, а `writeMessage()` надсилає вихідне. Сервер
відповідає за gRPC-фреймінг, довжини й прапорці. Згенеровані класи
відповідають за вміст:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // шлях запиту називає метод контракту
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // байти -> об'єкт

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // об'єкт -> байти
});
```

Маршрутизація тут, це просто шлях: пакет, сервіс, метод. Клієнт будь-якою
мовою, викликаючи `GetProfile`, надсилає POST на
`/profile.ProfileService/GetProfile`. А сам обробник живе поряд із
REST-маршрутами й бачить той самий прогрітий пул і контекст запиту.

Усі чотири форми gRPC виходять із того самого API й відрізняються лише
кількістю викликів:

```php
// Unary: одне повідомлення туди, одне назад
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: одне туди, багато назад
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Full duplex: читання й відповідь упереміш
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` присипляє корутину до наступного повідомлення, а
`writeMessage()` відповідає одразу, не чекаючи кінця вхідного потоку. Той
самий дуплекс, що й у WebSocket, тільки з контрактом і за стандартом.

## Передача помилок

У gRPC своя система кодів помилок, і живе вона в місці, яке спершу спантеличує.
HTTP-статус відповіді завжди 200. Завжди. Справжній результат подорожує
у trailers, заголовках, які HTTP/2 надсилає після тіла. Ми мигцем побачили
їх у розділі про стримінг, а ось їхній головний споживач:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // чистий return: сервер сам додає grpc-status: 0 (OK)
});
```

Падіння теж обробляються: виняток, що вилітає з обробника, перетворюється на
`grpc-status: 13` (INTERNAL), а не на розірване з'єднання.

## Deadlines

Пам'ятаєте, скільки розділів першої серії ми витратили на думку, що
«будь-яке очікування повинне мати обмеження»? Так от, у gRPC ця думка
піднесена до стандарту протоколу. Клієнт передає свій deadline прямо
в запиті, через заголовок `grpc-timeout`, а сервер віддає його обробнику:

```php
$deadline = $req->getGrpcTimeout(); // мілісекунди або null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Замисліться, наскільки правильна ця механіка. У клієнта лишилося двісті
мілісекунд терпіння? Тоді немає сенсу йти до `GeoDirectory` з двосекундним
таймаутом. Deadline протягується через усі внутрішні очікування, через усі
сервіси в ланцюжку, і вся система поважає терпіння найпершого викликача.

## Кінець другої серії

Ось і весь маршрут. Озирнімося назад один раз.

П'ятнадцять розділів першої серії будували словник: корутини, скасування,
`Future`, канали, scope, групи, пули, потоки, контекст. Чесно кажучи,
місцями могло здатися, що словник надлишковий. А потім прийшла друга серія,
і виявилося, що сервер, це просто речення, складене з тих самих слів. Кожен
запит, це корутина. Пул захищає базу. Scope прибирає після запиту.
Backpressure стримує перевантаження. Потоки займають ядра. А зверху статика,
SSE, WebSocket і gRPC на одному порту.

Зверніть увагу й на те, чого не було в жодній серії: колбеків, ланцюжків
`.then()`, ключових слів `async` та `await` через рядок, ручного керування
циклом подій. Увесь код, це звичайний послідовний PHP. Він просто перестав
чекати намарно.

Звідси ви самі. Візьміть сервіс, що давно проситься на переробку, і почніть
з одного обробника. Довідник класів у [документації сервера](/uk/docs/server/index.html),
а внутрішній устрій в [архітектурі](/uk/architecture/server.html). А якщо
щось поводиться інакше, ніж обіцяли ці розділи, ви тепер знаєте достатньо,
щоб скласти хороший баг-репорт.
