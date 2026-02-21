---
layout: docs
lang: es
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /es/docs/reference/supported-functions.html
page_title: "Funciones soportadas"
description: "Lista completa de funciones PHP adaptadas para operación no bloqueante con corrutinas en TrueAsync."
---

# Funciones soportadas

TrueAsync adapta **más de 70 funciones estándar de PHP** para operación no bloqueante dentro de corrutinas.
Todas las funciones listadas se vuelven automáticamente asíncronas cuando se llaman dentro de una corrutina.
Fuera de una corrutina, funcionan como siempre.

---

## DNS

| Función | Descripción |
|---------|-------------|
| `gethostbyname()` | Resolver nombre de host a dirección IP |
| `gethostbyaddr()` | Resolución inversa de dirección IP a nombre de host |
| `gethostbynamel()` | Obtener lista de direcciones IP para un nombre de host |

---

## Bases de datos

### PDO MySQL

| Función | Descripción |
|---------|-------------|
| `PDO::__construct()` | Conexión no bloqueante |
| `PDO::prepare()` | Preparar consulta |
| `PDO::exec()` | Ejecutar consulta |
| `PDOStatement::execute()` | Ejecutar consulta preparada |
| `PDOStatement::fetch()` | Obtener resultados |

### PDO PgSQL

| Función | Descripción |
|---------|-------------|
| `PDO::__construct()` | Conexión no bloqueante |
| `PDO::prepare()` | Preparar consulta |
| `PDO::exec()` | Ejecutar consulta |
| `PDOStatement::execute()` | Ejecutar consulta preparada |
| `PDOStatement::fetch()` | Obtener resultados |

### Pool de conexiones PDO

Pool de conexiones transparente para PDO mediante integración con `Async\Pool`.
Cada corrutina recibe su propia conexión del pool con gestión automática del ciclo de vida.

### MySQLi

| Función | Descripción |
|---------|-------------|
| `mysqli_connect()` | Conexión no bloqueante |
| `mysqli_query()` | Ejecutar consulta |
| `mysqli_prepare()` | Preparar consulta |
| `mysqli_stmt_execute()` | Ejecutar consulta preparada |
| `mysqli_fetch_*()` | Obtener resultados |

### PostgreSQL (nativo)

| Función | Descripción |
|---------|-------------|
| `pg_connect()` | Conexión no bloqueante |
| `pg_query()` | Ejecutar consulta |
| `pg_prepare()` | Preparar consulta |
| `pg_execute()` | Ejecutar consulta preparada |
| `pg_fetch_*()` | Obtener resultados |

Cada contexto async utiliza una conexión separada para concurrencia segura.

---

## CURL

| Función | Descripción |
|---------|-------------|
| `curl_exec()` | Ejecutar solicitud |
| `curl_multi_exec()` | Ejecutar múltiples solicitudes |
| `curl_multi_select()` | Esperar actividad |
| `curl_multi_getcontent()` | Obtener contenido |
| `curl_setopt()` | Establecer opciones |
| `curl_getinfo()` | Obtener información de solicitud |
| `curl_error()` | Obtener error |
| `curl_close()` | Cerrar handle |

---

## Sockets

| Función | Descripción |
|---------|-------------|
| `socket_create()` | Crear socket |
| `socket_create_pair()` | Crear par de sockets |
| `socket_connect()` | Conectar |
| `socket_accept()` | Aceptar conexión |
| `socket_read()` | Leer datos |
| `socket_write()` | Escribir datos |
| `socket_send()` | Enviar datos |
| `socket_recv()` | Recibir datos |
| `socket_sendto()` | Enviar a dirección |
| `socket_recvfrom()` | Recibir de dirección |
| `socket_bind()` | Vincular a dirección |
| `socket_listen()` | Escuchar |
| `socket_select()` | Monitorear actividad de sockets |

---

## E/S de archivos y flujos

| Función | Descripción |
|---------|-------------|
| `fopen()` | Abrir archivo |
| `fclose()` | Cerrar archivo |
| `fread()` | Leer de archivo |
| `fwrite()` | Escribir en archivo |
| `fgets()` | Leer línea |
| `fgetc()` | Leer carácter |
| `fgetcsv()` | Leer línea CSV |
| `fputcsv()` | Escribir línea CSV |
| `fseek()` | Establecer posición |
| `ftell()` | Obtener posición |
| `rewind()` | Restablecer posición |
| `ftruncate()` | Truncar archivo |
| `fflush()` | Vaciar búferes |
| `fscanf()` | Lectura formateada |
| `file_get_contents()` | Leer archivo completo |
| `file_put_contents()` | Escribir archivo completo |
| `file()` | Leer archivo en array |
| `copy()` | Copiar archivo |
| `tmpfile()` | Crear archivo temporal |
| `readfile()` | Mostrar archivo |
| `fpassthru()` | Mostrar resto del archivo |
| `stream_get_contents()` | Leer resto del flujo |
| `stream_copy_to_stream()` | Copiar entre flujos |

---

## Sockets de flujo

| Función | Descripción |
|---------|-------------|
| `stream_socket_client()` | Crear conexión cliente |
| `stream_socket_server()` | Crear socket servidor |
| `stream_socket_accept()` | Aceptar conexión |
| `stream_select()` | Monitorear actividad de flujos |
| `stream_context_create()` | Crear contexto async |

> **Limitación:** `stream_select()` con flujos pipe (ej. de `proc_open()`) no está soportado en Windows. En Linux/macOS funciona nativamente a través del bucle de eventos.

---

## Ejecución de procesos

| Función | Descripción |
|---------|-------------|
| `proc_open()` | Abrir proceso con pipes |
| `proc_close()` | Cerrar proceso |
| `exec()` | Ejecutar comando externo |
| `shell_exec()` | Ejecutar comando shell |
| `system()` | Ejecutar comando del sistema |
| `passthru()` | Ejecutar con salida directa |

---

## Temporizadores y retardos

| Función | Descripción |
|---------|-------------|
| `sleep()` | Retardo en segundos |
| `usleep()` | Retardo en microsegundos |
| `time_nanosleep()` | Retardo con precisión de nanosegundos |
| `time_sleep_until()` | Esperar hasta marca de tiempo |

---

## Búfer de salida

Cada corrutina recibe un búfer de salida **aislado**.

| Función | Descripción |
|---------|-------------|
| `ob_start()` | Iniciar búfer |
| `ob_flush()` | Vaciar búfer |
| `ob_clean()` | Limpiar búfer |
| `ob_get_contents()` | Obtener contenido del búfer |
| `ob_end_clean()` | Finalizar búfer |

---

## Aún no soportado

Funciones planificadas para implementación o aún no adaptadas.

### DNS

| Función | Descripción |
|---------|-------------|
| `dns_check_record()` / `checkdnsrr()` | Verificar registro DNS |
| `dns_get_mx()` / `getmxrr()` | Obtener registros MX |
| `dns_get_record()` | Obtener registros DNS |

### Bases de datos

| Extensión | Descripción |
|-----------|-------------|
| PDO ODBC | Controlador ODBC |
| PDO Oracle | Controlador Oracle |
| PDO SQLite | Controlador SQLite |
| PDO Firebird | Controlador Firebird |
| MongoDB | Cliente MongoDB |

### Operaciones de archivos (metadatos)

| Función | Descripción |
|---------|-------------|
| `flock()` | Bloqueo de archivos |
| `opendir()` / `readdir()` / `closedir()` | Recorrido de directorios |
| `unlink()` / `rename()` | Eliminación y renombrado de archivos |
| `mkdir()` / `rmdir()` | Creación y eliminación de directorios |
| `stat()` / `lstat()` | Información de archivos |
| `readlink()` | Lectura de enlaces simbólicos |

> **Nota:** Las operaciones de metadatos de archivos en disco local se completan en microsegundos. Su asincronía solo tiene sentido para sistemas de archivos en red (NFS).

---

## ¿Qué sigue?

- [spawn()](/es/docs/reference/spawn.html) — crear corrutinas
- [await()](/es/docs/reference/await.html) — esperar resultados
- [Corrutinas](/es/docs/components/coroutines.html) — conceptos y ejemplos
