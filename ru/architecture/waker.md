---
layout: architecture
lang: ru
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /ru/architecture/waker.html
page_title: "Waker — механизм ожидания и пробуждения"
description: "Внутреннее устройство Waker — связующего звена между корутинами и событиями: статусы, resume_when, timeout, доставка ошибок."
---

# Механизм ожидания и пробуждения корутин

Для того чтобы хранить контекст ожидания корутины, 
`TrueAsync` использует структуру `Waker`. 
Она служит связующим звеном между корутиной и событиями, на которые она подписана.
Благодаря `Waker` корутина всегда знает, какие именно события она ждёт.

## Структура Waker

С целью оптимизации работы с памятью, `waker` интегрировать непосредственно в структуру корутины (`zend_coroutine_t`), 
что позволяет избежать дополнительных аллокаций и упростить управление памятью, 
хотя в коде используется указатель `zend_async_waker_t *waker` для обратной совместимости.

`Waker` хранит список ожидаемых событий, а также агрерирует результат ожидания или исключение.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // События, которых ждёт корутина
    HashTable events;

    // События, сработавшие на последней итерации
    HashTable *triggered_events;

    // Результат пробуждения
    zval result;

    // Ошибка (если пробуждение вызвано ошибкой)
    zend_object *error;

    // Точка создания (для отладки)
    zend_string *filename;
    uint32_t lineno;

    // Деструктор
    zend_async_waker_dtor dtor;
};
```

## Статусы Waker

На каждом этапе жизни корутины `Waker` находится в одном из пяти состояний:

![Статусы Waker](/diagrams/ru/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker не активен
    ZEND_ASYNC_WAKER_WAITING,   // Корутина ждёт событий
    ZEND_ASYNC_WAKER_QUEUED,    // Корутина поставлена в очередь на выполнение
    ZEND_ASYNC_WAKER_IGNORED,   // Корутина пропущена
    ZEND_ASYNC_WAKER_RESULT     // Результат доступен
} ZEND_ASYNC_WAKER_STATUS;
```

Корутина начинает с `NO_STATUS` — `Waker` существует, но не активен, корутина выполняется.
Когда корутина вызывает `SUSPEND()`, `Waker` переходит в `WAITING`, теперь он следит за событиями.

Когда одно из событий срабатывает, `Waker` переходит в `QUEUED`: результат сохранён,
корутина стоит в очереди `Scheduler`'а и ждёт переключения контекста.

Статус `IGNORED` необходим для случая, когда корутина уже стоит в очереди, но должна быть уничтожена.
Тогда `Scheduler` не запускает корутину, а немедленно финализирует состояние.

Когда корутина просыпается, `Waker` переходит в состояние `RESULT`.
При этом `waker->error` переходит в `EG(exception)`.
В случае отсутствия ошибок, корутина может использовать `waker->result`. Например, именно `result` возвращает 
функция `await()`.

## Создание Waker

```c
// Получить waker (создать если нет)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Переинициализировать waker для нового ожидания
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// С таймаутом и cancellation
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` деструктурирует существующий waker
и сбрасывает его в начальное состояние. Это позволяет переиспользовать
waker без аллокаций.

## Подписка на события

Модуль zend_async_API.c предоставляет несколько готовых функций, чтобы связать корутину с событием:

```c
zend_async_resume_when(
    coroutine,        // Какую корутину пробуждать
    event,            // На какое событие подписаться
    trans_event,      // Передать ownership события
    callback,         // Callback-функция
    event_callback    // Корутинный callback (или NULL)
);
```

`resume_when` — главная функция подписки.
Она создаёт `zend_coroutine_event_callback_t`, привязывает его
к событию и к waker'у корутины.

В качестве callback-функции вы можете использовать одну из трёх стандартных, 
в зависимости от того, как вы хотите пробуждать корутину:

```c
// Успешный результат
zend_async_waker_callback_resolve(event, callback, result, exception);

// Отмена
zend_async_waker_callback_cancel(event, callback, result, exception);

// Таймаут
zend_async_waker_callback_timeout(event, callback, result, exception);
```
