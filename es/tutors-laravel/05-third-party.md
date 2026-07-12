---
layout: tutorial
lang: es
path_key: "/tutors-laravel/05-third-party.html"
nav_active: docs
permalink: /es/tutors-laravel/05-third-party.html
page_title: "Paquetes de terceros"
description: "Debugbar, Telescope, Inertia, spatie/permission, Socialite: qué ya está adaptado para corrutinas y qué merece la pena desactivar."
---

# Paquetes de terceros

Hemos cubierto el núcleo de Laravel y tu propio código. Pero la lista de
dependencias de un proyecto real no termina ahí: `Debugbar` en desarrollo,
`Telescope` para logs, `Inertia` para el frontend,
`spatie/laravel-permission` para roles. Cada uno de ellos se escribió
mucho antes de que nadie se imaginara cientos de peticiones concurrentes
dentro de un solo proceso, y cada uno tiene su propio singleton cargando
estado. La buena noticia: para los paquetes más comunes este trabajo ya
está hecho. La mala noticia: no para todos, y importa saber distinguir
unos de otros.

## Ya adaptados

**`spatie/laravel-permission`.** `PermissionRegistrar` guarda el `team ID`
actual y un índice de permisos comodín en sus propias propiedades,
exactamente el patrón cubierto en el capítulo sobre patrones inseguros.
`AsyncPermissionRegistrar` mueve ambos a `current_context()`:

```php
class AsyncPermissionRegistrar extends PermissionRegistrar
{
    public function setPermissionsTeamId(int|string|Model|null $id): void
    {
        current_context()->set(self::CTX_TEAM_ID, $id, replace: true);
    }

    public function getPermissionsTeamId(): int|string|null
    {
        return current_context()->find(self::CTX_TEAM_ID);
    }

    // clearPermissionsCollection() se convierte en un no-op: la lista de
    // permisos en sí es de solo lectura tras cargarse y se comparte de
    // forma segura entre peticiones.
}
```

Nada cambia en tu propio código: `Auth::user()->can(...)`,
`setPermissionsTeamId()` en middleware, todo funciona exactamente como
describe la documentación del paquete.

**`inertiajs/inertia-laravel`.** `AsyncResponseFactory` mueve
`sharedProps`, `rootView`, `version` y `encryptHistory`, todo lo que solía
acumularse en las propiedades del singleton `ResponseFactory` y habría
sobrevivido más allá del final de una petición hasta la siguiente, al
contexto.

**`barryvdh/laravel-debugbar`.** La solución aquí es un poco más matizada.
`Debugbar` recopila datos a lo largo de toda la petición: consultas SQL,
mensajes, tiempos, un colector acumulativo clásico que escribe en sí mismo
durante todo el ciclo de manejo, incluyendo las pausas en `await`.
`AsyncDebugbar` no resuelve una nueva instancia por petición (eso rompería
las suscripciones a eventos de una sola vez), mantiene una `Debugbar` por
worker, pero hace que los propios colectores sean conscientes del
contexto:

```php
class AsyncDebugbar extends LaravelDebugbar
{
    public function __construct(Application $app, Request $request)
    {
        parent::__construct($app, $request);

        // Estos acumulan datos a través de cada pausa de E/S en la petición,
        // así que el almacenamiento debe ser por corrutina, no por instancia.
        $this->messagesCollector   = new AsyncMessagesCollector();
        $this->timeCollector       = new AsyncTimeDataCollector(...);
        $this->exceptionsCollector = new AsyncExceptionsCollector();
    }
}
```

La diferencia con `ScopedServiceProxy` del primer capítulo importa: ahí,
todo el servicio se resolvía de nuevo por petición; aquí, el servicio sigue
siendo una única instancia (es costoso recrearlo: suscripciones a
eventos, configuración), y solo los colectores acumulativos específicos
dentro de él se vuelven conscientes del contexto. El mismo diagnóstico que
el capítulo sobre patrones inseguros ("no escribas en estado compartido
entre peticiones"), solo que con una cura adaptada a la anatomía particular
de este paquete.

**`laravel/telescope`.** De forma similar: `entriesQueue`, `updatesQueue`
y el flag `shouldRecord` se mueven al contexto a través de un trait
`CoroutineSafeRecording`, y la decisión de si registrar una petición dada
se toma por corrutina.

**`laravel/socialite`.** Aquí es más simple: `SocialiteManager` guarda en
caché los drivers junto con la configuración de la petición que llegó a
ellos primero. La solución no es un adaptador, es un `scopedSingleton`, el
mismo "enfoque uno" del primer capítulo: un manager nuevo por petición, sin
necesidad de contexto alguno.

## Seguros sin adaptación

`Cache`, `Queue`, `Mail`, `Log`, `Validation`, `Filesystem`, `HTTP
Client`, `Notifications`, `Encryption`, `Hashing`, `Pagination`,
`Sanctum`, `Passport`, `Scout`, `Cashier`, `Horizon`, estos también tienen
singletons, pero lo que guardan es configuración y clientes, no datos por
petición. `CacheManager` guarda en caché el objeto cliente de `Redis`, no
los valores que pones en ella; `MailManager` guarda en caché el `Mailer`
configurado, no los correos. La misma pregunta del capítulo sobre
patrones inseguros: ¿sobrevive el estado al final de una petición
manteniéndose correcto? Aquí la respuesta es sí, porque el estado es
configuración de conexión, no datos de un usuario.

## Incompatibles: desactívalos

**`livewire/livewire`.** Aquí vale la pena detenerse y no arrastrar el
optimismo anterior. `LivewireManager` acumula estado por petición muy
adentro de sí mismo, y `wire:stream` está construido sobre supuestos
acerca de una respuesta con buffer y de una sola vez que el propio modelo
de corrutinas concurrentes rompe. Adaptarlo poco a poco no ha funcionado,
ni para `laravel-spawn` ni para `Laravel Octane` antes que él. La única
recomendación que realmente se sostiene es no habilitar `Livewire` en modo
async en absoluto. Para interfaces interactivas en este stack, usa
`Inertia`, que ya está adaptada y cubierta arriba. `Filament`, construido
sobre `Livewire`, hereda la misma limitación.

## Decidir sobre tu propio paquete

Si el paquete que necesitas no está en ninguna de las dos listas, la
pregunta es la misma del capítulo anterior, solo que apuntada esta vez al
código de otra persona: ¿guarda el singleton del paquete estado mutable
que se supone que solo debe ser correcto para una petición? Si es así, hay
tres caminos, y no son equivalentes.

El más rápido es `scoped_services` en la configuración, "enfoque uno": el
paquete se resuelve de nuevo en cada petición, y su propio código
permanece intacto.

```php
// config/async.php
'scoped_services' => [
    \SomePackage\Manager::class,
],
```

Si recrearlo es costoso (el paquete es caro de inicializar, o guarda en
caché algo útil entre peticiones por su cuenta), escribe un adaptador
específico siguiendo el patrón de `AsyncPermissionRegistrar` o
`AsyncDebugbar` de este capítulo: extiéndelo con una subclase, añade un
`bootCompleted()`, mueve a `current_context()` solo lo que realmente
cambia de una petición a otra, deja el resto tal cual.

Y si no es un servicio independiente sino un patrón profundamente
arraigado como `Livewire`, no gastes una semana adaptándolo solo para
descubrir una semana después que `wire:stream` está roto por razones
arquitectónicas. Ejecuta `MutableStaticPropertyRule` del capítulo anterior
contra el código fuente del paquete: si los hallazgos se cuentan por
decenas y golpean el núcleo mismo del paquete en lugar de cachés seguras
de arranque, esa es una señal para excluirlo del modo async, no para
arreglarlo.

Hemos cubierto tu propio código, el núcleo de Laravel y su ecosistema
circundante. Lo que queda es ver los números: cuánto más rápida se vuelve
realmente una aplicación una vez que todo esto está en su sitio.
