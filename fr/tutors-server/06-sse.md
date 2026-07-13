---
layout: tutorial
lang: fr
path_key: "/tutors-server/06-sse.html"
nav_active: docs
permalink: /fr/tutors-server/06-sse.html
page_title: "Server-Sent Events"
description: "SSE : un flux d'événements vers le navigateur, la progression de l'import et le heartbeat via sseComment()."
---

# Server-Sent Events

L'import des adresses commence donc maintenant par un bouton sur la page.
L'utilisateur a cliqué, le fichier est parti, le traitement a démarré. Il
tourne pendant une dizaine de minutes. Que voit l'utilisateur pendant tout
ce temps ?

Exactement, un spinner qui tourne. Pendant dix minutes. Sans le moindre
signe de vie. Vers la troisième minute, il décidera que tout est figé,
rafraîchira la page et lancera l'import une deuxième fois. Il nous faut une
barre de progression.

La solution classique, c'est le polling : le navigateur interroge
`/import/progress` une fois par seconde, le serveur répond avec un nombre.
Est-ce que ça marche ? Ça marche. Mais faites le calcul : six cents requêtes
en dix minutes, avec les en-têtes, avec un cycle de traitement complet, et
dans chacune la charge utile est un seul nombre. Ce que nous préférerions,
c'est l'inverse : le navigateur se connecte une fois, et à partir de là le
serveur lui-même envoie le nombre chaque fois qu'il change.

C'est exactement ce que fait `SSE`, `Server-Sent Events`. Pas de nouveau
protocole. Une réponse `HTTP` ordinaire que le serveur ne ferme pas mais à
laquelle il continue d'ajouter des événements. Côté navigateur, ils sont
reçus par l'`EventSource` intégré, sans la moindre bibliothèque.

## La progression vers le navigateur

```php
use function Async\delay;

$server->addHttpHandler(function (HttpRequest $req, HttpResponse $res) {
    if ($req->getPath() !== '/import/progress') { /* ... routage ... */ }

    $import = currentImport(); // ce même ImportService de la première série

    $res->sseStart();
    $res->sseRetry(3000); // si le flux se rompt, le navigateur se reconnecte dans 3 secondes

    while (!$import->isFinished()) {
        $res->sseEvent(
            data:  json_encode(['done' => $import->counter(), 'total' => $import->total()]),
            event: 'progress',
        );

        if (!$res->sendable()) {
            break; // l'onglet a été fermé, personne à qui dessiner
        }

        delay(1000);
    }

    $res->sseEvent(event: 'finished', data: 'ok');
    $res->end();
});
```

Et dans le navigateur :

```js
const es = new EventSource('/import/progress');
es.addEventListener('progress', e => {
    const {done, total} = JSON.parse(e.data);
    bar.style.width = (100 * done / total) + '%';
});
es.addEventListener('finished', () => es.close());
```

Regardez de près la structure du handler. Une boucle. Une prise de mesure.
`delay(1000)`. Ça vous dit quelque chose ? C'est la coroutine de progression
du tout premier chapitre, lettre pour lettre. Seule la dernière ligne a
changé : au lieu d'un `echo` vers le terminal, un `sseEvent()` dans une
réponse ouverte. Quinze chapitres plus tard, la barre de progression a
atteint le navigateur, et le code a à peine changé. Et, comme à l'époque, la
progression ne sait rien de l'import, et l'import ne sait rien de la
progression.

Il n'y a pas de magie non plus sous le capot : les méthodes SSE sont un fin
formatage par-dessus le `send()` du chapitre quatre. De là, deux cadeaux
gratuits. Le backpressure : un onglet lent ne mangera pas la mémoire du
serveur. Et l'indépendance vis-à-vis du protocole : le même handler
fonctionne sur `HTTP/1.1`, `HTTP/2` et `HTTP/3`, et c'est le navigateur qui
choisit.

## Le long silence et le heartbeat

Une connexion `SSE` vit des minutes et des heures. Une longue vie, comme
d'habitude, a ses propres maux. Il y en a deux ici.

Le premier : le timeout d'écriture. Par défaut, le serveur limite le temps
qu'une réponse peut mettre à s'envoyer, et c'est correct. Mais une réponse
SSE est « en cours d'envoi » pour toujours, c'est sa nature. Pour un service
à flux, vous désactivez la limite :

```php
$config->setWriteTimeout(0);
```

Le second mal est plus subtil. Supposons que l'import bloque longtemps : il
calcule quelque chose de lourd, aucun événement ne sort. Pour nous c'est une
pause, mais pour un proxy quelconque entre le serveur et le navigateur c'est
une connexion morte qui est bonne à supprimer. Et il la supprimera, nginx
prend soixante secondes par défaut pour cela.

Le remède est comique de simplicité :

```php
$res->sseComment(); // sur le fil : ":\n\n"
```

Un commentaire. Un événement que le navigateur ignore silencieusement, mais
qui traverse le fil et convainc chaque intermédiaire que la connexion est
vivante. Envoyez-le sur un minuteur pendant les pauses, et le flux survivra
à n'importe quel silence.

## Ruptures et récupération

Le réseau mobile a cligné, le flux s'est rompu. Que faire ? Rien.
Sérieusement : l'`EventSource` rétablit la connexion lui-même, après avoir
attendu l'intervalle de `sseRetry()`.

La seule chose qu'il vaille la peine de l'aider à faire, c'est de ne pas
repartir de zéro. Donnez des numéros aux événements :

```php
$res->sseEvent(data: $update, id: (string) $sequence);
```

À la reconnexion, le navigateur envoie un en-tête `Last-Event-ID` avec le
dernier numéro qu'il a reçu, et le handler reprend exactement à partir de ce
point :

```php
$since = (int) ($req->getHeader('last-event-id') ?? 0);
foreach (updatesSince($since) as $sequence => $update) {
    $res->sseEvent(data: $update, id: (string) $sequence);
}
```

Livraison, reconnexion, rattrapage de ce qui a été manqué. Un canal de
notification honnête, et tout cela sur le HTTP le plus ordinaire.

Avec une réserve : le canal est à sens unique. Le serveur parle, le
navigateur écoute. Pour une barre de progression, c'est idéal. Mais pour un
chat de support, où les deux côtés écrivent ? Pour un chat, il vous faudra
quelque chose de plus sérieux.
