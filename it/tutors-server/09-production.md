---
layout: tutorial
lang: it
path_key: "/tutors-server/09-production.html"
nav_active: docs
permalink: /it/tutors-server/09-production.html
page_title: "Produzione"
description: "Timeout, limiti, backpressure sull'accept, compressione, log e graceful shutdown."
---

# Produzione

Un buon server si distingue da una demo non per come funziona. Per come
fallisce. Tutti funzionano quando c'è l'umore giusto; la produzione
comincia dove arriva la brutta giornata: un picco di traffico, client
lenti, un deploy nel momento più inopportuno. Questo capitolo parla
interamente di brutte giornate.

## Timeout: nessuno aspetta per sempre

Dalla prima serie abbiamo preso una regola ferrea: ogni attesa deve
avere un limite. Vediamo dove una connessione abbia in effetti delle
attese. Il client invia una richiesta, questa è una. Prende la risposta,
questa è due. Resta appeso tra le richieste sul keep-alive, questa è
tre. Ogni fase ottiene il proprio limite:

```php
$config
    ->setReadTimeout(30)       // la richiesta impiega più di 30 secondi a essere inviata? addio
    ->setWriteTimeout(60)      // e la risposta impiega più di un minuto a essere recuperata? anche quello
    ->setKeepAliveTimeout(15); // una connessione inattiva vive al massimo 15 secondi
```

Il timeout di lettura non riguarda solo l'internet lento. C'è un attacco
con un nome meraviglioso, slowloris: il client invia una richiesta un
byte al minuto e occupa la connessione per sempre. Cento client di
questo tipo e un server senza timeout è spacciato. Con un timeout sono
solo cento connessioni cadute.

L'unica eccezione legittima la conosci già dal capitolo sull'SSE: per i
flussi il timeout di scrittura viene disattivato, `setWriteTimeout(0)`.

## Limiti: rifiutare a buon mercato

Ora sul sovraccarico. La domanda non è "se", la domanda è "quando". E in
quel momento il server ha esattamente due strade. Strada uno: accettare
tutti, accumulare una coda, rallentare, e alla fine tutti si beccano i
timeout, compresi quelli che si sarebbero potuti servire. Strada due:
dire subito a quelli in più "occupato", e servire il resto come se nulla
fosse.

La seconda strada si configura così:

```php
$config
    ->setMaxConnections(10_000)          // limite rigido di connessioni
    ->setMaxInflightRequests(1_000)      // richieste elaborate in modo concorrente
    ->setMaxBodySize(10 * 1024 * 1024);  // body più grande di 10 MiB? 413
```

Guarda con attenzione `setMaxInflightRequests`. La riconosci? È la nostra
vecchia amica, il limite di concorrenza: `POOL_MAX`, `concurrency` sui
gruppi, ora al livello di un intero server. Una richiesta in eccesso
riceve un istantaneo `503 Retry-After: 1`. Istantaneo è la parola
chiave: il client scopre la verità in un millisecondo e riproverà più
tardi, invece di restare appeso in una coda per un minuto ad aspettare
un timeout.

C'è anche una terza linea di difesa, la più elegante. Il server stesso
misura quanto a lungo le richieste aspettano in coda. L'attesa sta
crescendo sistematicamente? Allora non stiamo tenendo il passo, e il
server smette temporaneamente di accettare nuove connessioni finché non
recupera. L'algoritmo si chiama CoDel, ma lo conosci con un altro nome:
è il backpressure del capitolo sui canali, applicato all'`accept()`.
Internet è il produttore, gli handler sono il consumatore, e il
produttore viene rallentato. C'è un'unica impostazione:

```php
$config->setBackpressureTargetMs(20); // quale tempo di attesa in coda considerare normale
```

## Compressione

Buona notizia: la compressione delle risposte funziona già. Il server
negozia con il client tramite `Accept-Encoding` e sceglie il migliore
tra i codec disponibili: zstd, brotli, gzip. Di solito qui non c'è nulla
da fare, ma vale la pena conoscere tre leve:

```php
$config
    ->setCompressionMinSize(1024)   // non comprimere le cose piccole: l'overhead costa di più
    ->setZstdLevel(3)               // bilanciamento velocità/rapporto per codec
    ->setCompressionMimeTypes([...]); // whitelist: il testo viene compresso, il jpeg già non lo è
```

Più una leva sul lato risposta: `$res->setNoCompression()` per gli
endpoint dove la compressione è dannosa. Gli helper SSE, tra l'altro, la
chiamano da soli; un gzip che bufferizza ucciderebbe tutta
l'istantaneità della consegna.

## Log

Finché tutto va bene, il server tace. D'accordo, preferiremmo sapere dei
guai non dagli utenti:

```php
use TrueAsync\LogSeverity;

$config
    ->setLogSeverity(LogSeverity::WARN)
    ->setLogStream(STDERR);
```

`WARN` copre gli handshake TLS falliti, i client caduti, le eccezioni
inghiottite. `INFO` aggiunge il ciclo di vita: avvio, porte, worker. Il
recipiente è un ordinario stream PHP: stderr per systemd e Docker, un
file, quello che vuoi.

## Un arresto garbato

E l'ultima brutta giornata, che in realtà è una buona: il deploy. Un
quadro degno della pittura a olio: il server ha mille connessioni vive,
cento di esse a metà scrittura sul database, ed ecco arrivare la nuova
versione. `kill -9`? Goditi cento transazioni interrotte e una folla di
utenti con upload rotti.

La versione garbata si presenta così:

```php
$config->setShutdownTimeout(30);
```

Alla ricezione di `stop()` o SIGTERM, il server prima smette di
accettare nuove connessioni, e lascia che quelle correnti finiscano di
vivere la loro vita, fino a trenta secondi. Chi non ce l'ha fatta verrà
annullato. E qui, per l'ultima volta in questa serie, la disciplina
dello scope ripaga: la cancellazione passa cooperativamente attraverso
l'albero di ogni richiesta, i blocchi `finally` rilasciano le risorse,
il pool esegue il rollback delle transazioni non chiuse. Il graceful
shutdown non è stato scritto come una feature. È caduto giù
dall'architettura.

Per le connessioni longeve dietro un load balancer c'è un altro tocco,
`setMaxConnectionAgeMs()`: una connessione più vecchia dell'età indicata
viene chiusa con garbo (`Connection: close`, GOAWAY), in modo che i
client si ridistribuiscano tra le macchine invece di restare appesi a
una sola per anni.

Ora questa sì è produzione. Il sovraccarico incontra un rifiuto veloce, i
client lenti sbattono contro i timeout, un deploy non fa a pezzi le
transazioni, e il server segnala da solo i propri problemi. Resta
un'ultima frontiera per l'intera serie: finora solo browser e curl hanno
parlato con il nostro server. È ora di far entrare altri interlocutori, i
servizi vicini, nella loro lingua nativa.
