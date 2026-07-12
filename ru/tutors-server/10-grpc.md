---
layout: docs
lang: ru
path_key: "/tutors-server/10-grpc.html"
nav_active: docs
permalink: /ru/tutors-server/10-grpc.html
page_title: "gRPC"
description: "addGrpcHandler(): unary и стриминг, readMessage/writeMessage, трейлеры и дедлайны."
---

# gRPC

С нашим сервером до сих пор разговаривали браузеры. Но у
`ProfileService` есть и другие собеседники: `UserDirectory`,
`GeoDirectory`, биллинг. Сервисы между собой давно общаются
не по REST, а по gRPC: строгие контракты, стриминг в обе стороны,
дедлайны и коды ошибок из коробки.

Обычно под gRPC поднимают отдельный сервер на отдельном порту.
Спросите себя: а зачем, собственно? gRPC — это протокол поверх
HTTP/2 и HTTP/3. Поверх того, что у нас уже слушает. Серверу
достаточно отличать такие запросы по content-type `application/grpc`
и отдавать их в отдельный обработчик. Он именно так и делает.

## Контракт сначала

Разговор в gRPC начинается не с кода. Он начинается с контракта,
и это, пожалуй, главная культурная разница с REST. Опишем сервис
профилей в `profile.proto`:

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

Компилятор protobuf генерирует из этого PHP-классы, рантайм ставится
композером:

```bash
$ composer require google/protobuf
$ protoc --php_out=src/Generated profile.proto
```

Теперь в проекте есть `Profile\GetProfileRequest` и `Profile\Profile`:
типизированные геттеры, сеттеры, сериализация. И ровно такие же классы
protoc сгенерирует для клиента на Go, Java или Python. В этом весь
смысл: контракт один, языки любые.

## Сообщения вместо тел

Чем gRPC-обработчик отличается от HTTP-обработчика? Единицей общения.
Там были «тело запроса» и «тело ответа», по одному на каждого. Здесь —
поток сообщений в каждую сторону: `readMessage()` возвращает байты
следующего входящего или `null` в конце, `writeMessage()` отправляет
исходящее. Сервер отвечает за grpc-фрейминг, длины и флаги.
Сгенерированные классы — за содержимое:

```php
use Profile\GetProfileRequest;
use Profile\Profile;

$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    // путь запроса называет метод контракта
    if ($req->getPath() !== '/profile.ProfileService/GetProfile') {
        $res->setTrailer('grpc-status', '12'); // UNIMPLEMENTED
        return;
    }

    $getProfile = new GetProfileRequest();
    $getProfile->mergeFromString($req->readMessage()); // байты -> объект

    $profile = (new Profile())
        ->setId($getProfile->getUserId())
        ->setName(fetchName($getProfile->getUserId()))
        ->setRegion(fetchRegion($getProfile->getUserId()));

    $res->writeMessage($profile->serializeToString()); // объект -> байты
});
```

Роутинг здесь — просто путь: пакет, сервис, метод. Клиент на любом
языке, вызывая `GetProfile`, шлёт POST на
`/profile.ProfileService/GetProfile`. А сам обработчик живёт рядом
с REST-роутами и видит тот же прогретый пул и контекст запроса.

Все четыре формы gRPC получаются из этого же API и различаются
только числом вызовов:

```php
// Unary: одно сообщение туда, одно обратно
$getProfile->mergeFromString($req->readMessage());
$res->writeMessage($reply->serializeToString());

// Server streaming: одно туда, много обратно
$getHistory->mergeFromString($req->readMessage());
foreach (loadHistory($getHistory->getUserId()) as $event) {
    $res->writeMessage($event->serializeToString());
}

// Полный дуплекс: читаем и отвечаем вперемешку
while (($bytes = $req->readMessage()) !== null) {
    $msg = new ChatMessage();
    $msg->mergeFromString($bytes);
    $res->writeMessage(process($msg)->serializeToString());
}
```

`readMessage()` усыпляет корутину до следующего сообщения,
`writeMessage()` отвечает сразу, не дожидаясь конца входящего потока.
Тот же дуплекс, что у WebSocket, только с контрактом и по стандарту.

## Передача ошибок

У gRPC своя система кодов ошибок, и живёт она в месте, которое
поначалу сбивает с толку. HTTP-статус ответа всегда 200. Всегда.
Настоящий результат едет в трейлерах — заголовках, которые HTTP/2
отправляет после тела. Мы мельком видели их в главе про стриминг,
и вот их главный потребитель:

```php
$server->addGrpcHandler(function (HttpRequest $req, HttpResponse $res) {
    $data = $req->readMessage();

    if (!authorized($req)) {
        $res->setTrailer('grpc-status', '7'); // PERMISSION_DENIED
        $res->setTrailer('grpc-message', 'access denied');
        return;
    }

    $res->writeMessage(process($data));
    // чистый return: сервер сам допишет grpc-status: 0 (OK)
});
```

Об авариях тоже подумано: исключение, вылетевшее из обработчика,
превращается в `grpc-status: 13` (INTERNAL), а не в оборванное
соединение.

## Дедлайны

Помните, сколько глав первой серии мы потратили на идею «любое
ожидание должно иметь предел»? Так вот, в gRPC эта идея возведена
в стандарт протокола. Клиент передаёт свой дедлайн прямо в запросе,
заголовком `grpc-timeout`, а сервер отдаёт его обработчику:

```php
$deadline = $req->getGrpcTimeout(); // миллисекунды или null

$result = $group->all()->await(timeout($deadline ?? 5000));
```

Вдумайтесь, насколько это правильная механика. У клиента осталось
двести миллисекунд терпения? Тогда бессмысленно ходить в `GeoDirectory`
с таймаутом в две секунды. Дедлайн продевается сквозь все внутренние
ожидания, через все сервисы в цепочке, и вся система уважает терпение
самого первого звонившего.

## Конец второй серии

Вот и весь маршрут. Оглянемся разок.

Пятнадцать глав первой серии собирали словарь: корутины, отмена,
`Future`, каналы, scope, группы, пулы, потоки, контекст. Честно
говоря, местами могло казаться, что словарь избыточен. А потом
пришла вторая серия, и оказалось, что сервер — это просто предложение,
составленное из тех же слов. Каждый запрос — корутина. Базу бережёт
пул. За запросом прибирает scope. Перегрузку держит обратное давление.
Ядра занимают потоки. А поверх — статика, SSE, WebSocket и gRPC
на одном порту.

Заметьте и то, чего в обеих сериях не было: колбэков, цепочек
`.then()`, ключевых слов `async` и `await` на каждой второй строчке,
ручного управления циклом событий. Весь код — обычный последовательный
PHP. Он просто перестал ждать впустую.

Дальше сами. Возьмите сервис, который давно просился на переделку,
и начните с одного обработчика. Справочник по классам —
в [документации сервера](/ru/docs/server/index.html), внутренности —
в [архитектуре](/ru/architecture/server.html). А если что-то поведёт
себя не так, как обещали эти главы, вы теперь знаете достаточно,
чтобы завести хороший баг-репорт.
