---
layout: docs
lang: uk
path_key: "/docs/components/task-group.html"
nav_active: docs
permalink: /uk/docs/components/task-group.html
page_title: "Async\\TaskGroup"
description: "Async\\TaskGroup -- високорівневий патерн структурованої конкурентності для управління групами завдань."
---

# Клас Async\TaskGroup

(PHP 8.6+, True Async 1.0)

## Вступ

При роботі з корутинами часто потрібно запустити кілька завдань і дочекатися їхніх результатів.
Використовуючи `spawn()` та `await()` безпосередньо, розробник бере на себе відповідальність за те,
що кожна корутина буде або очікувана, або скасована. Забута корутина продовжує працювати,
необроблена помилка втрачається, а скасування групи завдань вимагає ручного коду.

Функції `await_all()` та `await_any()` не враховують логічні зв'язки між різними завданнями.
Наприклад, коли потрібно зробити кілька запитів, взяти перший результат і скасувати решту,
`await_any()` вимагає додаткового коду від програміста для скасування решти завдань.
Такий код може бути досить складним, тому `await_all()` та `await_any()` слід вважати
антипатернами в цій ситуації.

Використання `Scope` для цієї мети не підходить, оскільки корутини завдань можуть створювати інші дочірні корутини,
що вимагає від програміста підтримувати список корутин завдань і відстежувати їх окремо.

**TaskGroup** вирішує всі ці проблеми. Це високорівневий патерн структурованої конкурентності,
що гарантує: всі завдання будуть належним чином очікувані або скасовані. Він логічно групує завдання
і дозволяє оперувати ними як єдиним цілим.

## Стратегії очікування

`TaskGroup` надає кілька стратегій очікування результатів.
Кожна повертає `Future`, що дозволяє передати таймаут: `->await(Async\timeout(5.0))`.

- **`all()`** -- повертає `Future`, що розв'язується масивом усіх результатів завдань,
  або відхиляється з `CompositeException`, якщо хоча б одне завдання кинуло виключення.
  З параметром `ignoreErrors: true` повертає тільки успішні результати.
- **`race()`** -- повертає `Future`, що розв'язується результатом першого завершеного завдання,
  незалежно від того, чи завершилося воно успішно чи ні. Інші завдання продовжують працювати.
- **`any()`** -- повертає `Future`, що розв'язується результатом першого *успішно* завершеного завдання,
  ігноруючи помилки. Якщо всі завдання завершилися з помилкою -- відхиляється з `CompositeException`.
- **`awaitCompletion()`** -- чекає повного завершення всіх завдань, а також інших корутин у `Scope`.

## Обмеження конкурентності

Коли вказано параметр `concurrency`, `TaskGroup` працює як пул корутин:
завдання, що перевищують ліміт, чекають у черзі і не створюють корутину, поки не з'явиться вільний слот.
Це економить пам'ять і контролює навантаження при обробці великої кількості завдань.

## TaskGroup і Scope

`TaskGroup` використовує `Scope` для управління життєвим циклом корутин завдань.
При створенні `TaskGroup` можна передати існуючий `Scope` або дозволити `TaskGroup` створити дочірній `Scope` від поточного.
Всі завдання, додані до `TaskGroup`, виконуються всередині цього `Scope`.
Це означає, що при скасуванні або знищенні `TaskGroup`
всі корутини будуть автоматично скасовані, забезпечуючи безпечне управління ресурсами та запобігаючи витокам.

## Запечатування та ітерація

`TaskGroup` дозволяє додавати завдання динамічно, поки він не буде
запечатаний за допомогою методу `seal()`.

Метод `all()` повертає `Future`, що спрацьовує, коли всі наявні завдання
в черзі завершені. Це дозволяє використовувати `TaskGroup` у циклі, де завдання додаються динамічно,
а `all()` викликається для отримання результатів поточного набору завдань.

`TaskGroup` також підтримує `foreach` для ітерації результатів у міру їх готовності.
У цьому випадку `seal()` потрібно викликати після додавання всіх завдань, щоб сигналізувати,
що нових завдань не буде, і `foreach` може завершитися після обробки всіх результатів.

## Огляд класу

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Методи */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Додавання завдань */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Очікування результатів */
    public all(bool $ignoreErrors = false): Async\Future
    public race(): Async\Future
    public any(): Async\Future
    public awaitCompletion(): void

    /* Життєвий цикл */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Стан */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Результати та помилки */
    public getResults(): array
    public getErrors(): array
    public suppressErrors(): void

    /* Ітерація */
    public getIterator(): Iterator
}
```

## Приклади

### all() -- Паралельне завантаження даних

Найпоширеніший сценарій -- завантаження даних з кількох джерел одночасно:

```php
$group = new Async\TaskGroup();

$group->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$group->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$group->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$data = $group->all()->await();
// ['user' => ..., 'orders' => [...], 'reviews' => [...]]

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

Всі три запити виконуються паралельно. Якщо будь-який з них кине виключення,
`all()` повертає `Future`, що відхиляється з `CompositeException`.

### race() -- Hedged-запити

Патерн "hedged request" -- надіслати однаковий запит на кілька реплік
і взяти першу відповідь. Це зменшує затримку при повільних або перевантажених серверах:

```php
$replicas = ['db-replica-1', 'db-replica-2', 'db-replica-3'];

$group = new Async\TaskGroup();

foreach ($replicas as $host) {
    $group->spawn(fn() => pg_query($host, 'SELECT * FROM products WHERE id = 42'));
}

// Перша відповідь -- результат, інші завдання продовжують працювати
$product = $group->race()->await();
```

### any() -- Відмовостійкий пошук

Запитати кілька провайдерів, взяти першу успішну відповідь, ігноруючи помилки:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => searchGoogle($query));
$group->spawn(fn() => searchBing($query));
$group->spawn(fn() => searchDuckDuckGo($query));

// any() ігнорує провайдерів, що відмовили, і повертає перший успішний результат
$results = $group->any()->await();

// Помилки від провайдерів, що відмовили, потрібно явно обробити, інакше деструктор кине виключення
$group->suppressErrors();
```

Якщо всі провайдери відмовили, `any()` кине `CompositeException` з усіма помилками.

### Обмеження конкурентності -- Обробка черги

Обробити 10 000 завдань, але не більше 50 одночасно:

```php
$group = new Async\TaskGroup(concurrency: 50);

foreach ($urls as $url) {
    $group->spawn(fn() => httpClient()->get($url)->getBody());
}

$results = $group->all()->await();
```

`TaskGroup` автоматично ставить завдання в чергу. Корутина створюється тільки коли
з'являється вільний слот, що економить пам'ять при великому обсязі завдань.

### Ітерація результатів у міру завершення

Обробляти результати, не чекаючи завершення всіх завдань:

```php
$group = new Async\TaskGroup();

foreach ($imageFiles as $file) {
    $group->spawn(fn() => processImage($file));
}

$group->seal();

foreach ($group as $key => $result) {
    // Результати надходять у міру готовності, а не в порядку додавання
    saveToStorage($result);
}
```

### Таймаут для групи завдань

Обмежити час очікування результатів:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => slowApi()->fetchReport());
$group->spawn(fn() => anotherApi()->fetchStats());
$group->seal();

try {
    $results = $group->all()->await(Async\timeout(5.0));
} catch (Async\TimeoutException) {
    echo "Failed to get data within 5 seconds";
}
```

## Аналоги в інших мовах

| Можливість              | PHP `TaskGroup`                     | Python `asyncio.TaskGroup`      | Java `StructuredTaskScope`               | Kotlin `coroutineScope`   |
|-------------------------|-------------------------------------|---------------------------------|------------------------------------------|---------------------------|
| Структурована конкурентність | `seal()` + `all()->await()`    | `async with` блок               | `try-with-resources` + `join()`          | Автоматично через scope   |
| Стратегії очікування    | `all()`, `race()`, `any()` -> Future | Тільки all (через `async with`) | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
| Обмеження конкурентності | `concurrency: N`                   | Ні (потрібен `Semaphore`)       | Ні                                       | Ні (потрібен `Semaphore`) |
| Ітерація результатів    | `foreach` у міру завершення         | Ні                              | Ні                                       | `Channel`                 |
| Обробка помилок         | `CompositeException`, `getErrors()` | `ExceptionGroup`                | `throwIfFailed()`                        | Виключення скасовує scope |

PHP `TaskGroup` поєднує можливості, які в інших мовах розподілені між кількома примітивами:
обмеження конкурентності без семафора, кілька стратегій очікування в одному об'єкті та ітерація результатів у міру завершення.

## Зміст

- [TaskGroup::__construct](/uk/docs/reference/task-group/construct.html) -- Створити групу завдань
- [TaskGroup::spawn](/uk/docs/reference/task-group/spawn.html) -- Додати завдання з автоінкрементним ключем
- [TaskGroup::spawnWithKey](/uk/docs/reference/task-group/spawn-with-key.html) -- Додати завдання з явним ключем
- [TaskGroup::all](/uk/docs/reference/task-group/all.html) -- Дочекатися всіх завдань і отримати результати
- [TaskGroup::race](/uk/docs/reference/task-group/race.html) -- Отримати результат першого завершеного завдання
- [TaskGroup::any](/uk/docs/reference/task-group/any.html) -- Отримати результат першого успішного завдання
- [TaskGroup::awaitCompletion](/uk/docs/reference/task-group/await-completion.html) -- Дочекатися завершення всіх завдань
- [TaskGroup::seal](/uk/docs/reference/task-group/seal.html) -- Запечатати групу для нових завдань
- [TaskGroup::cancel](/uk/docs/reference/task-group/cancel.html) -- Скасувати всі завдання
- [TaskGroup::dispose](/uk/docs/reference/task-group/dispose.html) -- Знищити scope групи
- [TaskGroup::finally](/uk/docs/reference/task-group/finally.html) -- Зареєструвати обробник завершення
- [TaskGroup::isFinished](/uk/docs/reference/task-group/is-finished.html) -- Перевірити, чи завершено всі завдання
- [TaskGroup::isSealed](/uk/docs/reference/task-group/is-sealed.html) -- Перевірити, чи запечатана група
- [TaskGroup::count](/uk/docs/reference/task-group/count.html) -- Отримати кількість завдань
- [TaskGroup::getResults](/uk/docs/reference/task-group/get-results.html) -- Отримати масив успішних результатів
- [TaskGroup::getErrors](/uk/docs/reference/task-group/get-errors.html) -- Отримати масив помилок
- [TaskGroup::suppressErrors](/uk/docs/reference/task-group/suppress-errors.html) -- Позначити помилки як оброблені
- [TaskGroup::getIterator](/uk/docs/reference/task-group/get-iterator.html) -- Ітерувати результати у міру завершення
