---
layout: docs
lang: zh
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /zh/docs/reference/supported-functions.html
page_title: "支持的函数"
description: "TrueAsync 中适配协程非阻塞操作的 PHP 函数完整列表。"
---

# 支持的函数

TrueAsync 将 **70 多个标准 PHP 函数**适配为协程内的非阻塞操作。
所有列出的函数在协程内调用时会自动变为异步。
在协程外部，它们照常工作。

---

## DNS

| 函数 | 描述 |
|------|------|
| `gethostbyname()` | 将主机名解析为 IP 地址 |
| `gethostbyaddr()` | 将 IP 地址反向解析为主机名 |
| `gethostbynamel()` | 获取主机名的 IP 地址列表 |

---

## 数据库

### PDO MySQL

| 函数 | 描述 |
|------|------|
| `PDO::__construct()` | 非阻塞连接 |
| `PDO::prepare()` | 准备语句 |
| `PDO::exec()` | 执行查询 |
| `PDOStatement::execute()` | 执行预处理语句 |
| `PDOStatement::fetch()` | 获取结果 |

### PDO PgSQL

| 函数 | 描述 |
|------|------|
| `PDO::__construct()` | 非阻塞连接 |
| `PDO::prepare()` | 准备语句 |
| `PDO::exec()` | 执行查询 |
| `PDOStatement::execute()` | 执行预处理语句 |
| `PDOStatement::fetch()` | 获取结果 |

### PDO 连接池

通过 `Async\Pool` 集成实现透明的 PDO 连接池。
每个协程从池中获取自己的连接，自动管理生命周期。

### MySQLi

| 函数 | 描述 |
|------|------|
| `mysqli_connect()` | 非阻塞连接 |
| `mysqli_query()` | 执行查询 |
| `mysqli_prepare()` | 准备语句 |
| `mysqli_stmt_execute()` | 执行预处理语句 |
| `mysqli_fetch_*()` | 获取结果 |

### PostgreSQL（原生）

| 函数 | 描述 |
|------|------|
| `pg_connect()` | 非阻塞连接 |
| `pg_query()` | 执行查询 |
| `pg_prepare()` | 准备语句 |
| `pg_execute()` | 执行预处理语句 |
| `pg_fetch_*()` | 获取结果 |

每个异步上下文使用独立连接以确保安全并发。

---

## CURL

| 函数 | 描述 |
|------|------|
| `curl_exec()` | 执行请求 |
| `curl_multi_exec()` | 执行多个请求 |
| `curl_multi_select()` | 等待活动 |
| `curl_multi_getcontent()` | 获取内容 |
| `curl_setopt()` | 设置选项 |
| `curl_getinfo()` | 获取请求信息 |
| `curl_error()` | 获取错误 |
| `curl_close()` | 关闭句柄 |

---

## 套接字

| 函数 | 描述 |
|------|------|
| `socket_create()` | 创建套接字 |
| `socket_create_pair()` | 创建套接字对 |
| `socket_connect()` | 连接 |
| `socket_accept()` | 接受连接 |
| `socket_read()` | 读取数据 |
| `socket_write()` | 写入数据 |
| `socket_send()` | 发送数据 |
| `socket_recv()` | 接收数据 |
| `socket_sendto()` | 发送到地址 |
| `socket_recvfrom()` | 从地址接收 |
| `socket_bind()` | 绑定地址 |
| `socket_listen()` | 监听 |
| `socket_select()` | 监控套接字活动 |

---

## 文件和流 I/O

| 函数 | 描述 |
|------|------|
| `fopen()` | 打开文件 |
| `fclose()` | 关闭文件 |
| `fread()` | 读取文件 |
| `fwrite()` | 写入文件 |
| `fgets()` | 读取行 |
| `fgetc()` | 读取字符 |
| `fgetcsv()` | 读取 CSV 行 |
| `fputcsv()` | 写入 CSV 行 |
| `fseek()` | 设置位置 |
| `ftell()` | 获取位置 |
| `rewind()` | 重置位置 |
| `ftruncate()` | 截断文件 |
| `fflush()` | 刷新缓冲区 |
| `fscanf()` | 格式化读取 |
| `file_get_contents()` | 读取整个文件 |
| `file_put_contents()` | 写入整个文件 |
| `file()` | 将文件读入数组 |
| `copy()` | 复制文件 |
| `tmpfile()` | 创建临时文件 |
| `readfile()` | 输出文件 |
| `fpassthru()` | 输出文件剩余部分 |
| `stream_get_contents()` | 读取流剩余部分 |
| `stream_copy_to_stream()` | 在流之间复制 |

---

## 流套接字

| 函数 | 描述 |
|------|------|
| `stream_socket_client()` | 创建客户端连接 |
| `stream_socket_server()` | 创建服务器套接字 |
| `stream_socket_accept()` | 接受连接 |
| `stream_select()` | 监控流活动 |
| `stream_context_create()` | 创建异步上下文 |

> **限制：** `stream_select()` 在 Windows 上不支持管道流（例如来自 `proc_open()`）。在 Linux/macOS 上通过事件循环原生工作。

---

## 进程执行

| 函数 | 描述 |
|------|------|
| `proc_open()` | 打开带管道的进程 |
| `proc_close()` | 关闭进程 |
| `exec()` | 执行外部命令 |
| `shell_exec()` | 执行 shell 命令 |
| `system()` | 执行系统命令 |
| `passthru()` | 执行并直接输出 |

---

## 定时器和延迟

| 函数 | 描述 |
|------|------|
| `sleep()` | 秒级延迟 |
| `usleep()` | 微秒级延迟 |
| `time_nanosleep()` | 纳秒精度延迟 |
| `time_sleep_until()` | 等待到指定时间 |

---

## 输出缓冲

每个协程获得一个**隔离的**输出缓冲区。

| 函数 | 描述 |
|------|------|
| `ob_start()` | 开始缓冲 |
| `ob_flush()` | 刷新缓冲区 |
| `ob_clean()` | 清理缓冲区 |
| `ob_get_contents()` | 获取缓冲区内容 |
| `ob_end_clean()` | 结束缓冲 |

---

## 尚未支持

计划实现或尚未适配的函数。

### DNS

| 函数 | 描述 |
|------|------|
| `dns_check_record()` / `checkdnsrr()` | 检查 DNS 记录 |
| `dns_get_mx()` / `getmxrr()` | 获取 MX 记录 |
| `dns_get_record()` | 获取 DNS 资源记录 |

### 数据库

| 扩展 | 描述 |
|------|------|
| PDO ODBC | ODBC 驱动 |
| PDO Oracle | Oracle 驱动 |
| PDO SQLite | SQLite 驱动 |
| PDO Firebird | Firebird 驱动 |
| MongoDB | MongoDB 客户端 |

### 文件操作（元数据）

| 函数 | 描述 |
|------|------|
| `flock()` | 文件锁定 |
| `opendir()` / `readdir()` / `closedir()` | 目录遍历 |
| `unlink()` / `rename()` | 文件删除和重命名 |
| `mkdir()` / `rmdir()` | 目录创建和删除 |
| `stat()` / `lstat()` | 文件信息 |
| `readlink()` | 读取符号链接 |

> **注意：** 本地磁盘上的文件元数据操作在微秒内完成。只有在网络文件系统（NFS）上才有异步化的意义。

---

## 接下来？

- [spawn()](/zh/docs/reference/spawn.html) — 创建协程
- [await()](/zh/docs/reference/await.html) — 等待结果
- [协程](/zh/docs/concepts/coroutines.html) — 概念和示例
