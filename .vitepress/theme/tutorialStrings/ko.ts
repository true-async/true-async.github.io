import type { TutorialStrings } from '../tutorialData'

const ko: TutorialStrings = {
  coreGroup: '기초',
  serverGroup: 'TrueAsync Server',
  progress: '완료',
  readMore: '읽기',
  core: [
    { label: '코루틴', body: '코루틴 첫걸음: spawn()과 병행 실행.' },
    { label: '취소', body: 'cancel()과 협력적 취소가 동작하는 방식.' },
    { label: 'Await', body: 'await()가 왜 필요하고 코루틴과 어떻게 함께 동작하는지.' },
    { label: '예외', body: '코루틴에서 발생한 예외가 await()를 통해 전파되는 방식.' },
    { label: '타임아웃', body: 'timeout()으로 await()의 대기 시간을 제한하기.' },
    { label: 'Future', body: 'Future와 FutureState: 코루틴에 묶이지 않은 결과의 약속.' },
    { label: '채널', body: 'Channel: 코루틴 사이의 값 스트림, 워커 풀, 백프레셔.' },
    { label: 'Scope', body: '코루틴 그룹을 소유하고, 완료를 기다리고, 함께 취소하는 주체.' },
    { label: 'PDO Pool', body: '코루틴이 하나의 PDO 연결을 공유할 수 없는 이유와 내장 풀이 이를 투명하게 해결하는 방법.' },
    { label: 'TaskGroup', body: '결과를 담는 작업 그룹과 all, race, any 대기 전략.' },
    { label: 'TaskSet', body: '자동 정리, joinNext/joinAny/joinAll, 그리고 감독 루프를 갖춘 작업 스트림.' },
    { label: '병행 이터레이터', body: 'iterate(): 컬렉션을 한 줄로 병행 순회하기.' },
    { label: 'Pool', body: 'Async\\Pool: 헬스체크와 서킷 브레이커를 갖춘 범용 리소스 풀.' },
    { label: '스레드', body: 'spawn_thread와 ThreadPool: CPU 위주 작업을 위한 진짜 병렬성.' },
    { label: 'Context', body: '전역 변수가 더 이상 동작하지 않는 지금, "현재 값"을 어디에 보관할 것인가.' },
  ],
  server: [
    { label: '첫 서버', body: 'PHP 내부의 HTTP 서버: HttpServer, HttpServerConfig, 그리고 첫 핸들러.' },
    { label: '요청과 응답', body: 'HttpRequest와 HttpResponse: 라우팅, json(), 그리고 HttpException을 통한 오류 처리.' },
    { label: '요청 내부의 동시성', body: '핸들러 안의 TaskGroup, 부하 상황의 PDO Pool, 그리고 request_context().' },
    { label: '바이트 스트림', body: 'send()와 sendable(), 요청 본문 스트리밍, 파일 업로드, 그리고 sendFile().' },
    { label: '정적 파일', body: 'StaticHandler: PHP 코루틴 없이 파일 제공, 캐싱, 그리고 안전 정책.' },
    { label: 'Server-Sent Events', body: 'SSE: 브라우저로 보내는 이벤트 스트림, 임포트 진행 상황, 그리고 sseComment()를 통한 하트비트.' },
    { label: 'WebSocket', body: 'recv 루프, 채팅방, 다른 코루틴에서의 send, 그리고 느린 클라이언트에 대한 trySend.' },
    { label: '워커와 HTTP/3', body: 'setWorkers(): 서버 내부의 스레드, 부트로더, 그리고 같은 포트의 HTTP/3.' },
    { label: '프로덕션', body: '타임아웃, 제한, accept 백프레셔, 압축, 로깅, 그리고 graceful shutdown.' },
    { label: 'gRPC', body: 'addGrpcHandler(): 단항과 스트리밍, readMessage/writeMessage, 트레일러, 그리고 데드라인.' },
  ],
  laravelGroup: 'Laravel',
  laravel: [
    { label: '첫 실행', body: 'TrueAsync Server 위에서 Laravel을 실행하고 라우트에서 데이터베이스까지 첫 API를 만듭니다.' },
    { label: '풀과 트랜잭션', body: 'Eloquent 아래의 PDO Pool과 CoroutineTransactions: 왜 중첩 트랜잭션 카운터를 Connection의 속성에 둘 수 없는가.' },
    { label: 'SSE와 gRPC', body: 'trueasync_response(), Sse, grpc_handlers: 컨트롤러에서 곧바로 버퍼링된 Illuminate Response 너머에 접근하기.' },
    { label: '위험한 패턴', body: '가변 static 속성, 싱글턴 위의 once(), Number::useLocale(): 요청 간 상태가 흔히 새는 방식과 정적 분석으로 이를 잡아내는 방법.' },
    { label: '서드파티 패키지', body: 'Debugbar, Telescope, Inertia, spatie/permission, Socialite: 이미 코루틴에 적응된 것과 꺼두는 것이 나은 것.' },
  ],
}

export default ko
