---
layout: page
lang: ru
path_key: "/contributing.html"
nav_active: contributing
permalink: /ru/contributing.html
page_title: "Участие в проекте"
description: "Как помочь развитию TrueAsync — код, документация, тестирование и сообщество"
---

## Статус проекта

`PHP TrueAsync` — неофициальный проект по изменению ядра `PHP`.
`RFC`, которое предлагается, в настоящее время находится в неопределённой ситуации,
и неясно, будет ли оно принято в будущем.

Тем не менее я как автор проекта верю в то, что наличие **выбора** является важным условием **развития**.
Проект `PHP TrueAsync` открыт для идей, предложений и помощи.

Если хотите обсудить что-то — пишите на форуме проекта или свяжитесь со мной лично:

<div style="display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0;">
  <a href="https://github.com/orgs/true-async/discussions" target="_blank" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: 1px solid #d0d7de; border-radius: 6px; text-decoration: none; color: #24292f; font-weight: 500;">
    <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 1h8.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 10.25 10H7.061l-2.574 2.573A1.458 1.458 0 0 1 2 11.543V10h-.25A1.75 1.75 0 0 1 0 8.25v-5.5C0 1.784.784 1 1.75 1ZM1.5 2.75v5.5c0 .138.112.25.25.25h1a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h3.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25h-8.5a.25.25 0 0 0-.25.25Zm13 2a.25.25 0 0 0-.25-.25h-.5a.75.75 0 0 1 0-1.5h.5c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 14.25 12H14v1.543a1.458 1.458 0 0 1-2.487 1.03L9.22 12.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.22 2.22v-2.19a.75.75 0 0 1 .75-.75h1a.25.25 0 0 0 .25-.25Z"/></svg>
    GitHub Discussions
  </a>
  <a href="https://discord.gg/yqBQPBHKp5" target="_blank" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: 1px solid #d0d7de; border-radius: 6px; text-decoration: none; color: #24292f; font-weight: 500;">
    <svg height="16" width="16" viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z"/></svg>
    Discord
  </a>
  <a href="mailto:edmondifthen@proton.me" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; border: 1px solid #d0d7de; border-radius: 6px; text-decoration: none; color: #24292f; font-weight: 500;">
    &#9993; Email
  </a>
</div>

## Способы участия

### Код

- **Исправление багов** — в [трекере задач](https://github.com/true-async/php-async/issues){:target="_blank"}
  есть issues с меткой `good first issue`, с которых удобно начать знакомство с проектом
- **Новые возможности** — будем рады обсудить вашу идею в [Discussions](https://github.com/orgs/true-async/discussions){:target="_blank"}
  до начала реализации
- **Ревью кода** — рецензирование pull requests — очень ценный вклад

### Документация

- **Исправления** — нашли неточность? Нажмите «Редактировать страницу» внизу любой страницы
- **Переводы** — помогите перевести документацию на другие языки
- **Примеры** — напишите примеры использования API для реальных сценариев
- **Туториалы** — создайте пошаговое руководство для конкретной задачи

### Тестирование

- **Тестирование сборок** — попробуйте [установить TrueAsync](/ru/download.html)
  на своей системе и расскажите, как прошло
- **Написание тестов** — увеличьте покрытие тестами для существующего API
- **Нагрузочное тестирование** — помогите найти узкие места производительности

### Сообщество

- **Отвечайте на вопросы** в [GitHub Discussions](https://github.com/orgs/true-async/discussions){:target="_blank"}
  и [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Рассказывайте о проекте** — доклады, статьи, посты в блогах
- **Сообщайте о проблемах** — подробный баг-репорт экономит часы разработки

## Как начать

### 1. Форкните репозиторий

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Настройте окружение

Следуйте [инструкции по сборке](/ru/download.html) для вашей платформы.
Для разработки рекомендуется сборка с `--debug`:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Создайте ветку

```bash
git checkout -b feature/my-improvement
```

### 4. Внесите изменения

- Следуйте стилю кода проекта
- Добавьте тесты для нового функционала
- Убедитесь, что существующие тесты проходят: `make test`

### 5. Отправьте Pull Request

- Опишите **что** и **зачем** вы изменили
- Укажите связанные issues
- Будьте готовы к обсуждению и доработкам

## Структура репозиториев

| Репозиторий | Описание |
|-------------|----------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Ядро PHP с Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Расширение с реализацией |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Этот сайт с документацией |

## Рекомендации

- **Маленькие PR лучше больших** — один PR решает одну задачу
- **Обсуждайте перед реализацией** — для крупных изменений создайте issue или discussion
- **Пишите тесты** — код без тестов сложнее принять
- **Документируйте** — обновляйте документацию при изменении API

## Связь

- **GitHub Discussions** — [вопросы и идеи](https://github.com/orgs/true-async/discussions){:target="_blank"}
- **Discord** — [живое общение](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [баг-репорты](https://github.com/true-async/php-async/issues){:target="_blank"}

Спасибо за интерес к проекту! Любой вклад — будь то код, документация или просто вопрос на форуме — помогает `TrueAsync` становиться лучше.
