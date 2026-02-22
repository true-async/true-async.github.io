---
layout: docs
lang: ko
path_key: "/docs/reference/supported-functions.html"
nav_active: docs
permalink: /ko/docs/reference/supported-functions.html
page_title: "지원 함수"
description: "TrueAsync에서 코루틴 인식 논블로킹 동작에 적합하게 변환된 PHP 함수의 전체 목록."
---

# 지원 함수

TrueAsync는 **70개 이상의 표준 PHP 함수**를 코루틴 내에서 논블로킹 동작하도록 변환합니다.
나열된 모든 함수는 코루틴 내부에서 호출될 때 자동으로 비동기로 동작합니다.
코루틴 외부에서는 평소와 같이 동작합니다.

---

## DNS

| 함수 | 설명 |
|------|------|
| `gethostbyname()` | 호스트 이름을 IP 주소로 확인 |
| `gethostbyaddr()` | IP 주소를 호스트 이름으로 역확인 |
| `gethostbynamel()` | 호스트 이름에 대한 IP 주소 목록 가져오기 |

---

## 데이터베이스

### PDO MySQL

| 함수 | 설명 |
|------|------|
| `PDO::__construct()` | 논블로킹 연결 |
| `PDO::prepare()` | 구문 준비 |
| `PDO::exec()` | 쿼리 실행 |
| `PDOStatement::execute()` | 준비된 구문 실행 |
| `PDOStatement::fetch()` | 결과 가져오기 |

### PDO PgSQL

| 함수 | 설명 |
|------|------|
| `PDO::__construct()` | 논블로킹 연결 |
| `PDO::prepare()` | 구문 준비 |
| `PDO::exec()` | 쿼리 실행 |
| `PDOStatement::execute()` | 준비된 구문 실행 |
| `PDOStatement::fetch()` | 결과 가져오기 |

### PDO 연결 풀링

`Async\Pool` 통합을 통한 PDO의 투명한 연결 풀링입니다.
각 코루틴은 자동 수명 주기 관리가 적용된 풀에서 자체 연결을 받습니다.

### MySQLi

| 함수 | 설명 |
|------|------|
| `mysqli_connect()` | 논블로킹 연결 |
| `mysqli_query()` | 쿼리 실행 |
| `mysqli_prepare()` | 구문 준비 |
| `mysqli_stmt_execute()` | 준비된 구문 실행 |
| `mysqli_fetch_*()` | 결과 가져오기 |

### PostgreSQL (네이티브)

| 함수 | 설명 |
|------|------|
| `pg_connect()` | 논블로킹 연결 |
| `pg_query()` | 쿼리 실행 |
| `pg_prepare()` | 구문 준비 |
| `pg_execute()` | 준비된 구문 실행 |
| `pg_fetch_*()` | 결과 가져오기 |

각 비동기 컨텍스트는 안전한 동시성을 위해 별도의 연결을 사용합니다.

---

## CURL

| 함수 | 설명 |
|------|------|
| `curl_exec()` | 요청 실행 |
| `curl_multi_exec()` | 다중 요청 실행 |
| `curl_multi_select()` | 활동 대기 |
| `curl_multi_getcontent()` | 콘텐츠 가져오기 |
| `curl_setopt()` | 옵션 설정 |
| `curl_getinfo()` | 요청 정보 가져오기 |
| `curl_error()` | 오류 가져오기 |
| `curl_close()` | 핸들 닫기 |

---

## 소켓

| 함수 | 설명 |
|------|------|
| `socket_create()` | 소켓 생성 |
| `socket_create_pair()` | 소켓 쌍 생성 |
| `socket_connect()` | 연결 |
| `socket_accept()` | 연결 수락 |
| `socket_read()` | 데이터 읽기 |
| `socket_write()` | 데이터 쓰기 |
| `socket_send()` | 데이터 전송 |
| `socket_recv()` | 데이터 수신 |
| `socket_sendto()` | 주소로 전송 |
| `socket_recvfrom()` | 주소에서 수신 |
| `socket_bind()` | 주소에 바인드 |
| `socket_listen()` | 수신 대기 |
| `socket_select()` | 소켓 활동 모니터링 |

---

## 파일 및 스트림 I/O

| 함수 | 설명 |
|------|------|
| `fopen()` | 파일 열기 |
| `fclose()` | 파일 닫기 |
| `fread()` | 파일에서 읽기 |
| `fwrite()` | 파일에 쓰기 |
| `fgets()` | 줄 읽기 |
| `fgetc()` | 문자 읽기 |
| `fgetcsv()` | CSV 줄 읽기 |
| `fputcsv()` | CSV 줄 쓰기 |
| `fseek()` | 위치 설정 |
| `ftell()` | 위치 가져오기 |
| `rewind()` | 위치 초기화 |
| `ftruncate()` | 파일 자르기 |
| `fflush()` | 버퍼 플러시 |
| `fscanf()` | 형식화된 읽기 |
| `file_get_contents()` | 전체 파일 읽기 |
| `file_put_contents()` | 전체 파일 쓰기 |
| `file()` | 파일을 배열로 읽기 |
| `copy()` | 파일 복사 |
| `tmpfile()` | 임시 파일 생성 |
| `readfile()` | 파일 출력 |
| `fpassthru()` | 나머지 파일 출력 |
| `stream_get_contents()` | 나머지 스트림 읽기 |
| `stream_copy_to_stream()` | 스트림 간 복사 |

---

## 스트림 소켓

| 함수 | 설명 |
|------|------|
| `stream_socket_client()` | 클라이언트 연결 생성 |
| `stream_socket_server()` | 서버 소켓 생성 |
| `stream_socket_accept()` | 연결 수락 |
| `stream_select()` | 스트림 활동 모니터링 |
| `stream_context_create()` | 비동기 인식 컨텍스트 생성 |

> **제한 사항:** 파이프 스트림(예: `proc_open()`에서)을 사용하는 `stream_select()`는 Windows에서 지원되지 않습니다. Linux/macOS에서는 이벤트 루프를 통해 네이티브로 동작합니다.

---

## 프로세스 실행

| 함수 | 설명 |
|------|------|
| `proc_open()` | 파이프와 함께 프로세스 열기 |
| `proc_close()` | 프로세스 닫기 |
| `exec()` | 외부 명령 실행 |
| `shell_exec()` | 셸 명령 실행 |
| `system()` | 시스템 명령 실행 |
| `passthru()` | 직접 출력과 함께 실행 |

---

## 타이머 및 지연

| 함수 | 설명 |
|------|------|
| `sleep()` | 초 단위 지연 |
| `usleep()` | 마이크로초 단위 지연 |
| `time_nanosleep()` | 나노초 정밀도 지연 |
| `time_sleep_until()` | 타임스탬프까지 대기 |

---

## 출력 버퍼링

각 코루틴은 **격리된** 출력 버퍼를 받습니다.

| 함수 | 설명 |
|------|------|
| `ob_start()` | 버퍼링 시작 |
| `ob_flush()` | 버퍼 플러시 |
| `ob_clean()` | 버퍼 정리 |
| `ob_get_contents()` | 버퍼 내용 가져오기 |
| `ob_end_clean()` | 버퍼링 종료 |

---

## 아직 지원되지 않는 기능

구현이 계획되었거나 아직 변환되지 않은 함수입니다.

### DNS

| 함수 | 설명 |
|------|------|
| `dns_check_record()` / `checkdnsrr()` | DNS 레코드 확인 |
| `dns_get_mx()` / `getmxrr()` | MX 레코드 가져오기 |
| `dns_get_record()` | DNS 리소스 레코드 가져오기 |

### 데이터베이스

| 확장 | 설명 |
|------|------|
| PDO ODBC | ODBC 드라이버 |
| PDO Oracle | Oracle 드라이버 |
| PDO SQLite | SQLite 드라이버 |
| PDO Firebird | Firebird 드라이버 |
| MongoDB | MongoDB 클라이언트 |

### 파일 작업 (메타데이터)

| 함수 | 설명 |
|------|------|
| `flock()` | 파일 잠금 |
| `opendir()` / `readdir()` / `closedir()` | 디렉토리 탐색 |
| `unlink()` / `rename()` | 파일 삭제 및 이름 변경 |
| `mkdir()` / `rmdir()` | 디렉토리 생성 및 삭제 |
| `stat()` / `lstat()` | 파일 정보 |
| `readlink()` | 심볼릭 링크 읽기 |

> **참고:** 로컬 디스크의 파일 메타데이터 작업은 마이크로초 안에 완료됩니다. 비동기로 만드는 것은 네트워크 파일 시스템(NFS)에서만 의미가 있습니다.

---

## 다음 단계

- [spawn()](/ko/docs/reference/spawn.html) — 코루틴 생성
- [await()](/ko/docs/reference/await.html) — 결과 대기
- [Coroutines](/ko/docs/components/coroutines.html) — 개념과 예제
