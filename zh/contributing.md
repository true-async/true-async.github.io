---
layout: page
lang: zh
path_key: "/contributing.html"
nav_active: contributing
permalink: /zh/contributing.html
page_title: "参与贡献"
description: "如何帮助 TrueAsync 发展 — 代码、文档、测试和社区"
---

## 项目状态

`PHP TrueAsync` 是一个修改 `PHP` 核心的非官方项目！
目前提出的 `RFC` 处于不确定的状态，
尚不清楚它是否会在未来被接受。

然而，作为项目的作者，我相信拥有**选择**是**进步**的重要条件。
`PHP TrueAsync` 项目欢迎各种想法、建议和帮助。
您可以通过 email 与我个人联系：edmondifthen + proton.me，
或在论坛上留言：https://github.com/orgs/true-async/discussions

## 贡献方式

### 代码

- **修复 Bug** — 查看带有 `good first issue` 标签的[未解决 issues](https://github.com/true-async/php-src/issues){:target="_blank"}
  来开始
- **新功能** — 在实现之前先在 [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  中讨论您的想法
- **代码审查** — 帮助审查 pull requests，这是宝贵的贡献

### 文档

- **纠错** — 发现了不准确的地方？点击任何页面底部的「编辑此页」
- **翻译** — 帮助将文档翻译成其他语言
- **示例** — 为实际场景编写 API 使用示例
- **教程** — 为特定任务创建分步指南

### 测试

- **构建测试** — 尝试在您的系统上[安装 TrueAsync](/zh/download.html)
  并报告任何问题
- **编写测试** — 增加现有 API 的测试覆盖率
- **负载测试** — 帮助发现性能瓶颈

### 社区

- **回答问题** — 在 [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  和 [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"} 上
- **传播项目** — 演讲、文章、博客文章
- **报告 Bug** — 一份详细的 Bug 报告能节省数小时的开发时间

## 如何开始

### 1. Fork 仓库

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. 设置环境

按照[构建说明](/zh/download.html)为您的平台进行配置。
开发建议使用 debug 构建：

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. 创建分支

```bash
git checkout -b feature/my-improvement
```

### 4. 进行修改

- 遵循项目的代码风格
- 为新功能添加测试
- 确保现有测试通过：`make test`

### 5. 提交 Pull Request

- 描述您修改了**什么**以及**为什么**
- 引用相关的 issues
- 准备好进行讨论和修改

## 仓库结构

| 仓库 | 描述 |
|------|------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | 带有 Async API 的 PHP 核心 |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | 带有实现的扩展 |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | 本文档网站 |

## 指南

- **小 PR 优于大 PR** — 一个 PR 解决一个任务
- **实现前先讨论** — 对于重大更改，请先创建 issue 或 discussion
- **编写测试** — 没有测试的代码更难被接受
- **编写文档** — 更改 API 时更新文档

## 联系方式

- **GitHub Discussions** — [问题和想法](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [实时聊天](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [Bug 报告](https://github.com/true-async/php-src/issues){:target="_blank"}

感谢您为 PHP 的未来做出贡献！
