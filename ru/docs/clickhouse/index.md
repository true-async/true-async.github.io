---
layout: docs
lang: ru
path_key: "/docs/clickhouse/index.html"
nav_active: docs
permalink: /ru/docs/clickhouse/index.html
page_title: "ClickHouse для TrueAsync"
description: "Нативный асинхронный клиент ClickHouse для PHP TrueAsync. Пиши синхронно — выполняется асинхронно: каждый сетевой вызов прозрачно уступает корутину, один Client обслуживает множество конкурентных корутин через скрытый пул соединений."
---

# ClickHouse для TrueAsync

**Нативный асинхронный клиент ClickHouse для [PHP TrueAsync](https://github.com/true-async).**
*Пиши синхронно — выполняется асинхронно.*

Построен на официальной библиотеке нативного протокола
[`ClickHouse/clickhouse-cpp`](https://github.com/ClickHouse/clickhouse-cpp). Каждый
сетевой вызов выглядит синхронным, но прозрачно уступает текущую корутину, пока
ждёт сокет. Один `Client` обслуживает множество конкурентных корутин через
скрытый пул соединений «по корутине».

```php
use TrueAsync\ClickHouse\Client;
use function Async\spawn;
use function Async\await_all;

$client = new Client(['host' => '127.0.0.1', 'user' => 'default']);

// Две корутины делают запрос конкурентно; каждая прозрачно берёт собственное
// соединение из скрытого пула, поэтому работа реально перекрывается на проводе.
[$results] = await_all([
    spawn(fn() => $client->query("SELECT count() AS c FROM events")->fetchOne()),
    spawn(fn() => $client->query(
        "SELECT name, count() AS c FROM events WHERE day = {d:Date} GROUP BY name",
        ['d' => '2026-06-07']
    )->fetchAll()),
]);
```

Каждый вызов выглядит синхронным, но уступает корутину, пока ждёт сети:
«пиши синхронно — выполняется асинхронно». Все вызовы клиента должны выполняться
внутри корутины ([`Async\spawn`](/ru/docs/reference/spawn.html)).

## Возможности

- **Асинхронность поверх реактора TrueAsync:** неблокирующие чтения/записи;
  корутина уступает управление вместо того, чтобы блокировать поток.
- **Нативный протокол** с компрессией **LZ4 / ZSTD**.
- **Скрытый пул «по корутине»:** конкурентные запросы получают каждый своё
  соединение; мёртвые соединения автоматически отбрасываются и заменяются.
- **`query()` → `Result`:** буферизовать через `fetchAll()`, стримить через
  `foreach` (лениво, блок за блоком) или прочитать скаляр через `fetchOne()`;
  несёт серверную статистику (`summary()`, `affectedRows()`).
- **`insert()`:** колоночная пакетная вставка; **`insertBatch()`:** стриминговая
  вставка со встроенным backpressure.
- **Нативная привязка параметров `{name:Type}`:** типизированная и защищённая
  от инъекций.
- **Богатый маппинг типов:** целые, числа с плавающей точкой, `Bool`, `String`,
  `UUID`, `IPv4/IPv6`, `Decimal`, `Enum`, `Date*`/`DateTime*` →
  `DateTimeImmutable`, `Array`/`Tuple`/`Map`/`Nullable`, `Int128`,
  `LowCardinality(String)`.
- **Многохостовый failover** и **TLS** (`ssl://`).
- **Типизированные исключения:** `ConnectionException`, `ServerException`
  (с серверным кодом ошибки), `ProtocolException`; ошибки вызывающего кода
  поднимают `\ValueError`.

## Требования

- PHP 8.x, собранный с **ZTS** и рантаймом **TrueAsync**.
- Компилятор **C++17** и **CMake** (для сборки встроенной clickhouse-cpp).

```sh
git clone --recurse-submodules https://github.com/true-async/php-clickhouse.git
cd php-clickhouse
# собрать встроенную clickhouse-cpp, затем phpize && ./configure && make
```

Полные шаги: **[Установка](/ru/docs/clickhouse/installation.html)**.

## Где начинать

- [Установка](/ru/docs/clickhouse/installation.html): требования, сборка
  clickhouse-cpp, сборка и загрузка расширения
- [Конфигурация](/ru/docs/clickhouse/configuration.html): подключение,
  аутентификация, компрессия, пул, failover, TLS
- [Использование](/ru/docs/clickhouse/usage.html): запросы, объект Result,
  insert, insertBatch, ошибки
- [Маппинг типов](/ru/docs/clickhouse/types.html): ClickHouse ↔ PHP
- [Пул соединений](/ru/docs/clickhouse/pool.html): скрытый пул «по корутине»
- [Архитектура](/ru/docs/clickhouse/architecture.html): внутреннее устройство

В каталоге [`tests/`](https://github.com/true-async/php-clickhouse/tree/main/tests)
лежат запускаемые примеры на каждую возможность.

## Лицензия

Apache-2.0.
