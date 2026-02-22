---
layout: docs
lang: uk
path_key: "/docs/reference/context/get.html"
nav_active: docs
permalink: /uk/docs/reference/context/get.html
page_title: "Context::get"
description: "Отримати значення з контексту. Кидає виключення, якщо ключ не знайдено."
---

# Context::get

(PHP 8.6+, True Async 1.0)

```php
public Context::get(string|object $key): mixed
```

Отримує значення за ключем з поточного контексту. Якщо ключ не знайдено на поточному рівні,
пошук продовжується вгору по ієрархії батьківських контекстів.

На відміну від `find()`, цей метод кидає виключення, якщо ключ не знайдено на жодному рівні.
Використовуйте `get()`, коли наявність значення є обов'язковою вимогою.

## Параметри

**key**
: Ключ для пошуку. Може бути рядком або об'єктом.
  При використанні об'єкта як ключа пошук виконується за посиланням на об'єкт.

## Значення, що повертаються

Значення, пов'язане з ключем.

## Помилки

- Кидає `Async\ContextException`, якщо ключ не знайдено в поточному
  чи будь-якому батьківському контексті.

## Приклади

### Приклад #1 Отримання обов'язкового значення

```php
<?php

use function Async\current_context;
use function Async\spawn;

current_context()->set('db_connection', $pdo);

spawn(function() {
    // Отримуємо значення, яке має існувати
    $db = current_context()->get('db_connection');
    $db->query('SELECT 1');
});
```

### Приклад #2 Обробка відсутнього ключа

```php
<?php

use function Async\current_context;

try {
    $value = current_context()->get('missing_key');
} catch (\Async\ContextException $e) {
    echo "Ключ не знайдено: " . $e->getMessage() . "\n";
}
```

### Приклад #3 Використання ключа-об'єкта

```php
<?php

use function Async\current_context;
use function Async\spawn;

class DatabaseKey {}

$dbKey = new DatabaseKey();
current_context()->set($dbKey, new PDO('sqlite::memory:'));

spawn(function() use ($dbKey) {
    // Ключ-об'єкт забезпечує унікальність без конфліктів імен
    $pdo = current_context()->get($dbKey);
    $pdo->exec('CREATE TABLE test (id INTEGER)');
});
```

## Дивіться також

- [Context::find](/uk/docs/reference/context/find.html) --- Безпечний пошук (повертає null)
- [Context::has](/uk/docs/reference/context/has.html) --- Перевірити наявність ключа
- [Context::getLocal](/uk/docs/reference/context/get-local.html) --- Отримати значення лише з локального контексту
- [Context::set](/uk/docs/reference/context/set.html) --- Встановити значення в контексті
