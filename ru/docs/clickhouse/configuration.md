---
layout: docs
lang: ru
path_key: "/docs/clickhouse/configuration.html"
nav_active: docs
permalink: /ru/docs/clickhouse/configuration.html
page_title: "ClickHouse для TrueAsync: конфигурация"
description: "Массив опций Client: хост, аутентификация, компрессия, пул соединений, многохостовый failover и TLS."
---

# Конфигурация

`Client` конструируется из массива опций:

```php
use TrueAsync\ClickHouse\Client;
use TrueAsync\ClickHouse\Compression;

$client = new Client([
    'host'        => '127.0.0.1',
    'port'        => 9000,
    'database'    => 'default',
    'user'        => 'default',
    'password'    => '',
    'compression' => Compression::LZ4,
    'pool'        => ['max' => 10],
]);
```

## Опции

| Ключ | Тип | По умолчанию | Описание |
|------|-----|--------------|----------|
| `host` | string | `127.0.0.1` | Хост сервера. |
| `port` | int | `9000` (или `9440` при включённом `tls`) | Порт нативного протокола. |
| `database` | string | `default` | База данных по умолчанию. |
| `user` | string | `default` | Имя пользователя. |
| `password` | string | `''` | Пароль. |
| `compression` | `Compression` | `Compression::LZ4` | Перечисление компрессии канала: `Compression::None`, `::LZ4` или `::ZSTD`. |
| `pool` | array | `['max' => 10]` | Настройки пула соединений; см. ниже. |
| `hosts` | string[] | нет | Список нескольких хостов; см. ниже. |
| `open_strategy` | `OpenStrategy` | `OpenStrategy::InOrder` | Как многохостовый пул выбирает хост для каждого соединения: `InOrder` (failover), `RoundRobin`, `Random`. |
| `tls` | bool | `false` | Подключаться по TLS. |
| `tls_verify` | bool | `true` | Проверять сертификат сервера (только при TLS). |

> Конструирование ленивое: ни одно соединение не открывается до первого
> `query`/`insert`. Поэтому неверный хост проявляется как
> `ConnectionException` при первом использовании, а не в конструкторе.

## Пул соединений

`'pool' => ['max' => N]` ограничивает число физических соединений, которые
открывает один `Client` (по умолчанию `10`). Конкурентные корутины забирают
каждая своё соединение вплоть до этого лимита; дальнейшие запросившие ждут, пока
одно освободится. См. [Пул соединений](/ru/docs/clickhouse/pool.html).

## Несколько хостов

`'hosts'` перечисляет несколько серверов (у каждой записи может быть свой порт).
Если задано, оно вытесняет `host`/`port` для основного хоста. `'open_strategy'`
решает, какой хост каждое соединение из пула пробует первым:

- `OpenStrategy::InOrder` (по умолчанию) — всегда начинать с первого хоста;
  остальные — чистый failover, пробуются по порядку только когда предыдущий не
  смог подключиться.
- `OpenStrategy::RoundRobin` — чередовать стартовый хост между соединениями,
  чтобы пул распределял свои соединения по хостам (каждое всё равно делает
  failover на остальные).
- `OpenStrategy::Random` — выбирать случайный стартовый хост для каждого
  соединения.

```php
use TrueAsync\ClickHouse\OpenStrategy;

$client = new Client([
    'hosts'         => ['ch-1.internal', 'ch-2.internal:9000', 'ch-3.internal'],
    'open_strategy' => OpenStrategy::RoundRobin,
    'user'          => 'default',
]);
```

Стратегия задаётся на *соединение*, а не на запрос: ClickHouse привязывает
соединение к одному хосту на всё время его жизни, поэтому балансировка происходит
на уровне соединений скрытого пула.

## TLS

```php
$client = new Client([
    'host'       => 'clickhouse.example.com',
    'tls'        => true,     // порт по умолчанию 9440
    'tls_verify' => true,     // false только для самоподписанных тестовых сертификатов
    'user'       => 'default',
    'password'   => 'secret',
]);
```

TLS обеспечивается слоем потоков PHP (`ssl://`); сервер должен слушать защищённый
порт нативного протокола (по соглашению — 9440).
