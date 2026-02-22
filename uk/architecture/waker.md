---
layout: architecture
lang: uk
path_key: "/architecture/waker.html"
nav_active: architecture
permalink: /uk/architecture/waker.html
page_title: "Waker -- механізм очікування та пробудження"
description: "Внутрішня будова Waker -- зв'язок між корутинами та подіями: статуси, resume_when, таймаут, доставка помилок."
---

# Механізм очікування та пробудження корутин

Для зберігання контексту очікування корутини
`TrueAsync` використовує структуру `Waker`.
Вона слугує зв'язком між корутиною та подіями, на які та підписана.
Завдяки `Waker` корутина завжди точно знає, на які події вона чекає.

## Структура Waker

Для оптимізації пам'яті `waker` інтегрований безпосередньо в структуру корутини (`zend_coroutine_t`),
що дозволяє уникнути додаткових алокацій і спрощує управління пам'яттю,
хоча в коді для зворотної сумісності використовується вказівник `zend_async_waker_t *waker`.

`Waker` зберігає список очікуваних подій та агрегує результат очікування або виняток.

```c
struct _zend_async_waker_s {
    ZEND_ASYNC_WAKER_STATUS status;

    // Події, на які чекає корутина
    HashTable events;

    // Події, що спрацювали на останній ітерації
    HashTable *triggered_events;

    // Результат пробудження
    zval result;

    // Помилка (якщо пробудження було викликане помилкою)
    zend_object *error;

    // Точка створення (для відлагодження)
    zend_string *filename;
    uint32_t lineno;

    // Деструктор
    zend_async_waker_dtor dtor;
};
```

## Статуси Waker

На кожному етапі життя корутини `Waker` перебуває в одному з п'яти станів:

![Статуси Waker](/diagrams/uk/architecture-waker/waker-states.svg)

```c
typedef enum {
    ZEND_ASYNC_WAKER_NO_STATUS, // Waker не активний
    ZEND_ASYNC_WAKER_WAITING,   // Корутина чекає на події
    ZEND_ASYNC_WAKER_QUEUED,    // Корутина поставлена в чергу на виконання
    ZEND_ASYNC_WAKER_IGNORED,   // Корутину було пропущено
    ZEND_ASYNC_WAKER_RESULT     // Результат доступний
} ZEND_ASYNC_WAKER_STATUS;
```

Корутина починає з `NO_STATUS` -- `Waker` існує, але не активний; корутина виконується.
Коли корутина викликає `SUSPEND()`, `Waker` переходить у стан `WAITING` і починає моніторити події.

Коли одна з подій спрацьовує, `Waker` переходить у стан `QUEUED`: результат зберігається,
і корутина розміщується в черзі `Scheduler` в очікуванні перемикання контексту.

Статус `IGNORED` потрібен для випадків, коли корутина вже перебуває в черзі, але має бути знищена.
В такому разі `Scheduler` не запускає корутину, а одразу фіналізує її стан.

Коли корутина прокидається, `Waker` переходить у стан `RESULT`.
В цей момент `waker->error` переноситься до `EG(exception)`.
Якщо помилок немає, корутина може використати `waker->result`. Наприклад, `result` -- це те, що
повертає функція `await()`.

## Створення Waker

```c
// Отримати waker (створити, якщо не існує)
zend_async_waker_t *waker = zend_async_waker_define(coroutine);

// Переініціалізувати waker для нового очікування
zend_async_waker_t *waker = zend_async_waker_new(coroutine);

// З таймаутом і скасуванням
zend_async_waker_t *waker = zend_async_waker_new_with_timeout(
    coroutine, timeout_ms, cancellation_event);
```

`zend_async_waker_new()` знищує наявний waker
і скидає його до початкового стану. Це дозволяє повторно використовувати
waker без алокацій.

## Підписка на події

Модуль zend_async_API.c надає декілька готових функцій для прив'язки корутини до події:

```c
zend_async_resume_when(
    coroutine,        // Яку корутину пробуджувати
    event,            // На яку подію підписатися
    trans_event,      // Передати володіння подією
    callback,         // Функція зворотного виклику
    event_callback    // Зворотний виклик корутини (або NULL)
);
```

`resume_when` -- це основна функція підписки.
Вона створює `zend_coroutine_event_callback_t`, прив'язує його
до події та до waker корутини.

Як функцію зворотного виклику можна використати одну з трьох стандартних,
залежно від того, як ви хочете пробудити корутину:

```c
// Успішний результат
zend_async_waker_callback_resolve(event, callback, result, exception);

// Скасування
zend_async_waker_callback_cancel(event, callback, result, exception);

// Таймаут
zend_async_waker_callback_timeout(event, callback, result, exception);
```
