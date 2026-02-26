---
layout: architecture
lang: ru
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /ru/architecture/fibers.html
page_title: "Файберы в TrueAsync"
description: "Как TrueAsync меняет поведение Fiber — корутинный режим, GC, refcount, параметры, exit/bailout, деструкторы."
---

# Файберы в TrueAsync

В стандартном `PHP` файбер (`Fiber`) — это кооперативный поток с собственным стеком вызовов.
При подключении расширения `TrueAsync` файбер переключается в **корутинный режим**:
вместо прямого переключения стеков, файбер получает собственную корутину,
которой управляет планировщик (`Scheduler`).

Эта статья описывает ключевые изменения в поведении файберов при работе с `TrueAsync`.

## Корутинный режим файбера

При создании `new Fiber(callable)`, если `TrueAsync` активен, вместо инициализации
контекста переключения стеков создаётся корутина:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

Вызов `$fiber->start()` не переключает стек напрямую, а ставит корутину в очередь
планировщика через `ZEND_ASYNC_ENQUEUE_COROUTINE`, после чего вызывающий код
приостанавливается в `zend_fiber_await()` до завершения или приостановки файбера.

## Жизненный цикл refcount корутины

Файбер явно удерживает свою корутину через `ZEND_ASYNC_EVENT_ADD_REF`:

```
После конструктора:   coroutine refcount = 1 (планировщик)
После start():        coroutine refcount = 2 (планировщик + файбер)
```

Дополнительный `+1` от файбера необходим, чтобы корутина оставалась живой
после завершения, иначе `getReturn()`, `isTerminated()` и другие методы
не смогут обратиться к результату.

Освобождение `+1` происходит в деструкторе файбера (`zend_fiber_object_destroy`):

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Параметры Fiber::start() — копирование в heap

Макрос `Z_PARAM_VARIADIC_WITH_NAMED` при разборе аргументов `Fiber::start()`
устанавливает `fcall->fci.params` как указатель прямо в стек VM-фрейма.
В стандартном PHP это безопасно — `zend_fiber_execute` вызывается немедленно
через переключение стека, и фрейм `Fiber::start()` ещё жив.

В корутинном режиме `fcall->fci.params` может стать
висячим указателем, если ожидаемая корутина разрушится первой. 
Дать гарантию, что такое никогда не произойдёт, невозможно.

Поэтому после разбора параметров копируем их в heap-память:

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

Теперь `coroutine_entry_point`
может безопасно использовать и освобождать параметры.

## GC для корутинных файберов

Вместо добавления объекта корутины в GC буфер, `zend_fiber_object_gc`
напрямую обходит стек выполнения корутины и передаёт найденные переменные:

```c
if (fiber->coroutine != NULL) {
    zend_execute_data *ex = ZEND_ASYNC_COROUTINE_GET_EXECUTE_DATA(fiber->coroutine);
    if (ex != NULL && ZEND_COROUTINE_IS_YIELD(fiber->coroutine)) {
        // Обход стека — как для обычного файбера
        for (; ex; ex = ex->prev_execute_data) {
            // ... добавляем CV в GC буфер ...
        }
    }
}
```

Это работает только для состояния `YIELD` (файбер приостановлен через `Fiber::suspend()`).
Для других состояний (running, awaiting child) стек активен и обходить его нельзя.

## Деструкторы из GC

В стандартном PHP деструкторы объектов, найденных `GC`, вызываются синхронно
в том же контексте. В `TrueAsync` GC запускается в отдельной GC-корутине
(см. [Сборка мусора в асинхронном контексте](async-gc.html)).

Это означает:

1. **Порядок выполнения** — деструкторы выполняются асинхронно, после возврата
   из `gc_collect_cycles()`.

2. **`Fiber::suspend()` в деструкторе** — невозможен. Деструктор выполняется
   в GC-корутине, а не в файбере. Вызов `Fiber::suspend()` приведёт к ошибке
   «Cannot suspend outside of a fiber».

3. **`Fiber::getCurrent()` в деструкторе** — вернёт `NULL`, так как деструктор
   выполняется вне контекста файбера.

По этой причине тесты, рассчитанные на синхронное выполнение деструкторов
из GC внутри файбера, помечены как `skip` для `TrueAsync`.

## Генераторы при shutdown

В стандартном PHP при уничтожении файбера генератор маркируется флагом
`ZEND_GENERATOR_FORCED_CLOSE`. Это запрещает `yield from` в finally-блоках —
генератор умирает и не должен создавать новые зависимости.

В `TrueAsync` корутина получает graceful cancellation, а не принудительное
закрытие. Генератор не маркируется как `FORCED_CLOSE`, и `yield from`
в finally-блоках может выполниться. Это известное отличие в поведении.

Пока неясно, стоит ли менять это или нет.
