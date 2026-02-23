---
layout: docs
lang: uk
path_key: "/docs/components/task-set.html"
nav_active: docs
permalink: /uk/docs/components/task-set.html
page_title: "Async\\TaskSet"
description: "Async\\TaskSet — динамічний набір завдань з автоматичним очищенням результатів після доставки."
---

# Клас Async\TaskSet

(PHP 8.6+, True Async 1.0)

## Вступ

`TaskGroup` чудово підходить для сценаріїв, де метою є результати, а не самі завдання.
Проте є чимало ситуацій, коли потрібно контролювати кількість завдань,
а результати споживати потоково.

Типові приклади:

- **Supervisor**: код, що стежить за завданнями та реагує на їхнє завершення.
- **Пул корутин**: фіксована кількість корутин, що обробляють дані.

**TaskSet** створено для розв'язання цих задач. Він автоматично видаляє завершені завдання
в момент доставки результату через `joinNext()`, `joinAll()`, `joinAny()` або `foreach`.

## Відмінності від TaskGroup

| Властивість               | TaskGroup                          | TaskSet                                     |
|---------------------------|------------------------------------|---------------------------------------------|
| Зберігання результатів    | Усі результати до явного запиту    | Видаляються після доставки                  |
| Повторний виклик методів  | Ідемпотентний — той самий результат| Кожен виклик — наступний елемент            |
| `count()`                 | Загальна кількість завдань         | Кількість ще не доставлених завдань         |
| Методи очікування         | `all()`, `race()`, `any()`         | `joinAll()`, `joinNext()`, `joinAny()`      |
| Ітерація                  | Записи залишаються                 | Записи видаляються після `foreach`          |
| Сценарій використання     | Фіксований набір завдань           | Динамічний потік завдань                    |

## Ідемпотентність vs споживання

**Ключова концептуальна відмінність** `TaskSet` від `TaskGroup`.

**TaskGroup — ідемпотентний.** Виклики `race()`, `any()`, `all()` завжди повертають
один і той самий результат. Ітерація через `foreach` завжди обходить усі завдання.
Результати зберігаються в групі й доступні повторно:

```php
$group = new Async\TaskGroup();

$group->spawn(fn() => "alpha");
$group->spawn(fn() => "beta");
$group->spawn(fn() => "gamma");
$group->seal();

// race() завжди повертає ту саму першу завершену задачу
$first  = $group->race()->await(); // "alpha"
$same   = $group->race()->await(); // "alpha" — той самий результат!

// all() завжди повертає повний масив
$all1 = $group->all()->await(); // ["alpha", "beta", "gamma"]
$all2 = $group->all()->await(); // ["alpha", "beta", "gamma"] — той самий масив!

// foreach завжди обходить усі елементи
foreach ($group as $key => [$result, $error]) { /* 3 ітерації */ }
foreach ($group as $key => [$result, $error]) { /* знову 3 ітерації */ }

echo $group->count(); // 3 — завжди 3
```

**TaskSet — споживальний.** Кожен виклик `joinNext()` / `joinAny()` витягує
наступний елемент і видаляє його з набору. Повторний `foreach` не знайде вже
доставлених записів. Така поведінка аналогічна читанню з черги або каналу:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");

// joinNext() щоразу повертає НАСТУПНИЙ результат
$first  = $set->joinNext()->await(); // "alpha"
$second = $set->joinNext()->await(); // "beta" — інший результат!
$third  = $set->joinNext()->await(); // "gamma"

echo $set->count(); // 0 — набір порожній

// joinAll() після повного споживання — порожній масив
$set->seal();
$rest = $set->joinAll()->await(); // [] — нічого повертати
```

Та сама логіка працює і для ітерації:

```php
$set = new Async\TaskSet();

$set->spawn(fn() => "alpha");
$set->spawn(fn() => "beta");
$set->spawn(fn() => "gamma");
$set->seal();

// Перший foreach споживає всі результати
foreach ($set as $key => [$result, $error]) {
    echo "$result\n"; // "alpha", "beta", "gamma"
}

echo $set->count(); // 0

// Другий foreach — порожній, ітерувати нічого
foreach ($set as $key => [$result, $error]) {
    echo "це не виконається\n";
}
```

> **Правило:** якщо вам потрібен повторний доступ до результатів — використовуйте `TaskGroup`.
> Якщо результати обробляються одноразово й мають звільняти пам'ять — використовуйте `TaskSet`.

## Семантика join-методів

На відміну від `TaskGroup`, де `race()` / `any()` / `all()` залишають записи в групі,
`TaskSet` використовує методи із семантикою **join** — результат доставлено, запис видалено:

- **`joinNext()`** — аналог `race()`: результат першого завершеного завдання (успіх або помилка),
  запис видаляється з набору.
- **`joinAny()`** — аналог `any()`: результат першого *успішно* завершеного завдання,
  запис видаляється з набору. Помилки пропускаються.
- **`joinAll()`** — аналог `all()`: масив усіх результатів,
  усі записи видаляються з набору.

## Автоматичне очищення

Автоочищення працює в усіх точках доставки результатів:

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

Під час ітерації через `foreach` кожен оброблений запис видаляється негайно:

```php
$set = new Async\TaskSet();

foreach ($urls as $url) {
    $set->spawn(fn() => fetch($url));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    // $set->count() зменшується з кожною ітерацією
    process($result);
}
```

## Ліміт конкурентності

Як і `TaskGroup`, `TaskSet` підтримує обмеження конкурентності:

```php
$set = new Async\TaskSet(concurrency: 10);

foreach ($tasks as $task) {
    $set->spawn(fn() => processTask($task));
}
```

Завдання, що перевищують ліміт, потрапляють у чергу й запускаються при звільненні слота.

## Огляд класу

```php
final class Async\TaskSet implements Async\Awaitable, Countable, IteratorAggregate {

    /* Методи */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Додавання завдань */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Очікування результатів (з автоочищенням) */
    public joinNext(): Async\Future
    public joinAny(): Async\Future
    public joinAll(bool $ignoreErrors = false): Async\Future

    /* Життєвий цикл */
    public seal(): void
    public cancel(?Async\AsyncCancellation $cancellation = null): void
    public dispose(): void
    public finally(Closure $callback): void

    /* Стан */
    public isFinished(): bool
    public isSealed(): bool
    public count(): int

    /* Очікування завершення */
    public awaitCompletion(): void

    /* Ітерація (з автоочищенням) */
    public getIterator(): Iterator
}
```

## Приклади

### joinAll() — паралельне завантаження з автоочищенням

```php
$set = new Async\TaskSet();

$set->spawnWithKey('user',    fn() => $db->query('SELECT * FROM users WHERE id = ?', [$id]));
$set->spawnWithKey('orders',  fn() => $db->query('SELECT * FROM orders WHERE user_id = ?', [$id]));
$set->spawnWithKey('reviews', fn() => $api->get("/users/{$id}/reviews"));

$set->seal();
$data = $set->joinAll()->await();
// $set->count() === 0, усі записи видалено

return new UserProfile($data['user'], $data['orders'], $data['reviews']);
```

### joinNext() — обробка завдань у міру готовності

```php
$set = new Async\TaskSet(concurrency: 5);

foreach ($urls as $url) {
    $set->spawn(fn() => httpClient()->get($url)->getBody());
}
$set->seal();

while ($set->count() > 0) {
    $result = $set->joinNext()->await();
    echo "Отримано результат, залишилось: {$set->count()}\n";
}
```

### joinAny() — стійкий пошук

```php
$set = new Async\TaskSet();

$set->spawn(fn() => searchProvider1($query));
$set->spawn(fn() => searchProvider2($query));
$set->spawn(fn() => searchProvider3($query));

// Перший успішний результат, запис видалено
$result = $set->joinAny()->await();
echo "Знайдено, активних завдань: {$set->count()}\n";
```

### foreach — потокова обробка

```php
$set = new Async\TaskSet(concurrency: 20);

foreach ($imageFiles as $file) {
    $set->spawn(fn() => processImage($file));
}
$set->seal();

foreach ($set as $key => [$result, $error]) {
    if ($error !== null) {
        log("Помилка обробки $key: {$error->getMessage()}");
        continue;
    }
    saveToStorage($result);
    // Запис видалено, пам'ять звільнено
}
```

### Worker-цикл із динамічним додаванням завдань

```php
$set = new Async\TaskSet(concurrency: 10);

// Одна корутина додає завдання
spawn(function() use ($set, $queue) {
    while ($message = $queue->receive()) {
        $set->spawn(fn() => processMessage($message));
    }
    $set->seal();
});

// Інша обробляє результати
spawn(function() use ($set) {
    foreach ($set as $key => [$result, $error]) {
        if ($error !== null) {
            log("Помилка: {$error->getMessage()}");
        }
    }
});
```

## Аналоги в інших мовах

| Можливість           | PHP `TaskSet`                     | Python `asyncio`              | Kotlin                    | Go                     |
|----------------------|-----------------------------------|-------------------------------|---------------------------|------------------------|
| Динамічний набір     | `spawn()` + `joinNext()`          | `asyncio.as_completed()`      | `Channel` + `select`      | `errgroup` + `chan`    |
| Автоочищення         | Автоматично                       | Ручне керування               | Ручне керування           | Ручне керування        |
| Ліміт конкурентності | `concurrency: N`                  | `Semaphore`                   | `Semaphore`               | Буферизований канал    |
| Потокова ітерація    | `foreach`                         | `async for` + `as_completed`  | `for` + `Channel`         | `for range` + `chan`   |

## Зміст

- [TaskSet::__construct](/uk/docs/reference/task-set/construct.html) — Створити набір завдань
- [TaskSet::spawn](/uk/docs/reference/task-set/spawn.html) — Додати завдання з автоінкрементним ключем
- [TaskSet::spawnWithKey](/uk/docs/reference/task-set/spawn-with-key.html) — Додати завдання з явним ключем
- [TaskSet::joinNext](/uk/docs/reference/task-set/join-next.html) — Отримати результат першого завершеного завдання
- [TaskSet::joinAny](/uk/docs/reference/task-set/join-any.html) — Отримати результат першого успішного завдання
- [TaskSet::joinAll](/uk/docs/reference/task-set/join-all.html) — Дочекатися всіх завдань та отримати результати
- [TaskSet::seal](/uk/docs/reference/task-set/seal.html) — Запечатати набір для нових завдань
- [TaskSet::cancel](/uk/docs/reference/task-set/cancel.html) — Скасувати всі завдання
- [TaskSet::dispose](/uk/docs/reference/task-set/dispose.html) — Знищити scope набору
- [TaskSet::finally](/uk/docs/reference/task-set/finally.html) — Зареєструвати обробник завершення
- [TaskSet::isFinished](/uk/docs/reference/task-set/is-finished.html) — Перевірити, чи завершені всі завдання
- [TaskSet::isSealed](/uk/docs/reference/task-set/is-sealed.html) — Перевірити, чи запечатаний набір
- [TaskSet::count](/uk/docs/reference/task-set/count.html) — Отримати кількість недоставлених завдань
- [TaskSet::awaitCompletion](/uk/docs/reference/task-set/await-completion.html) — Дочекатися завершення всіх завдань
- [TaskSet::getIterator](/uk/docs/reference/task-set/get-iterator.html) — Ітерація по результатах з автоочищенням
