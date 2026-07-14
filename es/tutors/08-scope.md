---
layout: tutorial
lang: es
path_key: "/tutors/08-scope.html"
nav_active: docs
permalink: /es/tutors/08-scope.html
page_title: "Scope"
description: "Scope: quién posee las corrutinas, espera a que terminen y cancela todo el grupo."
---

# Scope

En el capítulo anterior arrancamos diez workers y cerramos el canal. El archivo
está leído, se ha llamado a `close()`, y el flujo principal ha seguido adelante. Pero espera:
los workers todavía siguen procesando el búfer. La función de importación ya
ha devuelto el control, y el trabajo no está hecho. Si el script de PHP terminara
ahora mismo, algunas direcciones quedarían sin comprobar.

Y una segunda preocupación de ese mismo capítulo: ¿qué pasa si `checkAddress` dentro de un
worker lanza una excepción? Por el capítulo sobre excepciones sabemos que se
almacenará en el handle de la corrutina, esperando un `await`. Pero nadie iba
a hacer `await` de los workers. El error saldría a la superficie justo al final, cuando
sea demasiado tarde para arreglar nada.

Ambos problemas pueden resolverse a mano: reunir las corrutinas en un array y
hacer `await` de cada una.

```php
$workers = [];

for ($i = 0; $i < 10; $i++) {
    $workers[] = spawn(worker(...), $queue);
}

// ... leyendo el archivo ...

foreach ($workers as $worker) {
    await($worker);
}
```

Funciona. Pero es contabilidad manual: tienes que acordarte de preparar el array, llevarlo
por todo el recorrido del código e iterarlo al final. Y si una
corrutina se arranca en algún lugar profundo dentro de una función llamada, ni siquiera
llega a ese array. Lo que queremos es que las corrutinas sepan por sí solas
a quién pertenecen.

Para eso está `Scope`.

## Un cajón de arena para corrutinas

`Scope` es un espacio en el que viven las corrutinas. Conoce cada corrutina
arrancada dentro de él y puede tratarlas como un grupo:

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;

$queue = new Channel(100);
$workers = new Scope();

for ($i = 0; $i < 10; $i++) {
    $workers->spawn(function () use ($queue) {
        foreach ($queue as $address) {
                checkAddress($address);
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
$workers->awaitCompletion(timeout(60000));

echo "Import finished, all addresses checked\n";
```

La diferencia con el capítulo anterior son dos líneas: `$workers->spawn()`
en lugar de `spawn()`, y `awaitCompletion()` al final. El método `awaitCompletion`
espera hasta que cada corrutina del scope termina, sean las que sean. Sin
array, sin contabilidad manual: el scope lleva la cuenta por sí solo.

El token de cancelación aquí no es opcional, es un argumento obligatorio: un scope
deliberadamente no te deja esperar sobre un grupo sin un límite. El familiar
`timeout` encaja bien, y si la importación no llega a tiempo en un minuto, la
espera se interrumpe con una `OperationCanceledException`, y depende de ti
decidir: esperar un poco más, o cancelar el grupo.

## Los errores ya no se pierden

Volvamos al worker que se cayó. Una corrutina dentro de un scope no puede morir
en silencio: una excepción no gestionada burbujea hasta el scope padre. Por defecto,
un scope reacciona con severidad: un error en una corrutina cancela todas las demás, y
la excepción se entrega a quien esté esperando en `awaitCompletion`.

```php
try {
    $workers->awaitCompletion(timeout(60000));
} catch (RemoteApiException $e) {
    echo "Import aborted: {$e->getMessage()}\n";
}
```

Esta estrategia se llama fail-together: el grupo o termina como un todo,
o se detiene como un todo. Para la importación, eso es razonable: si `GeoDirectory` se cae,
no tiene sentido bombardearlo con los nueve workers restantes.

Pero la severidad no siempre es lo que quieres. Una dirección mala en el archivo no es
razón para abandonar las otras noventa y nueve mil. En ese caso, le asignas
al scope un manejador de errores, y las corrutinas se vuelven independientes: la que falla
se registra, el resto sigue trabajando:

```php
$workers->setExceptionHandler(function ($scope, $coroutine, Throwable $e) {
    error_log("Address not checked: {$e->getMessage()}");
});
```

Además de la propia excepción, el manejador recibe el scope y la corrutina
fallida: útil para averiguar exactamente quién murió, o para reiniciar el trabajo.

La elección de la estrategia depende de ti, y esa es la diferencia principal con un
`spawn` corriente: allí, la única estrategia es "dispara y olvida".

## Cancelar todo el grupo

En el capítulo sobre la cancelación detuvimos una sola corrutina con `cancel()`.
Un scope hace lo mismo para todo un grupo a la vez:

```php
$workers->cancel();
```

Cada corrutina de dentro recibe la familiar `AsyncCancellation` en su propio
punto de espera: unas en `recv`, otras en `delay`. El mecanismo es el mismo,
cooperativo, solo que la señal sale para todos a la vez.

Un scope puede contener scopes hijos, y la cancelación fluye hacia abajo por la jerarquía
de forma recursiva: cancela el padre, y toda la rama se cancela. Las corrutinas
dejan de ser un montón disperso de tareas independientes y forman un árbol, donde cada
una tiene un lugar y un dueño. Este enfoque se llama concurrencia estructurada,
y ya se ha probado en Kotlin, Swift y Java. TrueAsync lo trae
a PHP.

## Un scope pertenece a un objeto

El uso más elegante de un scope: entregar su propiedad a un objeto.

```php
use Async\Scope;

final class ImportService
{
    private Scope $scope;

    public function __construct()
    {
        $this->scope = new Scope();
    }

    public function import(string $path): void
    {
        $this->scope->spawn(/* workers y lectura del archivo */);
        $this->scope->spawn(/* la corrutina de progreso del primer capítulo */);
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}
```

El tiempo de vida de las corrutinas ahora coincide con el tiempo de vida del servicio.
Mientras el objeto exista, sus corrutinas siguen trabajando. Destruye el objeto,
y `dispose()` cancela todo lo que hubiera conseguido arrancar.

¿Recuerdas `$progress->cancel()` del primer capítulo? Capturamos manualmente el
momento en que la corrutina de progreso dejó de ser necesaria. Con un scope, esa
cuestión simplemente desaparece: el progreso se necesita durante todo el tiempo que dure la importación,
y esta dura exactamente lo que vive `ImportService`. La propiedad se
expresa directamente en el código, y ya no hay sitio donde olvidar una
corrutina.

## Toda la importación, de principio a fin

Juntemos todo lo que hemos ido acumulando a lo largo de ocho capítulos en una
clase que funcione: las corrutinas y el progreso del primer capítulo, el
canal consciente del backpressure del séptimo, el scope de este.

```php
use Async\Scope;
use Async\Channel;
use Async\ChannelException;
use function Async\delay;
use function Async\timeout;

final class ImportService
{
    private Scope $scope;

    public function __construct(private readonly int $workers = 10)
    {
        $this->scope = new Scope();
    }

    public function import(string $path, int $total): void
    {
        $queue = new Channel(100);
        $counter = 0;

        // Workers: sacan direcciones del canal, no más de $this->workers de forma concurrente
        for ($i = 0; $i < $this->workers; $i++) {
            $this->scope->spawn(function () use ($queue, &$counter) {
                foreach ($queue as $address) {
                        checkAddress($address);
                        $counter++;
                }
            });
        }

        // Progreso: dibuja el estado una vez por segundo hasta que la importación termina
        $this->scope->spawn(function () use (&$counter, $total) {
            while ($counter < $total) {
                printProgress($counter, $total);
                delay(1000);
            }
            printProgress($total, $total);
        });

        // Productor: lee el archivo, el backpressure del canal protege la memoria
        $handle = fopen($path, 'r');
        $header = fgetcsv($handle);
        $addressIndex = array_search('address', $header);

        while (($row = fgetcsv($handle)) !== false) {
            $queue->send($row[$addressIndex]);
        }

        fclose($handle);
        $queue->close();

        // Espera a todo: tanto los workers como la corrutina de progreso
        $this->scope->awaitCompletion(timeout(600000));
    }

    public function __destruct()
    {
        $this->scope->dispose();
    }
}

$importer = new ImportService();
$importer->import('users.csv', 100_000);
```

Un par de detalles que merecen una mirada más cercana. El progreso ya no es un bucle
infinito: la condición `while ($counter < $total)` lo termina de forma cooperativa una vez que la
última dirección ha sido procesada, así que `awaitCompletion` espera a todo
sin un solo `cancel`. Y `dispose()` en el destructor no juega ningún papel en el
funcionamiento normal en absoluto: es una red de seguridad para cuando la importación lanza una
excepción o el objeto se descarta a mitad de camino.

Eso es lo esencial de scope. `spawn` solo responde a la pregunta "cómo
arranco trabajo concurrente". Scope se encarga de las preguntas que vienen justo después:
quién espera ese trabajo, quién se entera de un error, y quién lo detiene.
Sin un scope, una corrutina queda a su suerte; dentro de un scope,
tiene un dueño y un lugar en la estructura del programa.

Hasta ahora los workers solo han estado leyendo del mundo exterior. Pero las direcciones
comprobadas todavía necesitan guardarse en una base de datos. ¿Podemos simplemente entregar a diez
corrutinas un único objeto `PDO`? Una buena pregunta para abrir el próximo capítulo.
