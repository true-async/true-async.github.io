---
layout: tutorial
lang: uk
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /uk/tutors/03-await.html
page_title: "Await"
description: "Навіщо потрібен await() і як він працює з корутинами."
---

# Await

Уявіть класичну розподілену бекенд-систему. Є десяток сервісів, пов'язаних між собою через авторизацію `JWT`.
Користувач входить через `UserDirectory` і потрапляє до `ProfileService`, щоб змінити якісь бізнес-дані у своєму
профілі, наприклад домашню адресу або адресу доставки. Завдання API оновити ці дані:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Якщо операція вважається ризикованою, може знадобитися додатково перевірити JWT-токен
через `UserDirectory`:

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

Функції `validateToken` та `profileExists` виконують введення-виведення та потребують часу, особливо `validateToken`.
Було б доцільно запустити `validateToken` у корутині, щоб скоротити загальний час очікування:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Однак цей код не працюватиме, оскільки `spawn` не може повернути результат негайно. Нам потрібен якийсь
спосіб дочекатися корутину. Саме для цього й призначена функція `await`.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

Функція `await` призупиняє потік виконання, доки корутина не завершиться, що дозволяє
синхронізувати різні корутини одна з одною.
