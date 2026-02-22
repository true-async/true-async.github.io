---
layout: docs
lang: ko
path_key: "/docs/reference/channel/get-iterator.html"
nav_active: docs
permalink: /ko/docs/reference/channel/get-iterator.html
page_title: "Channel::getIterator"
description: "foreach를 사용하여 채널 값을 순회하기 위한 이터레이터를 가져옵니다."
---

# Channel::getIterator

(PHP 8.6+, True Async 1.0)

```php
public Channel::getIterator(): \Iterator
```

채널 값을 순회하기 위한 이터레이터를 반환합니다. Channel은
`IteratorAggregate` 인터페이스를 구현하므로 `foreach`를 직접 사용할 수 있습니다.

이터레이터는 다음 값을 기다리는 동안 현재 코루틴을 일시 중단합니다.
채널이 닫히고 **그리고** 버퍼가 비어지면 반복이 종료됩니다.

> **중요:** 채널이 절대 닫히지 않으면 `foreach`는 새로운 값을 무한정 기다립니다.

## 반환값

채널 값을 순회하기 위한 `\Iterator` 객체.

## 예제

### 예제 #1 foreach로 채널 읽기

```php
<?php

use Async\Channel;

$channel = new Channel(10);

spawn(function() use ($channel) {
    $channel->send('one');
    $channel->send('two');
    $channel->send('three');
    $channel->close(); // without this, foreach will never terminate
});

spawn(function() use ($channel) {
    foreach ($channel as $value) {
        echo "Received: $value\n";
    }
    echo "All values processed\n";
});
```

### 예제 #2 생산자-소비자 패턴

```php
<?php

use Async\Channel;

$jobs = new Channel(20);

// Producer
spawn(function() use ($jobs) {
    $urls = ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'];

    foreach ($urls as $url) {
        $jobs->send($url);
    }
    $jobs->close();
});

// Consumer
spawn(function() use ($jobs) {
    foreach ($jobs as $url) {
        $response = httpGet($url);
        echo "Downloaded: $url ({$response->status})\n";
    }
});
```

## 같이 보기

- [Channel::recv](/ko/docs/reference/channel/recv.html) --- 단일 값 수신
- [Channel::close](/ko/docs/reference/channel/close.html) --- 채널 닫기 (반복 종료)
- [Channel::isEmpty](/ko/docs/reference/channel/is-empty.html) --- 버퍼가 비어있는지 확인
