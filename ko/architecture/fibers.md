---
layout: architecture
lang: ko
path_key: "/architecture/fibers.html"
nav_active: architecture
permalink: /ko/architecture/fibers.html
page_title: "TrueAsync의 파이버"
description: "TrueAsync가 Fiber의 동작을 어떻게 변경하는지 — 코루틴 모드, GC, refcount, 매개변수, exit/bailout, 소멸자."
---

# TrueAsync의 파이버

표준 `PHP`에서 파이버(`Fiber`)는 자체 호출 스택을 가진 협력적 스레드입니다.
`TrueAsync` 확장이 활성화되면 파이버는 **코루틴 모드**로 전환됩니다.
스택을 직접 전환하는 대신, 파이버는 자체 코루틴을 할당받으며
이를 스케줄러(`Scheduler`)가 관리합니다.

이 문서에서는 `TrueAsync` 환경에서 파이버 동작의 주요 변경 사항을 설명합니다.

## 파이버의 코루틴 모드

`new Fiber(callable)`을 생성할 때 `TrueAsync`가 활성화되어 있으면,
스택 전환 컨텍스트를 초기화하는 대신 코루틴이 생성됩니다:

```c
fiber->coroutine = ZEND_ASYNC_NEW_COROUTINE(...);
ZEND_COROUTINE_SET_FIBER(fiber->coroutine);
fiber->coroutine->extended_data = fiber;
fiber->coroutine->internal_entry = coroutine_entry_point;
```

`$fiber->start()` 호출은 스택을 직접 전환하지 않고,
`ZEND_ASYNC_ENQUEUE_COROUTINE`을 통해 코루틴을 스케줄러 큐에 등록합니다.
이후 호출 코드는 `zend_fiber_await()`에서 파이버가 완료되거나 일시 중단될 때까지 대기합니다.

## 코루틴의 refcount 생명주기

파이버는 `ZEND_ASYNC_EVENT_ADD_REF`를 통해 자신의 코루틴을 명시적으로 유지합니다:

```
생성자 이후:   coroutine refcount = 1 (스케줄러)
start() 이후:  coroutine refcount = 2 (스케줄러 + 파이버)
```

파이버의 추가 `+1`은 코루틴이 완료 후에도 살아 있도록 하기 위해 필요합니다.
그렇지 않으면 `getReturn()`, `isTerminated()` 등의 메서드가 결과에 접근할 수 없게 됩니다.

`+1`의 해제는 파이버 소멸자(`zend_fiber_object_destroy`)에서 이루어집니다:

```c
if (ZEND_COROUTINE_IS_FINISHED(coroutine) || !ZEND_COROUTINE_IS_STARTED(coroutine)) {
    ZEND_ASYNC_EVENT_RELEASE(&coroutine->event);
}
```

## Fiber::start() 매개변수 — 힙으로 복사

`Z_PARAM_VARIADIC_WITH_NAMED` 매크로는 `Fiber::start()`의 인수를 파싱할 때
`fcall->fci.params`를 VM 프레임 스택의 포인터로 직접 설정합니다.
표준 PHP에서는 이것이 안전합니다. `zend_fiber_execute`가 스택 전환을 통해
즉시 호출되며, `Fiber::start()` 프레임이 아직 살아 있기 때문입니다.

코루틴 모드에서는 대기 중인 코루틴이 먼저 소멸되면
`fcall->fci.params`가 댕글링 포인터가 될 수 있습니다.
이러한 상황이 절대 발생하지 않는다고 보장하는 것은 불가능합니다.

따라서 매개변수 파싱 후 힙 메모리로 복사합니다:

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

이제 `coroutine_entry_point`에서
매개변수를 안전하게 사용하고 해제할 수 있습니다.

## 코루틴 파이버의 GC

코루틴 객체를 GC 버퍼에 추가하는 대신, `zend_fiber_object_gc`는
코루틴의 실행 스택을 직접 순회하며 발견된 변수를 전달합니다:

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

이는 `YIELD` 상태(파이버가 `Fiber::suspend()`를 통해 일시 중단된 경우)에서만 동작합니다.
다른 상태(running, awaiting child)에서는 스택이 활성 상태이므로 순회할 수 없습니다.

## GC에서의 소멸자

표준 PHP에서 `GC`가 발견한 객체의 소멸자는 동일한 컨텍스트에서 동기적으로 호출됩니다.
`TrueAsync`에서는 GC가 별도의 GC 코루틴에서 실행됩니다
([비동기 컨텍스트에서의 가비지 컬렉션](async-gc.html) 참조).

이는 다음을 의미합니다:

1. **실행 순서** — 소멸자는 `gc_collect_cycles()` 반환 이후 비동기적으로 실행됩니다.

2. **소멸자에서의 `Fiber::suspend()`** — 불가능합니다. 소멸자는 파이버가 아닌
   GC 코루틴에서 실행됩니다. `Fiber::suspend()` 호출 시
   "Cannot suspend outside of a fiber" 오류가 발생합니다.

3. **소멸자에서의 `Fiber::getCurrent()`** — 소멸자가 파이버 컨텍스트 외부에서
   실행되므로 `NULL`을 반환합니다.

이러한 이유로 GC에 의한 소멸자가 파이버 내부에서 동기적으로 실행되는 것을 전제로 한
테스트는 `TrueAsync`에서 `skip`으로 표시됩니다.

## 종료 시 제너레이터

표준 PHP에서 파이버가 소멸될 때 제너레이터에는
`ZEND_GENERATOR_FORCED_CLOSE` 플래그가 설정됩니다. 이는 finally 블록에서의
`yield from`을 금지합니다. 제너레이터가 종료되며 새로운 의존성을 생성해서는 안 되기 때문입니다.

`TrueAsync`에서는 코루틴이 강제 종료가 아닌 graceful cancellation을 받습니다.
제너레이터에 `FORCED_CLOSE` 플래그가 설정되지 않으며,
finally 블록에서의 `yield from`이 실행될 수 있습니다. 이는 알려진 동작 차이입니다.

이 동작을 변경해야 하는지 여부는 아직 결정되지 않았습니다.
