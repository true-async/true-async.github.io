---
layout: docs
lang: ru
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /ru/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — динамический набор задач с автоматической очисткой результатов после доставки."
---

# Класс Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Введение

`TaskGroup` отлично подходит для сценариев, когда все целью являются результаты, а не задачи. 
Но есть много ситуаций, когда нужно контролировать число задач, а результаты потребляться потоком.

Типичные примеры:

- **Supervisor**: код, который следит за задачами и реагирует на их завершение.
- **Пул корутин**: одинаковое количество корутин обрабатывает данные.

**TaskSet** спроектирована для решения данных проблем. Она удаляет завершённые задачи 
автоматически в момент доставки результата через `joinNext()`, `joinAll()`, `joinAny()` или `foreach`.

## Отличия от TaskGroup

| Свойство                   | TaskGroup                          | TaskSet                                     |
|----------------------------|------------------------------------|---------------------------------------------|
| Хранение результатов       | Все результаты до явного запроса   | Удаляются после доставки                    |
| Повторный вызов методов    | Идемпотентный — тот же результат   | Каждый вызов — следующий элемент            |
| `count()`                  | Общее число задач                  | Число задач, ещё не доставленных            |
| Методы ожидания            | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`      |
| Итерация                   | Записи остаются                    | Записи удаляются после `foreach`            |
| Сценарий                   | Фиксированный набор задач          | Динамический поток задач                    |

## Идемпотентность vs потребление

**Главное концептуальное отличие** `TaskSet` от `TaskGroup`.

**TaskGroup — идемпотентный.** Вызовы `race()`, `any()`, `all()` всегда возвращают
один и тот же результат. Итерация через `foreach` всегда обходит все задачи.
Результаты хранятся в группе и доступны повторно:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() всегда возвращает одну и ту же первую завершившуюся задачу
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — тот же результат!

// all() всегда возвращает полный массив
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — тот же массив!

// foreach всегда обходит все элементы
foreach ($group as $key => [$result, $error]) { /* 3 итерации */ }
foreach ($group as $key => [$result, $error]) { /* снова 3 итерации */ }

echo $group->count(); // 3 — всегда 3
```

**TaskSet — потребляющий.** Каждый вызов `joinNext()` / `joinAny()` извлекает
следующий элемент и удаляет его из набора. Повторный `foreach` не найдёт уже
доставленных записей. Это поведение аналогично чтению из очереди или канала:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() каждый раз возвращает СЛЕДУЮЩИЙ результат
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — другой результат!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — набор пуст

// joinAll() после полного потребления — пустой массив
$set->seal();
$rest = $set->joinAll()->await(); // [] — нечего возвращать
```

Та же логика работает и для итерации:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// Первый foreach потребляет все результаты
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Второй foreach — пуст, итерировать нечего
foreach ($set as $key => [$result, $error]) {
    echo "это не выполнится\n";
}
```

> **Правило:** если вам нужно обращаться к результатам повторно — используйте `TaskGroup`.
> Если результаты обрабатываются однократно и должны освобождать память — используйте `TaskSet`.

## Семантика join-методов

В отличие от `TaskGroup`, где `race()` / `any()` / `all()` оставляют записи в группе,
`TaskSet` использует методы с семантикой **join** — результат доставлен, запись удалена:

- **`joinNext()`** — аналог `race()`: результат первой завершившейся задачи (успех или ошибка),
  запись удаляется из набора.
- **`joinAny()`** — аналог `any()`: результат первой *успешно* завершившейся задачи,
  запись удаляется из набора. Ошибки пропускаются.
- **`joinAll()`** — аналог `all()`: массив всех результатов,
  все записи удаляются из набора.

## Автоматическая очистка

Автоочистка работает во всех точках доставки результатов:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "a");
$set->spawn(fn() => "b");
echo $set->count(); // 2

$set->joinNext()->await();
echo $set->count(); // 1

$set->joinNext()->await();
echo $set->count(); // 0
```

При итерации через `foreach` каждая обработанная запись удаляется немедленно:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() уменьшается с каждой итерацией
    process($result);
}
```

## Лимит конкурентности

Как и `TaskGroup`, `TaskSet` поддерживает ограничение конкурентности:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Задачи, превышающие лимит, помещаются в очередь и запускаются при освобождении слота.

## Обзор класса

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Методы */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Добавление задач */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Ожидание результатов (с автоочисткой) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Жизненный цикл */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Состояние */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Ожидание завершения */
    public awaitCompletion(): void

    /* Итерация (с автоочисткой) */
    public getIterator(): Iterator
}
```

## Примеры

### joinAll() — параллельная загрузка с автоочисткой

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, все записи удалены

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — обработка задач по мере готовности

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Получен результат, осталось: {$set->count()}\n";
}
```

### joinAny() — устойчивый поиск

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Первый успешный результат, запись удалена
$result = $set->joinAny()->await();
echo "Найдено, активных задач: {$set->count()}\n";
```

### foreach — потоковая обработка

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Ошибка обработки $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Запись удалена, память освобождена
}
```

### Worker-цикл с динамическим добавлением задач

```php
$set = new Async\TaskSet(concurrency: 10);

// Одна корутина добавляет задачи
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Другая обрабатывает результаты
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Ошибка: {$error->getMessage()}");
        }
    }
});
```

## Аналоги в других языках

| Возможность          | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Динамический набор   | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Автоочистка          | Автоматически                     | Ручное управление             | Ручное управление         | Ручное управление      |
| Лимит конкурентности | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Буферизованный канал   |
| Потоковая итерация   | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Содержание

- [TaskSet::__construct](/ru/docs/reference/task-set/construct.html) — Создать набор задач
- [TaskSet::spawn](/ru/docs/reference/task-set/spawn.html) — Добавить задачу с автоинкрементным ключом
- [TaskSet::spawnWithKey](/ru/docs/reference/task-set/spawn-with-key.html) — Добавить задачу с явным ключом
- [TaskSet::joinNext](/ru/docs/reference/task-set/join-next.html) — Получить результат первой завершившейся задачи
- [TaskSet::joinAny](/ru/docs/reference/task-set/join-any.html) — Получить результат первой успешной задачи
- [TaskSet::joinAll](/ru/docs/reference/task-set/join-all.html) — Дождаться всех задач и получить результаты
- [TaskSet::seal](/ru/docs/reference/task-set/seal.html) — Запечатать набор для новых задач
- [TaskSet::cancel](/ru/docs/reference/task-set/cancel.html) — Отменить все задачи
- [TaskSet::dispose](/ru/docs/reference/task-set/dispose.html) — Уничтожить scope набора
- [TaskSet::finally](/ru/docs/reference/task-set/finally.html) — Зарегистрировать обработчик завершения
- [TaskSet::isFinished](/ru/docs/reference/task-set/is-finished.html) — Проверить, завершены ли все задачи
- [TaskSet::isSealed](/ru/docs/reference/task-set/is-sealed.html) — Проверить, запечатан ли набор
- [TaskSet::count](/ru/docs/reference/task-set/count.html) — Получить количество недоставленных задач
- [TaskSet::awaitCompletion](/ru/docs/reference/task-set/await-completion.html) — Дождаться завершения всех задач
- [TaskSet::getIterator](/ru/docs/reference/task-set/get-iterator.html) — Итерация по результатам с автоочисткой
