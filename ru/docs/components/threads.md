---
layout: docs
lang: ru
path_key: "/docs/components/threads.html"
nav_active: docs
permalink: /ru/docs/components/threads.html
page_title: "Async\\Thread"
description: "Async\\Thread — запуск кода в отдельном параллельном потоке: передача данных, WeakReference/WeakMap, ThreadChannel, Future между потоками."
---

# Async\Thread: запуск PHP в отдельном потоке

## Зачем нужны потоки

Корутины решают задачу конкурентности для **I/O-bound** нагрузки — в одном процессе можно обслуживать
тысячи параллельных ожиданий сети или диска. Но у корутин есть ограничение: все они выполняются
**в одном и том же PHP-процессе** и по очереди получают управление от планировщика. Если задача
**CPU-bound** — сжатие, парсинг, криптография, тяжёлые вычисления — одна такая корутина забьёт
планировщик, и все остальные корутины встанут до её завершения.

Потоки решают это ограничение. `Async\Thread` запускает замыкание в **отдельном параллельном потоке**
с **собственным изолированным окружением PHP**: свой набор переменных, свой autoloader, свои классы
и функции. Ничто между потоками не разделяется напрямую — любые данные передаются **по значению**,
через глубокое копирование.

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Тикер в основной корутине — доказывает, что параллельный поток
// не мешает основной программе продолжать работу
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
        // Тяжёлые вычисления в отдельном потоке
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

Тикер спокойно отрабатывает свои 5 «тиков» параллельно с тяжёлой работой потока — основной программе
не приходится ждать.

## Когда использовать потоки, а когда корутины

| Задача                                    | Инструмент               |
|-------------------------------------------|--------------------------|
| Много одновременных HTTP/DB/файл-запросов | Корутины                 |
| Долгая CPU-нагрузка (парсинг, crypto)     | Потоки                   |
| Изоляция нестабильного кода               | Потоки                   |
| Параллельная работа на нескольких ядрах   | Потоки                   |
| Обмен данными между задачами              | Корутины + каналы        |

Поток — это **относительно дорогая сущность**: запуск нового потока на порядок тяжелее запуска
корутины. Поэтому их не создают тысячами: обычная модель — несколько постоянно живущих worker-потоков
(часто по числу CPU-ядер), либо один поток под конкретную тяжёлую задачу.

## Жизненный цикл

```php
// Создание — поток стартует и начинает выполнение сразу
$thread = spawn_thread(fn() => compute());

// Ожидание результата. Ждёт текущая корутина, остальные продолжают работу
$result = await($thread);

// Либо неблокирующая проверка
if ($thread->isCompleted()) {
    $result = $thread->getResult();
}
```

`Async\Thread` реализует интерфейс `Completable`, поэтому его можно передавать в `await()`,
`await_all()`, `await_any()`, в `Task\Group` — точно так же, как обычную корутину.

### Состояния

| Метод             | Что проверяет                                       |
|-------------------|-----------------------------------------------------|
| `isRunning()`     | Поток ещё выполняется                               |
| `isCompleted()`   | Поток завершён (успехом или исключением)            |
| `isCancelled()`   | Поток был отменён                                   |
| `getResult()`     | Результат, если завершился успехом; иначе `null`    |
| `getException()`  | Исключение, если завершился ошибкой; иначе `null`   |

### Обработка исключений

Исключение, брошенное внутри потока, перехватывается и доставляется в родителя обёрнутым
в `Async\RemoteException`:

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

`getRemoteException()` может вернуть `null`, если класс исключения не удалось загрузить в родительском
потоке (например, это пользовательский класс, определённый только в потоке-получателе).

## Передача данных между потоками

Это самая важная часть модели. **Всё передаётся копированием** — никаких общих ссылок.

### Что можно передавать

| Тип                                                     | Поведение                                               |
|---------------------------------------------------------|---------------------------------------------------------|
| Скаляры (`int`, `float`, `string`, `bool`, `null`)      | Копируются                                              |
| Массивы                                                 | Глубокое копирование, вложенные объекты сохраняют идентичность |
| Объекты с объявленными свойствами (`public $x` и т.п.)  | Глубокое копирование, на той стороне создаются заново   |
| `Closure` (замыкания)                                   | Переносится тело функции + все переменные из `use(...)` |
| `WeakReference`                                         | Переносится вместе с референтом (см. ниже)              |
| `WeakMap`                                               | Переносится со всеми ключами и значениями (см. ниже)    |
| `Async\FutureState`                                     | Один раз, для записи результата из потока (см. ниже)    |

### Что передать нельзя

| Тип                                                    | Почему                                                  |
|--------------------------------------------------------|---------------------------------------------------------|
| `stdClass` и любые объекты с динамическими свойствами  | У динамических свойств нет описания в классе, в потоке-получателе их невозможно корректно пересоздать |
| Ссылки PHP (`&$var`)                                   | Разделяемая ссылка между потоками противоречит модели   |
| Ресурсы (`resource`)                                   | Дескрипторы файлов, curl-handler'ы, сокеты привязаны к конкретному потоку |

Если попытаться передать что-то из этого — источник сразу выбросит `Async\ThreadTransferException`:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

spawn(function() {
    $obj = new stdClass();   // динамические свойства
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

### Идентичность объектов сохраняется

Один и тот же объект, упомянутый в графе данных несколько раз, **создаётся в потоке-получателе один раз**,
и все ссылки указывают на него. В рамках одной операции передачи (все переменные из `use(...)` одного
замыкания, одна отправка в канал, один результат потока) идентичность сохраняется:

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// Класс нужно объявить в окружении потока-получателя, делаем это через bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(function() use ($obj, $meta) {
        // Одна и та же инстанция в двух разных переменных
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

То же самое работает для связанных объектов в одном графе: массив со ссылками на общие вложенные
объекты сохранит идентичность после передачи.

### Циклы

Граф с циклом через обычные объекты передать можно. Ограничение — очень глубоко вложенные циклы могут
упереться во внутренний лимит глубины передачи (сотни уровней). В практическом коде это почти никогда
не встречается. Циклы вида `$node->weakParent = WeakReference::create($node)` — то есть объект, который
через `WeakReference` ссылается сам на себя — на данный момент упираются в тот же лимит, поэтому их
лучше не использовать внутри одного передаваемого графа.

## WeakReference через потоки

У `WeakReference` специальная логика передачи. Поведение зависит от того, что ещё передаётся вместе.

### Референт тоже передаётся — идентичность сохраняется

Если вместе с `WeakReference` передаётся сам объект (напрямую, в массиве, как свойство другого объекта),
на той стороне `$wr->get()` вернёт **именно тот** экземпляр, который попал в другие ссылки:

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

### Референт не передаётся — WeakReference становится мёртвым

Если в графе передаётся только `WeakReference`, а самого объекта — нет, то в потоке-получателе
на этот объект никто не держит сильной ссылки. По правилам PHP это означает, что объект сразу же
уничтожается, а `WeakReference` становится **мёртвым** (`$wr->get() === null`). Это точно такое же
поведение, как в однопоточном PHP: без сильного владельца объект уходит.

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

Если на момент передачи `WeakReference` уже был мёртвым в источнике (`$wr->get() === null`), он
переедет в поток-получатель тоже мёртвым.

### Singleton

`WeakReference::create($obj)` возвращает singleton: два вызова для одного объекта дают **один и тот же**
экземпляр `WeakReference`. При передаче это свойство сохраняется — в потоке-получателе тоже будет
один экземпляр `WeakReference` на один объект.

## WeakMap через потоки

`WeakMap` передаётся со всеми своими записями. Но действует то же правило, что и в однопоточном
PHP: **ключ `WeakMap` живёт только пока у кого-то есть сильная ссылка на него**.

### Ключи в графе — записи сохраняются

Если ключи передаются отдельно (или достижимы через другие переданные объекты), `WeakMap`
в потоке-получателе содержит все записи:

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

Если передаётся только `WeakMap`, а его ключи нигде больше не фигурируют в графе, в потоке-получателе
**WeakMap окажется пустым**. Это не баг, а прямое следствие слабой семантики: без сильного владельца
ключ уничтожается сразу после загрузки, и соответствующая запись исчезает.

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

Чтобы запись «выжила» после передачи, нужно передать её ключ отдельно (или как часть какого-то
другого объекта, который сам попадает в граф).

### Вложенные структуры

`WeakMap` может содержать в качестве значений другие `WeakMap`, `WeakReference`, массивы, обычные
объекты — всё переносится рекурсивно. Циклы вида `$wm[$obj] = $wm` обрабатываются корректно.

## Future между потоками

Прямая передача `Async\Future` между потоками **невозможна**: `Future` — это объект-ожидатель, его
события привязаны к планировщику того потока, где он был создан. Вместо этого можно передавать
сторону-«писателя» — `Async\FutureState`, — и только **один раз**.

Типичный паттерн: в родителе создаётся пара `FutureState` + `Future`, сам `FutureState` передаётся
в поток через переменную `use(...)`, в потоке вызывается `complete()` или `error()`, а родитель
получает результат через свой `Future`:

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

    // Родитель ждёт через свой Future — событие придёт сюда,
    // когда поток вызовет $state->complete()
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

1. `FutureState` можно передать **только в один** поток. Попытка второй передачи бросит исключение.
2. Передавать сам `Future` нельзя — он принадлежит родительскому потоку и умеет будить только
   своего владельца.
3. После передачи `FutureState` оригинальный объект в родителе остаётся валидным: когда поток
   вызывает `complete()`, это изменение становится видимым и через `Future` в родителе —
   `await($future)` разблокируется.

Это единственный штатный способ доставить **одиночный результат** из потока обратно, вне обычного
`return` из `spawn_thread()`. Если нужно стримить много значений — используйте `ThreadChannel`.

## Bootloader: подготовка окружения потока

У потока **своё окружение**, и оно не наследует определения классов, функций и констант, объявленных
в родительском скрипте. Если замыкание использует пользовательский класс, этот класс нужно
либо переобъявить, либо подключить через autoload — для этого есть параметр `bootloader`:

```php
$thread = spawn_thread(
    task: function() {
        $config = new Config('prod');  // Config должен существовать в потоке
        return $config->name;
    },
    bootloader: function() {
        // Выполняется в потоке-получателе ДО основного замыкания
        require_once __DIR__ . '/src/autoload.php';
    },
);
```

Bootloader гарантированно выполняется в потоке-получателе перед загрузкой переменных `use(...)` и перед
вызовом основного замыкания. Типичные задачи bootloader'а: регистрация autoload, объявление
классов через `eval`, настройка ini-параметров, подключение библиотек.

## Пограничные случаи

### Суперглобальные переменные

`$_GET`, `$_POST`, `$_SERVER`, `$_ENV` в потоке свои — они инициализируются заново, как в свежем
запросе. В текущей версии TrueAsync их заполнение в потока-получателях временно отключено (планируется
включить позже) — следите за CHANGELOG.

### Статические переменные функций

У каждого потока свой набор статических переменных функций и классов. Изменения в одном потоке
не видны другим — это часть общей изоляции.

### Opcache

Opcache делится своим кешем скомпилированного байткода между потоками только на чтение: скрипты
компилируются один раз на весь процесс, а дальше каждый новый поток переиспользует готовый
байткод. Благодаря этому запуск потока идёт быстрее.

## См. также

- [`spawn_thread()`](/ru/docs/reference/spawn-thread.html) — запуск замыкания в потоке
- [`Async\ThreadChannel`](/ru/docs/components/thread-channels.html) — каналы между потоками
- [`await()`](/ru/docs/reference/await.html) — ожидание результата потока
- [`Async\RemoteException`](/ru/docs/components/exceptions.html) — обёртка ошибок потока-получателя
