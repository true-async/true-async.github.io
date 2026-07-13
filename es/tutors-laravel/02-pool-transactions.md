---
layout: tutorial
lang: es
path_key: "/tutors-laravel/02-pool-transactions.html"
nav_active: docs
permalink: /es/tutors-laravel/02-pool-transactions.html
page_title: "Pool de conexiones y transacciones"
description: "PDO Pool bajo Eloquent y CoroutineTransactions: por qué el contador de transacciones anidadas no puede quedarse en una propiedad de Connection."
---

# Pool de conexiones y transacciones

`Auth`, `session`, `request`: los resolvimos en el capítulo anterior,
contexto más un proxy, y el framework dejó de confundir peticiones. La base
de datos parece incluso más sencilla: el capítulo nueve de la serie del
núcleo ya lo resolvió, el `PDO Pool` le entrega a cada corrutina su propia
conexión y la recupera por su cuenta. ¿Qué podría salir mal aquí para
`Eloquent`?

Puede salir mal. El pool gestiona la conexión de forma transparente. Pero
no sabe nada de otro trozo de estado que `Laravel` guarda justo al lado de
esa conexión: el contador de anidamiento de transacciones.

## Dónde vive `transactionLevel()`

Dentro de `Illuminate\Database\Connection` hay una propiedad de instancia
corriente:

```php
protected $transactions = 0;
```

`beginTransaction()` la incrementa, `commit()` y `rollBack()` la
decrementan. Mientras una `Connection` sirva a un solo proceso, esto tiene
todo el sentido: una propiedad, una transacción. Pero `PDO Pool` opera una
capa por debajo de `Connection`. Intercambia la conexión física por debajo
del objeto, mientras que el objeto `Connection` en sí, ese al que
`$this->transactions` está adjunta, sigue siendo una única instancia
compartida por todo el `DatabaseManager`.

Repitamos el escenario del capítulo anterior, esta vez con la base de
datos:

```php
$server->addHttpHandler(function ($request, $response) {
    DB::transaction(function () use ($request) {
        Order::create(['user_id' => $request->getQueryParam('u')]);
        delay(30); // la corrutina se duerme justo dentro de la transacción
    });

    $response->json(['ok' => true]);
});
```

Dos peticiones entran en `DB::transaction()` de forma concurrente. El pool
entrega honestamente dos conexiones físicas, cada una la suya. Pero
`$this->transactions` es el mismo número para ambas en el mismo objeto
`Connection`. La primera corrutina sube el contador a `1`, y luego se
duerme. La segunda también lo sube, pero ahora a `2`, aunque para ella esto
debería haber sido una transacción externa en el nivel `1`. `commit()` en
la primera corrutina multiplica contra el nivel de anidamiento equivocado,
y Laravel emite silenciosamente un `SAVEPOINT` donde no debería, o hace
commit de una transacción anticipadamente que una corrutina vecina todavía
mantiene abierta.

## Misma receta, distinto ámbito: la corrutina, no el árbol de la petición

En el capítulo anterior el estado de `auth` vivía en el contexto de scope
porque se comparte entre todas las corrutinas de una misma petición. El
contador de transacciones está construido de otra manera: `PDO Pool`
entrega una conexión física por *corrutina*, no por petición completa (un
`TaskGroup` paralelo dentro de un handler obtiene dos conexiones distintas
del pool). Así que el contador tiene que vivir en el contexto de corrutina,
no en el contexto de scope:

```php
trait CoroutineTransactions
{
    private const CTX_TRANSACTIONS = 'db.transactions';

    public function transactionLevel()
    {
        if ($this->isAsyncMode()) {
            return coroutine_context()->find(self::CTX_TRANSACTIONS) ?? 0;
        }

        return $this->transactions;
    }

    private function setTransactionLevel(int $level): void
    {
        if ($this->isAsyncMode()) {
            coroutine_context()->set(self::CTX_TRANSACTIONS, $level, replace: true);
        } else {
            $this->transactions = $level;
        }
    }

    // beginTransaction(), commit(), rollBack() y los manejadores de errores
    // se sobrescriben de la misma manera: en lugar de leer y escribir
    // $this->transactions, pasan por setTransactionLevel()/transactionLevel().
}
```

`coroutine_context()` frente a `current_context()`, esa es exactamente la
frontera discutida en el capítulo de `Context` de la serie del núcleo: el
primero es privado a una sola corrutina, el segundo se comparte a lo largo
de todo el árbol de corrutinas de una petición. La elección aquí no es una
cuestión de estilo, es obligatoria: si los confundes, dos viajes paralelos
a la base de datos dentro de una misma petición vuelven a compartir el
contador de transacciones de otro, el agujero simplemente se mueve un piso
más arriba.

El trait no reescribe `Connection` por completo, intercepta
quirúrgicamente los métodos que tocan `$this->transactions`, y está
adjunto a una clase de conexión específica:

```php
class AsyncPgsqlConnection extends PostgresConnection
{
    use CoroutineTransactions;
}
```

Hay una clase separada por cada `DBMS`, `AsyncPgsqlConnection`,
`AsyncMySqlConnection`, `AsyncMariaDbConnection`, `AsyncSqliteConnection`,
`AsyncSqlServerConnection`, porque las clases padre de Laravel ya difieren
entre sí, mientras que el trait de aislamiento del contador es el mismo
para todas.

## Por qué no puedes simplemente poner en scope todo el `DatabaseManager`

La tentación está ahí: ya que sabemos cómo esconder un servicio detrás del
contexto (`ScopedServiceProxy` del capítulo anterior), ¿por qué no hacer lo
mismo con `db`? La razón por la que esto no ocurre es bastante desagradable.
`DatabaseServiceProvider::boot()` escribe esto una sola vez al arrancar:

```php
Model::setConnectionResolver($app['db']);
```

Eso es una propiedad estática en la propia clase `Model`, compartida por
todos los modelos y todas las peticiones. Si `db` se resolviera de forma
distinta para cada scope, esta referencia estática seguiría apuntando al
`DatabaseManager` de la petición que la creó primero. Una vez que el scope
de esa petición termina y se limpia, el objeto al que apunta
`Model::$resolver` queda recolectado por el garbage collector, y la
propiedad estática se queda apuntando a memoria muerta. El resultado no es
"datos equivocados", es todo el proceso cayéndose.

Así que `db` sigue siendo un singleton, como siempre lo fue. El
aislamiento de conexiones físicas es tarea de `PDO Pool` a nivel de `C`, no
del contenedor de dependencias. El aislamiento del contador de
transacciones es tarea del trait a nivel de una sola corrutina. Dos
herramientas estrechas y precisas en lugar de una gran refactorización que
además tumbaría el servidor.

Hemos tratado el estado de la petición y el estado de la transacción.
Laravel maneja las respuestas HTTP ordinarias por su cuenta, almacenándolas
enteras en un buffer. Pero, ¿qué pasa si la respuesta no es algo único,
sino un flujo: una barra de progreso hacia el navegador, o una llamada
desde un servicio vecino por gRPC? Ahí es adonde vamos en el próximo
capítulo.
