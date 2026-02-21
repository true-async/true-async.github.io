---
layout: architecture
lang: ru
path_key: "/architecture/pool.html"
nav_active: architecture
permalink: /ru/architecture/pool.html
page_title: "Архитектура Async\\Pool"
description: "Внутреннее устройство универсального пула ресурсов Async\\Pool — структуры данных, алгоритмы acquire/release, healthcheck, circuit breaker."
---

# Архитектура Async\Pool

> Эта статья описывает внутреннее устройство универсального пула ресурсов.
> Если вы ищете руководство по использованию, см. [Async\Pool](/ru/docs/components/pool.html).
> Для PDO-специфичной надстройки см. [Архитектура PDO Pool](/ru/architecture/pdo-pool.html).

## Структура данных

Пул реализован в двух слоях: публичная ABI-структура в ядре PHP
и расширенная внутренняя структура в async-расширении.

![Структуры данных пула](/diagrams/ru/architecture-pool/data-structures.svg)

## Два пути создания

Пул может быть создан из PHP-кода (через конструктор `Async\Pool`)
или из C-расширения (через internal API).

| Путь  | Функция                             | Callbacks                      | Используется           |
|-------|-------------------------------------|--------------------------------|------------------------|
| PHP   | `zend_async_pool_create()`          | `zend_fcall_t*` (PHP callable) | Пользовательский код   |
| C API | `zend_async_pool_create_internal()` | function pointers              | PDO, другие расширения |

Разница — в `handler_flags`. Когда флаг установлен, пул вызывает C-функцию напрямую,
минуя оверхед вызова PHP callable через `zend_call_function()`.

## Acquire: получение ресурса

![acquire() — внутренний алгоритм](/diagrams/ru/architecture-pool/acquire.svg)

### Ожидание ресурса

Когда все ресурсы заняты и достигнут `max_size`, корутина приостанавливается
через `ZEND_ASYNC_SUSPEND()`. Механизм ожидания аналогичен каналам:

1. Создаётся структура `zend_async_pool_waiter_t`
2. Waiter добавляется в FIFO-очередь `waiters`
3. Регистрируется callback для пробуждения
4. Если задан timeout — регистрируется таймер
5. `ZEND_ASYNC_SUSPEND()` — корутина отдаёт управление

Пробуждение происходит, когда другая корутина вызывает `release()`.

## Release: возврат ресурса

![release() — внутренний алгоритм](/diagrams/ru/architecture-pool/release.svg)

## Healthcheck: фоновая проверка

Если `healthcheckInterval > 0`, при создании пула запускается периодический таймер.
Таймер интегрирован с реактором через `ZEND_ASYNC_NEW_TIMER_EVENT`.

![Healthcheck — периодическая проверка](/diagrams/ru/architecture-pool/healthcheck.svg)

Healthcheck проверяет **только** свободные ресурсы. Занятые ресурсы не затрагиваются.
Если после удаления мёртвых ресурсов общее количество упало ниже `min`, пул создаёт замены.

## Circular Buffer

Свободные ресурсы хранятся в circular buffer — кольцевом буфере фиксированной ёмкости.
Начальная ёмкость — 8 элементов, расширяется при необходимости.

Операции `push` и `pop` работают за O(1). Буфер использует два указателя (`head` и `tail`),
что позволяет эффективно добавлять и извлекать ресурсы без перемещения элементов.

## Интеграция с событийной системой

Пул наследует от `zend_async_event_t` и реализует полный набор event handlers:

| Handler        | Назначение                                                 |
|----------------|------------------------------------------------------------|
| `add_callback` | Регистрация callback (для waiter-ов)                       |
| `del_callback` | Удаление callback                                          |
| `start`        | Запуск события (NOP)                                       |
| `stop`         | Остановка события (NOP)                                    |
| `dispose`      | Полная очистка: освобождение памяти, уничтожение callbacks |

Это позволяет:
- Приостанавливать и возобновлять корутины через event callbacks
- Интегрировать healthcheck-таймер с реактором
- Корректно освобождать ресурсы через event disposal

## Garbage Collection

PHP-обёртка пула (`async_pool_obj_t`) реализует кастомный `get_gc`,
который регистрирует все ресурсы из idle buffer как GC-корни.
Это предотвращает преждевременную сборку мусора для свободных ресурсов,
которые не имеют явных ссылок из PHP-кода.

## Circuit Breaker

Пул реализует интерфейс `CircuitBreaker` с тремя состояниями:

![Состояния Circuit Breaker](/diagrams/ru/architecture-pool/circuit-breaker.svg)

Переходы могут быть ручными или автоматическими через `CircuitBreakerStrategy`:
- `reportSuccess()` вызывается при успешном `release` (ресурс прошёл `beforeRelease`)
- `reportFailure()` вызывается когда `beforeRelease` вернул `false`
- Стратегия решает, когда переключить состояние

## Close: закрытие пула

При закрытии пула:

1. Событие пула отмечается как CLOSED
2. Healthcheck-таймер останавливается
3. Все ожидающие корутины пробуждаются с `PoolException`
4. Все свободные ресурсы уничтожаются через `destructor`
5. Занятые ресурсы продолжают жить — будут уничтожены при `release`

## C API для расширений

Расширения (PDO, Redis и др.) используют пул через макросы:

| Макрос                                           | Функция                      |
|--------------------------------------------------|------------------------------|
| `ZEND_ASYNC_NEW_POOL(...)`                       | Создать пул с C callbacks    |
| `ZEND_ASYNC_NEW_POOL_OBJ(pool)`                  | Создать PHP-обёртку для пула |
| `ZEND_ASYNC_POOL_ACQUIRE(pool, result, timeout)` | Получить ресурс              |
| `ZEND_ASYNC_POOL_RELEASE(pool, resource)`        | Вернуть ресурс               |
| `ZEND_ASYNC_POOL_CLOSE(pool)`                    | Закрыть пул                  |

Все макросы вызывают function pointers, зарегистрированные async-расширением при загрузке.
Это обеспечивает изоляцию: ядро PHP не зависит от конкретной реализации пула.

## Sequence: полный цикл acquire-release

![Полный цикл acquire → use → release](/diagrams/ru/architecture-pool/full-cycle.svg)

## Дальше что?

- [Async\Pool: руководство](/ru/docs/components/pool.html) — как использовать пул
- [Архитектура PDO Pool](/ru/architecture/pdo-pool.html) — PDO-специфичная надстройка
- [Корутины](/ru/docs/components/coroutines.html) — как работают корутины
