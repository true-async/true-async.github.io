---
layout: tutorial
lang: es
path_key: "/tutors/06-future.html"
nav_active: docs
permalink: /es/tutors/06-future.html
page_title: "Future"
description: "Future y FutureState: la promesa de un resultado que no está atado a una corrutina."
---

# Future

En los capítulos anteriores descubrimos que una corrutina se comporta como una promesa de un resultado:
`await` puede llamarse tantas veces como quieras, y siempre devuelve lo mismo.
Pero una corrutina tiene una restricción estricta: el resultado siempre lo produce la función
que arrancó `spawn`. Una llamada, una función, un resultado.

Pero, ¿qué pasa si el resultado no proviene de una función en absoluto?

Volvamos a `ProfileService`. Un usuario cambia su dirección de entrega, y antes
de guardarla, la dirección debe comprobarse contra un directorio de regiones atendidas
por el servicio `GeoDirectory`:

```php
function loadRegions(): array {
    $response = file_get_contents('https://geodirectory.example.com/api/regions');
    return json_decode($response, true);
}
```

El directorio es grande, lento de cargar y el mismo para todos. Al mismo tiempo,
cada petición de actualización de perfil lo necesita, y las peticiones se atienden de forma concurrente.
Llamar a `spawn(loadRegions(...))` en cada una significa bombardear a `GeoDirectory` con
peticiones idénticas para obtener una respuesta idéntica. Un desperdicio.

Lo que nos gustaría es que la primera petición cargara realmente el directorio, mientras que todas
las demás esperan su resultado. Para eso necesitamos un lugar donde un fragmento de código
deposite el resultado y otro lo recoja.

Ese lugar puede ser un `Future`.

## FutureState y Future

`Future` es una promesa y un contenedor para un resultado. No está atado a una corrutina,
pero funciona con el `await` que ya conocemos.

`Future` consta de dos objetos:

```php
use Async\Future;
use Async\FutureState;

$state = new FutureState();
$future = new Future($state);
```

- **`FutureState`** — escribe el resultado. Se queda con quien produce el resultado.
- **`Future`** — lee el resultado. Se entrega a quien espera el resultado.

El productor completa la operación, el consumidor la espera mediante el familiar `await`:

```php
use function Async\await;

$state->complete(42);

echo await($future); // 42
```

¿Por qué dos objetos en lugar de uno? La separación protege contra errores.
Quien tiene un `Future` físicamente no puede completar la operación: no existe tal
método en él. Solo el dueño del `FutureState` tiene permiso para escribir el resultado,
y solo una vez:

```php
$state->complete(1);
$state->complete(2); // AsyncException: FutureState is already completed
```

Si la operación falla, en lugar de un resultado se escribe una excepción,
y `await` la lanzará a todos los que estén esperando:

```php
$state->error(new RemoteApiException('GeoDirectory did not respond'));

await($future); // throws RemoteApiException
```

## Resolviendo el problema del directorio

Ahora podemos construir una carga del directorio que las peticiones concurrentes compartan entre sí:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

final class RegionsDirectory
{
    private ?Future $future = null;

    public function regions(): Future
    {
        if ($this->future !== null) {
            return $this->future;
        }

        $state = new FutureState();
        $this->future = new Future($state);

        spawn(function () use ($state) {
            try {
                $state->complete(loadRegions());
            } catch (Exception $e) {
                $state->error($e);
            }
        });

        return $this->future;
    }
}
```

La primera llamada a `regions` arranca una corrutina que hace la carga real.
Cada llamada posterior obtiene el mismo `Future` y espera sobre un único resultado compartido.
Una vez cargado el directorio, `await` empieza a devolverlo al instante, sin importar
cuántas veces se pida:

```php
$regions = await($directory->regions());

if (profileExists($userId) && isset($regions[$changes['region']])) {
    updateProfile($userId, $changes);
}
```

Por muchas peticiones que se atiendan de forma concurrente, `GeoDirectory` recibe exactamente un impacto,
mientras que `RegionsDirectory` sigue siendo un servicio corriente: puede conectarse en un contenedor de DI,
sustituirse en las pruebas, y todo su estado vive en un único campo `$future`.
Fíjate en que `await` funciona igual con una corrutina y con un `Future`,
incluido el timeout del capítulo anterior:

```php
$regions = await($directory->regions(), timeout(2000));
```

## Un resultado que ya tienes

A veces el resultado se conoce de antemano. Por ejemplo, el directorio de regiones
se precalienta al arrancar el servicio y ya está en memoria. No tiene
sentido crear un `FutureState` y una corrutina solo para un valor ya conocido,
así que existen métodos de fábrica para eso:

```php
// el resultado ya está ahí
$future = Future::completed($regionsFromWarmup);

// el error ya se conoce
$future = Future::failed(new RemoteApiException('GeoDirectory did not respond'));
```

El método `regions` puede devolver un `Future` así, y el consumidor no notará
la diferencia: sigue llamando a `await` y obtiene el resultado de inmediato.

## Una técnica clásica: la memoización

`RegionsDirectory` ya implementa una técnica clásica llamada memoización:
calcula el resultado una vez y lo entrega a cada llamada repetida. La técnica
es lo bastante general como para envolver cualquier función con argumentos:

```php
use Async\Future;
use Async\FutureState;
use function Async\spawn;

function memoize(callable $fn): callable
{
    $cache = [];

    return function (mixed ...$args) use ($fn, &$cache): Future {
        $key = serialize($args);

        if (isset($cache[$key])) {
            return $cache[$key];
        }

        $state = new FutureState();
        $cache[$key] = new Future($state);

        spawn(function () use ($state, $fn, $args) {
            try {
                $state->complete($fn(...$args));
            } catch (Throwable $e) {
                $state->error($e);
            }
        });

        return $cache[$key];
    };
}
```

```php
$regionsOf = memoize(loadRegionsOf(...));

$de = await($regionsOf('DE')); // una petición a GeoDirectory
$fr = await($regionsOf('FR')); // una petición a GeoDirectory
$de = await($regionsOf('DE')); // instantáneo, desde la caché
```

Fíjate en una sutileza: la caché guarda el propio `Future`, no un valor plano.
Una memoización ingenua en código concurrente sufriría una condición de carrera: mientras la primera
llamada espera la respuesta de `GeoDirectory`, una segunda llamada comprueba la caché, la ve
vacía y dispara una petición duplicada. Aquí no existe ese hueco. El `Future`
aterriza en la caché de inmediato, antes incluso de que empiece el cálculo, así que la segunda
llamada lo encuentra y simplemente espera.

La técnica tiene un límite: la memoización solo funciona para datos que no cambian
durante la vida del proceso. Cachear así una comprobación de token o un tipo de cambio
sería un error: dependen del tiempo, y una caché así necesita un tiempo de vida tras
el cual el resultado se vuelve a obtener. Por la misma razón, los errores merecen una
reflexión aparte: un `Future` fallido también se quedaría en la caché para siempre, y suele
ser mejor eliminarlo para que la siguiente llamada lo reintente.

Lo principal que llevarte de este capítulo: una corrutina responde a la pregunta
"cómo obtengo el resultado", mientras que un `Future` simplemente promete que un resultado
existirá. De dónde viene, una corrutina, una caché u otro hilo, no es
asunto del consumidor. El productor y el consumidor se han puesto de acuerdo en un
resultado y no saben nada más el uno del otro.

Pero, ¿qué pasa si no hay un solo resultado, sino todo un flujo de valores que
necesitan viajar de corrutina a corrutina? Hay una herramienta aparte para eso,
y es el tema del próximo capítulo.
