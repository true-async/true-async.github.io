---
layout: tutorial
lang: fr
path_key: "/tutors-server/04-streaming-uploads.html"
nav_active: docs
permalink: /fr/tutors-server/04-streaming-uploads.html
page_title: "Flux d'octets"
description: "send() et sendable(), le streaming du corps, l'envoi de fichiers et sendFile()."
---

# Flux d'octets

Jusqu'ici nos réponses ont été petites et entières, construites avec
`setBody()` et `json()`. Pour une API, c'est exactement ce qu'il vous
faut.

Mais `ProfileService` a récupéré des tâches d'un autre calibre. La
comptabilité veut un export annuel, et cela représente des centaines de
mégaoctets de `CSV`. Les utilisateurs envoient des fichiers d'import, et
ceux-là ne sont pas petits non plus. Faisons le calcul approximatif :
cinquante requêtes concurrentes, chacune retenant cent mégaoctets en
mémoire... non, ne comptons pas plus loin, on voit déjà comment cela
finit.

Nous devons apprendre à travailler avec les corps par parties. Dans les
deux directions.

## La réponse par parties : send()

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->setStatusCode(200)
        ->setHeader('Content-Type', 'text/csv');

    foreach (exportRows() as $row) {
        $res->send(implode(',', $row) . "\n");
    }
});
```

Le premier `send()` fixe le statut et les en-têtes, après quoi les
morceaux partent vers le client à mesure qu'ils sont prêts : chunked en
HTTP/1.1, trames DATA en HTTP/2. À chaque instant, une seule ligne vit
en mémoire. Un flux d'octets vers le client prend forme !

Maintenant une question pour tester votre finesse. Nous générons les
lignes depuis la base de données à, disons, un gigabit par seconde. Et
le client télécharge sur internet mobile dans un train. Où passent les
lignes en trop ?

Si vous avez lu le chapitre sur les canaux, vous avez déjà la réponse :
le backpressure. Quand le tampon du flux se remplit, `send()` suspend la
coroutine du gestionnaire. Le client a vidé la file, la coroutine s'est
réveillée, la génération a continué. L'export se règle de lui-même sur la
vitesse du goulot le plus étroit, et notez-le, nous n'avons pas écrit une
seule ligne pour cela !

Attendre un client lent, cependant, n'est pas toujours ce que vous
voulez :

```php
if (!$res->sendable()) {
    // send() va bloquer tout de suite. Disons que nous n'attendrons pas.
}
```

`send()` est toujours sûr. `sendable()` vous avertit seulement : le
prochain appel va s'endormir. Ce qu'il faut faire ensuite dépend de vous.

> Il existe encore un type d'attaque répandu avec des clients lents : ils
> ouvrent une connexion et ne lisent pas, jusqu'à ce que le serveur se
> bloque.
> Pour un serveur à coroutines, c'est moins effrayant, puisque chaque
> coroutine coûte bien moins qu'un processus ou un thread.
> Néanmoins, la limite globale de coroutines est un paramètre important,
> tout comme les autres options de sécurité supplémentaires !
>

## Le corps de la requête par parties : readBody()

La situation inverse. Un utilisateur envoie un CSV d'un gigaoctet, et par
défaut le gestionnaire est appelé une fois le corps entier lu. Le mot
« gigaoctet » et les mots « en mémoire » dans la même phrase sont
exactement ce que nous avons convenu d'éviter.

Nous activons le mode streaming :

```php
$config->setBodyStreamingEnabled(true);
```

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $file = fopen('/var/imports/' . bin2hex(random_bytes(8)) . '.csv', 'wb');
    $total = 0;

    while (($chunk = $req->readBody()) !== null) {
        fwrite($file, $chunk);
        $total += strlen($chunk);
    }

    fclose($file);
    $res->json(['received' => $total]);
});
```

Dans le serveur `TrueAsync`, le gestionnaire démarre juste après les
en-têtes, suffisamment tôt. En fait, le travail de la coroutine se
déroule précisément au rythme de la réception des données depuis le
socket. C'est pourquoi travailler avec le flux de données ici est un
choix naturel.

Si vous lancez cinquante envois concurrents de 20 Mio, le pic de mémoire
aurait été de 1170 Mio et est devenu 197. Le débit a presque triplé,
parce que le traitement commence sans attendre la fin de l'envoi. Pas mal
pour une seule ligne de configuration.

## Formulaires avec fichiers : UploadedFile

Le classique formulaire HTML avec un fichier est un cas plus facile, et
pour lui vous n'avez rien à activer. Le multipart est toujours analysé en
flux, et le gestionnaire reçoit des objets tout prêts :

```php
$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $csv = $req->getFile('import');

    if ($csv === null || !$csv->isValid()) {
        throw new HttpException('File is required', 422);
    }

    $csv->moveTo('/var/imports/' . $csv->getClientFilename());
    $res->json(['size' => $csv->getSize()]);
});
```

Quiconque a vu PSR-7 se sent chez lui : `moveTo()`, `getSize()`,
`getClientFilename()`. Plusieurs fichiers dans un même champ (`photos[]`)
arrivent sous forme de tableau via `getFiles()`.

## Servir des fichiers : sendFile()

Reste à servir des fichiers tout prêts. C'est la seule chose que vous ne
devriez pas assembler à la main à partir de `fopen` et `send()`, et voici
pourquoi :

```php
use TrueAsync\SendFileOptions;
use TrueAsync\SendFileDisposition;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    $res->sendFile('/var/reports/2026-06.csv', new SendFileOptions(
        disposition:  SendFileDisposition::ATTACHMENT,
        downloadName: 'report-june.csv',
        cacheControl: 'private, max-age=3600',
    ));
});
```

Derrière cet unique appel se cache une trentaine d'années d'histoire du
HTTP. Le `Content-Type` déduit de l'extension. `ETag` et `Last-Modified`,
pour qu'une requête répétée s'en tire avec un court 304. Les
téléchargements repris via `Range` quand le client a coupé en plein
milieu. Le service d'un voisin pré-compressé (`report.csv.gz`) si le
client comprend gzip. Et tout cela avec des lectures asynchrones depuis
le disque, sans retenir la boucle d'événements. Écrire cela à la main,
c'est en oublier au moins la moitié.

Une règle : après `sendFile()`, la réponse est scellée. Y écrire quoi que
ce soit de plus ne marchera pas, vous obtiendrez une exception.

Nous pouvons désormais à la fois accepter et servir un fichier d'un
gigaoctet. Mais notez à qui nous servons tout cela via un gestionnaire
PHP : des rapports protégés par des droits d'accès, des fichiers derrière
des liens à usage unique. Et le CSS ? Et le logo ? Ils sont les mêmes
pour tout le monde, et démarrer une coroutine pour chacun d'eux paraît un
peu gênant. C'est le prochain chapitre, et il sera court.
