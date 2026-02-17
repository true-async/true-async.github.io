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

**TaskGroup** решает эту проблему. Это высокоуровневый паттерн structured concurrency,
который гарантирует: все задачи будут корректно ожидаемы или отменены.
`TaskGroup` предоставляет несколько стратегий ожидания (`all`, `race`, `any`, `awaitCompletion`),
контроль конкурентности, итерацию по результатам и обработку ошибок.

При указании параметра `concurrency` TaskGroup также работает как пул корутин:
задачи, превышающие лимит, ожидают в очереди и не создают корутину до появления свободного слота.
Это позволяет экономить память и контролировать нагрузку при обработке большого числа задач.

## Обзор класса

```php
final class Async\TaskGroup implements Async\Awaitable, Countable, IteratorAggregate {

    /* Методы */
    public __construct(?int $concurrency = null, ?Async\Scope $scope = null)

    /* Добавление задач */
    public spawn(callable $task, mixed ...$args): void
    public spawnWithKey(string|int $key, callable $task, mixed ...$args): void

    /* Ожидание результатов */
    public all(bool $ignoreErrors = false): array
    public race(): mixed
    public any(): mixed
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
| Structured concurrency  | `seal()` + `all()`                  | `async with` блок               | `try-with-resources` + `join()`          | Автоматически через scope |
| Стратегии ожидания      | `all()`, `race()`, `any()`          | Только all (через `async with`) | `ShutdownOnSuccess`, `ShutdownOnFailure` | `async`/`await`, `select` |
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
