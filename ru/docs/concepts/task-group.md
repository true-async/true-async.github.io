---
layout: docs
lang: ru
path_key: "/docs/concepts/task-group.html"
nav_active: docs
permalink: /ru/docs/concepts/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup — высокоуровневый паттерн structured concurrency для управления группой задач."
---

# Класс Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Введение

При работе с корутинами часто нужно запустить несколько задач и дождаться их результатов.
Используя `spawn()` и `await()` напрямую, разработчик берёт на себя ответственность за то,
чтобы каждая корутина была ожидаема или отменена. Забытая корутина продолжает работать,
необработанная ошибка теряется, а отмена группы задач требует ручного кода.

Функции `await_all()`, `await_any()` не учитывают логические связи между разными задачами.
Например, когда нужно сделать несколько запросов, взять первый результат и отменить остальные,
`await_any()` требует от программиста дополнительного кода для отмены оставшихся задач. 
Такой код может быть достаточно сложным, поэтому функции `await_all()`, `await_any()` стоит рассматривать 
как антипатерны в этой ситуации.

Использование `Scope` для этой цели не подходит, так как корутины-задачи могут создавать другие дочерние корутины,
что требует от программиста реализовывать список корутин-задач и отдельно отслеживать их.

**TaskGroup** решает все эти проблемы. Это высокоуровневый паттерн structured concurrency,
который гарантирует: все задачи будут корректно ожидаемы или отменены. Он логические объединяет задачи, 
и позволяет оперировать ими как единым целым.

`TaskGroup` предоставляет несколько стратегий ожидания (`all`, `race`, `any`),
контроль конкурентности, итерацию по результатам и обработку ошибок.

- `all` возвращает `Future`, который разрешится массивом результатов всех задач, или реджектится с `CompositeException`.
- `race` возвращает `Future`, который разрешится результатом первой завершившейся задачи.
- `any` возвращает `Future`, который разрешится результатом первой успешно завершившейся задачи, игнорируя ошибки.
- `awaitCompletion` ожидает полного завершения всех задач, а также других корутин в `Scope`.

Поскольку `all`, `race` и `any` возвращают `Future`, для получения результата нужно вызвать `->await()`.
Это позволяет передать токен отмены: `->await($timeout)` — для ожидания с таймаутом.

При указании параметра `concurrency` `TaskGroup` также работает как пул корутин:
задачи, превышающие лимит, ожидают в очереди и не создают корутину до появления свободного слота.
Это позволяет экономить память и контролировать нагрузку при обработке большого числа задач.

## Примеры

### Параллельная загрузка данных

Самый частый сценарий — загрузить данные из нескольких источников одновременно:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Все три запроса выполняются параллельно. Если любой из них бросит исключение,
`all()` вернёт `Future`, который реджектится с `CompositeException`.

### Hedged requests

Паттерн «hedged request» — отправить один и тот же запрос на несколько реплик
и взять первый ответ. Это снижает задержку при медленных или перегруженных серверах:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// Первый ответ — результат, остальные задачи продолжают работать
$product = $group->race()->await();
```

### Обработка очереди с лимитом конкурентности

Обработать 10 000 задач, но не более 50 одновременно:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` автоматически ставит задачи в очередь. Корутина создаётся только тогда,
когда появляется свободный слот, что экономит память при большом объёме задач.

### Итерация по результатам по мере готовности

Обрабатывать результаты, не дожидаясь завершения всех задач:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Результаты приходят по мере готовности, а не в порядке добавления
    saveToStorage($result);
}
```

### Устойчивый к ошибкам поиск

Запросить несколько провайдеров, взять первый успешный ответ, игнорируя ошибки:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() игнорирует провайдеры, которые упали, и возвращает первый успешный результат
$results = $group->any()->await();

// Ошибки упавших провайдеров нужно явно обработать, иначе деструктор бросит исключение
$group->suppressErrors();
```

Если все провайдеры упали, `any()` выбросит `CompositeException` со всеми ошибками.

### Таймаут для группы задач

Ограничить время ожидания результатов через токен отмены:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Не удалось получить данные за 5 секунд";
}
```

## Обзор класса

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Методы */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Добавление задач */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Ожидание результатов */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Жизненный цикл */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Состояние */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Результаты и ошибки */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Итерация */
    public getIterator(): Iterator
}
```



## Аналоги в других языках

| Возможность             | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Structured concurrency  | `seal()` + `all()->await()`         | `async with` блок               | `try-with-resources` + `join()`          | Автоматически через scope |
| Стратегии ожидания      | `all()`, `race()`, `any()` → Future | Только all (через `async with`) | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Лимит конкурентности    | `concurrency: N`                    | Нет (нужен `Semaphore`)         | Нет                                      | Нет (нужен `Semaphore`)   |
| Итерация по результатам | `foreach` по мере готовности        | Нет                             | Нет                                      | `Channel`                 |
| Обработка ошибок        | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | Исключение отменяет scope |

PHP `TaskGroup` объединяет возможности, которые в других языках разнесены по нескольким примитивам:
лимит конкурентности без семафора, несколько стратегий ожидания в одном объекте и итерация по результатам по мере готовности.

## Содержание

- [TaskGroup::__construct](/ru/docs/reference/task-group/construct.html) — Создать группу задач
- [TaskGroup::spawn](/ru/docs/reference/task-group/spawn.html) — Добавить задачу с автоинкрементным ключом
- [TaskGroup::spawnWithKey](/ru/docs/reference/task-group/spawn-with-key.html) — Добавить задачу с явным ключом
- [TaskGroup::all](/ru/docs/reference/task-group/all.html) — Дождаться всех задач и получить результаты
- [TaskGroup::race](/ru/docs/reference/task-group/race.html) — Получить результат первой завершившейся задачи
- [TaskGroup::any](/ru/docs/reference/task-group/any.html) — Получить результат первой успешной задачи
- [TaskGroup::awaitCompletion](/ru/docs/reference/task-group/await-completion.html) — Дождаться завершения всех задач
- [TaskGroup::seal](/ru/docs/reference/task-group/seal.html) — Запечатать группу для новых задач
- [TaskGroup::cancel](/ru/docs/reference/task-group/cancel.html) — Отменить все задачи
- [TaskGroup::dispose](/ru/docs/reference/task-group/dispose.html) — Уничтожить scope группы
- [TaskGroup::finally](/ru/docs/reference/task-group/finally.html) — Зарегистрировать обработчик завершения
- [TaskGroup::isFinished](/ru/docs/reference/task-group/is-finished.html) — Проверить, завершены ли все задачи
- [TaskGroup::isSealed](/ru/docs/reference/task-group/is-sealed.html) — Проверить, запечатана ли группа
- [TaskGroup::count](/ru/docs/reference/task-group/count.html) — Получить количество задач
- [TaskGroup::getResults](/ru/docs/reference/task-group/get-results.html) — Получить массив успешных результатов
- [TaskGroup::getErrors](/ru/docs/reference/task-group/get-errors.html) — Получить массив ошибок
- [TaskGroup::suppressErrors](/ru/docs/reference/task-group/suppress-errors.html) — Пометить ошибки как обработанные
- [TaskGroup::getIterator](/ru/docs/reference/task-group/get-iterator.html) — Итерация по результатам по мере завершения
