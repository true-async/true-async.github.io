---
layout: page
lang: uk
path_key: "/contributing.html"
nav_active: contributing
permalink: /uk/contributing.html
page_title: "Участь у проекті"
description: "Як допомогти розвитку TrueAsync — код, документація, тестування та спільнота"
---

## Статус проекту

`PHP TrueAsync` — це неофіційний проект зі зміни ядра `PHP`!
`RFC`, що пропонується, наразі перебуває в невизначеній ситуації,
і незрозуміло, чи буде воно прийняте в майбутньому.

Проте я як автор проекту вірю в те, що наявність **вибору** є важливою умовою **розвитку**.
Проект `PHP TrueAsync` відкритий для ідей, пропозицій та допомоги.
Ви можете зв'язатися зі мною особисто за email: edmondifthen + proton.me,
або написати на форум: https://github.com/orgs/true-async/discussions

## Способи участі

### Код

- **Виправлення багів** — перегляньте [відкриті issues](https://github.com/true-async/php-src/issues){:target="_blank"}
  з міткою `good first issue` для початку
- **Нові можливості** — обговоріть ідею в [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  перед реалізацією
- **Ревю коду** — допомагайте рецензувати pull requests, це цінний внесок

### Документація

- **Виправлення** — знайшли неточність? Натисніть «Редагувати сторінку» внизу будь-якої сторінки
- **Переклади** — допоможіть перекласти документацію іншими мовами
- **Приклади** — напишіть приклади використання API для реальних сценаріїв
- **Туторіали** — створіть покрокові інструкції для конкретних завдань

### Тестування

- **Тестування збірок** — спробуйте [встановити TrueAsync](/uk/download.html)
  на своїй системі та повідомте про проблеми
- **Написання тестів** — збільшіть покриття тестами для існуючого API
- **Навантажувальне тестування** — допоможіть знайти вузькі місця продуктивності

### Спільнота

- **Відповідайте на запитання** в [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  та [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Розповідайте про проект** — доповіді, статті, пости в блогах
- **Повідомляйте про баги** — детальний баг-репорт економить години розробки

## Як почати

### 1. Форкніть репозиторій

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. Налаштуйте середовище

Слідуйте [інструкції зі збірки](/uk/download.html) для вашої платформи.
Для розробки рекомендується збірка з `--debug`:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. Створіть гілку

```bash
git checkout -b feature/my-improvement
```

### 4. Внесіть зміни

- Дотримуйтесь стилю коду проекту
- Додайте тести для нового функціоналу
- Переконайтеся, що існуючі тести проходять: `make test`

### 5. Надішліть Pull Request

- Опишіть **що** та **навіщо** ви змінили
- Вкажіть пов'язані issues
- Будьте готові до обговорення та доопрацювань

## Структура репозиторіїв

| Репозиторій | Опис |
|-------------|------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Ядро PHP з Async API |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | Розширення з реалізацією |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | Цей сайт з документацією |

## Рекомендації

- **Маленькі PR краще за великі** — один PR вирішує одне завдання
- **Обговорюйте перед реалізацією** — для великих змін створіть issue або discussion
- **Пишіть тести** — код без тестів складніше прийняти
- **Документуйте** — оновлюйте документацію при зміні API

## Зв'язок

- **GitHub Discussions** — [запитання та ідеї](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [живе спілкування](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [баг-репорти](https://github.com/true-async/php-src/issues){:target="_blank"}

Дякуємо за ваш внесок у розвиток PHP!
