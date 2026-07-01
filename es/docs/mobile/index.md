---
layout: docs
lang: es
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /es/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge: un runtime PHP persistente dentro de una app nativa de Android sobre JNI. Arquitectura, intercambio de eventos, llamadas a Kotlin desde PHP, generación de código."
---

# TrueAsync Mobile

(proyecto de demostración, experimental, repositorio
[native-bridge](https://github.com/true-async/native-bridge), Android)

El PHP asíncrono encaja muy bien en aplicaciones de interfaz de usuario: la interfaz no debería
congelarse mientras algo está hablando con la red, leyendo del disco, o esperando la siguiente
acción del usuario. TrueAsync tiene una API en C dedicada a esto: el Trigger Event
(`ZEND_ASYNC_NEW_TRIGGER_EVENT()` en `zend_async_API.h`). Es un objeto con un único método,
`trigger()`, que cualquier código en C o C++ puede llamar desde otro hilo para despertar de
forma segura entre hilos al reactor de PHP y darle el control para procesar el evento.

**native-bridge** implementa exactamente este tipo de integración para Android: PHP se embebe
en la app como un proceso persistente, arranca una sola vez en un hilo en segundo plano,
ejecuta un event loop (el mismo reactor de TrueAsync usado en el resto del ecosistema), y habla
con Kotlin en ambas direcciones.

## Por qué un proceso persistente en vez de solicitud/respuesta

El escenario habitual de PHP es una solicitud web: el proceso arranca, atiende una solicitud, y
termina. Eso no encaja con una app móvil: PHP necesita permanecer vivo mientras la app esté
abierta, y reaccionar a eventos del usuario (toques, sensores, ubicación) de la misma forma que
un manejador reacciona a una solicitud HTTP. Eso es exactamente lo que ofrece native-bridge: PHP
arranca una sola vez cuando la app se inicia y vive en su propio hilo hasta que se detiene
explícitamente, mientras las corrutinas de TrueAsync dentro de ese hilo manejan eventos y
trabajo en segundo plano de forma concurrente.

## Arquitectura del bridge

El bridge funciona en dos direcciones:

1. **De Android a PHP.** Kotlin coloca eventos (un toque, una lectura de sensor, ubicación, un
   evento personalizado arbitrario) en una cola, y PHP los extrae desde su propio loop.
2. **De PHP a Kotlin.** PHP llama a métodos implementados del lado de Kotlin (mostrar un Toast,
   vibrar, copiar texto al portapapeles, etc.).

Ambas direcciones pasan por **JNI (Java Native Interface)**, el mecanismo estándar de Android
que permite que código en C llame a código Kotlin/Java y viceversa. Ninguna de las dos
direcciones pasa datos por JSON ni ningún otro formato de texto: los valores cruzan la frontera
ya tipados, sin conversiones adicionales.

PHP corre en su propio hilo del sistema operativo y nunca bloquea el hilo de interfaz de
Android. Si PHP está esperando datos, el hilo de interfaz sigue respondiendo, y viceversa.

## Dirección 1: eventos de Android a PHP

Kotlin envía eventos por JNI a una cola que PHP lee con `NativeBridge::poll()`. Cuando la cola
está vacía, `poll()` devuelve `null` de inmediato, y la aplicación PHP decide por sí misma si
esperar el siguiente evento o hacer otra cosa mientras tanto (en la app de demostración es una
breve pausa `usleep()`, durante la cual TrueAsync puede ejecutar corrutinas y temporizadores en
segundo plano).

Hay cuatro tipos de eventos: un toque en pantalla, datos de ubicación, datos de sensores
(acelerómetro y similares), y un evento arbitrario con un nombre y un payload de texto. Ese
último tipo es el que usa la app de demostración para marcar pulsaciones de botón:

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

Los primeros tres tipos de evento (toque, ubicación, sensores) no necesitan asignación de
cadenas, así que se mantienen económicos incluso con una tasa de llamadas alta (por ejemplo,
para un flujo de datos de acelerómetro).

## Dirección 2: llamadas de PHP a Kotlin

Cuando PHP llama a un método de módulo, por ejemplo `Toast::show('Hello', true)`, hay dos formas
en las que esa llamada puede llegar a Kotlin:

### La ruta genérica

Por defecto, PHP empaqueta los argumentos en un buffer tipado compacto (sin formato tipo JSON,
así que Kotlin lo lee sin analizar texto y sin asignaciones adicionales) y lo envía mediante una
sola llamada a `NativeBridge::invoke()`. Añadir un módulo o método nuevo en esta ruta nunca toca
C: solo cambian Kotlin y el wrapper PHP generado, así que basta con una recompilación Gradle del
lado Kotlin, sin necesidad de reconstruir la biblioteca nativa.

### La ruta rápida: `#[FastPath]`

Para métodos "calientes" que se llaman muy a menudo (por ejemplo, alimentar datos de sensor en
cada frame), la especificación PHP marca el método con el atributo `#[FastPath]`. Para ese
método, el generador emite una función en C tipada dedicada que llama a Kotlin directamente por
JNI, sin buffer intermedio. Este tipo de método requiere reconstruir la biblioteca nativa (el
archivo `.so`) en cada cambio, pero corre más rápido y sin asignaciones adicionales. El
comportamiento del método no cambia, solo la forma en que la llamada cruza la frontera
PHP/Kotlin.

## Describir un módulo: `#[BridgeModule]`

El contrato de un módulo se describe del lado de PHP como una interfaz con el atributo
`#[BridgeModule]`:

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- El nombre del módulo se deriva del nombre de la interfaz (`ToastInterface` se convierte en el
  módulo `Toast`), o se establece explícitamente: `#[BridgeModule('Clipboard')]`.
- `#[Ui]` sobre un método significa que la implementación en Kotlin debe ejecutarse en el hilo
  de interfaz de Android (el generador añade el cambio de hilo por ti).
- `#[FastPath]` sobre un método activa la ruta rápida de llamada descrita arriba.

## Qué genera `tools/bridge/gen.php`

A partir de una especificación PHP (una interfaz `#[BridgeModule]`), el generador reconstruye en
cada ejecución:

- una clase Kotlin con métodos abstractos (`ToastSpec`);
- el código de enrutado de la llamada (Kotlin);
- un wrapper PHP (`Toast::show(...)`) que llama el resto del código de la app PHP;
- para los métodos marcados con `#[FastPath]`, código C tipado que llama a Kotlin directamente.

## Ciclo de vida de la aplicación PHP

1. Kotlin arranca PHP en un hilo en segundo plano y le pasa la ruta al script PHP de entrada.
2. El script PHP llama a `NativeBridge::init()`; a partir de ese momento el bridge está listo
   para aceptar eventos y llamadas.
3. A partir de ahí la aplicación corre en un bucle: extrae eventos mediante `poll()`, los
   maneja, y lanza corrutinas de TrueAsync en segundo plano cuando hace falta (por ejemplo, para
   solicitudes de red).
4. El apagado es ordenado: Kotlin llama a `NativeBridge.stop()`, el bucle PHP lo detecta a
   través de `NativeBridge::shouldStop()`, termina su trabajo, y libera sus recursos
   limpiamente.

## Ejemplo: un contador en un botón

Un ejemplo simplificado basado en la app de demostración: un botón inicia y detiene un contador
infinito, y su valor se actualiza directamente en la interfaz. El inicio y la detención se
implementan con un simple `spawn()`/`cancel()` de una corrutina de TrueAsync, sin bloquear el
hilo de interfaz:

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

Un segundo clic cancela la corrutina `$counter` mediante `cancel()`, y el contador se detiene en
el valor que había alcanzado. El ejemplo completo, con varios contadores independientes, está en
`android/app.php` del repositorio.

## Estado y limitaciones

- Solo se admite Android; el soporte para iOS está planeado pero aún no implementado.
- El bridge por ahora transporta tipos simples: cadenas, enteros, números de punto flotante,
  booleanos. Pasar objetos compuestos (por campo, todavía sin formato de texto) está planeado.
- La dirección PHP a Kotlin es síncrona: un método devuelve su resultado de inmediato; los
  resultados diferidos (asíncronos) aún no se admiten en este lado.
- El opcache de PHP está forzosamente desactivado en Android: el sandbox de la app no le permite
  usar el archivo de bloqueo ni la memoria ejecutable que necesita.
- Se requiere una build de PHP thread-safe (ZTS), ya que PHP corre en su propio hilo del sistema
  operativo en vez de en el hilo principal de la app.

## Véase también

- [Roadmap: TrueAsync Mobile](/es/roadmap.html)
- [Repositorio native-bridge en GitHub](https://github.com/true-async/native-bridge)
