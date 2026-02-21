---
layout: docs
lang: it
path_key: "/docs/components/introduction.html"
nav_active: docs
permalink: /it/docs/components/introduction.html
page_title: "Perché l'asincronia?"
description: "Cos'è l'asincronia e perché ne hai bisogno?"
---

## Come funziona il PHP tradizionale (FPM)

![Modello FPM](../../../assets/docs/fpm_model.jpg)

Se un'applicazione server PHP fosse un ristorante, sarebbe probabilmente considerato un locale d'élite
dove ogni tavolo è servito da un cameriere dedicato.

Ogni nuova richiesta al server è gestita da una VM PHP, un processo o un thread separato,
dopo di che lo stato viene distrutto.
Questo equivale a un cameriere che serve un tavolo e poi viene licenziato o gli viene cancellata la memoria.

Questo modello ha un vantaggio: se si verifica un errore PHP, un memory leak,
una connessione al database dimenticata -- non influenza le altre richieste. Ogni richiesta è isolata.
Ciò significa che lo sviluppo è più semplice, il debug è più semplice e c'è un'alta tolleranza ai guasti.

Negli ultimi anni, la comunità PHP ha cercato di introdurre un modello stateful,
dove una singola VM PHP può servire più richieste, preservando lo stato tra di esse.
Ad esempio, il progetto Laravel Octane, che utilizza Swoole o RoadRunner, ottiene prestazioni migliori
preservando lo stato tra le richieste.
Ma questo è lontano dal limite di ciò che è possibile.

Licenziare un cameriere dopo ogni ordine è troppo costoso.
Poiché i piatti vengono preparati lentamente in cucina, il cameriere trascorre la maggior parte del tempo in attesa.
La stessa cosa accade con PHP-FPM: la VM PHP resta inattiva.
Ci sono più context switch,
più overhead per la creazione e la distruzione di processi o thread,
e un maggiore consumo di risorse.

```php
// PHP-FPM tradizionale
$user = file_get_contents('https://api/user/123');     // fermo in attesa 300ms
$orders = $db->query('SELECT * FROM orders');          // fermo in attesa 150ms
$balance = file_get_contents('https://api/balance');   // fermo in attesa 200ms

// Tempo speso: 650ms di pura attesa
// La CPU è inattiva. La memoria è inattiva. Tutto è in attesa.
```

## Concorrenza

![Modello di Concorrenza](../../../assets/docs/concurrency_model.jpg)

Poiché la cucina non può preparare i piatti istantaneamente,
e il cameriere ha del tempo morto tra le preparazioni,
c'è l'opportunità di gestire ordini da più clienti.

Questo schema può funzionare in modo piuttosto flessibile:
Il Tavolo 1 ha ordinato tre piatti.
Il Tavolo 2 ha ordinato due piatti.
Il cameriere porta il primo piatto al tavolo 1, poi il primo piatto al tavolo 2.
O forse è riuscito a portare due piatti al primo tavolo e uno al secondo. O viceversa!

Questa è la concorrenza: la condivisione di una singola risorsa (`CPU`) tra diversi thread di esecuzione logici,
che sono chiamati coroutine.

```php
use function Async\spawn;
use function Async\await;

// Lancia tutte e tre le richieste "concorrentemente"
$userTask = spawn(file_get_contents(...), 'https://api/user/123');
$ordersTask = spawn($db->query(...), 'SELECT * FROM orders');
$balanceTask = spawn(file_get_contents(...), 'https://api/balance');

// Mentre una richiesta è in attesa di risposta, ne facciamo altre!
$user = await($userTask);
$orders = await($ordersTask);
$balance = await($balanceTask);

// Tempo speso: 300ms (il tempo della richiesta più lenta)
```

## Concorrenza non è Parallelismo

È importante capire la differenza.

**Concorrenza** -- come in `True Async`, `JavaScript`, `Python`:
- Un cameriere che passa rapidamente tra i tavoli
- Un thread PHP che passa tra le attività
- Le attività sono **alternate**, ma non eseguite simultaneamente
- Nessuna race condition -- solo una coroutine è in esecuzione in ogni momento

**Parallelismo** -- questo è il multithreading (`Go`):
- Più camerieri lavorano simultaneamente
- Più thread eseguono su diversi core della CPU
- Le attività vengono eseguite **veramente in simultanea**
- Sono necessari mutex, lock e tutto quel dolore

## E adesso?

Ora comprendi l'essenza. Puoi approfondire:

- [Efficienza](../evidence/concurrency-efficiency.md) -- quante coroutine servono per le massime prestazioni
- [Base di evidenze](../evidence/coroutines-evidence.md) -- misurazioni, benchmark e ricerche che confermano l'efficacia delle coroutine
- [Swoole in pratica](../evidence/swoole-evidence.md) -- misurazioni reali: Appwrite +91%, IdleMMO 35M req/giorno, benchmark con DB
- [Python asyncio in pratica](../evidence/python-evidence.md) -- Duolingo +40%, Super.com -90% costi, Instagram, benchmark uvloop
- [Coroutine](coroutines.md) -- come funzionano internamente
- [Scope](scope.md) -- come gestire gruppi di coroutine
- [Scheduler](scheduler.md) -- chi decide quale coroutine eseguire
