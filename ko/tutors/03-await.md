---
layout: tutorial
lang: ko
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /ko/tutors/03-await.html
page_title: "Await"
description: "await()가 왜 필요하며 코루틴과 함께 어떻게 동작하는지."
---

# Await

전형적인 분산 백엔드 시스템을 상상해 보세요. `JWT` 인가로 서로 연결된 열 개 남짓의 서비스가 있습니다. 사용자가 `UserDirectory`를 통해 로그인하고 `ProfileService`로 이동하여 프로필의 일부 업무 데이터, 예를 들어 집 주소나 배송 주소를 변경합니다. API의 임무는 그 데이터를 업데이트하는 것입니다.

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

작업이 위험하다고 판단되면 `UserDirectory`를 통해 JWT 토큰을 추가로 검증해야 할 수도 있습니다.

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}

if (profileExists($userId) && validateToken($token)) {
    updateProfile($userId, $changes);
}
```

`validateToken`과 `profileExists` 함수는 I/O를 수행하며 시간이 걸리는데, 특히 `validateToken`이 그렇습니다.
전체 대기 시간을 줄이기 위해 `validateToken`을 코루틴에서 실행하는 것이 합리적입니다.

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

그러나 이 코드는 동작하지 않습니다. `spawn`은 결과를 즉시 반환할 수 없기 때문입니다. 코루틴을 기다릴 수 있는 어떤 방법이 필요합니다. 바로 그것이 `await` 함수가 하는 일입니다.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

`await` 함수는 코루틴이 끝날 때까지 실행 흐름을 멈추므로, 서로 다른 코루틴을 서로 동기화할 수 있게 해줍니다.
