---
layout: architecture
lang: ko
path_key: "/architecture/async-gc.html"
nav_active: architecture
permalink: /ko/architecture/async-gc.html
page_title: "비동기 컨텍스트에서의 가비지 컬렉션"
description: "PHP GC가 코루틴, 스코프, 컨텍스트와 함께 동작하는 방식 -- get_gc 핸들러, 좀비 코루틴, 순환 참조."
---

# 비동기 컨텍스트에서의 가비지 컬렉션

`PHP`에서 가비지 컬렉터는 일반적으로 동기적으로 동작합니다. 가능한 루트 버퍼가 가득 차면
현재 컨텍스트에서 `gc_collect_cycles()`가 호출됩니다. `GC`는 순환 참조를 계산하고
삭제 대상으로 표시된 객체에 대해 루프에서 객체 소멸자를 호출합니다.

동시성 환경에서는 이 모델이 무너집니다. 객체의 소멸자가 `await`를 호출할 수 있습니다 --
예를 들어, 데이터베이스 연결을 올바르게 닫기 위해서입니다. `GC`가 코루틴 내부에서 실행 중일 때
`await`는 해당 코루틴을 일시 중단시키고, `GC`를 불완전한 상태로 남깁니다.
다른 코루틴들은 부분적으로 수집된 객체를 보게 됩니다.

이러한 이유로 `TrueAsync`는 가비지 컬렉션 로직을 수정해야 했습니다.

## GC 코루틴

`gc_possible_root` 버퍼가 가득 차고 임계값이 트리거되면, `zend_gc_collect_cycles()`는
별도의 코루틴에서 자체적으로 실행됩니다.

```c
ZEND_API int zend_gc_collect_cycles(void)
{
    if (UNEXPECTED(ZEND_ASYNC_IS_ACTIVE
        && ZEND_ASYNC_CURRENT_COROUTINE != GC_G(gc_coroutine))) {

        if (GC_G(gc_coroutine)) {
            return 0;  // GC가 이미 다른 코루틴에서 실행 중
        }

        start_gc_in_coroutine();
        return 0;
    }

    // ... 실제 가비지 컬렉션
}
```

`GC`를 트리거한 코루틴은 차단되지 않고 작업을 계속하며,
가비지 컬렉션은 다음 `Scheduler` 틱에서 수행됩니다.

`GC` 코루틴은 자체적인 최상위 `Scope`(`parent = NULL`)를 갖습니다.
이는 가비지 컬렉션을 사용자 코드로부터 격리합니다: 사용자 `Scope`를 취소해도
`GC`에는 영향을 미치지 않습니다.

## 코루틴에서의 소멸자

주요 문제는 소멸자 호출 시 발생합니다. 소멸자가 예기치 않게
코루틴을 일시 중단시킬 수 있기 때문입니다. 따라서 `GC`는 마이크로태스크 기반의 동시 반복자 알고리즘을 사용합니다.
반복을 시작하기 위해 `GC`는 별도의 반복자 코루틴을 생성합니다.
이는 순차적 실행의 환상을 만들어 `GC`를 상당히 단순화합니다.

```c
static bool gc_call_destructors_in_coroutine(void)
{
    GC_G(dtor_idx) = GC_FIRST_ROOT;
    GC_G(dtor_end) = GC_G(first_unused);

    // 소멸자를 위한 자식 코루틴 생성
    zend_coroutine_t *coroutine = gc_spawn_destructors_coroutine();

    // GC 코루틴이 dtor_scope에서 일시 중단
    zend_async_resume_when(GC_G(gc_coroutine), &scope->event, ...);
    ZEND_ASYNC_SUSPEND();   // 소멸자가 실행되는 동안 GC는 대기

    return true;
}
```

소멸자는 Scope 메커니즘을 사용하여 코루틴의 수명을 제어할 뿐만 아니라
완료를 기다리기도 합니다. 이를 위해 모든 소멸자 코루틴을
캡슐화하는 또 다른 자식 `Scope`가 생성됩니다:

```
gc_scope                          <- 최상위 `GC`
  \-- GC 코루틴                    <- 마킹 + 조정
       \-- dtor_scope             <- 자식 스코프
            \-- dtor-coroutine[0] <- 소멸자 호출 (HI_PRIORITY)
```


`GC` 코루틴은 `dtor_scope`의 완료 이벤트를 구독합니다. `dtor_scope` 내의
**모든** 소멸자가 완료된 경우에만 깨어납니다.


![별도 코루틴에서의 가비지 컬렉션](/diagrams/ko/architecture-async-gc/gc-coroutine.svg)

## 소멸자가 await를 호출하면?

여기서는 마이크로태스크 기반의 고전적인 동시 반복자 알고리즘이 사용됩니다:
* 컨텍스트 전환이 발생하면 실행될 마이크로태스크가 등록됩니다
* 전환이 발생하면, 마이크로태스크가 반복을 위한 또 다른 코루틴을 생성합니다

반복자는 여전히 같은 코루틴에 있는지 확인합니다:

```c
static zend_result gc_call_destructors(uint32_t idx, uint32_t end, ...)
{
    zend_coroutine_t *coroutine = ZEND_ASYNC_CURRENT_COROUTINE;

    while (idx != end) {
        obj->handlers->dtor_obj(obj);   // 소멸자 호출

        // 코루틴이 변경되었으면 -- 소멸자가 await를 호출한 것
        if (coroutine != NULL && coroutine != *current_coroutine_ptr) {
            return FAILURE;   // 순회 중단
        }
        idx++;
    }
    return SUCCESS;
}
```

`ZEND_ASYNC_CURRENT_COROUTINE`가 변경되었다면, 소멸자가 `await`를 호출하여
현재 코루틴이 대기 상태에 들어갔다는 것을 의미합니다. 이 경우 반복자는 단순히 종료되고, 다음 반복 단계는
새로운 코루틴에서 시작됩니다.
