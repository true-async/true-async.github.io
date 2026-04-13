---
layout: docs
lang: ru
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /ru/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — потокобезопасный канал для передачи данных между OS-потоками в TrueAsync."
---

# Async\ThreadChannel: каналы между OS-потоками

## Чем отличается от обычного Channel

`Async\Channel` работает **внутри одного потока** — между корутинами одного Scheduler'а. Данные
в нём лежат в обычной `emalloc`-памяти, и безопасность обеспечивается тем, что одновременно к каналу
обращается только одна корутина.

`Async\ThreadChannel` предназначен для передачи данных **между OS-потоками**. Его внутренности живут
в **persistent-памяти** (`pemalloc`), синхронизация — через `pthread_mutex`. Каждое отправленное значение
глубоко копируется в persistent-память, а на стороне получателя — в его собственный emalloc-heap.

| Свойство                          | `Async\Channel`          | `Async\ThreadChannel`        |
|-----------------------------------|--------------------------|------------------------------|
| Область видимости                 | Один OS-поток            | Между OS-потоками            |
| Где лежат буферизированные данные | emalloc (request heap)   | pemalloc (persistent heap)   |
| Синхронизация                     | Scheduler (cooperative)  | mutex (preemptive)           |
| Rendezvous (capacity=0)           | Поддерживается           | Нет, всегда буферизированный |
| Минимальная ёмкость               | 0                        | 1                            |

Если у вас всё выполняется в одном потоке — используйте `Async\Channel`, он легче. `ThreadChannel` имеет
смысл, когда реально нужен обмен данными между OS-потоками.

## Создание

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — размер буфера (минимум `1`). Чем больше — тем лучше амортизируется рывковый producer,
но тем больше памяти на живую очередь.

## Базовый пример: producer + consumer

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Producer — отдельный OS-поток
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Consumer — в основном потоке (корутина)
    try {
        while (true) {
            $msg = $ch->recv();
            echo "got: ", $msg, "\n";
        }
    } catch (Async\ThreadChannelException $e) {
        echo "channel closed\n";
    }

    await($producer);
});
```

```
got: item-1
got: item-2
got: item-3
got: item-4
got: item-5
channel closed
```

Producer пишет в канал из child-потока, основной поток читает через `recv()` — ничего специального,
похоже на обычный `Channel`.

## send / recv

### `send($value[, $cancellation])`

Отправляет значение в канал. Если буфер полон — **приостанавливает текущую корутину** (кооперативная
приостановка — другие корутины этого Scheduler'а продолжают работать), пока кто-то из других потоков
не освободит место.

Значение **глубоко копируется в persistent-память** по тем же правилам, что и captured переменные
в `spawn_thread()`. Объекты с dynamic properties, references, resources — отклоняются с
`Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // массив
$ch->send(new Point(3, 4));                    // объект с declared props
$ch->send($futureState);                       // Async\FutureState (один раз!)
```

Если канал уже закрыт — `send()` бросает `Async\ThreadChannelException`.

### `recv([$cancellation])`

Читает значение из канала. Если буфер пуст — приостанавливает текущую корутину до появления данных
**или** закрытия канала.

- Если данные появились — возвращает значение.
- Если канал закрыт и буфер пуст — бросает `Async\ThreadChannelException`.
- Если канал закрыт, но в буфере ещё что-то осталось — **сначала отдаёт оставшиеся данные**, и только
  когда буфер опустеет, начинает бросать `ThreadChannelException`.

Это позволяет корректно дренировать канал после закрытия.

## Состояние канала

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;

spawn(function() {
    $ch = new ThreadChannel(capacity: 3);

    echo "capacity: ", $ch->capacity(), "\n";
    echo "empty: ", ($ch->isEmpty() ? "yes" : "no"), "\n";

    $ch->send('a');
    $ch->send('b');

    echo "count after 2 sends: ", count($ch), "\n";
    echo "full: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $ch->send('c');
    echo "full after 3: ", ($ch->isFull() ? "yes" : "no"), "\n";

    $got = [];
    while (!$ch->isEmpty()) {
        $got[] = $ch->recv();
    }
    echo "drained: ", implode(',', $got), "\n";

    $ch->close();
    echo "closed: ", ($ch->isClosed() ? "yes" : "no"), "\n";
});
```

```
capacity: 3
empty: yes
count after 2 sends: 2
full: no
full after 3: yes
drained: a,b,c
closed: yes
```

| Метод          | Что возвращает                          |
|----------------|-----------------------------------------|
| `capacity()`   | Размер буфера, заданный в конструкторе  |
| `count()`      | Текущее число сообщений в буфере        |
| `isEmpty()`    | `true`, если буфер пуст                 |
| `isFull()`     | `true`, если буфер заполнен до capacity |
| `isClosed()`   | `true`, если канал был закрыт           |

`ThreadChannel` реализует `Countable`, поэтому `count($ch)` работает.

## close()

```php
$ch->close();
```

После закрытия:

- `send()` сразу бросает `Async\ThreadChannelException`.
- `recv()` **дренирует оставшиеся значения**, затем начинает бросать `ThreadChannelException`.
- Все корутины/потоки, зависшие в `send()` или `recv()`, **будят** с `ThreadChannelException`.

Канал можно закрыть только один раз. Повторный вызов — безопасный no-op.

## Паттерн: worker-пул

Два канала — один для задач, один для результатов. Worker-потоки читают задачи из первого и кладут
результаты во второй.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 worker-потока
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Имитация CPU-нагрузки
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // Канал jobs закрыт — worker заканчивает
            }
        });
    }

    // Раздаём 6 задач
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Ждём, пока все worker-потоки завершатся
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Дренируем результаты
    $by = [];
    while (!$results->isEmpty()) {
        $r = $results->recv();
        $by[$r['worker']] = ($by[$r['worker']] ?? 0) + 1;
    }
    ksort($by);
    foreach ($by as $w => $n) {
        echo "worker-$w processed $n\n";
    }
});
```

```
worker-1 processed 2
worker-2 processed 2
worker-3 processed 2
```

Каждый worker обработал по 2 задачи — нагрузка распределилась между тремя потоками.

### Замечание про распределение

Если producer пишет в канал быстрее, чем worker'ы читают (или если worker'и почти не тратят CPU), **первый
worker может забрать все задачи** сразу, потому что его `recv()` просыпается первым и успевает забрать
следующее сообщение до того, как остальные worker'и дойдут до своего `recv()`. Это нормальное поведение
конкурентной очереди — «справедливого» шедулинга не гарантируется.

Если нужна строгая равномерность — делите задачи заранее (shard-by-hash), либо давайте каждому worker'у
свой отдельный канал.

## Передача сложных данных через канал

Через `ThreadChannel` можно передавать всё, что поддерживает межпотоковая передача данных (см.
[«Передача данных между потоками»](/ru/docs/components/threads.html#передача-данных-между-потоками)):

- скаляры, массивы, объекты с declared properties
- `Closure` (замыкания)
- `WeakReference` и `WeakMap` (с теми же правилами сильных владельцев, что и в `spawn_thread`)
- `Async\FutureState` (один раз)

Каждая отправка `send()` — это отдельная операция с собственной таблицей идентичности. **Идентичность
сохраняется внутри одного сообщения**, но не между разными `send()`. Если вы хотите, чтобы два получателя
увидели «один и тот же» объект — отправьте его один раз внутри массива, а не двумя отдельными сообщениями.

## Ограничения

- **Ёмкость минимум 1.** Rendezvous (capacity=0) не поддерживается, в отличие от `Async\Channel`.
- **Одна `ThreadChannel` не сериализуется** (`@not-serializable`). Её нельзя положить в файл или по сети —
  канал существует только в рамках живого процесса.
- **Указатель на канал можно передавать** через `spawn_thread` или вложенно через другой канал —
  object handle на `ThreadChannel` передаётся корректно, и обе стороны видят один и тот же внутренний
  буфер.

## См. также

- [`Async\Thread`](/ru/docs/components/threads.html) — OS-потоки в TrueAsync
- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — запуск замыкания в новом потоке
- [`Async\Channel`](/ru/docs/components/channels.html) — каналы между корутинами одного потока
