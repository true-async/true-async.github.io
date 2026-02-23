---
layout: docs
lang: ru
path_key: "/docs/reference/task-set/get-iterator.html"
nav_active: docs
permalink: /ru/docs/reference/task-set/get-iterator.html
page_title: "TaskSet::getIterator"
description: "Получить итератор для обхода результатов с автоматической очисткой."
---

# TaskSet::getIterator

(PHP 8.6+, True Async 1.0)

```php
public TaskSet::getIterator(): Iterator
```

Возвращает итератор, который выдаёт результаты **по мере завершения** задач.
TaskSet реализует `IteratorAggregate`, поэтому можно использовать `foreach` напрямую.

**Каждая обработанная запись автоматически удаляется из набора**, что освобождает память
и уменьшает `count()`.

## Поведение итератора

- `foreach` приостанавливает текущую корутину до появления следующего результата
- Ключ — тот же, что был назначен при `spawn()` или `spawnWithKey()`
- Значение — массив `[mixed $result, ?Throwable $error]`:
  - Успех: `[$result, null]`
  - Ошибка: `[null, $error]`
- Итерация завершается, когда набор запечатан **и** все задачи обработаны
- Если набор не запечатан — `foreach` приостанавливается в ожидании новых задач

> **Важно:** Без вызова `seal()` итерация будет ждать бесконечно.

## Примеры

### Пример #1 Потоковая обработка

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet(concurrency: 5);

    for ($i = 0; $i < 100; $i++) {
        $set->spawn(fn() => processItem($items[$i]));
    }
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            echo "Задача $key: ошибка — {$error->getMessage()}\n";
            continue;
        }
        echo "Задача $key: готово\n";
        // Запись удалена, память освобождена
    }

    echo $set->count() . "\n"; // 0
});
```

### Пример #2 Именованные ключи

```php
<?php

use Async\TaskSet;

spawn(function() {
    $set = new TaskSet();

    $set->spawnWithKey('users', fn() => fetchUsers());
    $set->spawnWithKey('orders', fn() => fetchOrders());
    $set->seal();

    foreach ($set as $key => [$result, $error]) {
        if ($error === null) {
            echo "$key: получено " . count($result) . " записей\n";
        }
    }
});
```

## См. также

- [TaskSet::seal](/ru/docs/reference/task-set/seal.html) — Запечатать набор
- [TaskSet::joinAll](/ru/docs/reference/task-set/join-all.html) — Дождаться всех задач
- [TaskSet::joinNext](/ru/docs/reference/task-set/join-next.html) — Следующий результат
