---
layout: docs
lang: it
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /it/docs/reference/supported-functions.html
page_title: "Funzioni supportate"
description: "Elenco completo delle funzioni PHP adattate per il funzionamento non-bloccante con le coroutine in TrueAsync."
---

# Funzioni supportate

TrueAsync adatta **oltre 70 funzioni PHP standard** per il funzionamento non-bloccante all'interno delle coroutine.
Tutte le funzioni elencate diventano automaticamente asincrone quando vengono chiamate all'interno di una coroutine.
Al di fuori di una coroutine, funzionano normalmente.

---

## DNS

| Funzione | Descrizione |
|----------|-------------|
| `gethostbyname()` | Risolvere nome host in indirizzo IP |
| `gethostbyaddr()` | Risoluzione inversa dell'indirizzo IP in nome host |
| `gethostbynamel()` | Ottenere l'elenco degli indirizzi IP per un nome host |

---

## Database

### PDO MySQL

| Funzione | Descrizione |
|----------|-------------|
| `PDO::__construct()` | Connessione non-bloccante |
| `PDO::prepare()` | Preparare query |
| `PDO::exec()` | Eseguire query |
| `PDOStatement::execute()` | Eseguire query preparata |
| `PDOStatement::fetch()` | Recuperare risultati |

### PDO PgSQL

| Funzione | Descrizione |
|----------|-------------|
| `PDO::__construct()` | Connessione non-bloccante |
| `PDO::prepare()` | Preparare query |
| `PDO::exec()` | Eseguire query |
| `PDOStatement::execute()` | Eseguire query preparata |
| `PDOStatement::fetch()` | Recuperare risultati |

### Pool di connessioni PDO

Pool di connessioni trasparente per PDO tramite integrazione con `Async\Pool`.
Ogni coroutine riceve la propria connessione dal pool con gestione automatica del ciclo di vita.

### MySQLi

| Funzione | Descrizione |
|----------|-------------|
| `mysqli_connect()` | Connessione non-bloccante |
| `mysqli_query()` | Eseguire query |
| `mysqli_prepare()` | Preparare query |
| `mysqli_stmt_execute()` | Eseguire query preparata |
| `mysqli_fetch_*()` | Recuperare risultati |

### PostgreSQL (nativo)

| Funzione | Descrizione |
|----------|-------------|
| `pg_connect()` | Connessione non-bloccante |
| `pg_query()` | Eseguire query |
| `pg_prepare()` | Preparare query |
| `pg_execute()` | Eseguire query preparata |
| `pg_fetch_*()` | Recuperare risultati |

Ogni contesto async utilizza una connessione separata per una concorrenza sicura.

---

## CURL

| Funzione | Descrizione |
|----------|-------------|
| `curl_exec()` | Eseguire richiesta |
| `curl_multi_exec()` | Eseguire più richieste |
| `curl_multi_select()` | Attendere attività |
| `curl_multi_getcontent()` | Ottenere contenuto |
| `curl_setopt()` | Impostare opzioni |
| `curl_getinfo()` | Ottenere info richiesta |
| `curl_error()` | Ottenere errore |
| `curl_close()` | Chiudere handle |

---

## Socket

| Funzione | Descrizione |
|----------|-------------|
| `socket_create()` | Creare socket |
| `socket_create_pair()` | Creare coppia di socket |
| `socket_connect()` | Connettere |
| `socket_accept()` | Accettare connessione |
| `socket_read()` | Leggere dati |
| `socket_write()` | Scrivere dati |
| `socket_send()` | Inviare dati |
| `socket_recv()` | Ricevere dati |
| `socket_sendto()` | Inviare a indirizzo |
| `socket_recvfrom()` | Ricevere da indirizzo |
| `socket_bind()` | Associare a indirizzo |
| `socket_listen()` | Ascoltare |
| `socket_select()` | Monitorare attività socket |

---

## I/O file e flussi

| Funzione | Descrizione |
|----------|-------------|
| `fopen()` | Aprire file |
| `fclose()` | Chiudere file |
| `fread()` | Leggere da file |
| `fwrite()` | Scrivere su file |
| `fgets()` | Leggere riga |
| `fgetc()` | Leggere carattere |
| `fgetcsv()` | Leggere riga CSV |
| `fputcsv()` | Scrivere riga CSV |
| `fseek()` | Impostare posizione |
| `ftell()` | Ottenere posizione |
| `rewind()` | Reimpostare posizione |
| `ftruncate()` | Troncare file |
| `fflush()` | Svuotare buffer |
| `fscanf()` | Lettura formattata |
| `file_get_contents()` | Leggere file intero |
| `file_put_contents()` | Scrivere file intero |
| `file()` | Leggere file in array |
| `copy()` | Copiare file |
| `tmpfile()` | Creare file temporaneo |
| `readfile()` | Mostrare file |
| `fpassthru()` | Mostrare resto del file |
| `stream_get_contents()` | Leggere resto del flusso |
| `stream_copy_to_stream()` | Copiare tra flussi |

---

## Socket di flusso

| Funzione | Descrizione |
|----------|-------------|
| `stream_socket_client()` | Creare connessione client |
| `stream_socket_server()` | Creare socket server |
| `stream_socket_accept()` | Accettare connessione |
| `stream_select()` | Monitorare attività dei flussi |
| `stream_context_create()` | Creare contesto async |

> **Limitazione:** `stream_select()` con flussi pipe (es. da `proc_open()`) non è supportato su Windows. Su Linux/macOS funziona nativamente tramite il ciclo di eventi.

---

## Esecuzione di processi

| Funzione | Descrizione |
|----------|-------------|
| `proc_open()` | Aprire processo con pipe |
| `proc_close()` | Chiudere processo |
| `exec()` | Eseguire comando esterno |
| `shell_exec()` | Eseguire comando shell |
| `system()` | Eseguire comando di sistema |
| `passthru()` | Eseguire con output diretto |

---

## Timer e ritardi

| Funzione | Descrizione |
|----------|-------------|
| `sleep()` | Ritardo in secondi |
| `usleep()` | Ritardo in microsecondi |
| `time_nanosleep()` | Ritardo con precisione al nanosecondo |
| `time_sleep_until()` | Attendere fino al timestamp |

---

## Buffer di output

Ogni coroutine riceve un buffer di output **isolato**.

| Funzione | Descrizione |
|----------|-------------|
| `ob_start()` | Avviare il buffering |
| `ob_flush()` | Svuotare il buffer |
| `ob_clean()` | Pulire il buffer |
| `ob_get_contents()` | Ottenere il contenuto del buffer |
| `ob_end_clean()` | Terminare il buffering |

---

## Non ancora supportato

Funzioni pianificate per l'implementazione o non ancora adattate.

### DNS

| Funzione | Descrizione |
|----------|-------------|
| `dns_check_record()` / `checkdnsrr()` | Verificare record DNS |
| `dns_get_mx()` / `getmxrr()` | Ottenere record MX |
| `dns_get_record()` | Ottenere record DNS |

### Database

| Estensione | Descrizione |
|------------|-------------|
| PDO ODBC | Driver ODBC |
| PDO Oracle | Driver Oracle |
| PDO SQLite | Driver SQLite |
| PDO Firebird | Driver Firebird |
| MongoDB | Client MongoDB |

### Operazioni su file (metadati)

| Funzione | Descrizione |
|----------|-------------|
| `flock()` | Blocco file |
| `opendir()` / `readdir()` / `closedir()` | Attraversamento directory |
| `unlink()` / `rename()` | Eliminazione e rinomina file |
| `mkdir()` / `rmdir()` | Creazione e rimozione directory |
| `stat()` / `lstat()` | Informazioni sui file |
| `readlink()` | Lettura dei link simbolici |

> **Nota:** Le operazioni sui metadati dei file su disco locale si completano in microsecondi. La loro asincronia ha senso solo per i file system di rete (NFS).

---

## E poi?

- [spawn()](/it/docs/reference/spawn.html) — creare coroutine
- [await()](/it/docs/reference/await.html) — attendere i risultati
- [Coroutine](/it/docs/concepts/coroutines.html) — concetti ed esempi
