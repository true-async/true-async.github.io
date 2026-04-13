---
layout: docs
lang: ru
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /ru/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — запуск кода в отдельном OS-потоке: передача данных, WeakReference/WeakMap, ThreadChannel, Future между потоками."
---

# Async\Thread: настоящие OS-потоки

## Зачем нужны потоки

Корутины решают задачу конкурентности для **I/O-bound** нагрузки — можно обслужить тысячи ожиданий
сети или диска в одном процессе. Но у корутин есть ограничение: все они выполняются на одном
OS-потоке. Если задача **CPU-bound** — сжатие, парсинг, криптография, тяжёлые вычисления — корутина
заблокирует Scheduler, и все остальные корутины встанут.

Потоки решают это ограничение. `Async\Thread` запускает замыкание в **отдельном OS-потоке** с **собственным
PHP-request'ом**: у него своя локальная память, свой autoloader, свои классы и функции. Между потоками
ничего не разделяется по ссылке — любые данные перекочёвывают через **глубокое копирование**.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Тикер в основном потоке — показывает, что Scheduler не стоит,
// пока worker-поток занят CPU-работой
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Тяжёлые вычисления в отдельном OS-потоке
        $sum = 0;
        for ($i = 0; $i < 5_000_000; $i++) {
            $sum += sqrt($i);
        }
        return $sum;
    });

    $result = await($thread);
    echo "heavy done: ", (int) $result, "\n";
});
```

```
tick 0
tick 1
tick 2
tick 3
tick 4
heavy done: 7453558806
```

Тикер получает свои 5 «тиков» параллельно с работой worker-потока — Scheduler основного потока не застревает.

## Когда использовать потоки, а когда корутины

| Задача                                    | Инструмент               |
|-------------------------------------------|--------------------------|
| Много одновременных HTTP/DB/файл-запросов | Корутины                 |
| Долгая CPU-нагрузка (парсинг, crypto)     | Потоки                   |
| Изоляция нестабильного кода               | Потоки                   |
| Fan-out к CPU-ядрам                       | Потоки                   |
| Работа с shared state                     | Корутины + каналы        |

Потоки **тяжёлые** — создание требует инициализировать новый PHP-request, скопировать замыкание и его
captured-переменные в общую память, затем снова воссоздать их в памяти child-потока. Поэтому их не
спавнят тысячами: обычная модель — несколько worker-потоков (по числу CPU-ядер) либо один поток
для изолирующей операции.

## Жизненный цикл

```php
// Создание и запуск — thread становится runnable сразу
$thread = spawn_thread(fn() => compute());

// Ожидание результата (блокирует текущую корутину, не весь Scheduler)
$result = await($thread);

// Либо неблокирующая проверка
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` реализует `Completable`, поэтому его можно передавать в `await()`, `await_all()`, `await_any()`,
в `Task\Group` и т.д. вместе с корутинами.

### Состояния

| Метод             | Что проверяет                                       |
|-------------------|-----------------------------------------------------|
| `isRunning()`     | Поток ещё выполняется                               |
| `isCompleted()`   | Поток завершён (успехом или исключением)            |
| `isCancelled()`   | Поток был отменён                                   |
| `getResult()`     | Результат, если завершился успехом; иначе `null`    |
| `getException()`  | Исключение, если завершился ошибкой; иначе `null`   |

### Обработка исключений

Исключение, брошенное внутри потока, перехватывается и переносится в родителя как
`Async\RemoteException`, оборачивая исходное:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $thread = spawn_thread(function() {
        throw new RuntimeException('boom');
    });

    try {
        await($thread);
    } catch (Async\RemoteException $e) {
        echo "remote class: ", $e->getRemoteClass(), "\n";

        $original = $e->getRemoteException();
        if ($original !== null) {
            echo "original: ", $original->getMessage(), "\n";
        }
    }
});
```

```
remote class: RuntimeException
original: boom
```

`getRemoteException()` может вернуть `null`, если класс исключения не может быть загружен в родителе
(например, user-defined класс, которого нет в parent request'е).

## Передача данных между потоками

Это самая важная часть модели. **Всё передаётся копированием** — никаких общих указателей.

### Что можно передавать

| Тип                                 | Поведение                                               |
|-------------------------------------|---------------------------------------------------------|
| Скаляры (`int`, `float`, `string`, `bool`, `null`) | Копируются                       |
| Массивы                             | Глубокое копирование, идентичность вложенных объектов сохраняется |
| Объекты с **declared properties**   | Глубокое копирование, `create_object()` на той стороне  |
| `Closure` (замыкания)               | Специальный snapshot: тело функции + captured переменные |
| `WeakReference`                     | Переносится вместе с референтом (см. ниже)              |
| `WeakMap`                           | Переносится со всеми ключами и значениями (см. ниже)    |
| `Async\FutureState`                 | Write-end, один раз (см. ниже)                          |

### Что передать нельзя

| Тип                                          | Причина                                                 |
|----------------------------------------------|---------------------------------------------------------|
| `stdClass` и любые объекты с dynamic properties | У dynamic props нет определения в классе на destination |
| PHP references (`&$var`)                     | Shared reference между потоками не имеет смысла         |
| `resource`                                   | Handle'ы (file, curl, socket) привязаны к потоку        |

Если попытаться передать что-то из этого — источник выбросит `Async\ThreadTransferException`:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // dynamic properties
    $obj->x = 1;

    try {
        $thread = spawn_thread(function() use ($obj) {
            return 'unreachable';
        });
        await($thread);
    } catch (Async\ThreadTransferException $e) {
        echo $e->getMessage(), "\n";
    }
});
```

```
Cannot transfer object with dynamic properties between threads (class stdClass). Use arrays instead
```

### Идентичность сохраняется

Один и тот же объект, упомянутый в графе данных несколько раз, **создаётся в потоке-получателе один раз**,
и обе ссылки указывают на него. Внутри одной передачи (captured переменные одного замыкания, одна
отправка в канал, один результат потока) работает общая таблица пересадок (xlat), поэтому:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// Bootloader нужен, чтобы класс был доступен в child-потоке
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // Одна и та же инстанция в двух captured переменных
        echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

        // Мутация через одну ссылку видна через другую
        $obj->name = 'staging';
        echo "meta: ", $meta['ref']->name, "\n";

        return 'ok';
    }, bootloader: $boot);

    echo await($thread), "\n";
});
```

```
same: yes
meta: staging
ok
```

Если между собой связаны объекты одного графа (массив со ссылками на общие вложенные объекты) — идентичность
тоже переносится.

### Циклы

Граф с циклом через обычные объекты можно передать, но есть лимит глубины рекурсии в **512** уровней. Циклы
через `WeakReference` на сам себя (например, `$node->weakParent = WeakReference::create($node)`) на данный
момент упираются в этот лимит — для них лучше не использовать weak-cycle внутри одного передаваемого графа.

## WeakReference через потоки

`WeakReference` имеет специальную логику передачи. Поведение зависит от того, что ещё передаётся в том же
графе данных.

### Референт тоже передаётся — идентичность

Если вместе с `WeakReference` передаётся сам объект (напрямую, в массиве, как свойство другого объекта),
то на той стороне `$wr->get()` вернёт **именно тот** экземпляр, который попал в другие ссылки:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Config { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($obj, $wr) {
        echo "wr === obj: ", ($wr->get() === $obj ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
wr === obj: yes
```

### Референт не передаётся — WeakReference мёртвый

Если в графе есть только `WeakReference`, а самого объекта нет — на той стороне никто не держит референт
сильной ссылкой. `WeakReference` становится **мёртвым** (`$wr->get() === null`). Это соответствует
обычной PHP-семантике `WeakReference` в однопоточном коде: без сильного владельца объект исчезает.

```php
spawn(function() use ($boot) {
    $obj = new Config('prod');
    $wr  = WeakReference::create($obj);

    $thread = spawn_thread(function() use ($wr) {   // $obj НЕ передаётся
        echo "dead: ", ($wr->get() === null ? "yes" : "no"), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
dead: yes
```

### Источник уже мёртв

Если на момент передачи референт уже уничтожен в источнике (`$wr->get() === null` ещё до передачи),
`WeakReference` переносится как мёртвый с самого начала.

### Singleton

`WeakReference::create($obj)` возвращает singleton: вызов дважды для одного объекта даёт **один и тот же**
экземпляр `WeakReference`. При передаче эта семантика сохраняется — на той стороне тоже будет один
экземпляр `WeakReference` для одного референта.

## WeakMap через потоки

`WeakMap` переносится со всеми своими записями. Как и в однопоточном PHP, **ключи WeakMap живут только
пока у кого-то есть сильная ссылка** на них.

### Ключи в графе — записи сохраняются

Если ключи передаются отдельно (или достижимы через другие переданные объекты), на той стороне `WeakMap`
содержит все записи:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Key { public function __construct(public string $name = '') {} }
$boot = function() { eval('class Key { public function __construct(public string $name = "") {} }'); };

spawn(function() use ($boot) {
    $k1 = new Key('alpha');
    $k2 = new Key('beta');
    $wm = new WeakMap();
    $wm[$k1] = 'v1';
    $wm[$k2] = 'v2';

    $thread = spawn_thread(function() use ($wm, $k1, $k2) {
        echo "count: ", count($wm), "\n";
        echo "k1: ", $wm[$k1], "\n";
        echo "k2: ", $wm[$k2], "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 2
k1: v1
k2: v2
```

### Только WeakMap — записи исчезают

Если передаётся только `WeakMap`, а его ключи никак больше не достижимы — на той стороне **WeakMap пустой**.
Это не баг, а прямое следствие слабой семантики: без сильного владельца ключ GC-ится сразу после загрузки,
и соответствующая запись исчезает.

```php
spawn(function() use ($boot) {
    $ghost = new Key('ghost');
    $wm = new WeakMap();
    $wm[$ghost] = 'value';

    $thread = spawn_thread(function() use ($wm) {  // $ghost не передаётся
        echo "count: ", count($wm), "\n";
        return 'ok';
    }, bootloader: $boot);

    await($thread);
});
```

```
count: 0
```

Чтобы запись выжила, нужно передать ключ отдельно (или как часть какого-либо другого объекта).

### Вложенные структуры

`WeakMap` может содержать в качестве значений другие `WeakMap`, `WeakReference`, массивы, объекты — всё
переносится рекурсивно. Циклы типа `$wm[$obj] = $wm` обрабатываются корректно.

## Future между потоками

Прямая передача `Async\Future` между потоками **невозможна**: `Future` — это read-end, он привязан
к конкретному Scheduler'у конкретного потока. Вместо этого передаётся **write-end** `Async\FutureState`,
и только **один раз**.

Типичный паттерн: создать `FutureState` и соответствующий `Future` в родителе, передать `FutureState`
в поток через captured variable, из потока выполнить `complete()`/`error()` — результат появится
на родительском `Future`:

```php
<?php

use Async\FutureState;
use Async\Future;
use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $state  = new FutureState();
    $future = new Future($state);

    $thread = spawn_thread(function() use ($state) {
        // Имитация тяжёлой работы
        $data = "computed in thread";
        $state->complete($data);
    });

    // Читаем через Future — событие придёт в родительский Scheduler
    $result = await($future);
    echo "got: ", $result, "\n";

    await($thread);
    echo "thread done\n";
});
```

```
got: computed in thread
thread done
```

**Важные ограничения:**

1. `FutureState` можно передать в поток **только один раз**. Попытка второй передачи бросит исключение.
2. Передавать сам `Future` (read-end) нельзя — его события привязаны к реактору родителя.
3. После передачи `FutureState` оригинальный объект в родительском потоке остаётся валидным: `complete()`
   в child-потоке пишет в общее состояние, `Future::isCompleted()` в родителе начинает возвращать `true`.

Это единственный штатный способ передать **одиночный результат** между потоками вне обычного `return`
из `spawn_thread`. Если нужно стримить несколько значений — используйте `ThreadChannel`.

## Bootloader: подготовка child-потока

У child-потока **свой request**, и он не наследует определения классов, функций и констант,
объявленных в parent-скрипте. Если замыкание использует user-defined класс, его нужно либо
переобъявить, либо включить через autoloader — для этого есть параметр `bootloader`:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config должен существовать
        return $config->name;
    },
    bootloader: function() {
        // Выполняется в child-потоке ДО основного замыкания
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Bootloader гарантированно выполняется в child-потоке перед загрузкой captured-переменных и вызовом
основного замыкания. Типичные задачи: регистрация autoload, декларация классов через `eval`, инициализация
ini-настроек, подключение библиотек.

## Пограничные случаи

### Суперглобалы

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` в child-потоке свои, инициализируются как в свежем request'е
(в текущей реализации их содержимое временно отключено из-за гонок в `zend_is_auto_global` — следите
за CHANGELOG).

### Статические переменные функций

Каждый child-поток имеет свой набор статических переменных функций. Изменения в одном потоке не видны
другим — это часть полной request-изоляции.

### Opcache

Opcache shared-memory доступен между потоками как read-only — скрипты компилируются один раз и используются
всеми потоками. Время старта child-потока это только ускоряет.

## См. также

- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — запуск замыкания в потоке
- [`Async\ThreadChannel`](/ru/docs/components/thread-channels.html) — межпотоковые каналы
- [`await()`](/ru/docs/reference/await.html) — ожидание результата потока
- [`Async\RemoteException`](/ru/docs/components/exceptions.html) — обёртка ошибок child-потока
