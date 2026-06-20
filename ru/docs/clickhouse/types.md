---
layout: docs
lang: ru
path_key: "/docs/clickhouse/types.html"
nav_active: docs
permalink: /ru/docs/clickhouse/types.html
page_title: "ClickHouse для TrueAsync: маппинг типов"
description: "Как типы колонок ClickHouse отображаются в PHP при чтении и что каждый тип принимает при вставке."
---

# Маппинг типов

Как типы колонок ClickHouse отображаются в PHP-значения при **чтении**
(результаты `query()`) и что каждый принимает при **записи**
(`insert`/`insertBatch`).

## Чтение: ClickHouse → PHP

| ClickHouse | PHP | Примечания |
|------------|-----|------------|
| `Int8`…`Int64`, `UInt8`…`UInt32` | `int` | |
| `UInt64` | `int` / `float` | значения выше `PHP_INT_MAX` переполняются во `float` |
| `Int128`, `UInt128` | `string` | десятичная строка (без потерь) |
| `Float32`, `Float64` | `float` | |
| `String`, `FixedString` | `string` | |
| `Bool` | `bool` | |
| `Enum8`, `Enum16` | `string` | метка (label) |
| `UUID` | `string` | каноническая запись `8-4-4-4-12` |
| `IPv4`, `IPv6` | `string` | текстовый адрес |
| `Decimal`, `Decimal32/64/128` | `string` | без потерь |
| `Date`, `Date32`, `DateTime`, `DateTime64` | `DateTimeImmutable` | UTC; `DateTime64` сохраняет дробную часть секунды |
| `Array(T)` | `list` | рекурсивно |
| `Nullable(T)` | `null` \| `T` | |
| `Tuple(...)` | `list` | позиционно |
| `Map(K, V)` | `array` | ассоциативный |
| `LowCardinality(String)` | `string` | включая `LowCardinality(Nullable(String))` → `null`\|`string` |

> `LowCardinality` поверх нестроковых типов не поддерживается нижележащей
> clickhouse-cpp на чтении и не производится.

## Запись: PHP → ClickHouse

Типы колонок берутся из серверного sample-блока INSERT; PHP-значение кодируется
в этот тип.

| ClickHouse | Принимает (PHP) |
|------------|-----------------|
| `Int*`, `UInt*` | `int` |
| `Float32/64` | `float` или `int` |
| `String`, `FixedString` | `string` |
| `Bool` | `bool` |
| `Date`, `Date32`, `DateTime` | `int` (unix-секунды) или `DateTimeInterface` |
| `DateTime64` | `int`/`float` секунды или `DateTimeInterface` (дробная часть сохраняется) |
| `UUID` | `string` |
| `IPv4`, `IPv6` | `string` (текстовый адрес) |
| `Enum8`, `Enum16` | `string`-метка или `int`-значение |
| `Decimal`, `Decimal32/64/128` | `string` (или число; парсится с масштабом колонки) |
| `Nullable(T)` | `null` или значение `T` |
| `Array(T)` | `list` (вложенные массивы и `Array(Nullable(T))` поддерживаются) |
| `Tuple(...)` | `list`, позиционно |
| `Map(K, V)` | ассоциативный `array` |

> Колонки `LowCardinality` этот клиент пока не может писать (ограничение
> clickhouse-cpp). Вставляйте во внутренний тип или используйте `INSERT … SELECT`.

### Примеры Date / DateTime

```php
// Все три варианта пишут одну и ту же колонку DateTime:
$client->insert("t", ["ts"], [
    [1717761600],                                              // unix-секунды
    [new DateTimeImmutable('2026-06-07 12:00:00', new DateTimeZone('UTC'))],
]);

// DateTime64(3) сохраняет миллисекунды:
$client->insert("t64", ["ts"], [
    [new DateTimeImmutable('2026-06-07 12:00:00.500', new DateTimeZone('UTC'))],
]);
```

### Вложенные примеры

```php
$client->insert("nested", ["arr", "tup", "m"], [
    [
        [[1, 2], [3]],            // Array(Array(Int32))
        [42, "hi"],               // Tuple(UInt32, String)
        ["a" => 1, "b" => 2],     // Map(String, UInt32)
    ],
]);
```
