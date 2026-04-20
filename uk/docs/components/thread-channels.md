---
layout: docs
lang: uk
path_key: "/docs/components/thread-channels.html"
nav_active: docs
permalink: /uk/docs/components/thread-channels.html
page_title: "Async\\ThreadChannel"
description: "Async\\ThreadChannel — потокобезпечний канал для передачі даних між потоками ОС у TrueAsync."
---

# Async\ThreadChannel: канали між потоками ОС

## Чим відрізняється від звичайного Channel

`Async\Channel` працює **в межах одного потоку** — між корутинами одного планувальника. Його дані живуть у **локальній пам'яті потоку**, а безпека гарантується тим, що лише одна корутина звертається до каналу одночасно.

`Async\ThreadChannel` призначений для передачі даних **між потоками ОС**. Буфер каналу живе у **спільній пам'яті**, доступній усім потокам, а не в пам'яті конкретного потоку. Кожне надіслане значення глибоко копіюється у цю спільну пам'ять, а на стороні отримувача — назад у локальну пам'ять потоку. Синхронізація здійснюється через потокобезпечний м'ютекс, тому `send()` і `recv()` можна викликати з різних потоків ОС конкурентно.

| Властивість                        | `Async\Channel`                        | `Async\ThreadChannel`                        |
|------------------------------------|----------------------------------------|----------------------------------------------|
| Область дії                        | Один потік ОС                          | Між потоками ОС                              |
| Де живуть буферизовані дані        | Локальна пам'ять потоку                | Спільна пам'ять, видима всім потокам         |
| Синхронізація                      | Планувальник корутин (кооперативний)   | М'ютекс (потокобезпечний)                    |
| Рандеву (capacity=0)               | Підтримується                          | Ні — завжди буферизований                    |
| Мінімальна ємність                 | 0                                      | 1                                            |

Якщо все виконується в одному потоці — використовуйте `Async\Channel`, він легший. `ThreadChannel` має сенс лише тоді, коли справді потрібен обмін даними між потоками ОС.

## Створення каналу

```php
use Async\ThreadChannel;

$ch = new ThreadChannel(capacity: 16);
```

**`capacity`** — розмір буфера (мінімум `1`). Більші значення краще поглинають сплески від виробників, але споживають більше пам'яті для живої черги.

## Базовий приклад: виробник + споживач

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $ch = new ThreadChannel(capacity: 4);

    // Виробник — окремий потік ОС
    $producer = spawn_thread(function() use ($ch) {
        for ($i = 1; $i <= 5; $i++) {
            $ch->send("item-$i");
        }
        $ch->close();
    });

    // Споживач — у головному потоці (корутина)
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

Виробник пише у канал з окремого потоку; головний потік читає через `recv()` — нічого особливого, виглядає так само, як звичайний `Channel`.

## send / recv

### `send($value[, $cancellation])`

Надсилає значення в канал. Якщо буфер повний — **призупиняє поточну корутину** (кооперативне призупинення — інші корутини цього планувальника продовжують виконуватись) до тих пір, поки інший потік не звільнить місце.

Значення **глибоко копіюється у спільну пам'ять каналу** за тими самими правилами, що й змінні, захоплені через `use(...)` у `spawn_thread()`. Об'єкти з динамічними властивостями, PHP-посилання та ресурси відхиляються з `Async\ThreadTransferException`.

```php
$ch->send(['user' => 'alice', 'id' => 42]);   // масив
$ch->send(new Point(3, 4));                    // об'єкт з оголошеними властивостями
$ch->send($futureState);                       // Async\FutureState (один раз!)
```

Якщо канал вже закрито — `send()` кидає `Async\ThreadChannelException`.

### `recv([$cancellation])`

Читає значення з каналу. Якщо буфер порожній — призупиняє поточну корутину до появи даних **або** закриття каналу.

- Якщо дані надійшли — повертає значення.
- Якщо канал закрито і буфер порожній — кидає `Async\ThreadChannelException`.
- Якщо канал закрито, але в буфері ще є елементи — **спочатку вичерпує залишені дані**, кидаючи `ThreadChannelException` лише після того, як буфер спорожніє.

Це дозволяє коректно вичерпати канал після його закриття.

## Стан каналу

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

| Метод          | Повертає                                              |
|----------------|-------------------------------------------------------|
| `capacity()`   | Розмір буфера, заданий у конструкторі                 |
| `count()`      | Поточна кількість повідомлень у буфері                |
| `isEmpty()`    | `true`, якщо буфер порожній                           |
| `isFull()`     | `true`, якщо буфер заповнений до ємності              |
| `isClosed()`   | `true`, якщо канал закрито                            |

`ThreadChannel` реалізує `Countable`, тому `count($ch)` працює.

## close()

```php
$ch->close();
```

Після закриття:

- `send()` негайно кидає `Async\ThreadChannelException`.
- `recv()` **вичерпує залишені значення**, після чого починає кидати `ThreadChannelException`.
- Усі корутини/потоки, призупинені у `send()` або `recv()`, **прокидаються** з `ThreadChannelException`.

Канал можна закрити лише один раз. Повторний виклик є безпечним no-op.

## Патерн: пул воркерів

Два канали — один для задач, інший для результатів. Потоки-воркери читають задачі з першого і кладуть результати у другий.

```php
<?php

use Async\ThreadChannel;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $jobs    = new ThreadChannel(capacity: 16);
    $results = new ThreadChannel(capacity: 16);

    // 3 потоки-воркери
    $workers = [];
    for ($i = 1; $i <= 3; $i++) {
        $workers[] = spawn_thread(function() use ($jobs, $results, $i) {
            try {
                while (true) {
                    $n = $jobs->recv();
                    // Симуляція навантаження на CPU
                    $x = 0;
                    for ($k = 0; $k < 2_000_000; $k++) {
                        $x += sqrt($k);
                    }
                    $results->send(['worker' => $i, 'n' => $n]);
                }
            } catch (Async\ThreadChannelException $e) {
                // канал jobs закрито — воркер завершує роботу
            }
        });
    }

    // Відправляємо 6 задач
    for ($n = 1; $n <= 6; $n++) {
        $jobs->send($n);
    }
    $jobs->close();

    // Чекаємо завершення всіх потоків-воркерів
    foreach ($workers as $w) {
        await($w);
    }
    $results->close();

    // Вичерпуємо результати
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

Кожен воркер обробив 2 задачі — навантаження розподілилось між трьома потоками.

### Примітка щодо розподілу

Якщо виробник пише у канал швидше, ніж воркери читають (або якщо воркери витрачають майже нульовий час CPU), **перший воркер може захопити всі задачі** одразу, оскільки його `recv()` прокидається першим і забирає наступне повідомлення до того, як інші воркери дістаються свого `recv()`. Це нормальна поведінка для конкурентної черги — справедливий розподіл не гарантується.

Якщо потрібна сувора рівномірність — розбийте задачі заздалегідь (розподіл за хешем), або надайте кожному воркеру власний виділений канал.

## Передача складних даних через канал

`ThreadChannel` може переносити все, що підтримує міжпотокова передача даних (дивіться [Передача даних між потоками](/uk/docs/components/threads.html#passing-data-between-threads)):

- скаляри, масиви, об'єкти з оголошеними властивостями
- `Closure` (замикання)
- `WeakReference` і `WeakMap` (з тими самими правилами сильного власника, що й у `spawn_thread`)
- `Async\FutureState` (один раз)

Кожен виклик `send()` є незалежною операцією зі своєю таблицею ідентичності. **Ідентичність зберігається в межах одного повідомлення**, але не між окремими викликами `send()`. Якщо ви хочете, щоб два отримувачі побачили «той самий» об'єкт — надішліть його один раз всередині масиву, а не двома окремими повідомленнями.

## Обмеження

- **Мінімальна ємність — 1.** Рандеву (capacity=0) не підтримується, на відміну від `Async\Channel`.
- **`ThreadChannel` не підтримує серіалізацію.** Об'єкти каналів не можна зберегти у файл або надіслати по мережі — канал існує лише всередині живого процесу.
- **Дескриптор каналу можна передавати** через `spawn_thread` або вкладати в інший канал — дескриптор об'єкта для `ThreadChannel` передається коректно, і обидві сторони бачать один і той самий внутрішній буфер.

## Дивіться також

- [`Async\Thread`](/uk/docs/components/threads.html) — потоки ОС у TrueAsync
- [`spawn_thread()`](/uk/docs/reference/spawn-thread.html) — запуск замикання в новому потоці
- [`Async\Channel`](/uk/docs/components/channels.html) — канали між корутинами в одному потоці
