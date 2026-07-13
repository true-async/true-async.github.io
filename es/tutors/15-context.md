---
layout: tutorial
lang: es
path_key: "/tutors/15-context.html"
nav_active: docs
permalink: /es/tutors/15-context.html
page_title: "Context"
description: "Context: dónde guardar \"el actual\" cuando las variables globales dejan de funcionar."
---

# Context

El PHP clásico vivió toda su vida bajo una regla simple: un proceso, una petición. De esa regla
nació toda una cultura: variables globales, propiedades estáticas, singletons. ¿El usuario actual? La
propiedad estática `Auth::$user`. ¿Un ID de petición para el registro? Una variable global. Funcionaba
sin fallos, porque "el actual" de verdad era una sola cosa para todo el proceso.

TrueAsync abolió esa regla. Ahora cientos de corrutinas viven mezcladas en un solo
proceso, sirviendo a distintos usuarios. Asigna `Auth::$user` en una corrutina, y la siguiente en
despertar lo leerá de vuelta, y tienes suerte si es siquiera la misma petición. Una historia familiar:
lo mismo pasó en el capítulo nueve, cuando diez workers compartían un solo `PDO`. Carreras sin
hilos, solo que ahora en el estado global.

¿Pasarlo todo como parámetros en su lugar? Honesto, pero despiadado: tendrías que enhebrar un
token de autorización a través de veinte firmas de función, cuando solo una de ellas de verdad lo necesita.
Lo que realmente quieres es un almacenamiento atado no al proceso, sino al hilo lógico de ejecución.
Y ya tenemos una estructura apta para el trabajo: las corrutinas y los scopes ya forman un árbol.

## Almacenamiento en un árbol

`Async\Context` es un almacén clave-valor adjunto a un scope o a una corrutina. El contexto de un scope está
disponible para todas sus corrutinas:

```php
use function Async\current_context;

// middleware, inicio del manejo de la petición
current_context()
    ->set('request_id', bin2hex(random_bytes(8)))
    ->set('user_id', $userId);
```

Y desde ahí, en cualquier lugar, a cualquier profundidad de llamada, sin un solo parámetro extra:

```php
function logInfo(string $message): void
{
    $requestId = current_context()->find('request_id');
    error_log("[$requestId] $message");
}
```

Fíjate en `find`: busca la clave en el contexto actual, y si no la encuentra, sube por
el árbol de scopes. Los scopes hijos ven automáticamente los datos de sus padres, así que una corrutina iniciada en lo
profundo de un manejador encontrará el `request_id` establecido al principio mismo de la petición. Es el mismo
mecanismo que el `context.Context` de Go, salvo que no tienes que buscarlo y pasarlo a
mano: el árbol ya está ahí.

Las peticiones ya no se estorban entre sí: cada una tiene su propio scope, y por tanto su propio
contexto. Mil peticiones concurrentes, mil `request_id` independientes, y ni una sola
variable global.

## Tres niveles

El contexto existe en tres niveles, del más amplio al más estrecho:

```php
use function Async\root_context;
use function Async\current_context;
use function Async\coroutine_context;

root_context();      // todo el proceso: configuración, compartida por todos
current_context();   // el scope actual: petición, usuario, locale
coroutine_context(); // solo esta corrutina: datos privados
```

`root_context` es el hogar legítimo para lo que antes por derecho era una variable global: el
nombre de la aplicación, los ajustes. Lo diriges explícitamente: `root_context()->find('app_name')`.
`coroutine_context` es el polo opuesto: sus datos son invisibles para cualquiera salvo la corrutina
misma, incluso sus vecinas en el mismo scope. Entre ambos, `find` cose los niveles de scope
juntos: no lo encontró localmente, pregunta al padre.

Y un detalle agradable más:

```php
current_context()->set('user_id', 42);
current_context()->set('user_id', 7); // AsyncException: la clave ya existe
```

Sobrescribir está prohibido a menos que lo pidas explícitamente (`replace: true`). El contexto se protege
a sí mismo contra la mismísima enfermedad de las variables globales con la que empezó este capítulo: alguien,
en algún lugar, sobrescribiendo un valor en silencio.

## El fin del viaje

Hace quince capítulos lanzamos dos funciones "a la vez" y nos sorprendió ver
sus salidas entremezclarse. Desde entonces, ha tomado forma todo un sistema, y cada nivel de él tiene
su propia preocupación:

- **Corrutinas, `spawn`, `await`** — la unidad de concurrencia y una promesa de un resultado.
- **Cancelación, timeouts, excepciones** — el contrato de interrupción: nada corre para siempre, y
  nada muere en silencio.
- **`Future` y canales** — conexiones: un único resultado, y un flujo de valores con
  sincronización.
- **`Scope`, `TaskGroup`, `TaskSet`, `iterate`** — estructura: cada corrutina tiene un dueño, y
  cada grupo tiene una estrategia de espera.
- **Pools** — disciplina de recursos: pocas conexiones, muchas corrutinas.
- **Hilos** — paralelismo para el cálculo, sin memoria compartida.
- **`Context`** — datos atados a la ejecución, no al proceso.

Fíjate en lo que nunca tuvimos que aprender: mutexes, semáforos, carreras de datos, callbacks, o colorear
funciones como async frente a sync. El código siguió siendo PHP común y secuencial que simplemente dejó de
estar sentado sin hacer nada.

Desde aquí, dos caminos. Para práctica práctica, dirígete a la [documentación](/es/docs.html), donde
cada componente se desmonta hasta el último tornillo. Para entender cómo funciona todo por
debajo, dirígete a la [arquitectura](/es/architecture.html). O mejor aún, simplemente toma tu
script más lento y mira qué le hace un solo `spawn`.
