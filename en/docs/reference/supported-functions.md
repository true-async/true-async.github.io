---
layout: docs
lang: en
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /en/docs/reference/supported-functions.html
page_title: "Supported Functions"
description: "Complete list of PHP functions adapted for coroutine-aware non-blocking operation in TrueAsync."
---

# Supported Functions

TrueAsync adapts **70+ standard PHP functions** for non-blocking operation within coroutines.
All listed functions automatically become asynchronous when called inside a coroutine.
Outside of a coroutine, they work as usual.

---

## DNS

| Function | Description |
|----------|-------------|
| `gethostbyname()` | Resolve hostname to IP address |
| `gethostbyaddr()` | Reverse resolve IP address to hostname |
| `gethostbynamel()` | Get list of IP addresses for hostname |

---

## Databases

### PDO MySQL

| Function | Description |
|----------|-------------|
| `PDO::__construct()` | Non-blocking connection |
| `PDO::prepare()` | Prepare statement |
| `PDO::exec()` | Execute query |
| `PDOStatement::execute()` | Execute prepared statement |
| `PDOStatement::fetch()` | Fetch results |

### PDO PgSQL

| Function | Description |
|----------|-------------|
| `PDO::__construct()` | Non-blocking connection |
| `PDO::prepare()` | Prepare statement |
| `PDO::exec()` | Execute query |
| `PDOStatement::execute()` | Execute prepared statement |
| `PDOStatement::fetch()` | Fetch results |

### PDO Connection Pooling

Transparent connection pooling for PDO via `Async\Pool` integration.
Each coroutine receives its own connection from the pool with automatic lifecycle management.

### MySQLi

| Function | Description |
|----------|-------------|
| `mysqli_connect()` | Non-blocking connection |
| `mysqli_query()` | Execute query |
| `mysqli_prepare()` | Prepare statement |
| `mysqli_stmt_execute()` | Execute prepared statement |
| `mysqli_fetch_*()` | Fetch results |

### PostgreSQL (native)

| Function | Description |
|----------|-------------|
| `pg_connect()` | Non-blocking connection |
| `pg_query()` | Execute query |
| `pg_prepare()` | Prepare statement |
| `pg_execute()` | Execute prepared statement |
| `pg_fetch_*()` | Fetch results |

Each async context uses a separate connection for safe concurrency.

---

## CURL

| Function | Description |
|----------|-------------|
| `curl_exec()` | Execute request |
| `curl_multi_exec()` | Execute multiple requests |
| `curl_multi_select()` | Wait for activity |
| `curl_multi_getcontent()` | Get content |
| `curl_setopt()` | Set options |
| `curl_getinfo()` | Get request info |
| `curl_error()` | Get error |
| `curl_close()` | Close handle |

---

## Sockets

| Function | Description |
|----------|-------------|
| `socket_create()` | Create socket |
| `socket_create_pair()` | Create socket pair |
| `socket_connect()` | Connect |
| `socket_accept()` | Accept connection |
| `socket_read()` | Read data |
| `socket_write()` | Write data |
| `socket_send()` | Send data |
| `socket_recv()` | Receive data |
| `socket_sendto()` | Send to address |
| `socket_recvfrom()` | Receive from address |
| `socket_bind()` | Bind to address |
| `socket_listen()` | Listen |
| `socket_select()` | Monitor socket activity |

---

## File and Stream I/O

| Function | Description |
|----------|-------------|
| `fopen()` | Open file |
| `fclose()` | Close file |
| `fread()` | Read from file |
| `fwrite()` | Write to file |
| `fgets()` | Read line |
| `fgetc()` | Read character |
| `fgetcsv()` | Read CSV line |
| `fputcsv()` | Write CSV line |
| `fseek()` | Set position |
| `ftell()` | Get position |
| `rewind()` | Reset position |
| `ftruncate()` | Truncate file |
| `fflush()` | Flush buffers |
| `fscanf()` | Formatted read |
| `file_get_contents()` | Read entire file |
| `file_put_contents()` | Write entire file |
| `file()` | Read file into array |
| `copy()` | Copy file |
| `tmpfile()` | Create temporary file |
| `readfile()` | Output file |
| `fpassthru()` | Output remaining file |
| `stream_get_contents()` | Read remaining stream |
| `stream_copy_to_stream()` | Copy between streams |

---

## Stream Sockets

| Function | Description |
|----------|-------------|
| `stream_socket_client()` | Create client connection |
| `stream_socket_server()` | Create server socket |
| `stream_socket_accept()` | Accept connection |
| `stream_select()` | Monitor stream activity |
| `stream_context_create()` | Create async-aware context |

> **Limitation:** `stream_select()` with pipe streams (e.g. from `proc_open()`) is not supported on Windows. On Linux/macOS it works natively through the event loop.

---

## Process Execution

| Function | Description |
|----------|-------------|
| `proc_open()` | Open process with pipes |
| `proc_close()` | Close process |
| `exec()` | Execute external command |
| `shell_exec()` | Execute shell command |
| `system()` | Execute system command |
| `passthru()` | Execute with direct output |

---

## Timers and Delays

| Function | Description |
|----------|-------------|
| `sleep()` | Delay in seconds |
| `usleep()` | Delay in microseconds |
| `time_nanosleep()` | Nanosecond precision delay |
| `time_sleep_until()` | Wait until timestamp |

---

## Output Buffering

Each coroutine receives an **isolated** output buffer.

| Function | Description |
|----------|-------------|
| `ob_start()` | Start buffering |
| `ob_flush()` | Flush buffer |
| `ob_clean()` | Clean buffer |
| `ob_get_contents()` | Get buffer contents |
| `ob_end_clean()` | End buffering |

---

## Not Yet Supported

Functions planned for implementation or not yet adapted.

### DNS

| Function | Description |
|----------|-------------|
| `dns_check_record()` / `checkdnsrr()` | Check DNS record |
| `dns_get_mx()` / `getmxrr()` | Get MX records |
| `dns_get_record()` | Get DNS resource records |

### Databases

| Extension | Description |
|-----------|-------------|
| PDO ODBC | ODBC driver |
| PDO Oracle | Oracle driver |
| PDO SQLite | SQLite driver |
| PDO Firebird | Firebird driver |
| MongoDB | MongoDB client |

### File Operations (metadata)

| Function | Description |
|----------|-------------|
| `flock()` | File locking |
| `opendir()` / `readdir()` / `closedir()` | Directory traversal |
| `unlink()` / `rename()` | File deletion and renaming |
| `mkdir()` / `rmdir()` | Directory creation and removal |
| `stat()` / `lstat()` | File information |
| `readlink()` | Read symbolic links |

> **Note:** File metadata operations on local disk complete in microseconds. Making them async only makes sense for network file systems (NFS).

---

## What's Next?

- [spawn()](/en/docs/reference/spawn.html) — creating coroutines
- [await()](/en/docs/reference/await.html) — waiting for results
- [Coroutines](/en/docs/components/coroutines.html) — concepts and examples
