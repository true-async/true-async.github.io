---
layout: tutorial
lang: es
path_key: "/tutors-laravel/04-unsafe-patterns.html"
nav_active: docs
permalink: /es/tutors-laravel/04-unsafe-patterns.html
page_title: "Lo que no puedes hacer dentro de una corrutina"
description: "Propiedades static mutables, once() sobre un singleton y Number::useLocale(): las formas habituales en que el estado se filtra entre peticiones, y cómo detectarlas con análisis estático."
---

# Lo que no puedes hacer dentro de una corrutina

Los capítulos anteriores arreglaron fugas de estado concretas: `auth`/
`session` a través del contexto, el contador de transacciones a través de
un trait. `laravel-spawn` cerró esos agujeros por ti. Pero el framework es
grande, los paquetes de terceros son todavía más numerosos, y mañana
alguien de tu equipo escribirá su propio servicio. Lo que necesitas es una
regla que puedas aplicar a simple vista, para distinguir el código que es
seguro para corrutinas concurrentes del código que algún día le entregará
a un usuario los datos de otro.

## Una regla: no escribas en `static` después del arranque

Cada ejemplo de abajo es un caso particular del mismo error: algo escribe
un valor en memoria compartida por todas las corrutinas del proceso, y ese
valor pertenece a una petición concreta.

**Una propiedad static mutable en un servicio.**

```php
// Peligroso
class PriceCalculator
{
    private static array $cache = [];

    public function forProduct(int $id): float
    {
        return self::$cache[$id] ??= $this->computeExpensive($id);
    }
}
```

Parece una memoización inofensiva. En realidad es un array compartido por
todas las corrutinas. Si `computeExpensive()` depende de algo que cambia
entre peticiones, la moneda de un usuario, un recargo regional, la primera
petición decide el destino de la caché para todas las peticiones que
siguen. La solución es simple: una propiedad de instancia en lugar de
`static`, con el servicio resuelto por petición (el "enfoque uno" del
primer capítulo).

**¿Y si el servicio es tuyo y deliberadamente necesitas estado por
petición?** No hace falta esperar a que `laravel-spawn` te proporcione un
`ScopedService` y un proxy para él, es el mismo truco que resolvió el
problema del contador de transacciones en el segundo capítulo, solo que un
nivel más arriba: no `coroutine_context()` para una sola corrutina, sino
`request_context()`, compartido a lo largo de todo el árbol de corrutinas
de una petición.

```php
class PriceCalculator  // sigue siendo un singleton
{
    private const CTX_CACHE = 'price.cache';

    public function forProduct(int $id): float
    {
        $cache = request_context()->find(self::CTX_CACHE) ?? [];

        return $cache[$id] ??= $this->computeExpensive($id, $cache);
    }
}
```

La diferencia con el ejemplo anterior parece pequeña pero es fundamental:
el array ya no vive en una propiedad `static` compartida por todo el
proceso a nivel de clase, vive en el contexto de scope de una petición
concreta. Dos peticiones concurrentes llaman a la misma instancia de
`PriceCalculator`, y aun así cada una obtiene su propia `$cache`, porque
`request_context()` se resuelve a un scope distinto para cada una de
ellas. Una mirada detallada a `coroutine_context()` y `request_context()`
está en el [segundo capítulo](/es/tutors-laravel/02-pool-transactions.html).

**`once()` sobre un singleton.**

```php
// Peligroso
class CurrentUserService  // registrado como singleton
{
    public function get()
    {
        return once(fn() => Auth::user());  // guarda en caché el PRIMER usuario, para siempre
    }
}
```

`once()` guarda en caché el resultado del closure en un `WeakMap`
indexado por el objeto al que pertenece la llamada. Para un singleton, ese
objeto es uno solo para todo el proceso, así que la caché también lo es.
La primera petición calcula el usuario, todas las peticiones siguientes
obtienen ese mismo usuario. En objetos por petición (controladores,
modelos `Eloquent`) `once()` es perfectamente seguro, porque ahí el propio
objeto es nuevo en cada petición.

**Una mutación global como `Number::useLocale()`.**

```php
// Peligroso
Number::useLocale('de');
$price = Number::format(1234.5);       // ¿y si la corrutina se duerme antes de esta línea?

// Seguro
$price = Number::format(1234.5, locale: 'de');
```

`useLocale()` cambia una variable static en la clase `Number`. Entre la
llamada a `useLocale()` y a `format()`, puede ocurrir un `await`, un
`delay()`, cualquier viaje a la base de datos, en otras palabras, un punto
donde el planificador le entrega el control a otra corrutina. Si esa otra
corrutina también llama a `Number::format()` sin un locale explícito,
obtiene el que otro acaba de establecer. El parámetro explícito `locale:`
elimina por completo la posibilidad de una carrera: no hay nada que
proteger, porque no hay nada que compartir.

**Superglobales.** `$_GET`, `$_POST`, `$_SERVER`, `$_SESSION` eran seguras
bajo PHP-FPM simplemente porque vivían durante una sola petición. En un
worker de corrutinas son variables compartidas por todo el proceso, y es
el servidor quien las actualiza, no PHP en cada nueva conexión como estás
acostumbrado. Usa el objeto `Request`, que `laravel-spawn` ya aísla a
través de `current_context()`, y deja tranquilas a las superglobales.

## Cuándo `static` es realmente seguro

Es igual de importante no irse al otro extremo y declarar que todo
`static` es un crimen. Estos casos son seguros:

- **`readonly static`**, si un valor nunca cambia después de la
  inicialización, compartirlo entre corrutinas no es más peligroso que
  compartir una constante.
- **Configuración establecida en el arranque**, un `static` fijado una
  vez cuando arranca el worker y solo leído después (rutas, plantillas
  compiladas, macros registradas).
- **Cachés deterministas**, si el resultado depende solo de los
  argumentos de entrada y no de la petición "actual" (digamos, la caché
  de `Str::camel()` para una cadena dada siempre es la misma cadena), una
  carrera por rellenarla no corrompe datos, en el peor de los casos algo
  se calcula dos veces.
- **Contadores monótonos sin semántica**, un alias autoincremental como
  un contador interno para alias SQL únicos: incluso si dos peticiones
  obtienen el mismo número, la colisión no produce datos incorrectos, a
  lo sumo un alias menos bonito.

La diferencia es siempre la misma: ¿es *un resultado calculado que no
depende de la petición* lo que se comparte, o *estado que pertenece a una
petición concreta*? Lo primero es una optimización. Lo segundo es una
fuga.

## Análisis estático en lugar de lectura cuidadosa

Recorrer manualmente cada paquete de terceros buscando `private static`
sin `readonly` es exactamente el tipo de trabajo que con gusto le delegas
a un linter. El paquete incluye una regla de `PHPStan` construida para
esto:

```php
final class MutableStaticPropertyRule implements Rule
{
    public function getNodeType(): string
    {
        return Property::class;
    }

    public function processNode(Node $node, Scope $scope): array
    {
        if (! $node->isStatic() || $node->isReadonly()) {
            return [];
        }

        // ... mensaje "posible fuga de estado entre corrutinas"
    }
}
```

La regla es tan sencilla como puede ser: encuentra cada propiedad `static`
sin el modificador `readonly` y la marca. Habrá bastantes falsos
positivos, exactamente los casos "seguros" listados arriba, pero es una
concesión deliberada: pasar por alto una fuga real cuesta más caro que
revisar manualmente una vez una lista de candidatos.

```bash
phpstan analyse app/ --configuration=phpstan.neon
phpstan analyse vendor/some/package/src --configuration=phpstan.neon
```

Ejecutar la regla contra el propio framework Laravel arroja más de
trescientos resultados. La abrumadora mayoría son exactamente los `static`
seguros de la sección anterior: cachés compiladas de `BladeCompiler`,
flags de configuración fijados una vez en `boot()`, resolvers que
internamente acceden a un `$app['request']` ya aislado. Revisar
trescientas líneas una vez es un cuarto de hora de trabajo. Pasar por alto
una sola y toparse con una fuga en producción son horas depurando el
informe de bug de otra persona diciendo "estoy viendo el perfil de otro
usuario".

## La conclusión

Antes de dejar un `static` (o un singleton con una propiedad mutable) en
código que corre dentro de un handler de petición, hazte una pregunta:
¿sobrevivirá este valor al final de la petición actual y seguirá siendo
correcto para la siguiente? Si la respuesta es sí, es seguro. Si se
supone que debe expirar junto con la petición pero físicamente sigue
viviendo en memoria compartida del proceso, es candidato para
`ScopedService`, `request_context()`/`coroutine_context()` (ver el
[segundo capítulo](/es/tutors-laravel/02-pool-transactions.html)), o una
simple propiedad de instancia recreada por petición.

Hemos cubierto tu propio código y Laravel de fábrica. Pero un proyecto
real suele tener `spatie/laravel-permission`, `Telescope`, `Inertia` y
`Debugbar` viviendo justo al lado, cada uno con su propia historia de
estado mutable. Cuáles de ellos ya están adaptados, y cuáles merece la
pena desactivar en modo async, es el tema del próximo capítulo.
