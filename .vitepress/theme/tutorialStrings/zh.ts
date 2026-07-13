import type { TutorialStrings } from '../tutorialData'

const zh: TutorialStrings = {
  coreGroup: '基础',
  serverGroup: 'TrueAsync Server',
  progress: '已完成',
  readMore: '阅读',
  core: [
    { label: '协程', body: '初识协程：spawn() 与并发执行。' },
    { label: '取消', body: 'cancel() 与协作式取消是如何工作的。' },
    { label: 'Await', body: '为什么需要 await()，以及它如何与协程配合。' },
    { label: '异常', body: '协程中的异常如何通过 await() 传播。' },
    { label: '超时', body: '用 timeout() 限定 await() 的等待时长。' },
    { label: 'Future', body: 'Future 与 FutureState：一个不绑定到协程的结果承诺。' },
    { label: '通道', body: 'Channel：协程之间的值流、工作池与背压。' },
    { label: 'Scope', body: '谁拥有一组协程、等待它们并将它们一起取消。' },
    { label: 'PDO Pool', body: '为什么协程不能共享同一个 PDO 连接，以及内置连接池如何透明地解决这个问题。' },
    { label: 'TaskGroup', body: '一组任务，带有结果以及 all、race、any 等待策略。' },
    { label: 'TaskSet', body: '一个带自动清理的任务流，joinNext/joinAny/joinAll，以及一个监督循环。' },
    { label: '并发迭代器', body: 'iterate()：一行代码并发遍历一个集合。' },
    { label: 'Pool', body: 'Async\\Pool：通用资源池，带健康检查与熔断器。' },
    { label: '线程', body: 'spawn_thread 与 ThreadPool：为 CPU 密集型工作提供真正的并行。' },
    { label: 'Context', body: '当全局变量不再奏效时，把“当前的东西”放在哪里。' },
  ],
  server: [
    { label: '第一个服务器', body: 'PHP 内部的 HTTP 服务器：HttpServer、HttpServerConfig 与你的第一个处理器。' },
    { label: '请求与响应', body: 'HttpRequest 与 HttpResponse：路由、json() 以及通过 HttpException 处理错误。' },
    { label: '请求内部的并发', body: '处理器中的 TaskGroup、负载下的 PDO Pool 与 request_context()。' },
    { label: '字节流', body: 'send() 与 sendable()、流式读取请求体、文件上传与 sendFile()。' },
    { label: '静态文件', body: 'StaticHandler：无需 PHP 协程即可提供文件、缓存与安全策略。' },
    { label: 'Server-Sent Events', body: 'SSE：发往浏览器的事件流、导入进度与通过 sseComment() 实现的心跳。' },
    { label: 'WebSocket', body: 'recv 循环、聊天室、从其他协程 send，以及用 trySend 应对慢客户端。' },
    { label: 'Workers 与 HTTP/3', body: 'setWorkers()：服务器引擎盖下的线程、bootloader，以及同一端口上的 HTTP/3。' },
    { label: '生产环境', body: '超时、限制、accept 上的背压、压缩、日志与优雅关闭。' },
    { label: 'gRPC', body: 'addGrpcHandler()：一元与流式、readMessage/writeMessage、trailers 与截止时间。' },
  ],
  laravelGroup: 'Laravel',
  laravel: [
    { label: '首次运行', body: '在 TrueAsync Server 下运行 Laravel，并从路由到数据库构建你的第一个 API。' },
    { label: '连接池与事务', body: 'Eloquent 之下的 PDO Pool 与 CoroutineTransactions：为什么嵌套事务计数器不能留在 Connection 的属性上。' },
    { label: 'SSE 与 gRPC', body: 'trueasync_response()、Sse 与 grpc_handlers：直接从控制器越过被缓冲的 Illuminate Response。' },
    { label: '不安全的模式', body: '可变的静态属性、单例上的 once()，以及 Number::useLocale()：状态在请求之间泄漏的常见方式，以及如何用静态分析捕获它们。' },
    { label: '第三方包', body: 'Debugbar、Telescope、Inertia、spatie/permission、Socialite：哪些已经为协程做好了适配，哪些值得禁用。' },
  ],
}

export default zh
