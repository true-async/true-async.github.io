---
layout: docs
lang: fr
path_key: "/docs/components/pdo-pool.html"
nav_active: docs
permalink: /fr/docs/components/pdo-pool.html
page_title: "PDO Pool"
description: "PDO Pool -- pool de connexions base de donnees integre pour les coroutines : pooling transparent, transactions, rollback automatique."
---

# PDO Pool : pool de connexions base de donnees

## Le probleme

Lorsqu'on travaille avec des coroutines, le probleme du partage des descripteurs d'E/S se pose.
Si le meme socket est utilise par deux coroutines qui ecrivent ou lisent simultanement
des paquets differents, les donnees vont se melanger et le resultat sera imprevisible.
Par consequent, vous ne pouvez pas simplement utiliser le meme objet `PDO` dans differentes coroutines !

D'un autre cote, creer une connexion separee pour chaque coroutine a chaque fois est une strategie tres couteuse.
Cela annule les avantages des E/S concurrentes. C'est pourquoi les pools de connexions sont generalement utilises
pour interagir avec les API externes, les bases de donnees et autres ressources.



```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret');

// Dix coroutines utilisent simultanement le meme $pdo
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        // Une autre coroutine a deja appele COMMIT sur cette meme connexion !
        $pdo->commit(); // Chaos
    });
}
```

Vous pourriez creer une connexion separee dans chaque coroutine, mais alors avec mille coroutines vous auriez mille connexions TCP.
MySQL autorise 151 connexions simultanees par defaut. PostgreSQL -- 100.

## La solution : PDO Pool

**PDO Pool** -- un pool de connexions base de donnees integre au coeur de PHP.
Il donne automatiquement a chaque coroutine sa propre connexion depuis un ensemble pre-prepare
et la restitue lorsque la coroutine a termine son travail.

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'secret', [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 2,
    PDO::ATTR_POOL_MAX => 10,
]);

// Dix coroutines -- chacune obtient sa propre connexion
for ($i = 0; $i < 10; $i++) {
    spawn(function() use ($pdo, $i) {
        // Le pool alloue automatiquement une connexion pour cette coroutine
        $pdo->beginTransaction();
        $pdo->exec("INSERT INTO orders (user_id) VALUES ($i)");
        $pdo->commit();
        // La connexion est restituee au pool
    });
}
```

De l'exterieur, le code ressemble a un travail avec un `PDO` ordinaire. Le pool est completement transparent.

## Comment l'activer

Le pool est active via les attributs du constructeur `PDO` :

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED              => true,  // Activer le pool
    PDO::ATTR_POOL_MIN                  => 0,     // Connexions minimales (defaut 0)
    PDO::ATTR_POOL_MAX                  => 10,    // Connexions maximales (defaut 10)
    PDO::ATTR_POOL_HEALTHCHECK_INTERVAL => 30,    // Intervalle de verification de sante (sec, 0 = desactive)
]);
```

| Attribut                    | Signification                                                        | Defaut  |
|-----------------------------|----------------------------------------------------------------------|---------|
| `POOL_ENABLED`              | Activer le pool                                                      | `false` |
| `POOL_MIN`                  | Nombre minimum de connexions maintenues ouvertes par le pool         | `0`     |
| `POOL_MAX`                  | Nombre maximum de connexions simultanees                             | `10`    |
| `POOL_HEALTHCHECK_INTERVAL` | Frequence de verification que la connexion est active (en secondes)  | `0`     |

## Liaison des connexions aux coroutines

Chaque coroutine obtient **sa propre** connexion du pool. Tous les appels a `query()`, `exec()`, `prepare()`
au sein d'une meme coroutine passent par la meme connexion.

```php
$pdo = new PDO($dsn, $user, $password, [
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MAX => 5,
]);

$coro1 = spawn(function() use ($pdo) {
    // Les trois requetes passent par la connexion #1
    $pdo->query("SELECT 1");
    $pdo->query("SELECT 2");
    $pdo->query("SELECT 3");
    // Coroutine terminee -- la connexion #1 retourne au pool
});

$coro2 = spawn(function() use ($pdo) {
    // Toutes les requetes passent par la connexion #2
    $pdo->query("SELECT 4");
    // Coroutine terminee -- la connexion #2 retourne au pool
});
```

Si une coroutine n'utilise plus la connexion (pas de transactions ou de requetes actives),
le pool peut la restituer plus tot -- sans attendre la fin de la coroutine.

## Transactions

Les transactions fonctionnent de la meme maniere que dans PDO ordinaire. Mais le pool garantit
que tant qu'une transaction est active, la connexion est **epinglee** a la coroutine et ne retournera pas au pool.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();

    $pdo->exec("UPDATE accounts SET balance = balance - 100 WHERE id = 1");
    $pdo->exec("UPDATE accounts SET balance = balance + 100 WHERE id = 2");

    $pdo->commit();
    // Ce n'est qu'apres le commit que la connexion peut retourner au pool
});
```

### Rollback automatique

Si une coroutine se termine sans appeler `commit()`, le pool annule automatiquement la transaction
avant de restituer la connexion au pool. C'est une protection contre la perte accidentelle de donnees.

```php
spawn(function() use ($pdo) {
    $pdo->beginTransaction();
    $pdo->exec("DELETE FROM users WHERE id = 1");
    // Oubli de commit()
    // Coroutine terminee -- le pool appellera automatiquement ROLLBACK
});
```

## Cycle de vie d'une connexion

![Cycle de vie d'une connexion dans le pool](/diagrams/fr/components-pdo-pool/connection-lifecycle.svg)

Un diagramme technique detaille avec les appels internes se trouve dans l'[architecture du PDO Pool](/fr/architecture/pdo-pool.html).

## Acces a l'objet Pool

La methode `getPool()` retourne l'objet `Async\Pool` a travers lequel vous pouvez obtenir des statistiques :

```php
$pool = $pdo->getPool();

if ($pool !== null) {
    echo "Pool actif : " . get_class($pool) . "\n"; // Async\Pool
}
```

Si le pool n'est pas active, `getPool()` retourne `null`.

## Quand l'utiliser

**Utilisez PDO Pool quand :**
- L'application s'execute en mode asynchrone avec TrueAsync
- Plusieurs coroutines accedent simultanement a la base de donnees
- Vous devez limiter le nombre de connexions a la base de donnees

**Pas necessaire quand :**
- L'application est synchrone (PHP classique)
- Une seule coroutine travaille avec la base de donnees
- Les connexions persistantes sont utilisees (elles sont incompatibles avec le pool)

## Pilotes supportes

| Pilote       | Support du pool |
|--------------|-----------------|
| `pdo_mysql`  | Oui             |
| `pdo_pgsql`  | Oui             |
| `pdo_sqlite` | Oui             |
| `pdo_odbc`   | Non             |

## Gestion des erreurs

Si le pool ne peut pas creer une connexion (mauvais identifiants, serveur indisponible),
l'exception est propagee a la coroutine qui a demande la connexion :

```php
$pdo = new PDO('mysql:host=localhost;dbname=app', 'root', 'wrong_password', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED => true,
    PDO::ATTR_POOL_MIN => 0,
]);

spawn(function() use ($pdo) {
    try {
        $pdo->query("SELECT 1");
    } catch (PDOException $e) {
        echo "Echec de connexion : " . $e->getMessage() . "\n";
    }
});
```

Notez `POOL_MIN => 0` : si vous definissez le minimum superieur a zero, le pool essaiera
de creer des connexions a l'avance, et l'erreur se produira lors de la creation de l'objet PDO.

## Exemple concret : traitement parallele de commandes

```php
use function Async\spawn;
use function Async\await;

$pdo = new PDO('mysql:host=localhost;dbname=shop', 'app', 'secret', [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_POOL_ENABLED       => true,
    PDO::ATTR_POOL_MIN           => 2,
    PDO::ATTR_POOL_MAX           => 5,
]);

// Obtenir la liste des commandes a traiter
$orders = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];

$coroutines = [];
foreach ($orders as $orderId) {
    $coroutines[] = spawn(function() use ($pdo, $orderId) {
        // Chaque coroutine obtient sa propre connexion du pool
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? FOR UPDATE");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if ($order['status'] === 'pending') {
            $pdo->exec("UPDATE orders SET status = 'processing' WHERE id = $orderId");
            $pdo->exec("INSERT INTO order_log (order_id, action) VALUES ($orderId, 'started')");
        }

        $pdo->commit();
        return $orderId;
    });
}

// Attendre la fin de toutes les coroutines
foreach ($coroutines as $coro) {
    $processedId = await($coro);
    echo "Commande #$processedId traitee\n";
}
```

Dix commandes sont traitees en concurrence, mais a travers un maximum de cinq connexions a la base de donnees.
Chaque transaction est isolee. Les connexions sont reutilisees entre les coroutines.

## Et ensuite ?

- [Demo interactive du PDO Pool](/fr/interactive/pdo-pool-demo.html) -- une demonstration visuelle du fonctionnement du pool de connexions
- [Architecture du PDO Pool](/fr/architecture/pdo-pool.html) -- details internes du pool, diagrammes, cycle de vie des connexions
- [Coroutines](/fr/docs/components/coroutines.html) -- comment fonctionnent les coroutines
- [Scope](/fr/docs/components/scope.html) -- gestion de groupes de coroutines
- [spawn()](/fr/docs/reference/spawn.html) -- lancement de coroutines
- [await()](/fr/docs/reference/await.html) -- attente de resultats
