---
layout: tutorial
lang: fr
path_key: "/tutors/07-channels.html"
nav_active: docs
permalink: /fr/tutors/07-channels.html
page_title: "Channels"
description: "Channel : un flux de valeurs entre coroutines, un pool de workers et le backpressure."
---

# Channels

`Future` promet exactement une valeur. Mais que faire s'il y a de nombreuses valeurs, et
qu'elles arrivent progressivement ?

Rappelez-vous le fichier CSV du premier chapitre. Maintenant la tâche est plus sérieuse : lors de
l'import, l'adresse de chaque utilisateur doit être vérifiée par rapport à `GeoDirectory`.
Nous savons déjà utiliser les coroutines, alors essayons l'approche directe :

```php
while (($row = fgetcsv($handle)) !== false) {
    spawn(checkAddress(...), $row[$addressIndex]);
}
```

Le fichier compte cent mille lignes. Ce code va créer cent mille
coroutines, et toutes vont ouvrir de manière concurrente une connexion vers `GeoDirectory`.
Les coroutines sont peu coûteuses, mais pas les connexions. Le service va s'étrangler, et notre
import avec lui.

Ce que nous voulons à la place, c'est que, disons, dix coroutines s'occupent de la vérification, tandis que
le reste des adresses attend son tour. Il nous faut une file d'attente dans laquelle certaines coroutines
puisent du travail et d'autres en ajoutent.

Une telle file d'attente s'appelle un canal (channel).

## Channel

Un canal connecte les coroutines directement, comme un tuyau :

```php
use Async\Channel;
use function Async\spawn;

$channel = new Channel(5);

spawn(function () use ($channel) {
    $channel->send('hello');
});

echo $channel->recv(); // hello
```

- **`send`** — dépose une valeur dans le canal.
- **`recv`** — retire une valeur du canal.

Les deux opérations bloquent, et c'est tout l'intérêt. Si le canal est vide, `recv`
suspend la coroutine jusqu'à ce que des données apparaissent. Si le canal est plein, c'est `send`
qui est suspendu à la place. Le `5` dans le constructeur définit la taille du tampon :
combien de valeurs le canal accepte de conserver avant que quiconque ne les récupère.

## Rendez-vous

Que se passe-t-il si vous créez un canal avec un tampon de `0` ? Il n'a nulle part où
stocker les valeurs, si bien que `send` ne se termine pas tant qu'une autre coroutine n'appelle pas `recv` :

```php
$ch = new Channel(0);

spawn(function () use ($ch) {
    echo "before send\n";
    $ch->send('hello');
    echo "after send\n"; // s'exécute seulement après recv
});

spawn(function () use ($ch) {
    echo "before recv\n";
    echo $ch->recv() . "\n";
});
```

Un tel canal s'appelle un rendez-vous : l'expéditeur et le destinataire sont contraints
de se rencontrer au même instant, d'où le nom.

La différence avec un canal tamponné est plus subtile qu'il n'y paraît. Un tampon signifie
« envoyé » mais pas « reçu » : `send` dépose une valeur et poursuit son chemin, et l'expéditeur
n'a aucune idée de si, ni de quand, elle est récupérée. Un rendez-vous garantit la livraison :
une fois que `send` retourne, la valeur est déjà entre les mains du destinataire. C'est important
quand une tâche ne peut pas rester à attendre dans une file : par exemple, confier du travail à un
worker seulement s'il est libre à cet instant.

Les données sont presque hors de propos ici : un rendez-vous est de la pure synchronisation.
Deux coroutines ont la garantie de se rencontrer au même moment, même si tout ce qu'elles
transmettaient était `null`.

## Pool de workers

Assemblons une solution pour l'import. Dix coroutines workers puisent les adresses
dans un canal, tandis que le flux principal lit le fichier et alimente le canal :

```php
use Async\Channel;
use Async\ChannelException;
use function Async\spawn;

$queue = new Channel(100);

for ($i = 0; $i < 10; $i++) {
    spawn(function () use ($queue) {
        try {
            while (true) {
                checkAddress($queue->recv());
            }
        } catch (ChannelException) {
            // le canal est fermé et vide, plus aucun travail n'arrive
        }
    });
}

while (($row = fgetcsv($handle)) !== false) {
    $queue->send($row[$addressIndex]);
}

$queue->close();
```

Chaque valeur du canal va vers exactement un worker, même si les dix
attendent sur `recv`. Les valeurs ne sont jamais dupliquées, si bien que les workers ne se marchent pas
dessus : le canal répartit le travail de lui-même entre ceux qui sont libres.

Quel que soit le nombre de lignes dans le fichier, il n'y a jamais plus de dix connexions
vers `GeoDirectory`. Le nombre de workers est exactement la limite de concurrence,
et elle est fixée par une seule constante dans la boucle.

## Backpressure

Pourquoi un tampon de `100` exactement ? Imaginez que les workers vérifient les adresses plus lentement que
le flux principal ne lit le fichier. Sans limite, la file continuerait de grandir
jusqu'à ce que l'intégralité du fichier de cent mille lignes soit en mémoire.

Avec un tampon de `100`, il se passe quelque chose de différent : dès que cent
adresses s'accumulent dans le canal, `send` suspend le flux principal. La lecture du
fichier se met en pause et reprend une fois que les workers libèrent de l'espace. Le producteur
s'ajuste automatiquement à la vitesse des consommateurs.

Ce mécanisme s'appelle le backpressure. Remarquez que nous ne l'avons pas programmé
nous-mêmes : il découle de la nature bloquante de `send`. Il suffit de choisir une taille de tampon,
et tout le reste s'équilibre de lui-même.

## Fermer un canal

Une fois le fichier lu, les workers continuent d'attendre sur `recv`. Une situation familière :
dans le chapitre sur l'annulation, la coroutine de progression tournait elle aussi indéfiniment.
Mais ici, nous n'avons pas besoin de `cancel()` sur chaque worker ; un canal dispose d'un outil
plus précis :

```php
$queue->close();
```

`close` annonce : aucune nouvelle valeur n'arrive. Les workers finissent d'abord de lire
ce qui reste dans le tampon, puis `recv` lance `ChannelException`,
mettant fin à la boucle `while (true)`. Remarquez l'ordre : la fermeture n'interrompt pas le travail
en cours, elle le laisse se terminer correctement.

Et un détail familier de plus : `recv` et `send` acceptent le même jeton d'annulation
que le `await` du chapitre sur les timeouts :

```php
$address = $queue->recv(timeout(5000));
```

Si rien n'apparaît dans le canal en cinq secondes, le worker reçoit une
`AsyncCancellation` et peut, par exemple, consigner un avertissement.

## Transmettre des données ou synchroniser ?

Regardons de plus près ce que le canal faisait réellement dans ce chapitre.
`recv` sur un canal vide endormait un worker jusqu'à ce que du travail apparaisse. `send` sur
un canal plein endormait la lecture du fichier jusqu'à ce que les workers vident la file.
Le rendez-vous réunissait deux coroutines au même instant. Chaque
opération bloquante s'est avérée être un point où les coroutines s'ajustent les unes aux autres.

Et ici, il convient de noter une subtilité du monde monothread. Pour transmettre
des données en tant que telles, un canal n'est pas nécessaire : les coroutines vivent en mémoire partagée, et un
objet peut simplement leur être remis via `use`. Les situations de compétition sur les données ne se produisent pas au sein d'un
seul thread ; deux coroutines ne s'exécutent jamais exactement au même moment.
Un canal sert à autre chose : une file bornée, la répartition du travail entre les
workers libres, la signalisation « plus de travail » via `close`.

Il est donc plus juste de penser un canal ainsi : c'est un moyen de synchroniser
des coroutines qui, au passage, déplace des données, et non l'inverse. Dans
le code multithread, en revanche, où les coroutines sont réparties sur différents
threads, un canal devient indispensable dans les deux rôles : il n'y a pas de mémoire partagée
là-bas, et il reste le seul pont sûr.

Nous avons maintenant deux façons de relier les coroutines entre elles. `Future` promet une valeur.
Un canal transporte tout un flux de valeurs et, chemin faisant, impose un rythme partagé
au travail : le producteur ne sait pas qui récupérera les données ni quand,
le consommateur ne sait pas d'où elles viennent, mais personne n'inonde personne de travail.

Il reste une pensée lancinante. Nous avons lancé dix workers et sommes passés à autre chose. Que se passe-t-il si
l'un d'eux meurt avec une exception au milieu de l'import ? Qui veille réellement
sur toutes ces coroutines ? Découvrons-le au prochain chapitre.
