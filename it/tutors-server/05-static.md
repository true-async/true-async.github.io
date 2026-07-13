---
layout: tutorial
lang: it
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /it/tutors-server/05-static.html
page_title: "File statici"
description: "StaticHandler: servire file senza una coroutine PHP, caching e policy di sicurezza."
---

# File statici

`ProfileService` si è fatto crescere un frontend. HTML, CSS, script,
avatar, il solito. Prima li serviva nginx, ma nel primo capitolo abbiamo
solennemente congedato nginx. Chi li serve adesso?

Il primo impulso è comprensibile: scrivere un handler che apre i file in
base all'URL. Fermati. Considera cosa significa: migliaia di richieste
al giorno per il logo, e per ognuna una coroutine, ingresso in PHP,
`fopen`, uscita. Qui PHP non fa nulla che richieda PHP.

Il server risolve questo in modo radicale. Una rotta statica viene
servita interamente in C. Una richiesta ad essa non entra mai affatto in
PHP:

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

Un prefisso URL, una directory su disco, fatto. `GET
/assets/css/app.css` si trasforma in una lettura asincrona del file
direttamente nel socket, attraverso libuv, oltre PHP. Gli handler dei
capitoli precedenti continuano a ricevere tutto il resto. Possono
esserci diversi mount, e le corrispondenze vengono cercate nell'ordine
di registrazione. Tutta l'etichetta HTTP di `sendFile` è presente anche
qui: `Content-Type`, `ETag` con 304, download ripresi tramite `Range`.

## Configurare un mount

`StaticHandler` si configura con una catena, prima di essere collegato al
server:

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

Andiamo riga per riga.

**`setCacheControl`** — l'header di caching su ogni risposta. Abbinato
all'`ETag` che è attivo di default, il browser riscarica un file solo
quando il file è effettivamente cambiato.

**`enablePrecompressed`** — la mia voce preferita. Se `app.css.br` sta
accanto ad `app.css`, un client con un `Accept-Encoding` adatto ottiene
il file compresso già pronto. Pensa all'economia: comprimi una volta
sola nella fase di build del frontend, al livello più costoso e di
qualità più alta, e lo servi un milione di volte senza spendere un
singolo ciclo in compressione.

**`hide`** — glob che ricevono un 404 indipendentemente dal fatto che il
file esista. Source map e bozze non usciranno.

**`setOnMissing(NEXT)`** — il destino delle richieste che mancano un
file. Di default un miss risponde 404 direttamente dal C. `NEXT` invece
passa oltre la richiesta, a un ordinario handler PHP. Perché? SPA. Il
file `/assets/app.js` viene servito dal disco, mentre un
`/assets/whatever` inesistente cade attraverso nell'applicazione, che
risponde con il proprio `index.html`.

Dopo `addStaticHandler` l'oggetto è bloccato: il server ha già costruito
le sue strutture hot-path a partire da esso. Un tentativo di toccare un
setter dopo di ciò è un'eccezione.

## Sicuro per default

Una piccola digressione. Servire file in base all'URL è storicamente uno
dei buchi più abbondanti nei web server. `../../etc/passwd` nella barra
degli indirizzi è un trucco più vecchio di molti lettori di questo
capitolo.

Quindi la policy pronta all'uso è paranoica. Le richieste con `..`
ricevono un 404. I percorsi attraverso file con un punto iniziale
ricevono un 404: né `.env` né `.git` trapeleranno, anche se finiscono
per caso nella directory. I link simbolici non vengono affatto
dereferenziati: il file deve trovarsi fisicamente dentro la root del
mount, e nessun symlink può trascinarlo fuori.

Tutto questo può essere allentato deliberatamente (`setDotfilePolicy`,
`setSymlinkPolicy`), ma i default sono scelti in modo che l'opzione
"collegalo e dimenticatene" sia sicura.

## Quando ci sono molti file

Per i mount caldi c'è ancora una leva:

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

La cache ricorda il percorso risolto, i metadati e gli header dei file
più recenti e taglia la sfilza di syscall sulle richieste ripetute. Su
una directory grande o su un filesystem di rete si nota. Su un piccolo
sito locale no, ed è per questo che è disattivata di default.

Questo è l'intero capitolo, ne avevo promesso uno breve. Lo statico
sfreccia oltre PHP, e PHP prosegue con il suo lavoro. E ora che il
servizio ha un volto, è ora di dargli vita. Ricordi la barra di
avanzamento del primissimo capitolo della prima serie, quella disegnata
nel terminale? Sta per trasferirsi nel browser. E sarà il server stesso
a disegnarla.
