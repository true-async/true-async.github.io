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

`PHP TrueAsync` — это неофициальный проект по изменению ядра `PHP`!
`RFC` которое предлагается в настоящее время находиться в неопределённой ситуации, 
и неясно, будет ли оно принято в будущем.

Тем не менее я как автор проекта, верю в то, что наличие **выбора** является важным условием **развития**.
Проект `PHP TrueAsync` открыт для идей, предложений и помощи.
Вы можете связаться со мной лично, по email edmondifthen + proton.me, 
либо написать на форум: https://github.com/orgs/true-async/discussions

## Способы участия

### Код

- **Исправление багов** — посмотрите [открытые issues](https://github.com/true-async/php-src/issues){:target="_blank"}
  с меткой `good first issue` для начала
- **Новые возможности** — обсудите идею в [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  перед реализацией
- **Ревью кода** — помогайте рецензировать pull requests, это ценный вклад

### Документация

- **Исправления** — нашли неточность? Нажмите «Редактировать страницу» внизу любой страницы
- **Переводы** — помогите перевести документацию на другие языки
- **Примеры** — напишите примеры использования API для реальных сценариев
- **Туториалы** — создайте пошаговое руководство для конкретной задачи

### Тестирование

- **Тестирование сборок** — попробуйте [установить TrueAsync](/ru/download.html)
  на своей системе и сообщите о проблемах
- **Написание тестов** — увеличьте покрытие тестами для существующего API
- **Нагрузочное тестирование** — помогите найти узкие места производительности

### Сообщество

- **Отвечайте на вопросы** в [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  и [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Рассказывайте о проекте** — доклады, статьи, посты в блогах
- **Сообщайте о багах** — подробный баг-репорт экономит часы разработки

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

- **GitHub Discussions** — [вопросы и идеи](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [живое общение](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [баг-репорты](https://github.com/true-async/php-src/issues){:target="_blank"}

Спасибо за ваш вклад в развитие PHP!
