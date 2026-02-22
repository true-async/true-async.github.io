---
layout: docs
lang: uk
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /uk/docs/components/channels.html
page_title: "Канали"
description: "Канали в TrueAsync -- безпечна передача даних між корутинами, черги завдань та зворотний тиск."
---

# Канали

Канали більш корисні для комунікації в багатопотоковому середовищі,
ніж в однопотоковому. Вони служать для безпечної передачі даних від однієї корутини до іншої.
Якщо потрібно модифікувати спільні дані,
в однопотоковому середовищі простіше передати об'єкт різним корутинам, ніж створювати канал.

Проте канали корисні в наступних сценаріях:
* організація черги завдань з обмеженнями
* організація пулів об'єктів (рекомендується використовувати спеціалізований примітив `Async\Pool`)
* синхронізація

Наприклад, є багато URL-адрес для сканування, але не більше N з'єднань одночасно:

```php
use Async\Channel;
use Async\Scope;

const MAX_CONNECTIONS = 10;
const MAX_QUEUE = 100;

$tasks = new Scope();
$channel = new Channel(MAX_QUEUE);

for($i = 0; $i < MAX_CONNECTIONS; $i++) {
    $tasks->spawn(function() use ($channel) {
        while (!$channel->isClosed()) {
            $url = $channel->recv();
            $content = file_get_contents($url);
            echo "Fetched page {$url}, length: " . strlen($content) . "\n";
        }
    });
}

// Заповнюємо канал значеннями
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

Константа `MAX_QUEUE` в цьому прикладі виступає обмежувачем для продюсера, створюючи зворотний тиск --
ситуацію, коли продюсер не може відправити дані, поки споживач не звільнить місце в каналі.

## Небуферизований канал (Рандеву)

Канал з розміром буфера `0` працює в режимі рандеву: `send()` блокується, поки інша корутина не викличе `recv()`, і навпаки. Це забезпечує строгу синхронізацію:

```php
use Async\Channel;

$ch = new Channel(0); // Канал рандеву

spawn(function() use ($ch) {
    echo "Sender: before send\n";
    $ch->send("hello");
    echo "Sender: send completed\n"; // Тільки після recv()
});

spawn(function() use ($ch) {
    echo "Receiver: before recv\n";
    $value = $ch->recv();
    echo "Receiver: got $value\n";
});
```

## Тайм-аути на операціях

Методи `recv()` та `send()` приймають необов'язковий параметр тайм-ауту в мілісекундах. Коли час спливає, кидається `TimeoutException`:

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Чекаємо не довше 50 мс
    } catch (TimeoutException $e) {
        echo "Nobody sent data within 50 ms\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Чекаємо отримувача не довше 50 мс
    } catch (TimeoutException $e) {
        echo "Nobody received the data within 50 ms\n";
    }
});
```

## Конкуруючі отримувачі

Якщо кілька корутин очікують на `recv()` одного каналу, кожне значення отримує **лише одна** з них. Значення не дублюються:

```php
use Async\Channel;

$ch = new Channel(0);

// Відправник
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Отримувач A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Отримувач B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B received: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Кожне значення (1, 2, 3) буде отримано тільки A або B, але не обома
```

Цей патерн корисний для реалізації пулів воркерів, де кілька корутин конкурують за завдання зі спільної черги.
