---
layout: docs
lang: ko
path_key: "/docs/mobile/index.html"
nav_active: docs
permalink: /ko/docs/mobile/index.html
page_title: "TrueAsync Mobile"
description: "native-bridge: JNI 위에서 네이티브 Android 앱 안에 상주하는 PHP 런타임. 아키텍처, 이벤트 교환, PHP에서 Kotlin 호출, 코드 생성."
---

# TrueAsync Mobile

(데모 프로젝트, 실험적, 저장소
[native-bridge](https://github.com/true-async/native-bridge), Android)

비동기 PHP는 UI 애플리케이션에 특히 잘 맞습니다: 네트워크와 통신하거나, 디스크를 읽거나,
다음 사용자 동작을 기다리는 동안 인터페이스가 멈춰서는 안 되기 때문입니다. TrueAsync는 이를
위한 전용 C API를 가지고 있습니다: Trigger Event(`zend_async_API.h`의
`ZEND_ASYNC_NEW_TRIGGER_EVENT()`)입니다. 이는 단일 메서드 `trigger()`를 가진 객체로,
어떤 C나 C++ 코드든 다른 스레드에서 이를 호출해 스레드 안전하게 PHP 리액터를 깨우고 이벤트
처리를 위한 제어권을 넘길 수 있습니다.

**native-bridge**는 Android를 위해 정확히 이런 종류의 통합을 구현합니다: PHP는 상주 프로세스로
앱에 내장되어, 백그라운드 스레드에서 한 번 시작하고, 이벤트 루프(생태계 전반에서 쓰이는 것과
같은 TrueAsync 리액터)를 돌리며, 양방향으로 Kotlin과 통신합니다.

## 요청/응답이 아닌 상주 프로세스인 이유

일반적인 PHP 시나리오는 웹 요청입니다: 프로세스가 시작해서 요청 하나를 처리하고 종료합니다.
이는 모바일 앱에는 맞지 않습니다: PHP는 앱이 열려 있는 동안 계속 살아 있어야 하고, 핸들러가
HTTP 요청에 반응하는 것과 같은 방식으로 사용자 이벤트(탭, 센서, 위치)에 반응해야 합니다.
native-bridge가 제공하는 것이 정확히 이것입니다: PHP는 앱이 실행될 때 한 번 시작되어 명시적으로
중지될 때까지 자신의 스레드에서 살아 있고, 그 스레드 안의 TrueAsync 코루틴들이 이벤트와
백그라운드 작업을 콘커런트하게 처리합니다.

## 브리지 아키텍처

브리지는 두 방향으로 동작합니다:

1. **Android에서 PHP로.** Kotlin이 이벤트(탭, 센서 값, 위치, 임의의 커스텀 이벤트)를 큐에
   넣고, PHP는 자신의 루프에서 이를 꺼냅니다.
2. **PHP에서 Kotlin으로.** PHP가 Kotlin 측에 구현된 메서드를 호출합니다(Toast 표시, 진동,
   클립보드에 텍스트 복사 등).

두 방향 모두 **JNI(Java Native Interface)**를 거칩니다. 이는 C 코드가 Kotlin/Java 코드를
호출하고 그 반대도 가능하게 하는 Android 표준 메커니즘입니다. 어느 방향도 JSON이나 다른 텍스트
형식으로 데이터를 전달하지 않습니다: 값은 이미 타입이 지정된 채로 경계를 넘으며, 추가 변환이
없습니다.

PHP는 자신의 OS 스레드에서 실행되며 Android의 UI 스레드를 절대 블로킹하지 않습니다. PHP가
데이터를 기다리는 동안에도 UI 스레드는 계속 반응하며, 그 반대도 마찬가지입니다.

## 방향 1: Android에서 PHP로의 이벤트

Kotlin은 JNI를 통해 이벤트를 큐에 보내고, PHP는 `NativeBridge::poll()`로 이를 읽습니다.
큐가 비어 있으면 `poll()`은 즉시 `null`을 반환하고, PHP 애플리케이션은 다음 이벤트를 기다릴지
아니면 그동안 다른 일을 할지 스스로 결정합니다(데모 앱에서는 짧은 `usleep()` 일시 정지이며,
그 동안 TrueAsync가 백그라운드 코루틴과 타이머를 실행할 기회를 얻습니다).

이벤트 유형은 네 가지입니다: 화면 터치, 위치 데이터, 센서 데이터(가속도계 등), 그리고 이름과
텍스트 payload를 가진 임의의 이벤트. 마지막 유형이 데모 앱에서 버튼 클릭을 표시하는 데 쓰이는
것입니다:

```php
use TrueAsync\NativeBridge;

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC) {
        match ($event['event_name']) {
            'count_a' => $counterA->toggle(),
            'fetch'   => spawn(fn() => fetchDemo()),
            default   => null,
        };
    }
}
```

처음 세 이벤트 유형(터치, 위치, 센서)은 문자열 할당이 필요 없으므로, 호출 빈도가 높아도
(예를 들어 가속도계 데이터 스트림) 저렴하게 유지됩니다.

## 방향 2: PHP에서 Kotlin으로의 호출

PHP가 모듈 메서드를 호출할 때, 예를 들어 `Toast::show('Hello', true)`를 호출할 때, 그 호출이
Kotlin에 도달하는 방법은 두 가지입니다:

### 일반 경로

기본적으로 PHP는 인수를 압축된 타입 버퍼에 담아(JSON 같은 문자열 형식이 아니므로 Kotlin은
텍스트 파싱이나 추가 할당 없이 이를 읽습니다) `NativeBridge::invoke()`로 한 번의 호출로
전달합니다. 이 경로에서 새 모듈이나 메서드를 추가해도 C는 전혀 건드리지 않습니다: Kotlin과
생성된 PHP 래퍼만 바뀌므로, Kotlin 쪽의 Gradle 재빌드만으로 충분하고 네이티브 라이브러리를
재빌드할 필요가 없습니다.

### 빠른 경로: `#[FastPath]`

매우 자주 호출되는 "핫" 메서드(예를 들어 매 프레임마다 센서 데이터를 공급하는 경우)의 경우,
PHP 스펙에서 해당 메서드를 `#[FastPath]` 속성으로 표시합니다. 이런 메서드에 대해 생성기는
중간 버퍼 없이 JNI를 통해 Kotlin을 직접 호출하는 전용 타입 C 함수를 만듭니다. 이 방식의
메서드는 변경할 때마다 네이티브 라이브러리(`.so` 파일)를 재빌드해야 하지만, 더 빠르고 추가
할당 없이 실행됩니다. 메서드의 동작 자체는 바뀌지 않으며, 호출이 PHP/Kotlin 경계를 넘는
방식만 바뀝니다.

## 모듈 설명: `#[BridgeModule]`

모듈의 계약은 PHP 쪽에서 `#[BridgeModule]` 속성이 붙은 인터페이스로 설명됩니다:

```php
namespace TrueAsync\Android\Spec;

#[BridgeModule]
interface ToastInterface
{
    #[Ui]
    public function show(string $text, bool $long): void;

    public function batteryLevel(): int;
}
```

- 모듈 이름은 인터페이스 이름에서 유도되거나(`ToastInterface`는 모듈 `Toast`가 됨), 명시적으로
  지정합니다: `#[BridgeModule('Clipboard')]`.
- 메서드 위의 `#[Ui]`는 Kotlin 구현이 Android의 UI 스레드에서 실행되어야 함을 뜻합니다
  (생성기가 스레드 전환을 알아서 추가합니다).
- 메서드 위의 `#[FastPath]`는 위에서 설명한 빠른 호출 경로를 활성화합니다.

## `tools/bridge/gen.php`가 생성하는 것

PHP 스펙(`#[BridgeModule]` 인터페이스)으로부터 생성기는 실행할 때마다 다음을 새로
만듭니다:

- 추상 메서드를 가진 Kotlin 클래스(`ToastSpec`);
- 호출 라우팅 코드(Kotlin);
- 나머지 PHP 앱 코드가 호출하는 PHP 래퍼(`Toast::show(...)`);
- `#[FastPath]`로 표시된 메서드의 경우, Kotlin을 직접 호출하는 타입 C 코드.

## PHP 애플리케이션 생명주기

1. Kotlin이 백그라운드 스레드에서 PHP를 시작하고 진입 PHP 스크립트의 경로를 전달합니다.
2. PHP 스크립트가 `NativeBridge::init()`을 호출합니다. 그 시점부터 브리지는 이벤트와 호출을
   받을 준비가 됩니다.
3. 그 다음 애플리케이션은 루프로 실행됩니다: `poll()`로 이벤트를 가져오고, 처리하고, 필요하면
   백그라운드 TrueAsync 코루틴을 생성합니다(예를 들어 네트워크 요청용).
4. 종료는 정상적으로 이루어집니다: Kotlin이 `NativeBridge.stop()`을 호출하면, PHP 루프는
   `NativeBridge::shouldStop()`으로 이를 감지하고, 마무리한 뒤 리소스를 깔끔하게 해제합니다.

## 예제: 버튼 위의 카운터

데모 앱을 기반으로 한 단순화된 예제입니다: 버튼이 끝없는 카운터를 시작하고 멈추며, 그 값은
UI에 직접 업데이트됩니다. 시작과 정지는 UI 스레드를 블로킹하지 않고 일반 TrueAsync 코루틴의
`spawn()`/`cancel()`로 구현됩니다:

```php
use TrueAsync\NativeBridge;
use TrueAsync\Android\Ui;
use function Async\spawn;
use function Async\delay;

NativeBridge::init();

$root = Ui::newLinearLayout();

$button = Ui::newButton();
Ui::setText($button, '▶ start counter');
Ui::setOnClickListener($button, 'toggle');
Ui::addView($root, $button);

$label = Ui::newTextView();
Ui::setText($label, 'stopped');
Ui::addView($root, $label);

Ui::setContentView($root);

$counter = null;

function tick(int $label): void
{
    $n = 0;
    while (true) {
        Ui::setText($label, 'tick ' . ++$n);
        delay(400);
    }
}

while (!NativeBridge::shouldStop()) {
    $event = NativeBridge::poll();
    if ($event === null) {
        usleep(1000);
        continue;
    }

    if ($event['type'] === NativeBridge::EVENT_GENERIC && $event['event_name'] === 'toggle') {
        if ($counter === null) {
            $counter = spawn(fn() => tick($label));
            Ui::setText($button, '■ stop counter');
        } else {
            $counter->cancel();
            $counter = null;
            Ui::setText($button, '▶ start counter');
        }
    }
}
```

두 번째 클릭은 `cancel()`을 통해 `$counter` 코루틴을 취소하고, 카운터는 도달한 값에서
멈춥니다. 여러 개의 독립적인 카운터가 있는 전체 예제는 저장소의 `android/app.php`에
있습니다.

## 상태와 제한 사항

- Android만 지원됩니다. iOS 지원은 계획되어 있지만 아직 구현되지 않았습니다.
- 브리지는 현재 단순 타입만 전달합니다: 문자열, 정수, 부동소수점, 불리언. 복합 객체 전달
  (필드 단위, 여전히 문자열 형식 없이)은 계획되어 있습니다.
- PHP에서 Kotlin으로의 방향은 동기식입니다: 메서드는 결과를 즉시 반환하며, 지연(비동기)
  결과는 이쪽에서 아직 지원되지 않습니다.
- Android에서는 PHP의 opcache가 강제로 비활성화됩니다: 앱 샌드박스가 필요한 잠금 파일과
  실행 가능 메모리 사용을 허용하지 않기 때문입니다.
- PHP가 앱의 메인 스레드가 아닌 자신의 OS 스레드에서 실행되므로 스레드 안전(ZTS) PHP 빌드가
  필요합니다.

## 참고

- [Roadmap: TrueAsync Mobile](/ko/roadmap.html)
- [GitHub의 native-bridge 저장소](https://github.com/true-async/native-bridge)
