---
layout: architecture
lang: uk
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /uk/architecture/fibers.html
page_title: "Файбери в TrueAsync"
description: "Як TrueAsync змінює поведінку Fiber — корутинний режим, GC, refcount, параметри, exit/bailout, деструктори."
---

# Файбери в TrueAsync

У стандартному `PHP` файбер (`Fiber`) — це кооперативний потік із власним стеком викликів.
При підключенні розширення `TrueAsync` файбер переходить у **корутинний режим**:
замість прямого перемикання стеків файбер отримує власну корутину,
якою керує планувальник (`Scheduler`).

Ця стаття описує ключові зміни в поведінці файберів при роботі з `TrueAsync`.

## Корутинний режим файбера

При створенні `new Fiber(callable)`, якщо `TrueAsync` активний, замість ініціалізації
контексту перемикання стеків створюється корутина:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

Виклик `$fiber->start()` не перемикає стек безпосередньо, а ставить корутину в чергу
планувальника через `ZEND_ASYNC_ENQUEUE_COROUTINE`, після чого викликаючий код
призупиняється в `zend_fiber_await()` до завершення або призупинення файбера.

## Життєвий цикл refcount корутини

Файбер явно утримує свою корутину через `ZEND_ASYNC_EVENT_ADD_REF`:

```
Після конструктора:   coroutine refcount = 1 (планувальник)
Після start():        coroutine refcount = 2 (планувальник + файбер)
```

Додатковий `+1` від файбера необхідний, щоб корутина залишалася живою
після завершення, інакше `getReturn()`, `isTerminated()` та інші методи
не зможуть звернутися до результату.

Звільнення `+1` відбувається в деструкторі файбера (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Параметри Fiber::start() — копіювання в heap

Макрос `Z_PARAM_VARIADIC_WITH_NAMED` при розборі аргументів `Fiber::start()`
встановлює `fcall->fci.params` як вказівник прямо в стек VM-фрейму.
У стандартному PHP це безпечно — `zend_fiber_execute` викликається негайно
через перемикання стека, і фрейм `Fiber::start()` ще живий.

У корутинному режимі `fcall->fci.params` може стати
висячим вказівником, якщо очікувана корутина зруйнується першою.
Дати гарантію, що таке ніколи не станеться, неможливо.

Тому після розбору параметрів копіюємо їх у heap-пам'ять:

```c
if (fiber->coroutine != NULL && fiber->fcall != NULL) {
    if (fiber->fcall->fci.param_count > 0) {
        uint32_t count = fiber->fcall->fci.param_count;
        zval *heap_params = emalloc(sizeof(zval) * count);
        for (uint32_t i = 0; i < count; i++) {
            ZVAL_COPY(&heap_params[i], &fiber->fcall->fci.params[i]);
        }
        fiber->fcall->fci.params = heap_params;
    }
    if (fiber->fcall->fci.named_params) {
        GC_ADDREF(fiber->fcall->fci.named_params);
    }
}
```

Тепер `coroutine_entry_point`
може безпечно використовувати та звільняти параметри.

## GC для корутинних файберів

Замість додавання об'єкта корутини в GC буфер, `zend_fiber_object_gc`
безпосередньо обходить стек виконання корутини та передає знайдені змінні:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Обхід стека — як для звичайного файбера
        for (; ex; ex = ex->prev_execute_data) {
            // ... додаємо CV в GC буфер ...
        }
    }
}
```

Це працює лише для стану `YIELD` (файбер призупинений через `Fiber::suspend()`).
Для інших станів (running, awaiting child) стек активний і обходити його не можна.

## Деструктори з GC

У стандартному PHP деструктори об'єктів, знайдених `GC`, викликаються синхронно
в тому ж контексті. У `TrueAsync` GC запускається в окремій GC-корутині
(див. [Збирання сміття в асинхронному контексті](async-gc.html)).

Це означає:

1. **Порядок виконання** — деструктори виконуються асинхронно, після повернення
   з `gc_collect_cycles()`.

2. **`Fiber::suspend()` в деструкторі** — неможливий. Деструктор виконується
   в GC-корутині, а не у файбері. Виклик `Fiber::suspend()` призведе до помилки
   «Cannot suspend outside of a fiber».

3. **`Fiber::getCurrent()` в деструкторі** — поверне `NULL`, оскільки деструктор
   виконується поза контекстом файбера.

З цієї причини тести, розраховані на синхронне виконання деструкторів
із GC всередині файбера, позначені як `skip` для `TrueAsync`.

## Генератори при shutdown

У стандартному PHP при знищенні файбера генератор маркується прапорцем
`ZEND_GENERATOR_FORCED_CLOSE`. Це забороняє `yield from` у finally-блоках —
генератор вмирає і не повинен створювати нові залежності.

У `TrueAsync` корутина отримує graceful cancellation, а не примусове
закриття. Генератор не маркується як `FORCED_CLOSE`, і `yield from`
у finally-блоках може виконатися. Це відома відмінність у поведінці.

Поки незрозуміло, чи варто це змінювати чи ні.
