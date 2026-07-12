---
layout: tutorial
lang: es
path_key: "/tutors/04-exceptions.html"
nav_active: docs
permalink: /es/tutors/04-exceptions.html
page_title: "Excepciones"
description: "Cómo se propagan las excepciones de una corrutina a través de await()."
---

# Excepciones en corrutinas

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");
    return json_decode($response)->valid;
}
```

La función `validateToken` del capítulo anterior tiene algunos problemas.
Si `UserDirectory` no responde (timeout, la red caída, el DNS sin resolver), `file_get_contents` devuelve `false`.
`json_decode(false)` devuelve `null`, y `null->valid` también es `null`. La función devuelve algo con valor falso,
el mismo resultado que con un token realmente inválido. `validateToken` no tiene forma de distinguir "el token caducó"
de "`UserDirectory` no respondió", aunque son dos situaciones completamente distintas.

El enfoque correcto es lanzar una excepción cuando el servicio no responde:

```php
function validateToken(string $token): bool 
{
    $response = file_get_contents("https://userdirectory.example.com/api/validate?token=$token");

    if ($response === false) {
        throw new RemoteApiException('UserDirectory did not respond');
    }

    return json_decode($response)->valid;
}
```

Pero ¿qué ocurre si se lanza una excepción dentro de una corrutina?
Si se lanza una excepción en código `PHP` normal y nadie la captura, `PHP` termina con un mensaje de Unhandled
Exception. ¿Y en el caso de una corrutina?

```php
use function Async\spawn;

spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
```

```text
Hello, world!
Fatal error: Uncaught Exception: Something went wrong in /path/to/script.php
```

A primera vista parece que no hay diferencia. Pero eso dista mucho de ser cierto.
Las corrutinas pertenecen al componente `Scheduler`, que es el responsable de conmutar entre ellas. Cada
corrutina se ejecuta en su propio hilo lógico. Si una excepción no gestionada llega al manejador final de la corrutina,
queda almacenada en el manejador (handle) de la corrutina.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

echo "Hello, world!\n";
sleep(1);
echo "Goodbye, world!\n";

unset($coroutine);
```

En otras palabras, la excepción no terminará el programa mientras alguien siga manteniendo una referencia
a `$coroutine`. Esta lógica garantiza la idempotencia de la operación `await`.

```php
$coroutine = spawn(function () {
    throw new Exception('Something went wrong');
});

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception: {$e->getMessage()}\n";    
}

try {
    await($coroutine);
} catch (Exception $e) {
    echo "Caught the exception a second time: {$e->getMessage()}\n";    
}
```

Las llamadas repetidas a `await` sobre la misma corrutina producen el mismo comportamiento, independientemente de si la
corrutina sigue en ejecución o no. Esto te permite tratar una corrutina como un `Future`, la promesa de un resultado
que se puede obtener en algún momento en el futuro. Si el resultado ya existe, `await` lo devuelve
de inmediato.

Ahora podemos mejorar el código que valida el token y actualiza el perfil añadiendo el manejo de excepciones:

```php
$validation = spawn(validateToken(...), $token);

try {
    if (profileExists($userId) && await($validation)) {
        updateProfile($userId, $changes);
    }
} catch (RemoteApiException $e) {
    // ¿Quizá valga la pena reintentar la operación más tarde?
}
```

> ¡Importante!
> Después de llamar a `await` o a cualquier otra operación `await_*`,
> la corrutina se marca como gestionada, y su excepción ya no provocará
> que el programa de PHP termine.
