---
layout: tutorial
lang: es
path_key: "/tutors/03-await.html"
nav_active: docs
permalink: /es/tutors/03-await.html
page_title: "Await"
description: "Por qué se necesita await() y cómo funciona con las corrutinas."
---

# Await

Imagina un sistema backend distribuido clásico. Hay una docena de servicios enlazados mediante autorización `JWT`.
Un usuario inicia sesión a través de `UserDirectory` y aterriza en `ProfileService` para cambiar algún dato de negocio en su
perfil, por ejemplo su domicilio o una dirección de entrega. El trabajo de la API es actualizar esos datos:

```php
function profileExists(int $userId): bool {
    $result = $db->query('SELECT 1 FROM profiles WHERE user_id = ?', [$userId]);
    return $result->rowCount() > 0;
}

if (profileExists($userId)) {
    updateProfile($userId, $changes);
}
```

Si la operación se considera arriesgada, podría ser necesario validar adicionalmente el token JWT
a través de `UserDirectory`:

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

Las funciones `validateToken` y `profileExists` realizan E/S y tardan tiempo, especialmente `validateToken`.
Tendría sentido ejecutar `validateToken` en una corrutina para reducir el tiempo total de espera:

```php
$isValid = spawn(validateToken(...), $token);

if (profileExists($userId) && $isValid) {
    updateProfile($userId, $changes);
}
```

Sin embargo, este código no funcionará, ya que `spawn` no puede devolver un resultado de inmediato. Necesitamos alguna
forma de esperar a la corrutina. Para eso sirve la función `await`.

```php
use function Async\await;

$validation = spawn(validateToken(...), $token);

if (profileExists($userId) && await($validation)) {
    updateProfile($userId, $changes);
}
```

La función `await` pausa el flujo de ejecución hasta que la corrutina termina, lo que te permite
sincronizar distintas corrutinas entre sí.
