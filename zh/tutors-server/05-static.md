---
layout: tutorial
lang: zh
path_key: "/tutors-server/05-static.html"
nav_active: docs
permalink: /zh/tutors-server/05-static.html
page_title: "静态文件"
description: "StaticHandler：不经过 PHP 协程地提供文件、缓存，以及安全策略。"
---

# 静态文件

`ProfileService` 长出了一个前端。HTML、CSS、脚本、头像，都是些常见的东
西。它们过去由 nginx 提供，但我们在第一章里已经郑重地把 nginx 送走了。
现在谁来提供它们呢？

第一个念头是可以理解的：写一个按 URL 打开文件的处理器。打住。想想这意味
着什么：一天有成千上万个对 logo 的请求，而每一个都要一个协程、进入 PHP、
`fopen`、退出。这里的 PHP 什么需要 PHP 的事都没做。

服务器用一种彻底的方式解决了这个问题。一个静态路由完全在 C 里被处理。对
它的请求根本就不会进入 PHP：

```php
use TrueAsync\StaticHandler;

$server->addStaticHandler(
    new StaticHandler('/assets/', '/var/www/profile/public')
);
```

一个 URL 前缀，一个磁盘上的目录，搞定。`GET /assets/css/app.css` 会变成
对该文件的一次异步读取，直接读进套接字，经由 libuv，绕过 PHP。前几章里
的处理器继续接收其他所有请求。可以有多个挂载点，匹配按注册顺序搜索。
`sendFile` 里那些 HTTP 礼仪在这里也都有：`Content-Type`、带 304 的
`ETag`、通过 `Range` 实现的断点续传。

## 配置一个挂载点

`StaticHandler` 通过链式调用来配置，在它被附加到服务器之前：

```php
$static = (new StaticHandler('/assets/', '/var/www/profile/public'))
    ->setCacheControl('public, max-age=86400')
    ->enablePrecompressed('br', 'zstd', 'gzip')
    ->hide('*.map', 'drafts/**')
    ->setOnMissing(StaticOnMissing::NEXT);

$server->addStaticHandler($static);
```

我们逐行来看。

**`setCacheControl`** — 加在每个响应上的缓存头。与默认开启的 `ETag` 配
合，浏览器只有在文件真正改变时才重新下载它。

**`enablePrecompressed`** — 我最喜欢的一项。如果 `app.css.br` 就放在
`app.css` 旁边，一个带着合适 `Accept-Encoding` 的客户端就会拿到那个现成
的压缩文件。想想这笔经济账：你在前端构建阶段压缩一次，用最昂贵、质量最
高的等级，然后提供它一百万次，而不用在压缩上花一个时钟周期。

**`hide`** — 无论文件是否存在都返回 404 的 glob 模式。源码映射（source
map）和草稿都不会外泄。

**`setOnMissing(NEXT)`** — 未命中文件的那些请求的归宿。默认情况下，未命
中会直接从 C 里回答 404。而 `NEXT` 则会把请求转交出去，交给一个普通的
PHP 处理器。为什么？SPA。`/assets/app.js` 这个文件从磁盘提供，而一个不
存在的 `/assets/whatever` 会穿透落到应用里，由应用用它自己的
`index.html` 来回答。

在 `addStaticHandler` 之后，这个对象就被锁定了：服务器已经用它构建好了
自己的热路径结构。之后再试图去碰某个 setter 就是一个异常。

## 默认即安全

一段小小的题外话。按 URL 提供文件，从历史上看是 web 服务器里最盛产漏洞
的一个环节。地址栏里的 `../../etc/passwd` 是一个比这一章的许多读者年纪
还大的把戏。

所以开箱即用的策略是偏执的。带有 `..` 的请求会得到 404。经过以点号开头
的文件的路径会得到 404：无论是 `.env` 还是 `.git` 都不会泄露，哪怕它们
意外地进了那个目录。符号链接根本不会被解引用：文件必须实实在在地躺在挂
载根目录之内，任何 symlink 都别想把它拽出来。

所有这些都可以有意地放宽（`setDotfilePolicy`、`setSymlinkPolicy`），但
默认值的选择使得“插上就忘”这个选项是安全的。

## 当文件很多的时候

对于热门的挂载点，还有一个杠杆：

```php
$static->setOpenFileCache(maxEntries: 1024, ttlSeconds: 60);
```

这个缓存会记住最近那些文件已解析出的路径、元数据和响应头，并在重复请求
时省去系统调用的那一趟跋涉。在一个大目录或一个网络文件系统上，这是很显
著的。在一个小小的本地站点上则不然，这也是它默认关闭的原因。

这一章就到这里，我答应过是短的一章。静态文件从 PHP 身边飞驰而过，而 PHP
继续做它自己的工作。既然服务已经有了一张脸，是时候让它活起来了。还记得
第一部最开头那一章里的进度条吗，就是那个画在终端里的？它就要搬进浏览器
了。而且是服务器亲自来画它。
