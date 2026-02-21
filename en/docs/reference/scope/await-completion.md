---
layout: docs
lang: en
path_key: "/docs/reference/scope/await-completion.html"
nav_active: docs
permalink: /en/docs/reference/scope/await-completion.html
page_title: "Scope::awaitCompletion"
description: "Waits for active coroutines in the scope to complete."
---

# Scope::awaitCompletion

(PHP 8.6+, True Async 1.0)

```php
public function awaitCompletion(Awaitable $cancellation): void
```

Waits for all **active** coroutines in the scope to complete. Zombie coroutines are not considered when waiting. The `$cancellation` parameter allows the wait to be interrupted early.

## Parameters

`cancellation` — an `Awaitable` object that, when triggered, will interrupt the wait.

## Return Value

No value is returned.

## Examples

### Example #1 Waiting for all coroutines to complete

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(1000);
    echo "Task 1 completed\n";
});

$scope->spawn(function() {
    \Async\delay(2000);
    echo "Task 2 completed\n";
});

// Wait for completion with a 5-second timeout
$scope->awaitCompletion(timeout(5000));
echo "All tasks done\n";
```

### Example #2 Interrupting the wait

```php
<?php

use Async\Scope;
use function Async\timeout;

$scope = new Scope();

$scope->spawn(function() {
    \Async\delay(60_000); // Very long task
});

try {
    $scope->awaitCompletion(timeout(3000));
} catch (\Async\CancelledException $e) {
    echo "Wait interrupted by timeout\n";
    $scope->cancel();
}
```

## See Also

- [Scope::awaitAfterCancellation](/en/docs/reference/scope/await-after-cancellation.html) — Wait for all coroutines including zombies
- [Scope::cancel](/en/docs/reference/scope/cancel.html) — Cancel all coroutines
- [Scope::isFinished](/en/docs/reference/scope/is-finished.html) — Check if the scope is finished
