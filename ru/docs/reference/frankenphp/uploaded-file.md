---
layout: docs
lang: ru
path_key: "/docs/reference/frankenphp/uploaded-file.html"
nav_active: docs
permalink: /ru/docs/reference/frankenphp/uploaded-file.html
page_title: "FrankenPHP\\UploadedFile"
description: "Класс FrankenPHP\\UploadedFile — доступ к метаданным загруженного файла (имя, тип, размер) и перемещение файла в постоянное хранилище."
---

# FrankenPHP\UploadedFile

(True Async 0.6+)

Объекты `UploadedFile` возвращаются методом [`Request::getUploadedFiles()`](/ru/docs/reference/frankenphp/request.html#getuploadedfiles).
Каждый объект представляет один загруженный файл и предоставляет доступ к его метаданным
и метод для перемещения в постоянное хранилище.

Несколько файлов, загруженных под одним именем поля, возвращаются как массив объектов `UploadedFile`.

## Обзор класса

```php
namespace FrankenPHP;

class UploadedFile
{
    public function getName(): string;
    public function getType(): string;
    public function getSize(): int;
    public function getTmpName(): string;
    public function getError(): int;
    public function moveTo(string $path): bool;
}
```

## Методы

### getName

```php
public UploadedFile::getName(): string
```

Возвращает оригинальное имя файла, отправленное клиентом.

> **Примечание:** никогда не доверяйте оригинальному имени файла для сохранения. Всегда очищайте
> или генерируйте безопасное имя перед сохранением.

### getType

```php
public UploadedFile::getType(): string
```

Возвращает MIME-тип, указанный клиентом (например, `image/png`).

### getSize

```php
public UploadedFile::getSize(): int
```

Возвращает размер файла в байтах.

### getTmpName

```php
public UploadedFile::getTmpName(): string
```

Возвращает путь к временному файлу на диске.

### getError

```php
public UploadedFile::getError(): int
```

Возвращает код ошибки загрузки. `UPLOAD_ERR_OK` (0) означает успех.
Смотрите [константы ошибок загрузки PHP](https://www.php.net/manual/ru/features.file-upload.errors.php).

### moveTo

```php
public UploadedFile::moveTo(string $path): bool
```

Перемещает загруженный файл в указанный путь назначения. Возвращает `true` при успехе.

## Примеры

### Пример #1 Обработка загрузки одного файла

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();

    if (isset($files['avatar'])) {
        $file = $files['avatar'];

        if ($file->getError() === UPLOAD_ERR_OK) {
            $safeName = bin2hex(random_bytes(16)) . '.png';
            $file->moveTo('/uploads/' . $safeName);

            $response->setStatus(200);
            $response->write("Загружено: {$file->getName()} ({$file->getSize()} байт)");
        } else {
            $response->setStatus(400);
            $response->write("Код ошибки загрузки: {$file->getError()}");
        }
    } else {
        $response->setStatus(400);
        $response->write('Файл не загружен');
    }

    $response->end();
});
```

### Пример #2 Обработка нескольких файлов

```php
<?php

use FrankenPHP\HttpServer;
use FrankenPHP\Request;
use FrankenPHP\Response;

HttpServer::onRequest(function (Request $request, Response $response): void {
    $files = $request->getUploadedFiles();
    $saved = [];

    // Несколько файлов, загруженных как photos[]
    $photos = $files['photos'] ?? [];

    if (!is_array($photos)) {
        $photos = [$photos];
    }

    foreach ($photos as $file) {
        if ($file->getError() === UPLOAD_ERR_OK) {
            $dest = '/uploads/' . bin2hex(random_bytes(8)) . '_' . $file->getName();
            $file->moveTo($dest);
            $saved[] = $file->getName();
        }
    }

    $response->setStatus(200);
    $response->setHeader('Content-Type', 'application/json');
    $response->write(json_encode(['saved' => $saved]));
    $response->end();
});
```

## Смотрите также

- [FrankenPHP\Request](/ru/docs/reference/frankenphp/request.html) -- Чтение данных запроса
- [FrankenPHP\Response](/ru/docs/reference/frankenphp/response.html) -- Формирование и отправка ответов
- [Руководство по FrankenPHP](/ru/docs/frankenphp.html) -- Установка, конфигурация и развёртывание
