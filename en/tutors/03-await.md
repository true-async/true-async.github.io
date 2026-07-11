---
layout: tutorial
lang: en
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /en/tutors/03-await.html
page_title: "Await"
description: "Why await() is needed and how it works with coroutines."
---

# Await

Imagine a classic distributed backend system. There's a dozen services tied together via `JWT` authorization.
A user logs in through `UserDirectory` and lands in `ProfileService` to change some business data in their
profile, for example their home address or a delivery address. The API's job is to update that data:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

If the operation is deemed risky, it might be necessary to additionally validate the JWT token
through `UserDirectory`:

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

The `validateToken` and `profileExists` functions perform I/O and take time, especially `validateToken`.
It would make sense to run `validateToken` in a coroutine to reduce the total wait time:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

However, this code won't work, since `spawn` can't return a result immediately. We need some
way to wait for the coroutine. That's what the `await` function is for.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

The `await` function pauses the flow of execution until the coroutine finishes, which lets you
synchronize different coroutines with one another.
