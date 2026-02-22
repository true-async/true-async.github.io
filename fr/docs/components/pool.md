---
layout: docs
lang: fr
path_key: "/docs/components/pool.html"
nav_active: docs
permalink: /fr/docs/components/pool.html
page_title: "Async\\Pool"
description: "Async\\Pool -- pool de ressources universel pour les coroutines : creation, acquire/release, healthcheck, circuit breaker."
---

# Async\Pool : pool de ressources universel

## Pourquoi un pool est necessaire

Lorsqu'on travaille avec des coroutines, le probleme du partage des descripteurs d'E/S se pose.
Si le meme socket est utilise par deux coroutines qui ecrivent ou lisent simultanement
des paquets differents, les donnees vont se melanger et le resultat sera imprevisible.
Par consequent, vous ne pouvez pas simplement utiliser le meme objet `PDO` dans differentes coroutines !

D'un autre cote, creer une connexion separee pour chaque coroutine a chaque fois est une strategie tres couteuse.
Cela annule les avantages des E/S concurrentes. C'est pourquoi les pools de connexions sont generalement utilises
pour interagir avec les API externes, les bases de donnees et autres ressources.

Un pool resout ce probleme : les ressources sont creees a l'avance, donnees aux coroutines sur demande,
et restituees pour reutilisation.

```php
use Async\Pool;

// Pool de connexions HTTP
$pool = new Pool(
    factory: fn() => new HttpConnection('api.example.com'),
    destructor: fn($conn) => $conn->close(),
    min: 2,
    max: 10,
);

// Une coroutine prend une connexion, l'utilise et la restitue
$conn = $pool->acquire();
$response = $conn->request('GET', '/users');
$pool->release($conn);
```

## Creer un pool

```php
$pool = new Pool(
    factory:            fn() => createResource(),       // Comment creer une ressource
    destructor:         fn($r) => $r->close(),          // Comment detruire une ressource
    healthcheck:        fn($r) => $r->ping(),           // La ressource est-elle active ?
    beforeAcquire:      fn($r) => $r->isValid(),        // Verification avant distribution
    beforeRelease:      fn($r) => !$r->isBroken(),      // Verification avant restitution
    min:                2,                               // Pre-creer 2 ressources
    max:                10,                              // Maximum 10 ressources
    healthcheckInterval: 30000,                          // Verification toutes les 30 sec
);
```

| Parametre              | Objectif                                                        | Defaut  |
|------------------------|-----------------------------------------------------------------|---------|
| `factory`              | Cree une nouvelle ressource. **Obligatoire**                    | --      |
| `destructor`           | Detruit une ressource lors de sa suppression du pool            | `null`  |
| `healthcheck`          | Verification periodique : la ressource est-elle encore active ? | `null`  |
| `beforeAcquire`        | Verification avant distribution. `false` -- detruire et prendre la suivante | `null`  |
| `beforeRelease`        | Verification avant restitution. `false` -- detruire, ne pas restituer | `null`  |
| `min`                  | Combien de ressources creer a l'avance (pre-chauffage)          | `0`     |
| `max`                  | Maximum de ressources (libres + en cours d'utilisation)         | `10`    |
| `healthcheckInterval`  | Intervalle de verification de sante en arriere-plan (ms, 0 = desactive) | `0`     |

## Acquisition et liberation

### Acquisition bloquante

```php
// Attendre qu'une ressource soit disponible (indefiniment)
$resource = $pool->acquire();

// Attendre au maximum 5 secondes
$resource = $pool->acquire(timeout: 5000);
```

Si le pool est plein (toutes les ressources sont en cours d'utilisation et `max` est atteint), la coroutine **se suspend**
et attend qu'une autre coroutine restitue une ressource. Les autres coroutines continuent de s'executer.

En cas de timeout, une `PoolException` est lancee.

### tryAcquire non bloquant

```php
$resource = $pool->tryAcquire();

if ($resource === null) {
    echo "Toutes les ressources sont occupees, essayons plus tard\n";
} else {
    // Utiliser la ressource
    $pool->release($resource);
}
```

`tryAcquire()` retourne `null` immediatement si aucune ressource n'est disponible. La coroutine n'est pas suspendue.

### Liberation

```php
$resource = $pool->acquire();

try {
    doWork($resource);
} finally {
    // IMPORTANT : toujours restituer la ressource au pool !
    $pool->release($resource);
}
```

Si `beforeRelease` est defini et retourne `false`, la ressource est consideree comme endommagee
et est detruite au lieu d'etre restituee au pool.

## Statistiques

```php
echo $pool->count();       // Total de ressources (libres + en cours d'utilisation)
echo $pool->idleCount();   // Libres, pretes a etre distribuees
echo $pool->activeCount(); // Actuellement utilisees par des coroutines
```

## Fermeture du pool

```php
$pool->close();
```

A la fermeture :
- Toutes les coroutines en attente recoivent une `PoolException`
- Toutes les ressources libres sont detruites via `destructor`
- Les ressources occupees sont detruites lors du `release` suivant

## Healthcheck : verification en arriere-plan

Si `healthcheckInterval` est defini, le pool verifie periodiquement les ressources libres.
Les ressources mortes sont detruites et remplacees par de nouvelles (si le nombre est descendu en dessous de `min`).

```php
$pool = new Pool(
    factory: fn() => new DatabaseConnection($dsn),
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),   // Verification : la connexion est-elle active ?
    min: 3,
    max: 10,
    healthcheckInterval: 10000,                 // Toutes les 10 secondes
);
```

Le healthcheck ne fonctionne que pour les ressources libres. Les ressources occupees ne sont pas verifiees.

## Circuit Breaker

Le pool implemente le pattern **Circuit Breaker** pour la gestion de la disponibilite des services.

### Trois etats

| Etat         | Comportement                                          |
|--------------|-------------------------------------------------------|
| `ACTIVE`     | Tout fonctionne, les requetes passent                 |
| `INACTIVE`   | Service indisponible, `acquire()` lance une exception |
| `RECOVERING` | Mode test, requetes limitees                          |

```php
use Async\CircuitBreakerState;

// Verifier l'etat
$state = $pool->getState(); // CircuitBreakerState::ACTIVE

// Controle manuel
$pool->deactivate();  // Passer a INACTIVE
$pool->recover();     // Passer a RECOVERING
$pool->activate();    // Passer a ACTIVE
```

### Gestion automatique via Strategy

```php
use Async\CircuitBreakerStrategy;

class MyStrategy implements CircuitBreakerStrategy
{
    private int $failures = 0;

    public function reportSuccess(mixed $source): void {
        $this->failures = 0;
        $source->activate();
    }

    public function reportFailure(mixed $source, \Throwable $error): void {
        $this->failures++;
        if ($this->failures >= 5) {
            $source->deactivate();
        }
    }
}

$pool->setCircuitBreakerStrategy(new MyStrategy());
```

La strategie est appelee automatiquement :
- `reportSuccess()` -- lors de la restitution reussie d'une ressource au pool
- `reportFailure()` -- lorsque `beforeRelease` retourne `false` (ressource endommagee)

## Cycle de vie d'une ressource

![Cycle de vie d'une ressource](/diagrams/fr/components-pool/resource-lifecycle.svg)

## Exemple concret : pool de connexions Redis

```php
use Async\Pool;
use function Async\spawn;
use function Async\await;

$redis = new Pool(
    factory: function() {
        $conn = new Redis();
        $conn->connect('127.0.0.1', 6379);
        return $conn;
    },
    destructor: fn($conn) => $conn->close(),
    healthcheck: fn($conn) => $conn->ping(),
    min: 2,
    max: 20,
    healthcheckInterval: 15000,
);

// 100 coroutines lisent en concurrence depuis Redis via 20 connexions
$coroutines = [];
for ($i = 0; $i < 100; $i++) {
    $coroutines[] = spawn(function() use ($redis, $i) {
        $conn = $redis->acquire(timeout: 3000);
        try {
            return $conn->get("key:$i");
        } finally {
            $redis->release($conn);
        }
    });
}

$results = array_map(fn($c) => await($c), $coroutines);
$redis->close();
```

## PDO Pool

Pour PDO, il existe une integration native avec `Async\Pool` qui rend le pooling completement transparent.
Au lieu d'`acquire`/`release` manuels, le pool est gere automatiquement en coulisses.

En savoir plus : [PDO Pool](/fr/docs/components/pdo-pool.html)

## Et ensuite ?

- [Architecture de Async\Pool](/fr/architecture/pool.html) -- details internes, diagrammes, API C
- [PDO Pool](/fr/docs/components/pdo-pool.html) -- pool transparent pour PDO
- [Coroutines](/fr/docs/components/coroutines.html) -- comment fonctionnent les coroutines
- [Channels](/fr/docs/components/channels.html) -- echange de donnees entre coroutines
