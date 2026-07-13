---
layout: tutorial
lang: ru
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /ru/tutors/03-await.html
page_title: "Await"
description: "Зачем нужен await() и как он работает с корутинами"
---

# Await

Представим классическую распределенную backend-систему. Есть десяток сервисов, связанных авторизацией через `JWT`.
Пользователь входит через `UserDirectory` и попадает в `ProfileService` с целью изменить бизнес данные профиля.
Например, адрес проживания или адрес для доставки. Задача API обновить данные:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Если операция оценивается как рискованная, может понадобиться дополнительно валидировать токен JWT 
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

Функции `validateToken` и `profileExists` используют ввод-вывод, занимают время, особенно `validateToken`.
Было бы разумно выполнить `validateToken` в корутине, чтобы сократить общее время ожидания:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Однако такой код не будет работать, ведь `spawn` не может вернуть результат немедленно. Нужен какой-то 
способ подождать корутину. Для этого существует функция `await`.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

Функция `await` останавливает поток выполнения до тех пор, пока корутина не завершит работу, 
что позволяет синхронизировать разные корутины между собой.