---
layout: tutorial
lang: fr
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /fr/tutors-server/05-static.html
page_title: "Fichiers statiques"
description: "StaticHandler : servir des fichiers sans coroutine PHP, mise en cache et politiques de sécurité."
---

# Fichiers statiques

`ProfileService` s'est doté d'un frontend. HTML, CSS, scripts, avatars,
l'habituel. Ils étaient auparavant servis par nginx, mais nous avons
cérémonieusement fait nos adieux à nginx au premier chapitre. Qui les
sert maintenant ?

La première impulsion est compréhensible : écrire un gestionnaire qui
ouvre les fichiers par URL. Stop. Réfléchissez à ce que cela implique :
des milliers de requêtes pour le logo par jour, et pour chacune une
coroutine, une entrée dans PHP, un `fopen`, une sortie. PHP ne fait ici
rien qui requière PHP.

Le serveur résout cela de façon radicale. Une route statique est servie
entièrement en C. Une requête vers elle n'entre jamais dans PHP :

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

Un préfixe d'URL, un répertoire sur le disque, terminé. `GET
/assets/css/app.css` se transforme en une lecture asynchrone du fichier
directement dans le socket, à travers libuv, en contournant PHP. Les
gestionnaires des chapitres précédents continuent de recevoir tout le
reste. Il peut y avoir plusieurs montages, et les correspondances sont
recherchées dans l'ordre d'enregistrement. Toute l'étiquette HTTP de
`sendFile` est également présente ici : `Content-Type`, `ETag` avec 304,
téléchargements repris via `Range`.

## Configurer un montage

`StaticHandler` se configure par une chaîne, avant d'être attaché au
serveur :

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

Allons-y ligne par ligne.

**`setCacheControl`** — l'en-tête de mise en cache sur chaque réponse.
Associé à l'`ETag` activé par défaut, le navigateur ne re-télécharge un
fichier que lorsque le fichier a réellement changé.

**`enablePrecompressed`** — mon élément préféré. Si `app.css.br` se
trouve à côté de `app.css`, un client avec un `Accept-Encoding` adéquat
obtient le fichier compressé tout prêt. Pensez à l'économie : vous
compressez une seule fois à l'étape de build du frontend, au niveau le
plus coûteux et de la plus haute qualité, et vous le servez un million de
fois sans dépenser un seul cycle en compression.

**`hide`** — des globs qui renvoient un 404 que le fichier existe ou non.
Les source maps et les brouillons ne sortiront pas.

**`setOnMissing(NEXT)`** — le sort des requêtes qui ne trouvent pas de
fichier. Par défaut, un échec répond 404 directement depuis le C. `NEXT`
transmet au contraire la requête plus loin, à un gestionnaire PHP
ordinaire. Pourquoi ? Le SPA. Le fichier `/assets/app.js` est servi
depuis le disque, tandis qu'un `/assets/whatever` inexistant retombe dans
l'application, qui répond avec son propre `index.html`.

Après `addStaticHandler`, l'objet est verrouillé : le serveur a déjà
construit à partir de lui ses structures de chemin critique. Une
tentative de toucher un setter après cela est une exception.

## Sûr par défaut

Une petite digression. Servir des fichiers par URL est historiquement
l'un des trous les plus généreux des serveurs web. `../../etc/passwd`
dans la barre d'adresse est une astuce plus ancienne que bien des
lecteurs de ce chapitre.

Aussi la politique prête à l'emploi est-elle paranoïaque. Les requêtes
avec `..` reçoivent un 404. Les chemins passant par des fichiers avec un
point en tête reçoivent un 404 : ni `.env` ni `.git` ne fuiront, même
s'ils atterrissent accidentellement dans le répertoire. Les liens
symboliques ne sont pas déréférencés du tout : le fichier doit se trouver
physiquement à l'intérieur de la racine du montage, et aucun lien
symbolique ne peut l'en extraire.

Tout cela peut être assoupli délibérément (`setDotfilePolicy`,
`setSymlinkPolicy`), mais les valeurs par défaut sont choisies pour que
l'option « branche-le et oublie-le » soit sûre.

## Quand il y a beaucoup de fichiers

Pour les montages très sollicités, il existe un levier de plus :

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

Le cache se souvient du chemin résolu, des métadonnées et des en-têtes
des fichiers les plus récents et supprime le parcours d'appels système
sur les requêtes répétées. Sur un grand répertoire ou un système de
fichiers réseau, c'est perceptible. Sur un petit site local, non, c'est
pourquoi il est désactivé par défaut.

C'est tout le chapitre, j'avais promis qu'il serait court. Le statique
file au-delà de PHP, et PHP poursuit son travail. Et maintenant que le
service a un visage, il est temps de lui donner vie. Vous souvenez-vous
de la barre de progression du tout premier chapitre de la première série,
celle dessinée dans le terminal ? Elle est sur le point de passer dans le
navigateur. Et le serveur lui-même la dessinera.
