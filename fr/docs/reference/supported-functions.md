---
layout: docs
lang: fr
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /fr/docs/reference/supported-functions.html
page_title: "Fonctions supportées"
description: "Liste complète des fonctions PHP adaptées pour un fonctionnement non-bloquant avec les coroutines dans TrueAsync."
---

# Fonctions supportées

TrueAsync adapte **plus de 70 fonctions PHP standard** pour un fonctionnement non-bloquant au sein des coroutines.
Toutes les fonctions listées deviennent automatiquement asynchrones lorsqu'elles sont appelées dans une coroutine.
En dehors d'une coroutine, elles fonctionnent normalement.

---

## DNS

| Fonction | Description |
|----------|-------------|
| `gethostbyname()` | Résoudre un nom d'hôte en adresse IP |
| `gethostbyaddr()` | Résolution inverse d'adresse IP en nom d'hôte |
| `gethostbynamel()` | Obtenir la liste des adresses IP pour un nom d'hôte |

---

## Bases de données

### PDO MySQL

| Fonction | Description |
|----------|-------------|
| `PDO::__construct()` | Connexion non-bloquante |
| `PDO::prepare()` | Préparer une requête |
| `PDO::exec()` | Exécuter une requête |
| `PDOStatement::execute()` | Exécuter une requête préparée |
| `PDOStatement::fetch()` | Récupérer les résultats |

### PDO PgSQL

| Fonction | Description |
|----------|-------------|
| `PDO::__construct()` | Connexion non-bloquante |
| `PDO::prepare()` | Préparer une requête |
| `PDO::exec()` | Exécuter une requête |
| `PDOStatement::execute()` | Exécuter une requête préparée |
| `PDOStatement::fetch()` | Récupérer les résultats |

### Pool de connexions PDO

Pool de connexions transparent pour PDO via l'intégration `Async\Pool`.
Chaque coroutine reçoit sa propre connexion du pool avec gestion automatique du cycle de vie.

### MySQLi

| Fonction | Description |
|----------|-------------|
| `mysqli_connect()` | Connexion non-bloquante |
| `mysqli_query()` | Exécuter une requête |
| `mysqli_prepare()` | Préparer une requête |
| `mysqli_stmt_execute()` | Exécuter une requête préparée |
| `mysqli_fetch_*()` | Récupérer les résultats |

### PostgreSQL (natif)

| Fonction | Description |
|----------|-------------|
| `pg_connect()` | Connexion non-bloquante |
| `pg_query()` | Exécuter une requête |
| `pg_prepare()` | Préparer une requête |
| `pg_execute()` | Exécuter une requête préparée |
| `pg_fetch_*()` | Récupérer les résultats |

Chaque contexte async utilise une connexion séparée pour une concurrence sûre.

---

## CURL

| Fonction | Description |
|----------|-------------|
| `curl_exec()` | Exécuter une requête |
| `curl_multi_exec()` | Exécuter plusieurs requêtes |
| `curl_multi_select()` | Attendre l'activité |
| `curl_multi_getcontent()` | Obtenir le contenu |
| `curl_setopt()` | Définir les options |
| `curl_getinfo()` | Obtenir les informations de requête |
| `curl_error()` | Obtenir l'erreur |
| `curl_close()` | Fermer le handle |

---

## Sockets

| Fonction | Description |
|----------|-------------|
| `socket_create()` | Créer un socket |
| `socket_create_pair()` | Créer une paire de sockets |
| `socket_connect()` | Connecter |
| `socket_accept()` | Accepter une connexion |
| `socket_read()` | Lire les données |
| `socket_write()` | Écrire les données |
| `socket_send()` | Envoyer les données |
| `socket_recv()` | Recevoir les données |
| `socket_sendto()` | Envoyer à une adresse |
| `socket_recvfrom()` | Recevoir d'une adresse |
| `socket_bind()` | Lier à une adresse |
| `socket_listen()` | Écouter |
| `socket_select()` | Surveiller l'activité des sockets |

---

## E/S fichiers et flux

| Fonction | Description |
|----------|-------------|
| `fopen()` | Ouvrir un fichier |
| `fclose()` | Fermer un fichier |
| `fread()` | Lire depuis un fichier |
| `fwrite()` | Écrire dans un fichier |
| `fgets()` | Lire une ligne |
| `fgetc()` | Lire un caractère |
| `fgetcsv()` | Lire une ligne CSV |
| `fputcsv()` | Écrire une ligne CSV |
| `fseek()` | Définir la position |
| `ftell()` | Obtenir la position |
| `rewind()` | Réinitialiser la position |
| `ftruncate()` | Tronquer le fichier |
| `fflush()` | Vider les tampons |
| `fscanf()` | Lecture formatée |
| `file_get_contents()` | Lire le fichier entier |
| `file_put_contents()` | Écrire le fichier entier |
| `file()` | Lire le fichier dans un tableau |
| `copy()` | Copier un fichier |
| `tmpfile()` | Créer un fichier temporaire |
| `readfile()` | Afficher un fichier |
| `fpassthru()` | Afficher le reste du fichier |
| `stream_get_contents()` | Lire le reste du flux |
| `stream_copy_to_stream()` | Copier entre flux |

---

## Sockets de flux

| Fonction | Description |
|----------|-------------|
| `stream_socket_client()` | Créer une connexion client |
| `stream_socket_server()` | Créer un socket serveur |
| `stream_socket_accept()` | Accepter une connexion |
| `stream_select()` | Surveiller l'activité des flux |
| `stream_context_create()` | Créer un contexte async |

> **Limitation :** `stream_select()` avec les flux pipe (ex. de `proc_open()`) n'est pas supporté sous Windows. Sous Linux/macOS, cela fonctionne nativement via la boucle d'événements.

---

## Exécution de processus

| Fonction | Description |
|----------|-------------|
| `proc_open()` | Ouvrir un processus avec pipes |
| `proc_close()` | Fermer un processus |
| `exec()` | Exécuter une commande externe |
| `shell_exec()` | Exécuter une commande shell |
| `system()` | Exécuter une commande système |
| `passthru()` | Exécuter avec sortie directe |

---

## Minuteries et délais

| Fonction | Description |
|----------|-------------|
| `sleep()` | Délai en secondes |
| `usleep()` | Délai en microsecondes |
| `time_nanosleep()` | Délai en nanosecondes |
| `time_sleep_until()` | Attendre jusqu'à un horodatage |

---

## Mise en tampon de sortie

Chaque coroutine reçoit un tampon de sortie **isolé**.

| Fonction | Description |
|----------|-------------|
| `ob_start()` | Démarrer la mise en tampon |
| `ob_flush()` | Vider le tampon |
| `ob_clean()` | Nettoyer le tampon |
| `ob_get_contents()` | Obtenir le contenu du tampon |
| `ob_end_clean()` | Terminer la mise en tampon |

---

## Pas encore supporté

Fonctions prévues pour implémentation ou pas encore adaptées.

### DNS

| Fonction | Description |
|----------|-------------|
| `dns_check_record()` / `checkdnsrr()` | Vérifier un enregistrement DNS |
| `dns_get_mx()` / `getmxrr()` | Obtenir les enregistrements MX |
| `dns_get_record()` | Obtenir les enregistrements DNS |

### Bases de données

| Extension | Description |
|-----------|-------------|
| PDO ODBC | Pilote ODBC |
| PDO Oracle | Pilote Oracle |
| PDO SQLite | Pilote SQLite |
| PDO Firebird | Pilote Firebird |
| MongoDB | Client MongoDB |

### Opérations sur fichiers (métadonnées)

| Fonction | Description |
|----------|-------------|
| `flock()` | Verrouillage de fichier |
| `opendir()` / `readdir()` / `closedir()` | Parcours de répertoire |
| `unlink()` / `rename()` | Suppression et renommage de fichiers |
| `mkdir()` / `rmdir()` | Création et suppression de répertoires |
| `stat()` / `lstat()` | Informations sur les fichiers |
| `readlink()` | Lecture des liens symboliques |

> **Remarque :** Les opérations sur les métadonnées de fichiers sur disque local s'exécutent en microsecondes. Leur asynchronisation n'a de sens que pour les systèmes de fichiers réseau (NFS).

---

## Et ensuite ?

- [spawn()](/fr/docs/reference/spawn.html) — créer des coroutines
- [await()](/fr/docs/reference/await.html) — attendre les résultats
- [Coroutines](/fr/docs/concepts/coroutines.html) — concepts et exemples
