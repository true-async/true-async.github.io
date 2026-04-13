---
layout: docs
lang: ru
path_key: "/docs/reference/spawn-thread.html"
nav_active: docs
permalink: /ru/docs/reference/spawn-thread.html
page_title: "spawn_thread()"
description: "spawn_thread() — запуск замыкания в новом OS-потоке. Полная документация: параметры, передача данных, исключения, примеры."
---

# spawn_thread

(PHP 8.6+, True Async 1.0)

`spawn_thread()` — запускает замыкание в **отдельном параллельном потоке** с собственным изолированным
окружением PHP. Возвращает `Async\Thread`, реализующий `Completable`, поэтому поток можно ожидать
через `await()`.

## Описание

```php
Async\spawn_thread(
    \Closure $task,
    bool $inherit = true,
    ?\Closure $bootloader = null
): Async\Thread
```

Создаёт новый OS-поток, поднимает в нём отдельный PHP-request, при необходимости выполняет `$bootloader`,
затем исполняет `$task`. Возвращаемое из `$task` значение становится результатом потока и доступно
через `await()` или `Thread::getResult()`.

## Параметры

**`task`**
: Замыкание, выполняемое в потоке-получателе. Может захватывать переменные через `use (...)` — они
глубоко копируются через общую память при создании потока и заново оживают уже в памяти
потока-получателя.

**`inherit`**
: Зарезервировано для будущего использования. На данный момент параметр принимается, но не влияет
на поведение потока — поток-получатель всегда стартует со свежим изолированным окружением.
Флаг останется в сигнатуре до появления поддержки наследования классов и функций из родителя.

**`bootloader`**
: Необязательное замыкание, выполняемое **первым** в потоке-получателе, до загрузки переменных
из `use(...)` основного `$task`. Используется для подготовки окружения потока: регистрация autoload,
объявление классов, инициализация ini, подключение библиотек. Bootloader не принимает параметров,
его возвращаемое значение игнорируется.

## Возвращаемое значение

Объект `Async\Thread`, представляющий запущенный поток. Реализует `Completable`, поэтому пригоден
для `await()`, `await_all()`, `await_any()`, `Task\Group` и т.п.

## Исключения

- `Async\ThreadTransferException` — выбрасывается **в родителе**, если одна из переменных, захваченных
  через `use(...)`, содержит непередаваемый тип (`stdClass` с динамическими свойствами, PHP-ссылку,
  ресурс и т.п.).
- `Async\RemoteException` — выбрасывается при `await()`, если `$task` завершился ошибкой. Оборачивает
  исходное исключение; `getRemoteClass()` и `getRemoteException()` дают доступ к деталям.

## Примеры

### Пример #1. Тяжёлая работа в отдельном потоке

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;
use function Async\delay;

// Тикер в основной корутине — показывает, что основная программа не встаёт
spawn(function() {
    for ($i = 0; $i < 5; $i++) {
        echo "tick $i\n";
        delay(100);
    }
});

spawn(function() {
    $thread = spawn_thread(function() {
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

Тикер отрабатывает параллельно с CPU-нагрузкой — основная программа не застревает.

### Пример #2. Передача переменных и идентичность

```php
<?php

use function Async\spawn;
use function Async\spawn_thread;
use function Async\await;

class Config {
    public function __construct(public string $name = '') {}
}

// Класс не наследуется в поток — объявляем его через bootloader
$boot = function() {
    eval('class Config { public function __construct(public string $name = "") {} }');
};

spawn(function() use ($boot) {
    $obj  = new Config('prod');
    $meta = ['ref' => $obj];

    $thread = spawn_thread(
        task: function() use ($obj, $meta) {
            // Одна и та же инстанция в двух переменных из use(...)
            echo "same: ", ($obj === $meta['ref'] ? "yes" : "no"), "\n";

            // Мутация через одну ссылку видна через другую
            $obj->name = 'staging';
            echo "meta: ", $meta['ref']->name, "\n";

            return $obj->name;
        },
        bootloader: $boot,
    );

    echo "result: ", await($thread), "\n";
});
```

```
same: yes
meta: staging
result: staging
```

Идентичность объекта сохраняется через разные переменные, захваченные одним замыканием через `use(...)`.

### Пример #3. Обработка исключения

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

### Пример #4. Передача непередаваемого типа

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

Исключение брошено **в родителе** на этапе копирования переменных из `use(...)` — поток-получатель даже не успел запуститься.

### Пример #5. Возврат результата через FutureState

Если нужно «разбудить» родительский `Future` прямо из параллельного потока (например, чтобы одно и то же
событие можно было ждать из разных мест основной корутины) — передайте `FutureState`:

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
        $data = "computed in thread";
        $state->complete($data);
    });

    // Событие придёт в родителя через $future, когда поток вызовет $state->complete()
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

`FutureState` можно передать в `spawn_thread` **только один раз** — попытка передать тот же state
во второй поток бросит исключение на этапе транзита.

## Примечания

- **Класс замыкания** — `$task` должен быть `\Closure`. Callables других типов (`[object, 'method']`,
  строковое имя функции) не принимаются — механизм передачи умеет переносить только `Closure`.
- **`use` с `&` (by-reference)** — отклоняется. Shared reference между потоками не имеет смысла.
- **Пользовательские классы** не наследуются в поток-получатель автоматически. Если `$task` использует
  класс, объявленный в родительском скрипте, его нужно сделать доступным в потоке через `bootloader`
  (подключить через autoload или объявить через `eval`).
- **Статические свойства функций и классов** в потоке-получателе свои — любые изменения остаются
  внутри потока и не утекают наружу.

## См. также

- [`Async\Thread`](/ru/docs/components/threads.html) — документация по компоненту
- [`Async\ThreadChannel`](/ru/docs/components/thread-channels.html) — каналы между потоками
- [`await()`](/ru/docs/reference/await.html) — ожидание результата
- [`spawn()`](/ru/docs/reference/spawn.html) — запуск корутины (не потока)
