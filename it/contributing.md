---
layout: page
lang: it
path_key: "/contributing.html"
nav_active: contributing
permalink: /it/contributing.html
page_title: "Contribuire"
description: "Come aiutare TrueAsync a crescere — codice, documentazione, test e community"
---

## Stato del progetto

`PHP TrueAsync` è un progetto non ufficiale per modificare il core di `PHP`!
L'`RFC` proposto si trova attualmente in una situazione incerta,
e non è chiaro se verrà accettato in futuro.

Tuttavia, come autore del progetto, credo che avere una **scelta** sia una condizione importante per il **progresso**.
Il progetto `PHP TrueAsync` è aperto a idee, suggerimenti e aiuto.
Puoi contattarmi personalmente via email: edmondifthen + proton.me,
oppure scrivere sul forum: https://github.com/orgs/true-async/discussions

## Modi per contribuire

### Codice

- **Correzione bug** — controlla le [issue aperte](https://github.com/true-async/php-src/issues){:target="_blank"}
  con l'etichetta `good first issue` per iniziare
- **Nuove funzionalità** — discuti la tua idea nelle [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  prima di implementarla
- **Code review** — aiuta a revisionare le pull request, è un contributo prezioso

### Documentazione

- **Correzioni** — trovato un'inesattezza? Clicca su «Modifica pagina» in fondo a qualsiasi pagina
- **Traduzioni** — aiuta a tradurre la documentazione in altre lingue
- **Esempi** — scrivi esempi di utilizzo dell'API per scenari reali
- **Tutorial** — crea guide passo-passo per compiti specifici

### Test

- **Test di compilazione** — prova a [installare TrueAsync](/it/download.html)
  sul tuo sistema e segnala eventuali problemi
- **Scrittura test** — aumenta la copertura dei test per l'API esistente
- **Test di carico** — aiuta a trovare i colli di bottiglia delle prestazioni

### Community

- **Rispondi alle domande** su [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  e [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Diffondi il progetto** — presentazioni, articoli, post sul blog
- **Segnala bug** — un report dettagliato fa risparmiare ore di sviluppo

## Come iniziare

### 1. Fai il fork del repository

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Configura l'ambiente

Segui le [istruzioni di compilazione](/it/download.html) per la tua piattaforma.
Per lo sviluppo, si consiglia una build di debug:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Crea un branch

```bash
git checkout -b feature/my-improvement
```

### 4. Apporta le modifiche

- Segui lo stile del codice del progetto
- Aggiungi test per le nuove funzionalità
- Assicurati che i test esistenti passino: `make test`

### 5. Invia una Pull Request

- Descrivi **cosa** e **perché** hai modificato
- Fai riferimento alle issue correlate
- Sii pronto per discussioni e revisioni

## Struttura dei repository

| Repository | Descrizione |
|------------|-------------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Core PHP con Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Estensione con implementazione |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Questo sito di documentazione |

## Linee guida

- **PR piccole sono meglio di grandi** — una PR risolve un compito
- **Discuti prima di implementare** — per modifiche importanti, crea prima una issue o discussion
- **Scrivi test** — il codice senza test è più difficile da accettare
- **Documenta** — aggiorna la documentazione quando modifichi l'API

## Contatti

- **GitHub Discussions** — [domande e idee](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [chat dal vivo](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [segnalazioni bug](https://github.com/true-async/php-src/issues){:target="_blank"}

Grazie per il tuo contributo al futuro di PHP!
