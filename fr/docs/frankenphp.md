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

```txt
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

```txt
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

Toutes les données de la requête sont récupérées depuis l'objet `http.Request` de Go via CGO — pas de variables globales SAPI, sûr pour les coroutines concurrentes.

| Méthode | Retour | Description |
|---------|--------|-------------|
| `getMethod()` | `string` | Méthode HTTP (`GET`, `POST`, etc.) |
| `getUri()` | `string` | URI complète de la requête avec query string |
| `getHeader(string $name)` | `?string` | Valeur d'un en-tête unique ou `null` |
| `getHeaders()` | `array` | Tous les en-têtes sous forme `name => value` (les valeurs multiples sont jointes par `, `) |
| `getBody()` | `string` | Corps complet de la requête (lu une seule fois) |
| `getQueryParams()` | `array` | Paramètres de la query string décodés |
| `getCookies()` | `array` | Cookies décodés depuis l'en-tête `Cookie` |
| `getHost()` | `string` | Valeur de l'en-tête Host |
| `getRemoteAddr()` | `string` | Adresse du client (`ip:port`) |
| `getScheme()` | `string` | `http` ou `https` |
| `getProtocolVersion()` | `string` | Protocole (`HTTP/1.1`, `HTTP/2.0`) |
| `getParsedBody()` | `array` | Champs de formulaire (urlencoded + multipart) |
| `getUploadedFiles()` | `array` | Fichiers téléversés sous forme d'objets `UploadedFile` |

### Objet Response

Les en-têtes et le statut sont stockés dans l'objet lui-même (pas dans les variables globales SAPI), sérialisés et envoyés à Go en un seul appel CGO lors de `end()`.

| Méthode | Retour | Description |
|---------|--------|-------------|
| `setStatus(int $code)` | `void` | Définir le statut HTTP (200 par défaut) |
| `getStatus()` | `int` | Obtenir le code de statut actuel |
| `setHeader(string $name, string $value)` | `void` | Définir un en-tête (remplace l'existant) |
| `addHeader(string $name, string $value)` | `void` | Ajouter un en-tête (pour `Set-Cookie`, etc.) |
| `removeHeader(string $name)` | `void` | Supprimer un en-tête |
| `getHeader(string $name)` | `?string` | Obtenir la première valeur d'un en-tête ou `null` |
| `getHeaders()` | `array` | Tous les en-têtes sous forme `name => [values...]` |
| `isHeadersSent()` | `bool` | `end()` a-t-il déjà été appelé |
| `redirect(string $url, int $code = 302)` | `void` | Définir l'en-tête Location + statut |
| `write(string $data)` | `void` | Mettre en tampon le corps de la réponse (peut être appelé plusieurs fois) |
| `end()` | `void` | Envoyer le statut + les en-têtes + le corps au client. **Obligatoire.** |

> **Important :** appelez toujours `end()`, même lorsque le corps est vide. `write()` met en tampon les données
> dans l'objet PHP ; `end()` sérialise les en-têtes et le corps et les copie vers Go en un seul appel CGO.
> Omettre `end()` bloquera la requête indéfiniment.

### Objet UploadedFile

`getUploadedFiles()` renvoie des objets `FrankenPHP\UploadedFile`. Go analyse le multipart via `http.Request.ParseMultipartForm`, enregistre les fichiers dans un répertoire temporaire et transmet les métadonnées à PHP.

| Méthode | Retour | Description |
|---------|--------|-------------|
| `getName()` | `string` | Nom original du fichier |
| `getType()` | `string` | Type MIME |
| `getSize()` | `int` | Taille du fichier en octets |
| `getTmpName()` | `string` | Chemin vers le fichier temporaire |
| `getError()` | `int` | Code d'erreur de téléversement (`UPLOAD_ERR_OK` = 0) |
| `moveTo(string $path)` | `bool` | Déplacer le fichier (rename ou copy+delete) |

Plusieurs fichiers pour un même champ sont renvoyés sous forme de tableau d'objets `UploadedFile`.

### Exemple : Cookies et redirection

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    // Lecture des cookies de la requête
    $cookies = $request->getCookies();

    if (!isset($cookies['session'])) {
        // Définition de plusieurs cookies
        $response->addHeader('Set-Cookie', 'session=abc123; Path=/; HttpOnly');
        $response->addHeader('Set-Cookie', 'theme=dark; Path=/');
        $response->redirect('/welcome');
        $response->end();
        return;
    }

    // Paramètres de la query string
    $params = $request->getQueryParams();
    $name = $params['name'] ?? 'World';

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'text/plain');
    $response->write("Hello, {$name}!");
    $response->end();
});
```

### Exemple : Upload de fichiers

```php
HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();
    $fields = $request->getParsedBody();

    if (isset($files['avatar'])) {
        $file = $files['avatar'];

        if ($file->getError() === UPLOAD_ERR_OK) {
            $file->moveTo('/uploads/' . $file->getName());
            $response->setStatus(200);
            $response->write("Uploaded: {$file->getName()} ({$file->getSize()} bytes)");
        } else {
            $response->setStatus(400);
            $response->write("Upload error: {$file->getError()}");
        }
    } else {
        $response->setStatus(400);
        $response->write('No file uploaded');
    }

    $response->end();
});
```

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

```txt
{
    admin localhost:2019
    frankenphp {
        num_threads 4
    }
}
```

### Configuration du délai de drainage

```txt
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

## Modèle d'exécution

- Chaque thread asynchrone utilise un canal bufferisé avec 1 slot (par défaut). Définissez `buffer_size` pour augmenter la file d'attente de requêtes par thread (maximum 10). Si tous les threads sont occupés et tous les tampons pleins, le client reçoit `503 (ErrAllBuffersFull)`.
- Les requêtes réveillent l'ordonnanceur PHP via un notificateur (`eventfd` sous Linux, `pipe` sur les autres plateformes) plus un chemin rapide via heartbeat pour réduire la latence de réveil.
- `Response::write()` met les données en tampon dans l'objet PHP. `end()` sérialise les en-têtes et le corps et les copie vers Go en un seul appel CGO. Appelez toujours `end()`, même pour un corps vide.
- Lors de l'arrêt, une valeur sentinelle est envoyée dans la file ; la boucle PHP libère les écritures en attente et restaure le handler heartbeat.

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
