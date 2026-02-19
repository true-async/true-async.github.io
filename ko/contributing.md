---
layout: page
lang: ko
path_key: "/contributing.html"
nav_active: contributing
permalink: /ko/contributing.html
page_title: "기여하기"
description: "TrueAsync의 발전을 돕는 방법 — 코드, 문서, 테스트 및 커뮤니티"
---

## 프로젝트 상태

`PHP TrueAsync`는 `PHP` 코어를 수정하는 비공식 프로젝트입니다!
현재 제안 중인 `RFC`는 불확실한 상황에 있으며,
미래에 채택될지 여부가 불분명합니다.

그럼에도 불구하고, 프로젝트의 저자로서 저는 **선택권**을 갖는 것이 **발전**의 중요한 조건이라고 믿습니다.
`PHP TrueAsync` 프로젝트는 아이디어, 제안 및 도움에 열려 있습니다.
이메일로 직접 연락할 수 있습니다: edmondifthen + proton.me,
또는 포럼에 작성하세요: https://github.com/orgs/true-async/discussions

## 기여 방법

### 코드

- **버그 수정** — [열린 이슈](https://github.com/true-async/php-src/issues){:target="_blank"}에서
  `good first issue` 라벨이 붙은 것부터 시작하세요
- **새로운 기능** — 구현 전에 [Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}에서
  아이디어를 논의하세요
- **코드 리뷰** — pull request 리뷰를 도와주세요, 소중한 기여입니다

### 문서

- **수정** — 부정확한 내용을 발견하셨나요? 페이지 하단의 «이 페이지 편집»을 클릭하세요
- **번역** — 다른 언어로 문서 번역을 도와주세요
- **예제** — 실제 시나리오를 위한 API 사용 예제를 작성하세요
- **튜토리얼** — 특정 작업을 위한 단계별 가이드를 만드세요

### 테스트

- **빌드 테스트** — 시스템에 [TrueAsync를 설치](/ko/download.html)해 보고
  문제를 보고하세요
- **테스트 작성** — 기존 API의 테스트 커버리지를 높이세요
- **부하 테스트** — 성능 병목 현상을 찾는 데 도움을 주세요

### 커뮤니티

- **질문에 답하기** — [GitHub Discussions](https://github.com/true-async/php-src/discussions){:target="_blank"}
  및 [Discord](https://discord.gg/yqBQPBHKp5){:target="_blank"}에서
- **프로젝트 홍보** — 발표, 기사, 블로그 게시물
- **버그 보고** — 상세한 버그 보고서는 몇 시간의 개발 시간을 절약합니다

## 시작하기

### 1. 저장소 포크하기

```bash
git clone https://github.com/true-async/php-src.git
cd php-src
```

### 2. 환경 설정

플랫폼에 맞는 [빌드 지침](/ko/download.html)을 따르세요.
개발에는 디버그 빌드를 권장합니다:

```bash
./buildconf
./configure --enable-async --enable-debug
make -j$(nproc)
```

### 3. 브랜치 생성

```bash
git checkout -b feature/my-improvement
```

### 4. 변경하기

- 프로젝트의 코드 스타일을 따르세요
- 새로운 기능에 대한 테스트를 추가하세요
- 기존 테스트가 통과하는지 확인하세요: `make test`

### 5. Pull Request 제출

- **무엇을** 그리고 **왜** 변경했는지 설명하세요
- 관련 이슈를 참조하세요
- 논의와 수정에 대비하세요

## 저장소 구조

| 저장소 | 설명 |
|--------|------|
| [php-src](https://github.com/true-async/php-src){:target="_blank"} | Async API를 포함한 PHP 코어 |
| [ext-async](https://github.com/true-async/ext-async){:target="_blank"} | 구현을 포함한 확장 |
| [true-async.github.io](https://github.com/true-async/true-async.github.io){:target="_blank"} | 이 문서 사이트 |

## 가이드라인

- **작은 PR이 큰 것보다 좋습니다** — 하나의 PR은 하나의 작업을 해결합니다
- **구현 전에 논의하세요** — 대규모 변경의 경우 먼저 이슈나 디스커션을 만드세요
- **테스트를 작성하세요** — 테스트 없는 코드는 수용하기 어렵습니다
- **문서화하세요** — API 변경 시 문서를 업데이트하세요

## 연락처

- **GitHub Discussions** — [질문과 아이디어](https://github.com/true-async/php-src/discussions){:target="_blank"}
- **Discord** — [실시간 채팅](https://discord.gg/yqBQPBHKp5){:target="_blank"}
- **Issues** — [버그 보고](https://github.com/true-async/php-src/issues){:target="_blank"}

PHP의 미래에 기여해 주셔서 감사합니다!
