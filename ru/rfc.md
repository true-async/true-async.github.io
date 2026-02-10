---
layout: page
lang: ru
path_key: "/rfc.html"
nav_active: rfc
permalink: /ru/rfc.html
page_title: "RFC"
description: "Официальные предложения по добавлению асинхронности в ядро PHP"
---

## PHP RFC: True Async

Проект TrueAsync продвигается через официальный процесс RFC на wiki.php.net.
На данный момент опубликованы два RFC, которые описывают базовую модель конкурентности
и структурную конкурентность.

<div class="rfc-card">

### RFC #1 — PHP True Async

<div class="rfc-meta">
<span>Автор: Edmond [HT]</span>
<span>Версия: 1.7</span>
<span>Целевая версия: PHP 8.6+</span>
<span class="rfc-badge discussion">Under Discussion</span>
</div>

Основной RFC, определяющий модель конкурентности для PHP.
Описывает корутины, функции `spawn()` / `await()` / `suspend()`,
объект `Coroutine`, интерфейсы `Awaitable` и `Completable`,
механизм кооперативной отмены, интеграцию с `Fiber`,
обработку ошибок и graceful shutdown.

**Ключевые принципы:**

- Минимум изменений в существующем коде для включения конкурентности
- Корутины сохраняют иллюзию последовательного выполнения
- Автоматическое переключение корутин при I/O операциях
- Кооперативная отмена — «cancellable by design»
- Стандартный C API для расширений

[Читать RFC на wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async){:target="_blank"}

</div>

<div class="rfc-card">

### RFC #2 — Scope и структурная конкурентность

<div class="rfc-meta">
<span>Автор: Edmond [HT]</span>
<span>Версия: 1.0</span>
<span class="rfc-badge draft">Draft</span>
</div>

Расширение базового RFC. Вводит класс `Scope`, привязывающий
время жизни корутин к лексической области видимости.
Описывает иерархию scope'ов, распространение ошибок,
политику «зомби»-корутин и критические секции через `protect()`.

**Что решает:**

- Предотвращение утечки корутин за пределы scope
- Автоматическая очистка ресурсов при выходе из scope
- Иерархическая отмена: отмена родителя → отмена всех дочерних
- Защита критических секций от отмены
- Обнаружение дедлоков и self-await

[Читать RFC на wiki.php.net &rarr;](https://wiki.php.net/rfc/true_async_scope){:target="_blank"}

</div>

## Как связаны эти RFC

Первый RFC определяет **низкоуровневые примитивы** — корутины,
базовые функции и C API для расширений. Второй RFC добавляет
**структурную конкурентность** — механизмы управления группами корутин,
которые делают конкурентный код безопасным и предсказуемым.

Вместе они формируют полную модель асинхронного программирования для PHP:

| | RFC #1: True Async | RFC #2: Scope |
|---|---|---|
| **Уровень** | Примитивы | Управление |
| **Что даёт** | `spawn()`, `await()`, `Coroutine` | `Scope`, `TaskGroup`, `protect()` |
| **Аналогии** | Go goroutines, Kotlin coroutines | Kotlin CoroutineScope, Python TaskGroup |
| **Цель** | Запуск конкурентного кода | Безопасное управление жизненным циклом |

## Участие в обсуждении

RFC обсуждаются в рассылке [internals@lists.php.net](mailto:internals@lists.php.net)
и на [GitHub Discussions](https://github.com/true-async/true-async/discussions){:target="_blank"}.

Также присоединяйтесь к обсуждению в [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}.
