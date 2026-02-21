---
layout: docs
lang: ru
path_key: "/docs/components/channels.html"
nav_active: docs
permalink: /ru/docs/components/channels.html
page_title: "Каналы"
description: "Каналы в TrueAsync — безопасная передача данных между корутинами, очереди задач и backpressure."
---

# Каналы

В большей степени каналы полезны для взаимодействия в многопоточной среде,
чем в однопоточной. Они служат для безопасной передачи данных от корутины к корутине.
Если нужно изменять общие данные,
то в однопоточной среде проще передать объект в разные корутины, чем делать канал.

Каналы же полезны в следующих сценариях:
* организации очереди задач с ограничением
* организации пулов объектов (рекомендуется использовать отдельный примитив `Async\Pool`)
* синхронизации

Например, есть множество ссылок, которые нужно обойти, но при этом не более N соединений одновременно:

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

// Заполняем канал значениями
for($i = 0; $i < MAX_CONNECTIONS * 2; $i++) {
    $channel->send("https://example.com/{$i}");
}
```

Константа `MAX_QUEUE` в этом примере играет роль ограничителя для продюсера, создавая обратное давление (`backpressure`),
то есть ситуацию, когда продюсер не может отправить данные, пока потребитель не освободит место в канале.

## Небуферизованный канал (рандеву)

Канал с размером буфера `0` работает в режиме рандеву: `send()` блокируется до тех пор, пока другая корутина не вызовет `recv()`, и наоборот. Это обеспечивает строгую синхронизацию:

```php
use Async\Channel;

$ch = new Channel(0); // Рандеву-канал

spawn(function() use ($ch) {
    echo "Отправитель: до send\n";
    $ch->send("hello");
    echo "Отправитель: send завершён\n"; // Только после recv()
});

spawn(function() use ($ch) {
    echo "Получатель: до recv\n";
    $value = $ch->recv();
    echo "Получатель: получил $value\n";
});
```

## Таймауты на операциях

Методы `recv()` и `send()` принимают опциональный параметр таймаута в миллисекундах. При истечении времени выбрасывается `TimeoutException`:

```php
use Async\Channel;
use Async\TimeoutException;

$ch = new Channel(0);

spawn(function() use ($ch) {
    try {
        $ch->recv(50); // Ждём не более 50 мс
    } catch (TimeoutException $e) {
        echo "Никто не отправил данные за 50 мс\n";
    }
});

spawn(function() use ($ch) {
    try {
        $ch->send("data", 50); // Ждём получателя не более 50 мс
    } catch (TimeoutException $e) {
        echo "Никто не принял данные за 50 мс\n";
    }
});
```

## Конкурирующие получатели

Если несколько корутин ожидают `recv()` на одном канале, каждое значение получит **только одна** из них. Значения не дублируются:

```php
use Async\Channel;

$ch = new Channel(0);

// Отправитель
spawn(function() use ($ch) {
    for ($i = 1; $i <= 3; $i++) {
        $ch->send($i);
    }
    $ch->close();
});

// Получатель A
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "A получил: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Получатель B
spawn(function() use ($ch) {
    try {
        while (true) {
            $v = $ch->recv();
            echo "B получил: $v\n";
        }
    } catch (\Async\ChannelException) {}
});

// Каждое значение (1, 2, 3) получит только A или B, но не оба
```

Этот паттерн полезен для реализации пулов воркеров, где несколько корутин конкурируют за задачи из общей очереди.
