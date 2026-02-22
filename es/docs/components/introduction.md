---
layout: docs
lang: es
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /es/docs/components/introduction.html
page_title: "Por Que Asincronia?"
description: "Que es la asincronia y por que la necesitas?"
---

## Como Funciona PHP Tradicional (FPM)

![Modelo FPM](../../../assets/docs/fpm_model.jpg)

Si una aplicacion de servidor PHP fuera un restaurante, probablemente seria considerada un establecimiento de elite
donde cada mesa es atendida por un camarero dedicado.

Cada nueva solicitud al servidor es manejada por una VM de PHP separada, proceso o hilo,
tras lo cual el estado se destruye.
Esto es equivalente a un camarero que atiende una mesa y luego es despedido o se le borra la memoria.

Este modelo tiene una ventaja: si ocurre un error de PHP, una fuga de memoria,
una conexion de base de datos olvidada -- no afecta a otras solicitudes. Cada solicitud esta aislada.
Esto significa que el desarrollo es mas simple, la depuracion es mas simple, y hay alta tolerancia a fallos.

En los ultimos anos, la comunidad PHP ha estado intentando introducir un modelo con estado,
donde una sola VM de PHP puede atender multiples solicitudes, preservando el estado entre ellas.
Por ejemplo, el proyecto Laravel Octane, que usa Swoole o RoadRunner, logra un mejor rendimiento
al preservar el estado entre solicitudes.
Pero esto esta lejos del limite de lo posible.

Despedir a un camarero despues de cada pedido es demasiado costoso.
Porque los platos se preparan lentamente en la cocina, el camarero pasa la mayor parte de su tiempo esperando.
Lo mismo sucede con PHP-FPM: la VM de PHP permanece inactiva.
Hay mas cambios de contexto,
mas sobrecarga por la creacion y destruccion de procesos o hilos,
y mayor consumo de recursos.

```php
// PHP-FPM tradicional
$user = file_get_contents('https://api/user/123');     // parado esperando 300ms
$orders = $db->query('SELECT * FROM orders');          // parado esperando 150ms
$balance = file_get_contents('https://api/balance');   // parado esperando 200ms

// Tiempo gastado: 650ms de pura espera
// CPU inactiva. Memoria inactiva. Todo esperando.
```

## Concurrencia

![Modelo de Concurrencia](../../../assets/docs/concurrency_model.jpg)

Como la cocina no puede preparar platos instantaneamente,
y el camarero tiene tiempo inactivo entre preparaciones,
hay una oportunidad de manejar pedidos de multiples clientes.

Este esquema puede funcionar de manera bastante flexible:
La mesa 1 pidio tres platos.
La mesa 2 pidio dos platos.
El camarero lleva el primer plato a la mesa 1, luego el primer plato a la mesa 2.
O quiza logro llevar dos platos a la primera mesa y uno a la segunda. O al reves!

Esto es concurrencia: compartir un solo recurso (`CPU`) entre diferentes hilos logicos de ejecucion,
que se llaman corrutinas.

```php
use function Async\spawn;
use function Async\await;

// Lanzar las tres solicitudes "concurrentemente"
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// Mientras una solicitud espera respuesta, hacemos las otras!
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// Tiempo gastado: 300ms (el tiempo de la solicitud mas lenta)
```

## Concurrencia no es Paralelismo

Es importante entender la diferencia.

**Concurrencia** -- como en `True Async`, `JavaScript`, `Python`:
- Un camarero cambia rapidamente entre mesas
- Un hilo PHP cambia entre tareas
- Las tareas se **entrelazan**, pero no se ejecutan simultaneamente
- Sin condiciones de carrera -- solo una corrutina se ejecuta en cualquier momento dado

**Paralelismo** -- esto es multihilo (`Go`):
- Multiples camareros trabajan simultaneamente
- Multiples hilos se ejecutan en diferentes nucleos de CPU
- Las tareas se ejecutan **verdaderamente al mismo tiempo**
- Se requieren mutexes, bloqueos, todo ese dolor

## Que Sigue?

Ahora entiendes la esencia. Puedes profundizar:

- [Eficiencia](../evidence/concurrency-efficiency.md) -- cuantas corrutinas se necesitan para el rendimiento maximo
- [Base de Evidencia](../evidence/coroutines-evidence.md) -- mediciones, benchmarks e investigaciones que confirman la efectividad de las corrutinas
- [Swoole en Practica](../evidence/swoole-evidence.md) -- mediciones reales: Appwrite +91%, IdleMMO 35M req/dia, benchmarks con BD
- [Python asyncio en Practica](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% costos, Instagram, benchmarks de uvloop
- [Corrutinas](coroutines.md) -- como funcionan internamente
- [Scope](scope.md) -- como gestionar grupos de corrutinas
- [Planificador](scheduler.md) -- quien decide que corrutina ejecutar
