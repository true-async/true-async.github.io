---
layout: tutorial
lang: zh
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /zh/tutors/03-await.html
page_title: "Await"
description: "为什么需要 await()，以及它如何与协程配合工作。"
---

# Await

设想一个经典的分布式后端系统。有十来个服务通过 `JWT` 授权串联在一起。
用户通过 `UserDirectory` 登录，进入 `ProfileService` 来修改其个人资料中的某些业务数据，
比如家庭住址或收货地址。API 的职责就是更新这些数据：

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

如果这个操作被认为有风险，可能就需要额外通过 `UserDirectory` 来校验 JWT 令牌：

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

`validateToken` 和 `profileExists` 函数都会执行 I/O 并耗费时间，尤其是 `validateToken`。
把 `validateToken` 放到协程里运行以减少总等待时间会很有意义：

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

然而这段代码无法工作，因为 `spawn` 无法立即返回结果。我们需要某种方式来等待协程。
这正是 `await` 函数的用途。

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

`await` 函数会暂停执行流程，直到协程结束为止，这让你能够把不同的协程彼此同步起来。
