---
layout: docs
lang: ru
path_key: "/docs/clickhouse/usage.html"
nav_active: docs
permalink: /ru/docs/clickhouse/usage.html
page_title: "ClickHouse для TrueAsync: использование"
description: "Запросы, объект Result (буфер/стрим/статистика), параметры, настройки, вставки, стриминговые пакетные вставки и обработка ошибок."
---

# Использование

Все примеры используют класс `TrueAsync\ClickHouse\Client`. Каждая сетевая
операция прозрачно уступает текущую корутину, поэтому **все вызовы клиента должны
выполняться внутри корутины** ([`Async\spawn`](/ru/docs/reference/spawn.html)).
Вызов `query()`/`insert()` на верхнем уровне (вне корутины) завершится ошибкой,
потому что рукопожатию и чтениям нужен планировщик, на котором можно
приостановиться.

```php
use TrueAsync\ClickHouse\Client;
use function Async\spawn;
use function Async\await_all;

$client = new Client(['host' => '127.0.0.1', 'user' => 'default']);

// Каждый запрос выполняется в своей корутине, поэтому оба идут конкурентно —
// один Client, два соединения из скрытого пула.
[$results] = await_all([
    spawn(fn() => $client->query("SELECT 1 AS n")->fetchOne()),
    spawn(fn() => $client->query("SELECT 2 AS n")->fetchOne()),
]);

var_dump($results); // [1, 2]
```

Один `Client` владеет скрытым [пулом соединений](/ru/docs/clickhouse/pool.html)
«по корутине»: конкурентные корутины получают каждая своё физическое соединение,
поэтому один `Client` может обслуживать множество одновременных запросов.

---

## Запросы

### `query(string $sql, array $params = [], array $options = []): Result`

Выполняет инструкцию и возвращает [`Result`](#объект-result). Используется также
для DDL (`CREATE`, `DROP`, …) и `INSERT … SELECT` (которые дают пустой результат).
К моменту возврата `query()` инструкция уже выполнена.

```php
$result = $client->query("SELECT number, number * 2 AS doubled FROM numbers(3)");

$rows = $result->fetchAll();
// [
//   ['number' => 0, 'doubled' => 0],
//   ['number' => 1, 'doubled' => 2],
//   ['number' => 2, 'doubled' => 4],
// ]
```

### Привязка параметров

Используйте нативные плейсхолдеры ClickHouse `{name:Type}`. Значения
привязываются на стороне сервера и типизируются; они никогда не подставляются как
строка, поэтому защищены от инъекций.

```php
$rows = $client->query(
    "SELECT * FROM events WHERE user_id = {uid:UInt64} AND day >= {since:Date}",
    ['uid' => 42, 'since' => '2026-01-01']
)->fetchAll();
```

### Настройки на запрос

Передавайте настройки ClickHouse для одного запроса через `options['settings']`.
Они переопределяют настройки соединения только для этого запроса.

```php
$rows = $client->query(
    "SELECT * FROM big_table",
    [],
    ['settings' => ['max_threads' => '8', 'max_execution_time' => '30']]
)->fetchAll();
```

---

## Объект Result

`query()` возвращает `Result`: однопроходный результат «только вперёд», который
можно либо **буферизовать**, либо **стримить**. Инструкции без строк (DDL,
`INSERT … SELECT`) дают пустой результат.

| Метод | Описание |
|-------|----------|
| `fetchAll(): array` | Все оставшиеся строки сразу (буферизует). |
| `fetch(): ?array` | Следующая строка (`колонка => значение`) или `null` в конце. |
| `fetchOne(): mixed` | Первая колонка следующей строки; удобно для скалярных запросов. |
| `foreach ($result as $row)` | Ленивый стриминг, по одному блоку за раз. |
| `affectedRows(): int` | Строки, записанные `INSERT … SELECT` (= `summary()->writtenRows`). |
| `summary(): Summary` | Серверная статистика по запросу (см. ниже). |

`Result` **однопроходный**: выберите один способ потребления. Не смешивайте
`foreach` и `fetch()` на одном объекте — они делят одну позицию в потоке.

### Буфер или стрим

```php
// Буфер: проще всего; весь результат в памяти.
$rows = $client->query("SELECT * FROM small_table")->fetchAll();

// Стрим: ограниченная память, идеально для больших результатов. Строки приходят
// блок за блоком в вашу корутину.
foreach ($client->query("SELECT * FROM huge_table") as $row) {
    handle($row);
}

// Скаляр.
$count = $client->query("SELECT count() FROM events")->fetchOne();
```

Стриминг однопроходный; досрочный выход из цикла допустим. Соединение (в котором
ещё остались непрочитанные данные) отбрасывается, и в следующий раз пул выдаёт
свежее. То же касается результата, который вы выбросили не прочитав: предпочитайте
`fetchAll()` (или просто полагайтесь на DDL / `INSERT … SELECT`, которые
завершаются сами), когда вам нужен только побочный эффект, иначе это соединение
будет отброшено, а не переиспользовано.

### Статистика запроса: `summary()`

`summary()` возвращает value-объект `Summary` со счётчиками, сообщёнными
сервером. Он становится финальным, когда результат полностью прочитан (и сразу
доступен для инструкций без строк):

```php
$result = $client->query("SELECT * FROM events WHERE day = today() LIMIT 100");
$rows   = $result->fetchAll();

$s = $result->summary();
$s->readRows;          // строки, которые сервер просканировал
$s->readBytes;
$s->rowsBeforeLimit;   // строки, совпавшие до LIMIT (null, если LIMIT не было); для пагинации
$s->elapsed;           // секунды

// «Affected rows» для серверной вставки:
$n = $client->query("INSERT INTO dst SELECT * FROM src")->affectedRows();
```

Поля `Summary`: `readRows`, `readBytes`, `writtenRows`, `writtenBytes`,
`totalRowsToRead`, `rowsBeforeLimit` (`?int`), `elapsed` (`float`).

---

## Вставка

### `insert(string $table, array $columns, array $rows): void`

Колоночная пакетная вставка. Типы колонок берутся из серверного sample-блока
INSERT, поэтому PHP-значения кодируются в реальные типы колонок (без догадок на
стороне клиента).

```php
$client->insert("events", ["id", "name", "score"], [
    [1, "a", 1.5],
    [2, "b", 2.5],
]);
```

Каждая строка позиционна: её значения должны совпадать с `$columns`. Неверное
число значений поднимает `\ValueError`. Что принимает каждый тип ClickHouse, см.
в [Маппинге типов](/ru/docs/clickhouse/types.html).

### Стриминговые вставки: `insertBatch()`

### `insertBatch(string $table, array $columns): Batch`

Для больших вставок, которые не должны целиком собираться в памяти. Добавляйте
строки, затем вызывайте `flush()`, чтобы отправить их одной вставкой. Сброс
применяет **асинхронный backpressure**: если буфер сокета заполняется, корутина
уступает управление, пока он не освободится, поэтому продюсер не может обогнать
сервер.

```php
$batch = $client->insertBatch("events", ["id", "name"]);

foreach ($source as $i => $name) {
    $batch->append([$i, $name]);

    if ($batch->count() >= 10_000) {
        $batch->flush();          // отправить эту порцию
    }
}

$batch->flush();                  // отправить остаток
```

Методы `Batch`:

| Метод | Описание |
|-------|----------|
| `append(array $row): void` | Буферизовать одну позиционную строку (без сети). |
| `flush(): void` | Отправить все буферизованные строки одной вставкой; ничего не делает, если буфер пуст. |
| `count(): int` | Число буферизованных, ещё не отправленных строк. |

Batch удерживает одно соединение из пула на всё время своей жизни и возвращает
его при уничтожении объекта. **Несброшенные строки отбрасываются при
уничтожении**, поэтому всегда вызывайте `flush()`, чтобы сохранить хвост.

---

## Пул соединений: `getPool()`

### `getPool(): \Async\Pool`

Возвращает нижележащую обёртку TrueAsync [`Async\Pool`](/ru/docs/components/pool.html) —
продвинутый запасной механизм (escape hatch) для статистики, жизненного цикла и
circuit-breaking. Обычные вызовы `query`/`insert` забирают и возвращают
соединения автоматически; этот метод нужен редко. См.
[Пул соединений](/ru/docs/clickhouse/pool.html).

```php
$pool = $client->getPool();
echo $pool->count(), " соединений, ", $pool->idleCount(), " простаивает\n";
```

---

## Обработка ошибок

Все ошибки — исключения. Иерархия клиента (всё наследуется от
`\RuntimeException`):

| Исключение | Когда |
|------------|-------|
| `ClickHouseException` | базовый класс для всего ниже |
| `ConnectionException` | сбой подключения/чтения/записи, EOF, отмена |
| `ServerException` | сервер отклонил запрос (`getCode()` — код ошибки ClickHouse) |
| `ProtocolException` | ошибка декодирования протокола, контрольной суммы или компрессии |

**Ошибки вызывающего кода** (некорректная строка, неверное число значений)
поднимают стандартный PHP `\ValueError`; это `LogicException`, а не сбой времени
выполнения.

```php
use TrueAsync\ClickHouse\ServerException;

try {
    $client->query("SELECT * FROM does_not_exist");
} catch (ServerException $e) {
    echo "Ошибка ClickHouse {$e->getCode()}: {$e->getMessage()}\n";
}
```

Соединение, умершее посреди операции, никогда не возвращается в пул; следующий
вызов прозрачно получает свежее.
