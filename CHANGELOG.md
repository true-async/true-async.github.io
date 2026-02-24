# Changelog

All notable changes to the TrueAsync documentation will be documented in this file.

## 2026-02-24

### Added
- **`Async\OperationCanceledException`** — new exception class documentation:
  - Added to exception hierarchy in `exceptions.md` (ru)
  - New dedicated section with description and usage example
  - Updated `TimeoutException` section to reflect that cancel tokens now throw `OperationCanceledException`

### Changed
- **`cancellation.md` (ru)**: Updated timeout example — `catch (TimeoutException)` → `catch (OperationCanceledException)`, added explanation about `$previous` containing the original token exception
- **`await.md` (ru)**: Added `OperationCanceledException` to Errors/Exceptions section for cancel token behavior
- **`signal.md` (ru)**: Updated Errors/Exceptions section and examples — replaced `TimeoutException`/`AsyncCancellation` with `OperationCanceledException`, updated code examples to show `$e->getPrevious()` pattern
