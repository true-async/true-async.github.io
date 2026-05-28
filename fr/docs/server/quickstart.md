---
layout: docs
lang: fr
path_key: "/docs/server/quickstart.html"
nav_active: docs
permalink: /fr/docs/server/quickstart.html
page_title: "TrueAsync Server : démarrage rapide"
description: "Installation de TrueAsync Server, exemple Hello World minimal et vérification du fonctionnement. Linux et Windows."
---

# Démarrage rapide TrueAsync Server

(PHP 8.6+, true_async_server 0.6+)

En cinq minutes : installation de l'extension, handler minimal et vérification de la réponse.

Le serveur est livré **avec TrueAsync PHP** dans toutes les builds prêtes à l'emploi. Si vous avez
déjà TrueAsync PHP installé via l'installateur, l'image Docker ou le ZIP Windows, il suffit
d'activer l'extension dans `php.ini` — pas besoin de recompiler. Si vous souhaitez la construire
manuellement à partir des sources (votre propre version de PHP, votre propre chaîne de dépendances),
voir la section [Compilation depuis les sources](#compilation-depuis-les-sources).

## Docker

Le moyen le plus rapide de tester. L'image prête à l'emploi contient PHP avec TrueAsync et
l'extension `true_async_server` :

```bash
docker run --rm -p 8080:8080 \
  -v $PWD/hello.php:/app/hello.php \
  -w /app \
  trueasync/php-true-async:latest \
  php hello.php
```

Tags disponibles :

| Tag | Description |
|-----|-------------|
| `trueasync/php-true-async:latest` | Ubuntu 24.04 + CLI + FPM, dernière version stable |
| `trueasync/php-true-async:latest-alpine` | Alpine 3.20, lightweight |
| `trueasync/php-true-async:0.6.7-php8.6` | Version spécifique |

Liste complète des tags et anciennes versions sur la [page de téléchargement](/fr/download.html#docker).

## Linux / macOS — installation par script

Le script télécharge les sources, compile TrueAsync PHP avec l'extension serveur et installe le
tout dans `~/.php-trueasync/bin/` :

```bash
# Linux (Ubuntu / Debian)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-linux.sh | bash

# macOS (Apple Silicon / Intel ; Homebrew requis)
curl -fsSL https://raw.githubusercontent.com/true-async/releases/master/installer/build-macos.sh | bash
```

Après installation, `php --ri true_async_server` affichera la liste des protocoles et les versions
des bibliothèques.

Paramètres (à passer via variables d'environnement avant `bash` ou en mode non interactif) :

```bash
curl -fsSL .../build-linux.sh | NO_INTERACTIVE=true bash
```

Les options et le contrôle de l'installation sont décrits sur la [page de téléchargement](/fr/download.html).

## Windows — ZIP

La build prête à l'emploi de TrueAsync PHP pour Windows x64 contient l'extension serveur.
Téléchargez le ZIP depuis [GitHub Releases](https://github.com/true-async/releases/releases) (fichier
de la forme `php-trueasync-X.Y.Z-php8.6-windows-x64.zip`), décompressez, ajoutez le répertoire au
`PATH` et activez dans `php.ini` :

```ini
extension=true_async_server
```

Vérification :

```cmd
php --ri true_async_server
```

> Le batching outbound HTTP/3 utilise `UDP_SEGMENT` (GSO Linux), il n'y a pas d'équivalent sous
> Windows. Le débit HTTP/3 sous Windows est plus bas ; HTTP/1.1, HTTP/2 et TLS fonctionnent sans
> régression.

## Activation de l'extension

Dans toutes les variantes d'installation, il faut ajouter dans `php.ini` :

```ini
extension=true_async_server
```

Et vérifier :

```bash
php --ri true_async_server
```

La sortie listera les protocoles (HTTP/1.1, HTTP/2, HTTP/3, TLS 1.2/1.3) et les versions runtime
d'OpenSSL, nghttp2, ngtcp2, nghttp3, libuv.

---

## Compilation depuis les sources

Si les builds standard ne conviennent pas, il est possible de compiler manuellement.

### Prérequis

| Composant | Minimum | Pourquoi | Note |
|-----------|--------:|----------|------|
| PHP | 8.6 | base | build depuis [TrueAsync php-src](https://github.com/true-async/php-src) |
| `ext-async` | dernier `main` | event-loop, `udp_bind` pour HTTP/3 | |
| OpenSSL | 3.0 (3.5 pour HTTP/3) | TLS, HTTP/3 | HTTP/3 nécessite l'API QUIC TLS d'OpenSSL 3.5 |
| `libnghttp2` | 1.57 | HTTP/2 | floor pour CVE-2023-44487 |
| `libngtcp2` + `libngtcp2_crypto_ossl` | 1.22 | HTTP/3 | backend crypto précisément `_ossl` |
| `libnghttp3` | 1.15 | HTTP/3 | |
| `libuv` | via TrueAsync | base | non liée directement par l'extension |
| `llhttp` | 9.3.0 | HTTP/1.1 | vendored dans `deps/llhttp/` |

> Les paquets de distribution d'OpenSSL/ngtcp2/nghttp3 sont en général trop anciens.
> Il est recommandé de compiler OpenSSL 3.5 + ngtcp2 + nghttp3 depuis les sources sous un préfixe
> commun (`/usr/local` ou `/opt/h3`) et de l'indiquer dans `PKG_CONFIG_PATH` lors du `./configure`.

### Linux

#### 1. Dépendances

```bash
sudo apt-get install -y \
    build-essential autoconf bison re2c pkg-config \
    libcmocka-dev   # pour --enable-tests
```

OpenSSL 3.5, ngtcp2 1.22+ et nghttp3 1.15+ sont à ce jour absents des dépôts de la plupart des
distributions, on les compile donc sous `/usr/local` :

```bash
# OpenSSL 3.5 avec QUIC
git clone --branch openssl-3.5 https://github.com/openssl/openssl
cd openssl && ./Configure --prefix=/usr/local && make -j$(nproc) && sudo make install
sudo ldconfig

# ngtcp2 (backend crypto OpenSSL)
git clone --recursive https://github.com/ngtcp2/ngtcp2
cd ngtcp2 && autoreconf -i \
  && ./configure --prefix=/usr/local --with-openssl --with-libnghttp3 \
                 PKG_CONFIG_PATH=/usr/local/lib/pkgconfig \
  && make -j$(nproc) && sudo make install

# nghttp3
git clone --recursive https://github.com/ngtcp2/nghttp3
cd nghttp3 && autoreconf -i \
  && ./configure --prefix=/usr/local && make -j$(nproc) && sudo make install
```

#### 2. Compilation de l'extension

```bash
git clone https://github.com/true-async/server true-async-server
cd true-async-server
phpize
./configure \
    --enable-http-server \
    --with-php-config="$(which php-config)" \
    PKG_CONFIG_PATH=/usr/local/lib/pkgconfig
make -j$(nproc)
sudo make install
```

HTTP/2 et HTTP/3 sont activés automatiquement quand les dépendances sont présentes
(`libnghttp2 ≥ 1.57` pour H2 ; `libngtcp2 ≥ 1.22`, `libnghttp3 ≥ 1.15`, OpenSSL ≥ 3.5 pour H3).
Pour désactiver : `--disable-http2`, `--disable-http3`.

Drapeaux supplémentaires :

| Drapeau | Effet |
|---------|-------|
| `--enable-tests` | build des tests unitaires avec libcmocka |
| `--enable-coverage` | instrumentation gcov |
| `--without-openssl` | sans TLS (désactive aussi HTTP/3) |
| `--enable-brotli` | activer Brotli (autodetect) |
| `--enable-zstd` | activer zstd (autodetect) |

Ensuite il ne reste plus qu'à activer l'extension dans `php.ini` et vérifier — voir la section
[Activation de l'extension](#activation-de-lextension) ci-dessus.

### Windows

Compilation via le PHP-SDK standard. Les `.lib` statiques pour OpenSSL 3.5, nghttp2, ngtcp2, nghttp3
doivent être disponibles sous `deps\` dans l'arborescence PHP-SDK.

```cmd
REM depuis Visual Studio x64 Native Tools prompt
phpsdk_buildtree phpdev
git clone https://github.com/true-async/php-src.git
cd php-src
git clone https://github.com/true-async/server ext\true_async_server

buildconf.bat
configure.bat ^
    --disable-all ^
    --enable-cli ^
    --enable-async=shared ^
    --enable-http-server=shared ^
    --with-openssl=shared

nmake
```

Le `php_true_async_server.dll` final apparaîtra dans `x64\Release_TS\` (ou `Release\` pour NTS).
Copiez-le dans `ext\` et ajoutez `extension=true_async_server` dans `php.ini`.

## Serveur minimal

```php
<?php
// hello.php

use TrueAsync\HttpServer;
use TrueAsync\HttpServerConfig;

$server = new HttpServer(
    (new HttpServerConfig())
        ->addListener('0.0.0.0', 8080)
);

$server->addHttpHandler(function ($request, $response) {
    $response
        ->setStatusCode(200)
        ->setHeader('Content-Type', 'text/plain')
        ->setBody('Hello, World!');
});

$server->start();   // bloque jusqu'à stop()
```

Lancement :

```bash
php hello.php
```

Vérification :

```bash
curl -i http://localhost:8080/
```

```
HTTP/1.1 200 OK
Content-Type: text/plain
Content-Length: 13

Hello, World!
```

## Suite

- [Configuration](/fr/docs/server/configuration.html) : TLS, timeouts, limites de corps
- [Multi-worker](/fr/docs/server/workers.html) : `setWorkers(N)` et bootloader
- [Exemples](/fr/docs/server/examples.html) : JSON-API, statique, multipart upload, fan-out
- [Référence `HttpServer`](/fr/docs/reference/server/http-server.html)
