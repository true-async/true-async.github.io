---
layout: tutorial
lang: ko
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /ko/tutors-laravel/02-pool-transactions.html
page_title: "커넥션 풀과 트랜잭션"
description: "Eloquent 아래의 PDO Pool과 CoroutineTransactions: 왜 중첩 트랜잭션 카운터를 Connection의 속성에 둘 수 없는가."
---

# 커넥션 풀과 트랜잭션

`Auth`, `session`, `request`: 이 문제들은 이전 장에서 해결했습니다. 컨텍스트와
프록시를 결합하니 프레임워크는 더 이상 요청들을 혼동하지 않게 되었습니다.
데이터베이스는 훨씬 더 간단해 보입니다. 코어 시리즈 9장에서 이미 해결한
문제로, `PDO Pool`이 각 코루틴에 자신만의 커넥션을 건네주고 스스로 회수합니다.
`Eloquent`에서 대체 무엇이 잘못될 수 있을까요?

잘못될 수 있습니다. 풀은 커넥션을 투명하게 관리합니다. 하지만 풀은
`Laravel`이 그 커넥션 바로 옆에 보관하는 또 다른 상태, 즉 트랜잭션 중첩
카운터에 대해서는 전혀 알지 못합니다.

## `transactionLevel()`은 어디에 있는가

`Illuminate\Database\Connection` 내부에는 평범한 인스턴스 속성이 있습니다.

```php
protected $transactions = 0;
```

`beginTransaction()`은 이 값을 증가시키고, `commit()`과 `rollBack()`은
감소시킵니다. 하나의 `Connection`이 하나의 프로세스를 담당하는 한, 이는
완벽하게 말이 됩니다: 속성 하나, 트랜잭션 하나. 하지만 `PDO Pool`은
`Connection`보다 한 단계 아래에서 동작합니다. 물리적 커넥션을 객체 아래에서
교체하는데, `Connection` 객체 자체, 즉 `$this->transactions`가 붙어 있는
그 객체는 여전히 `DatabaseManager` 전체가 공유하는 단 하나의 인스턴스입니다.

이전 장의 시나리오를 데이터베이스와 함께 다시 재현해봅시다.

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // 코루틴이 트랜잭션 한가운데서 잠듭니다
    });

    $response->json(['ok' => true]);
});
```

두 요청이 병행으로 `DB::transaction()`에 진입합니다. 두 물리적 커넥션은
모두 풀이 정직하게 각자에게 건네줍니다. 하지만 둘 다 같은 `Connection`
객체의 같은 `$this->transactions` 값을 참조합니다. 첫 번째 코루틴이
카운터를 `1`로 올린 뒤 잠듭니다. 두 번째 코루틴도 이 값을 올리지만
이번엔 `2`가 되는데, 사실 이 코루틴에게는 레벨 `1`의 외부 트랜잭션이어야
했던 것입니다. 첫 번째 코루틴의 `commit()`은 잘못된 중첩 레벨을 기준으로
계산되어, Laravel이 있어서는 안 될 곳에서 조용히 `SAVEPOINT`를 발행하거나,
이웃 코루틴이 아직 열어 두고 있는 트랜잭션을 너무 일찍 커밋해버립니다.

## 같은 처방, 다른 범위: 코루틴이지 요청 트리가 아니다

이전 장에서 `auth` 상태는 스코프 컨텍스트에 두었습니다. 한 요청의 모든
코루틴이 그 상태를 공유하기 때문입니다. 트랜잭션 카운터는 구조가 다릅니다.
`PDO Pool`은 요청 전체가 아니라 *코루틴* 하나마다 물리적 커넥션을 하나씩
건네줍니다(핸들러 안의 병렬 `TaskGroup`은 풀로부터 별개의 커넥션 두 개를
받습니다). 따라서 카운터는 스코프 컨텍스트가 아니라 코루틴 컨텍스트에
있어야 합니다.

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack()과 에러 핸들러들도
    // 같은 방식으로 오버라이드됩니다: $this->transactions를 직접 읽고 쓰는
    // 대신 setTransactionLevel()/transactionLevel()을 거칩니다.
}
```

`coroutine_context()`와 `current_context()`의 구분, 이것이 바로 코어
시리즈의 `Context` 장에서 다뤘던 경계입니다. 전자는 단일 코루틴에만
속하고, 후자는 요청의 전체 코루틴 트리가 공유합니다. 여기서의 선택은
스타일의 문제가 아니라 필수입니다. 둘을 혼동하면 한 요청 안의 두 병렬
데이터베이스 왕복이 다시 서로의 트랜잭션 카운터를 공유하게 되며, 구멍이
그저 한 층 위로 옮겨갈 뿐입니다.

이 트레이트는 `Connection`을 통째로 다시 작성하지 않습니다. `$this->transactions`를
건드리는 메서드들만 정밀하게 가로채며, 특정 커넥션 클래스에 부착됩니다.

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

`DBMS`마다 별도의 클래스가 있습니다. `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`, `AsyncSqliteConnection`,
`AsyncSqlServerConnection`. Laravel의 부모 클래스들이 이미 서로 다르기
때문이며, 카운터를 격리하는 트레이트 자체는 이들 모두에게 동일합니다.

## 왜 `DatabaseManager` 전체를 스코프로 감쌀 수 없는가

유혹은 분명 있습니다. 이미 서비스를 컨텍스트 뒤에 숨기는 방법
(이전 장의 `ScopedServiceProxy`)을 알고 있는데, 왜 `db`에는 같은 방식을
쓰지 않을까요? 그렇게 하지 않는 이유는 꽤 불쾌합니다.
`DatabaseServiceProvider::boot()`는 시작 시 이렇게 한 번 기록합니다.

```php
Model::setConnectionResolver($app['db']);
```

이것은 `Model` 클래스 자체의 static 속성이며, 모든 모델과 모든 요청이
공유합니다. 만약 `db`가 스코프마다 다르게 리졸브된다면, 이 static 참조는
가장 먼저 그것을 생성한 요청의 `DatabaseManager`를 계속 가리키게 됩니다.
그 요청의 스코프가 끝나고 정리되면, `Model::$resolver`가 가리키던 객체는
가비지 컬렉션되고, static 속성은 죽은 메모리를 가리킨 채 남게 됩니다.
결과는 "잘못된 데이터"가 아니라 프로세스 전체의 크래시입니다.

그래서 `db`는 원래처럼 싱글턴으로 유지됩니다. 물리적 커넥션 격리는
`C` 레벨에서 `PDO Pool`의 몫이지 의존성 컨테이너의 몫이 아닙니다.
트랜잭션 카운터 격리는 단일 코루틴 수준에서 트레이트의 몫입니다.
서버를 추가로 다운시킬 수 있는 하나의 큰 리팩터링 대신, 좁고 정밀한
두 개의 도구를 사용하는 것입니다.

이제 요청 상태와 트랜잭션 상태를 다뤘습니다. Laravel은 평범한 HTTP
응답을 통째로 버퍼링해서 스스로 처리합니다. 하지만 만약 응답이 일회성이
아니라 스트림이라면 어떨까요: 브라우저로 보내는 진행률 표시줄, 혹은
gRPC를 통한 이웃 서비스의 호출이라면? 그것이 다음 장에서 다룰 내용입니다.
