---
layout: docs
lang: fr
path_key: "/docs/frankenphp.html"
nav_active: docs
permalink: /fr/docs/frankenphp.html
page_title: "FrankenPHP"
description: "Exécuter TrueAsync PHP avec FrankenPHP — démarrage rapide avec Docker, compilation depuis les sources, configuration du Caddyfile, point d'entrée du worker asynchrone, redémarrage progressif et dépannage."
---

# FrankenPHP + TrueAsync

[FrankenPHP](https://frankenphp.dev) est un serveur d'applications PHP construit sur [Caddy](https://caddyserver.com).
Il intègre le runtime PHP directement dans un processus Go, éliminant ainsi la surcharge d'un proxy FastCGI séparé.

Dans le fork TrueAsync de FrankenPHP, un seul thread PHP gère **de nombreuses requêtes simultanément** —
chaque requête HTTP entrante obtient sa propre coroutine, et l'ordonnanceur TrueAsync bascule entre elles
pendant qu'elles attendent les E/S.

```
FPM traditionnel / FrankenPHP classique :
  1 requête → 1 thread  (bloqué pendant les E/S)

TrueAsync FrankenPHP :
  N requêtes → 1 thread  (coroutines, E/S non bloquantes)
```

## Démarrage rapide — Docker

Le moyen le plus rapide de tester cette configuration est d'utiliser l'image Docker pré-construite :

```bash
docker run --rm -p 8080:8080 trueasync/php-true-async:latest-frankenphp
```

Ouvrez [http://localhost:8080](http://localhost:8080) — vous verrez le tableau de bord en direct affichant la version de PHP,
les coroutines actives, la mémoire et le temps de fonctionnement.

### Tags d'image disponibles

| Tag | Description |
|-----|-------------|
| `latest-frankenphp` | Dernière version stable, dernière version de PHP |
| `latest-php8.6-frankenphp` | Dernière version stable, PHP 8.6 |
| `0.6.4-php8.6-frankenphp` | Version spécifique |

### Exécuter votre propre application PHP

Montez le répertoire de votre application et fournissez un `Caddyfile` personnalisé :

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/app:/app \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  trueasync/php-true-async:latest-frankenphp
```

## Installation depuis les sources

La compilation depuis les sources vous donne un binaire `frankenphp` natif en plus du binaire `php`.

### Linux (Ubuntu / Debian)

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Ou de manière interactive — l'assistant vous posera des questions sur FrankenPHP dans le cadre de la sélection des préréglages d'extensions.

Go 1.26+ est requis pour la compilation. S'il n'est pas trouvé, l'installateur le télécharge et l'utilise automatiquement
sans affecter votre installation système.

### macOS

```bash
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | \
  BUILD_FRANKENPHP=true NO_INTERACTIVE=true bash
```

Go est installé via Homebrew si nécessaire.

### Ce qui est installé

Après une compilation réussie, les deux binaires sont placés dans `$INSTALL_DIR/bin/` :

```
~/.php-trueasync/bin/php          # PHP CLI
~/.php-trueasync/bin/frankenphp   # FrankenPHP server binary
```

## Configuration du Caddyfile

FrankenPHP est configuré via un `Caddyfile`. La configuration minimale pour un worker TrueAsync asynchrone :

```caddyfile
{
    admin off
    frankenphp {
        num_threads 4   # total PHP threads across all workers (default: 2× CPU cores)
    }
}

:8080 {
    root * /app
    php_server {
        index off
        file_server off
        worker {
            file /app/entrypoint.php
            num 1
            async
            match /*
        }
    }
}
```

### Directives globales `frankenphp`

| Directive | Description |
|-----------|-------------|
| `num_threads N` | Taille totale du pool de threads PHP. Par défaut `2 × cœurs CPU`. Tous les workers partagent ce pool |

### Directives clés du worker

| Directive | Description |
|-----------|-------------|
| `file` | Chemin vers le script PHP du point d'entrée |
| `num` | Nombre de threads PHP assignés à ce worker. Commencez avec `1` et ajustez en fonction du travail lié au CPU |
| `async` | **Obligatoire** — active le mode coroutine TrueAsync |
| `drain_timeout` | Délai de grâce pour les requêtes en cours lors d'un redémarrage progressif (par défaut `30s`) |
| `match` | Motif d'URL géré par ce worker |

### Workers multiples

Vous pouvez exécuter différents points d'entrée pour différentes routes :

```caddyfile
:8080 {
    root * /app
    php_server {
        worker {
            file /app/api.php
            num 2
            async
            match /api/*
        }
        worker {
            file /app/web.php
            num 1
            async
            match /*
        }
    }
}
```

## Écriture du point d'entrée

Le point d'entrée est un script PHP à longue durée de vie. Il enregistre un callback de traitement des requêtes puis
cède le contrôle à `FrankenPHP`, qui bloque jusqu'à l'arrêt du serveur.

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

set_time_limit(0);

HttpServer::onRequest(function (Request $request, Response $response): void {
    $path = parse_url($request->getUri(), PHP_URL_PATH);

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello from TrueAsync! Path: $path");
    $response->end();
});
```

### Objet Request

```php
$request->getMethod();    // GET, POST, ...
$request->getUri();       // URI complète de la requête
$request->getHeaders();   // Tableau de tous les en-têtes HTTP
$request->getHeader($name); // Valeur d'un en-tête unique
$request->getBody();      // Corps brut de la requête (chaîne)
```

### Objet Response

```php
$response->setStatus(int $code);
$response->setHeader(string $name, string $value);
$response->write(string $data);   // Can be called multiple times (streaming)
$response->end();                 // Finalize and send the response
```

> **Important :** appelez toujours `end()`, même lorsque le corps est vide. `write()` transmet le tampon PHP
> directement à Go sans copie ; `end()` libère la référence d'écriture en attente et signale
> que la réponse est terminée. Omettre `end()` bloquera la requête indéfiniment.

`getBody()` lit le corps complet de la requête en une seule fois et le renvoie sous forme de chaîne. Le corps est
mis en tampon côté Go, donc la lecture est non bloquante du point de vue de PHP.

### E/S asynchrones dans le handler

Comme chaque requête s'exécute dans sa propre coroutine, vous pouvez utiliser librement les appels d'E/S bloquants —
ils suspendront la coroutine au lieu de bloquer le thread :

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Both requests run concurrently in the same PHP thread
    $db   = new PDO('pgsql:host=localhost;dbname=app', 'user', 'pass');
    $rows = $db->query('SELECT * FROM users LIMIT 10')->fetchAll();

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($rows));
    $response->end();
});
```

### Lancement de coroutines supplémentaires

Le handler lui-même est déjà une coroutine, vous pouvez donc lancer (`spawn()`) du travail enfant :

```php
use function Async\spawn;
use function Async\await;

HttpServer::onRequest(function (Request $request, Response $response): void {
    // Fan-out: run two DB queries concurrently
    $users  = spawn(fn() => fetchUsers());
    $totals = spawn(fn() => fetchTotals());

    $data = [
        'users'  => await($users),
        'totals' => await($totals),
    ];

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode($data));
    $response->end();
});
```

## Optimisation

### Nombre de threads du worker (`num`)

Chaque thread PHP exécute une boucle d'ordonnancement TrueAsync. Un seul thread gère déjà des milliers de
requêtes concurrentes liées aux E/S via les coroutines. Ajoutez des threads supplémentaires uniquement lorsque vous avez du travail lié au CPU
qui bénéficie d'un vrai parallélisme (chaque thread s'exécute sur un thread OS séparé grâce au ZTS).

Un bon point de départ :

```
API à forte charge d'E/S :    num 1–2
Charge mixte :                 num = nombre de cœurs CPU / 2
Forte charge CPU :             num = nombre de cœurs CPU
```

## Redémarrage progressif

Les workers asynchrones prennent en charge les **redémarrages bleu-vert** — le code est rechargé sans interrompre les requêtes en cours.

Lorsqu'un redémarrage est déclenché (via l'API admin, un observateur de fichiers ou un rechargement de configuration) :

1. Les anciens threads sont **détachés** — plus aucune nouvelle requête ne leur est acheminée.
2. Les requêtes en cours disposent d'un délai de grâce (`drain_timeout`, par défaut `30s`) pour se terminer.
3. Les anciens threads s'arrêtent et libèrent leurs ressources (notifier, canaux).
4. De nouveaux threads démarrent avec le code PHP mis à jour.

Pendant la fenêtre de drainage, les nouvelles requêtes reçoivent `HTTP 503`. Une fois les nouveaux threads prêts, le trafic reprend normalement.

### Déclenchement via l'API Admin

```bash
curl -X POST http://localhost:2019/frankenphp/workers/restart
```

L'API admin de Caddy écoute sur `localhost:2019` par défaut. Pour l'activer, supprimez `admin off` de
votre bloc global (ou restreignez-la à localhost) :

```caddyfile
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configuration du délai de drainage

```caddyfile
worker {
    file entrypoint.php
    num 2
    async
    drain_timeout 30s   # grace period for in-flight requests (default 30s)
    match /*
}
```

## Vérification de l'installation

```bash
# Version
frankenphp version

# Start with a config
frankenphp run --config /etc/caddy/Caddyfile

# Validate the Caddyfile without starting
frankenphp adapt --config /etc/caddy/Caddyfile
```

Vérifiez que TrueAsync est actif depuis PHP :

```php
var_dump(extension_loaded('true_async')); // bool(true)
var_dump(ZEND_THREAD_SAFE);               // bool(true)
```

## Dépannage

### Les requêtes n'arrivent jamais au handler PHP

Assurez-vous que le worker a `async` activé **et** que le matcher Caddy achemine le trafic vers celui-ci.
Sans `match *` (ou un motif spécifique), aucune requête n'atteint le worker asynchrone.

### `undefined reference to tsrm_*` lors de la compilation

PHP a été compilé avec `--enable-embed=shared`. Recompilez sans `=shared` :

```bash
./configure --enable-embed --enable-zts --enable-async ...
```

### Les requêtes renvoient `HTTP 503`

Tous les threads PHP sont occupés et le délai de grâce est actif (fenêtre de drainage lors d'un redémarrage),
ou la file d'attente des threads est saturée. Augmentez `num` pour ajouter plus de threads, ou réduisez `drain_timeout`
si les déploiements prennent trop de temps.

## Débogage avec Delve

Go 1.25+ émet des informations de débogage **DWARF v5**. Si Delve signale une erreur de compatibilité, recompilez
avec DWARF v4 :

```bash
GOEXPERIMENT=nodwarf5 go build -tags "trueasync,nowatcher" -o frankenphp ./caddy/frankenphp
```

Lancez le débogueur :

```bash
go install github.com/go-delve/delve/cmd/dlv@latest
dlv exec ./frankenphp
```

## Code source

| Dépôt | Description |
|-------|-------------|
| [true-async/frankenphp](https://github.com/true-async/frankenphp/tree/true-async) | Fork TrueAsync de FrankenPHP (branche `true-async`) |
| [true-async/releases](https://github.com/true-async/releases) | Images Docker, installateurs, configuration de build |

Pour une analyse approfondie du fonctionnement interne de l'intégration Go ↔ PHP, consultez la page [Architecture FrankenPHP](/fr/architecture/frankenphp.html).
