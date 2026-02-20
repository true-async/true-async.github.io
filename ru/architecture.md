---
layout: architecture
lang: ru
path_key: "/architecture.html"
nav_active: architecture
permalink: /ru/architecture.html
page_title: "Архитектура"
description: "Внутреннее устройство компонентов TrueAsync — пул ресурсов, PDO Pool, диаграммы и C API."
---

## Обзор

Раздел архитектуры описывает внутреннее устройство ключевых компонентов TrueAsync
на уровне C-кода: структуры данных, алгоритмы, интеграцию с Zend Engine
и взаимодействие между ядром PHP и async-расширением.

Эти материалы предназначены для разработчиков, которые хотят понять,
как работает TrueAsync «под капотом», или планируют создавать собственные
расширения.

### [Zend Async API (C ABI)](/ru/architecture/zend-async-api.html)

Сердце асинхронного ABI: function pointers, система регистрации расширений,
глобальное состояние (`zend_async_globals_t`), макросы `ZEND_ASYNC_*`
и версионирование API.

### [Корутины, Scheduler и Reactor](/ru/architecture/scheduler-reactor.html)

Внутреннее устройство планировщика корутин и реактора событий:
очереди (circular buffers), context switching через fiber,
микротаски, libuv event loop, fiber context pool и graceful shutdown.

### [События и событийная модель](/ru/architecture/events.html)

`zend_async_event_t` — базовая структура данных, от которой наследуют
все асинхронные примитивы. Callback-система, ref-counting,
event reference, флаги, иерархия типов событий.

### [Waker — механизм ожидания и пробуждения](/ru/architecture/waker.html)

Waker — связующее звено между корутиной и событиями.
Статусы, `resume_when`, корутинные callback'и, доставка ошибок,
структура `zend_coroutine_t` и switch handlers.

### [Сборка мусора в асинхронном контексте](/ru/architecture/async-gc.html)

Как PHP GC работает с корутинами, scope, контекстами: `get_gc` хендлеры,
обход fiber-стеков, zombie-корутины, иерархический контекст
и защита от циклических ссылок.

## Компоненты

### [Async\Pool](/ru/architecture/pool.html)

Универсальный пул ресурсов. Описаны:
- Двухуровневая структура данных (ABI в ядре + internal в расширении)
- Алгоритмы acquire/release с FIFO-очередью ожидающих корутин
- Healthcheck через периодический таймер
- Circuit Breaker с тремя состояниями
- C API для расширений (макросы `ZEND_ASYNC_POOL_*`)

### [PDO Pool](/ru/architecture/pdo-pool.html)

PDO-специфичная надстройка над `Async\Pool`. Описаны:
- Template-соединение и отложенное создание реальных соединений
- Привязка соединений к корутинам через HashTable
- Pinning при активных транзакциях и стейтментах
- Автоматический rollback и cleanup при завершении корутины
- Управление credentials в factory
