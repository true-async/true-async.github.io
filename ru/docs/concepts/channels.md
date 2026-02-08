---
layout: docs
lang: ru
path_key: "/docs/concepts/channels.html"
nav_active: docs
permalink: /ru/docs/concepts/channels.html
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
