<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vitepress'

const route = useRoute()
const lang = computed(() => {
  const m = route.path.match(/^\/(en|ru|de|es|fr|it|uk|zh|ko)\//)
  return m ? m[1] : 'en'
})

interface DemoI18n {
  eyebrow: string; title: string; subtitle: string
  coro1: string; coro2: string; iteration: string
  timeline: string; cpuWorking: string; cpuWaiting: string
  play: string; pause: string; step: string; reset: string; speed: string; loop: string
  legCpu: string; legCpu2: string; legDb: string; legNet: string
  statTotal: string; statDb: string; statNet: string; statSaved: string
  exTitle: string; exTemplate: string
}

const i18n: Record<string, DemoI18n> = {
  en: {
    eyebrow: 'Interactive',
    title: 'How Coroutines Work',
    subtitle: 'Two coroutines efficiently share CPU time: while one waits for the database or network, the other does useful work.',
    coro1: 'Coroutine 1 · User Processing',
    coro2: 'Coroutine 2 · Logging & Notifications',
    iteration: 'Iteration',
    timeline: 'Execution Timeline',
    cpuWorking: 'Working', cpuWaiting: 'Waiting',
    play: '▶ Play', pause: '⏸ Pause', step: '⏭ Step', reset: '↺ Reset', speed: 'Speed', loop: 'Loop',
    legCpu: 'CPU working', legCpu2: 'CPU (coro 2)', legDb: 'Waiting for DB', legNet: 'Waiting for network',
    statTotal: 'Total time', statDb: 'DB wait', statNet: 'Network wait', statSaved: 'Time saved',
    exTitle: 'Cooperative multitasking',
    exTemplate: 'This visualization shows how two coroutines efficiently share the CPU. While one waits for a response from the database or network, the other does useful work, and no thread ever blocks. Compared to sequential execution (%SEQ% ms), cooperative scheduling finishes the same work in %TOTAL% ms.',
  },
  ru: {
    eyebrow: 'Интерактивно',
    title: 'Как работают корутины',
    subtitle: 'Две корутины эффективно делят процессорное время: пока одна ждёт базу данных или сеть, другая выполняет полезную работу.',
    coro1: 'Корутина 1 · Обработка пользователей',
    coro2: 'Корутина 2 · Логи и уведомления',
    iteration: 'Итерация',
    timeline: 'Хронология выполнения',
    cpuWorking: 'Работает', cpuWaiting: 'Ожидание',
    play: '▶ Запустить', pause: '⏸ Пауза', step: '⏭ Шаг', reset: '↺ Сброс', speed: 'Скорость', loop: 'Цикл',
    legCpu: 'CPU работает', legCpu2: 'CPU (корутина 2)', legDb: 'Ожидание БД', legNet: 'Ожидание сети',
    statTotal: 'Всего времени', statDb: 'Ожидание БД', statNet: 'Ожидание сети', statSaved: 'Сэкономлено',
    exTitle: 'Кооперативная многозадачность',
    exTemplate: 'Визуализация показывает, как две корутины эффективно делят процессор. Пока одна ждёт ответа от базы данных или сети, другая выполняет полезную работу, и ни один поток не блокируется. По сравнению с последовательным выполнением (%SEQ% мс) кооперативное планирование справляется с той же работой за %TOTAL% мс.',
  },
}
const t = computed(() => i18n[lang.value] || i18n.en)

// Cooperative single-CPU scheduler (deterministic; computed once).
interface CpuSeg { start: number; end: number; coro: number; iter: number; line: string }
interface WaitSeg extends CpuSeg { type: string }
function buildSchedule() {
  const mk = (ops: any[], n: number) => {
    const a: any[] = []
    for (let i = 0; i < n; i++) for (const o of ops) a.push({ t: o.t, d: o.d, line: o.line, iter: i })
    return a
  }
  const co = [
    { id: 1, ops: mk([{ t: 'cpu', d: 2, line: 'prep' }, { t: 'db', d: 15, line: 'exec' }, { t: 'cpu', d: 2, line: 'fetch' }], 3), p: 0, ready: 0 },
    { id: 2, ops: mk([{ t: 'cpu', d: 2, line: 'prep' }, { t: 'db', d: 12, line: 'exec' }, { t: 'cpu', d: 1, line: 'write' }, { t: 'net', d: 20, line: 'write' }], 3), p: 0, ready: 0 },
  ]
  const cpuSegs: CpuSeg[] = [], waitSegs: WaitSeg[] = []
  let cpuFree = 0, guard = 0, seq = 0
  for (const c of co) for (const o of c.ops) seq += o.d
  while (co.some(c => c.p < c.ops.length) && guard++ < 500) {
    const cand = co.filter(c => c.p < c.ops.length && c.ops[c.p].t === 'cpu')
    if (!cand.length) break
    cand.sort((a, b) => (a.ready - b.ready) || (a.id - b.id))
    const c = cand[0]
    let tm = Math.max(cpuFree, c.ready)
    const op = c.ops[c.p]
    cpuSegs.push({ start: tm, end: tm + op.d, coro: c.id, iter: op.iter, line: op.line })
    tm += op.d; cpuFree = tm; c.p++
    if (c.p < c.ops.length && (c.ops[c.p].t === 'db' || c.ops[c.p].t === 'net')) {
      const io = c.ops[c.p]
      waitSegs.push({ start: tm, end: tm + io.d, type: io.t, coro: c.id, iter: io.iter, line: io.line })
      c.ready = tm + io.d; c.p++
    } else { c.ready = tm }
  }
  const all = [...cpuSegs, ...waitSegs]
  const total = all.reduce((m, s) => Math.max(m, s.end), 0)
  const iterEnd: Record<number, number[]> = { 1: [0, 0, 0], 2: [0, 0, 0] }
  for (const s of all) iterEnd[s.coro][s.iter] = Math.max(iterEnd[s.coro][s.iter], s.end)
  const bounds = Array.from(new Set(all.flatMap(s => [s.start, s.end]))).sort((a, b) => a - b)
  return { cpuSegs, waitSegs, total, seq, iterEnd, bounds }
}
const S = buildSchedule()

const time = ref(0)
const playing = ref(false)
const speed = ref(1)
const loopOn = ref(false)
const speeds = [0.5, 1, 2, 4]

const cpuColor = (c: number) => c === 1 ? '#8B7BFF' : '#5AD1B0'
const waitColor = (ty: string) => ty === 'db' ? '#E7B276' : '#6f8dff'
const pct = (x: number) => (x / S.total * 100).toFixed(2) + '%'

const cur = computed(() => Math.min(time.value, S.total))

const cpuSegsView = computed(() => S.cpuSegs.filter(g => g.start < cur.value + 0.001).map(g => ({
  left: pct(g.start), width: pct(Math.min(g.end, cur.value) - g.start), bg: cpuColor(g.coro),
})))
const waitFor = (id: number) => S.waitSegs.filter(g => g.coro === id && g.start < cur.value + 0.001).map(g => ({
  left: pct(g.start), width: pct(Math.min(g.end, cur.value) - g.start), bg: waitColor(g.type),
}))
const wait1View = computed(() => waitFor(1))
const wait2View = computed(() => waitFor(2))

// Render the volatile segment/tick lists as HTML strings via v-html rather than
// keyed v-for: Vue's keyed-children block patcher crashes ("insertBefore of
// null") when several sibling lists grow together inside one optimized block.
// The strings are built from trusted internal data only — no user input.
const segsToHtml = (list: { left: string; width: string; bg: string }[]) =>
  list.map(s => `<div class="cd-seg" style="left:${s.left};width:${s.width};background:${s.bg}"></div>`).join('')
const cpuSegsHtml = computed(() => segsToHtml(cpuSegsView.value))
const wait1Html = computed(() => segsToHtml(wait1View.value))
const wait2Html = computed(() => segsToHtml(wait2View.value))

const ticksHtml = computed(() => {
  let out = ''
  for (let x = 0; x <= S.total + 0.1; x += 25) out += `<span class="cd-tick" style="left:${pct(x)}">${Math.round(x)}</span>`
  return out
})
const playheadLeft = computed(() => pct(cur.value))

const overlap = (seg: CpuSeg) => Math.max(0, Math.min(seg.end, cur.value) - Math.min(seg.start, cur.value))
const statTotal = computed(() => Math.round(cur.value))
const statDb = computed(() => Math.round(S.waitSegs.filter(g => g.type === 'db').reduce((a, g) => a + overlap(g), 0)))
const statNet = computed(() => Math.round(S.waitSegs.filter(g => g.type === 'net').reduce((a, g) => a + overlap(g), 0)))
const statSaved = computed(() => Math.round((S.seq - S.total) * (cur.value / S.total)))
const iterCount = (id: number) => S.iterEnd[id].filter(e => e <= cur.value + 0.001).length
const iter1 = computed(() => iterCount(1))
const iter2 = computed(() => iterCount(2))

const cpuOn = computed(() => S.cpuSegs.find(g => g.start <= cur.value && cur.value < g.end) || null)
const cpuPill = computed(() => {
  const on = cpuOn.value
  if (on) return {
    text: t.value.cpuWorking,
    color: on.coro === 1 ? '#B69BFF' : '#5AD1B0',
    bg: on.coro === 1 ? 'rgba(139,123,255,.14)' : 'rgba(90,209,176,.14)',
  }
  return { text: t.value.cpuWaiting, color: '#E7B276', bg: 'rgba(231,178,118,.14)' }
})

const activeKey = (id: number) => {
  const g = [...S.cpuSegs, ...S.waitSegs].find(x => x.coro === id && x.start <= cur.value && cur.value < x.end)
  return g ? g.line : null
}
const hl = (id: number, key: string) => {
  const on = activeKey(id) === key
  if (!on) return 'transparent'
  return id === 1 ? 'rgba(139,123,255,.16)' : 'rgba(90,209,176,.16)'
}

const explanation = computed(() =>
  t.value.exTemplate.replace('%SEQ%', String(S.seq)).replace('%TOTAL%', String(Math.round(S.total))))

let raf = 0, last = 0
function frame(ts: number) {
  if (!last) last = ts
  const dt = (ts - last) / 1000; last = ts
  let nt = time.value + dt * 34 * speed.value
  if (nt >= S.total) {
    if (loopOn.value) { nt = 0 }
    else { time.value = S.total; playing.value = false; return }
  }
  time.value = nt
  if (playing.value) raf = requestAnimationFrame(frame)
}
function start() { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame) }
function togglePlay() {
  if (playing.value) { playing.value = false; cancelAnimationFrame(raf); return }
  if (time.value >= S.total) time.value = 0
  playing.value = true; start()
}
function step() {
  playing.value = false; cancelAnimationFrame(raf)
  const nb = S.bounds.find(b => b > cur.value + 0.001)
  if (nb != null) time.value = nb
}
function reset() { playing.value = false; cancelAnimationFrame(raf); time.value = 0 }
function toggleLoop() { loopOn.value = !loopOn.value }
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="coro-demo">
    <section class="cd-hero">
      <div class="cd-eyebrow">{{ t.eyebrow }}</div>
      <h1 class="cd-title">{{ t.title }}</h1>
      <p class="cd-subtitle">{{ t.subtitle }}</p>
    </section>

    <section class="cd-panels">
      <div class="cd-code">
        <div class="cd-code-head">
          <span class="cd-code-name cd-name1"><span class="cd-dot cd-dot1"></span>{{ t.coro1 }}</span>
          <span class="cd-iter">{{ t.iteration }}: {{ iter1 }}/3</span>
        </div>
        <div class="cd-code-body">
          <div class="cd-ln"><span class="v">$coro1</span> = <span class="k">spawn</span>(<span class="c">function</span>() {</div>
          <div class="cd-ln">  <span class="v">$pdo</span> = <span class="k">new</span> <span class="c">PDO</span>(<span class="n">$dsn</span>);</div>
          <div class="cd-ln">  <span class="k">foreach</span> ([<span class="n">1</span>,<span class="n">2</span>,<span class="n">3</span>] <span class="k">as</span> <span class="n">$id</span>) {</div>
          <div class="cd-ln" :style="{ background: hl(1, 'prep') }">    <span class="v">$stmt</span> = <span class="n">$pdo</span>-><span class="k">prepare</span>(<span class="s">"SELECT * FROM users WHERE id=?"</span>);</div>
          <div class="cd-ln" :style="{ background: hl(1, 'exec') }">    <span class="n">$stmt</span>-><span class="k">execute</span>([<span class="n">$id</span>]); <span class="cm">// ⏳ 15ms</span></div>
          <div class="cd-ln" :style="{ background: hl(1, 'fetch') }">    <span class="v">$user</span> = <span class="n">$stmt</span>-><span class="k">fetch</span>();</div>
          <div class="cd-ln" :style="{ background: hl(1, 'fetch') }">    <span class="k">processUser</span>(<span class="n">$user</span>);</div>
          <div class="cd-ln">  }</div>
          <div class="cd-ln">});</div>
        </div>
      </div>
      <div class="cd-code">
        <div class="cd-code-head">
          <span class="cd-code-name cd-name2"><span class="cd-dot cd-dot2"></span>{{ t.coro2 }}</span>
          <span class="cd-iter">{{ t.iteration }}: {{ iter2 }}/3</span>
        </div>
        <div class="cd-code-body">
          <div class="cd-ln"><span class="v">$coro2</span> = <span class="k">spawn</span>(<span class="c">function</span>() {</div>
          <div class="cd-ln">  <span class="v">$pdo</span> = <span class="k">new</span> <span class="c">PDO</span>(<span class="n">$dsn</span>);</div>
          <div class="cd-ln">  <span class="v">$socket</span> = <span class="k">fsockopen</span>(<span class="n">$host</span>, <span class="n">9000</span>);</div>
          <div class="cd-ln">  <span class="k">foreach</span> ([<span class="s">'login'</span>,<span class="s">'click'</span>,<span class="s">'logout'</span>] <span class="k">as</span> <span class="n">$e</span>) {</div>
          <div class="cd-ln" :style="{ background: hl(2, 'prep') }">    <span class="v">$stmt</span> = <span class="n">$pdo</span>-><span class="k">prepare</span>(<span class="s">"INSERT INTO logs VALUES(?)"</span>);</div>
          <div class="cd-ln" :style="{ background: hl(2, 'exec') }">    <span class="n">$stmt</span>-><span class="k">execute</span>([<span class="n">$e</span>]); <span class="cm">// ⏳ 12ms</span></div>
          <div class="cd-ln" :style="{ background: hl(2, 'write') }">    <span class="k">fwrite</span>(<span class="n">$socket</span>, <span class="n">$e</span>); <span class="cm">// ⏳ 20ms</span></div>
          <div class="cd-ln">  }</div>
          <div class="cd-ln">});</div>
        </div>
      </div>
    </section>

    <section class="cd-timeline-wrap">
      <div class="cd-timeline">
        <div class="cd-tl-head">
          <h2>{{ t.timeline }}</h2>
          <div class="cd-tl-head-right">
            <span class="cd-cpu-pill" :style="{ background: cpuPill.bg, color: cpuPill.color }">CPU: {{ cpuPill.text }}</span>
            <span class="cd-tl-time">{{ statTotal }} ms</span>
          </div>
        </div>

        <div class="cd-tracks">
          <div class="cd-track-label cd-tl-cpu">CPU</div>
          <div class="cd-track" v-html="cpuSegsHtml"></div>
          <div class="cd-track-label cd-tl-1">{{ lang === 'ru' ? 'Корутина 1' : 'Coroutine 1' }}</div>
          <div class="cd-track" v-html="wait1Html"></div>
          <div class="cd-track-label cd-tl-2">{{ lang === 'ru' ? 'Корутина 2' : 'Coroutine 2' }}</div>
          <div class="cd-track" v-html="wait2Html"></div>
        </div>
        <div class="cd-scale">
          <div style="display:contents" v-html="ticksHtml"></div>
          <div class="cd-playhead" :style="{ left: playheadLeft }"></div>
        </div>

        <div class="cd-controls">
          <button class="cd-btn cd-btn-play" @click="togglePlay">{{ playing ? t.pause : t.play }}</button>
          <button class="cd-btn cd-btn-ghost" @click="step">{{ t.step }}</button>
          <button class="cd-btn cd-btn-ghost" @click="reset">{{ t.reset }}</button>
          <div class="cd-divider"></div>
          <span class="cd-speed-label">{{ t.speed }}</span>
          <div class="cd-speeds">
            <button
              v-for="sp in speeds" :key="sp" @click="speed = sp"
              :style="{ background: speed === sp ? '#6A54F5' : 'transparent', color: speed === sp ? '#fff' : 'var(--cd-muted)' }"
            >{{ sp }}x</button>
          </div>
          <div class="cd-divider"></div>
          <button
            class="cd-btn cd-loop" @click="toggleLoop"
            :style="{
              background: loopOn ? 'rgba(106,84,245,.16)' : 'var(--cd-panel-hover)',
              color: loopOn ? '#B69BFF' : 'var(--cd-muted)',
              borderColor: loopOn ? '#6A54F5' : 'var(--cd-border2)',
            }"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"></path></svg>{{ t.loop }}
          </button>
        </div>

        <div class="cd-legend">
          <span><span class="cd-lg" style="background:#8B7BFF"></span>{{ t.legCpu }}</span>
          <span><span class="cd-lg" style="background:#5AD1B0"></span>{{ t.legCpu2 }}</span>
          <span><span class="cd-lg" style="background:#E7B276"></span>{{ t.legDb }}</span>
          <span><span class="cd-lg" style="background:#6f8dff"></span>{{ t.legNet }}</span>
        </div>
      </div>
    </section>

    <section class="cd-stats">
      <div class="cd-stat">
        <div class="cd-stat-val" style="color:var(--cd-text)">{{ statTotal }}<span class="cd-stat-unit"> ms</span></div>
        <div class="cd-stat-lbl">{{ t.statTotal }}</div>
      </div>
      <div class="cd-stat">
        <div class="cd-stat-val" style="color:#E7B276">{{ statDb }}<span class="cd-stat-unit"> ms</span></div>
        <div class="cd-stat-lbl">{{ t.statDb }}</div>
      </div>
      <div class="cd-stat">
        <div class="cd-stat-val" style="color:#6f8dff">{{ statNet }}<span class="cd-stat-unit"> ms</span></div>
        <div class="cd-stat-lbl">{{ t.statNet }}</div>
      </div>
      <div class="cd-stat cd-stat-accent">
        <div class="cd-stat-val" style="color:#8B7BFF">{{ statSaved }}<span class="cd-stat-unit"> ms</span></div>
        <div class="cd-stat-lbl" style="color:#B69BFF">{{ t.statSaved }}</div>
      </div>
    </section>

    <section class="cd-explain-wrap">
      <div class="cd-explain">
        <h3>{{ t.exTitle }}</h3>
        <p>{{ explanation }}</p>
      </div>
    </section>
  </div>
</template>

<style>
.coro-demo {
  --cd-bg: var(--color-bg, #F5F3FB);
  --cd-panel: #FFFFFF; --cd-panel-hover: #F0EDF9; --cd-panel-accent: #F3F0FD; --cd-panel-sunk: #EEEBF5;
  --cd-border: #E6E2F1; --cd-border2: #DCD7EC; --cd-text: #1B1730; --cd-muted: #5E5A72; --cd-dim: #8B8798; --cd-dim2: #948FA6;
  --cd-code-bg: #171334;
  font-family: 'Space Grotesk', sans-serif;
  padding-top: var(--navbar-h, 0);
}
html[data-theme=dark] .coro-demo {
  --cd-panel: #221C3B; --cd-panel-hover: #28223F; --cd-panel-accent: #1E1A38; --cd-panel-sunk: #1C1926;
  --cd-border: #2E2846; --cd-border2: #2C2940; --cd-text: #ECEAF4; --cd-muted: #A7A5B6; --cd-dim: #6C6A7B; --cd-dim2: #8C8A99;
  --cd-code-bg: #151129;
}
.coro-demo section { max-width: 1080px; margin: 0 auto; }

.cd-hero { padding: 56px 32px 8px; text-align: center; }
.cd-eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: .16em; text-transform: uppercase; color: #8B7BFF; margin-bottom: 14px; }
.cd-title { font-size: 42px; line-height: 1.08; font-weight: 700; letter-spacing: -.03em; margin: 0 0 16px; color: var(--cd-text); }
.cd-subtitle { font-size: 18px; line-height: 1.55; color: var(--cd-muted); max-width: 620px; margin: 0 auto; }

.cd-panels { padding: 28px 32px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.cd-code { background: var(--cd-code-bg); border: 1px solid var(--cd-border2); border-radius: 16px; overflow: hidden; }
.cd-code-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 18px; border-bottom: 1px solid #211B38; }
.cd-code-name { display: inline-flex; align-items: center; gap: 9px; font-size: 13.5px; font-weight: 600; }
.cd-name1 { color: #CFC6FF; } .cd-name2 { color: #B7ECD9; }
.cd-dot { width: 10px; height: 10px; border-radius: 50%; }
.cd-dot1 { background: #8B7BFF; box-shadow: 0 0 8px 1px rgba(139,123,255,.7); }
.cd-dot2 { background: #5AD1B0; box-shadow: 0 0 8px 1px rgba(90,209,176,.7); }
.cd-iter { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #7d7b8c; }
.cd-code-body { padding: 14px 20px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.7; color: #D6D3E6; overflow-x: auto; }
.cd-ln { white-space: pre; padding: 1px 8px; margin: 0 -8px; border-radius: 5px; transition: background .15s ease; }
.cd-code-body .v { color: #B69BFF; } .cd-code-body .k { color: #7C6BFF; } .cd-code-body .c { color: #5AD1B0; }
.cd-code-body .n { color: #E8B77C; } .cd-code-body .s { color: #7CC7E8; } .cd-code-body .cm { color: #6f6d80; }

.cd-timeline-wrap { padding: 20px 32px 0; }
.cd-timeline { background: var(--cd-panel); border: 1px solid var(--cd-border); border-radius: 18px; padding: 26px; }
.cd-tl-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.cd-tl-head h2 { font-size: 18px; font-weight: 600; margin: 0; color: var(--cd-text); }
.cd-tl-head-right { display: flex; align-items: center; gap: 12px; }
.cd-cpu-pill { display: inline-flex; align-items: center; gap: 7px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600; padding: 5px 11px; border-radius: 100px; transition: background .2s ease, color .2s ease; }
.cd-tl-time { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #8B7BFF; }
.cd-tracks { display: grid; grid-template-columns: 120px 1fr; gap: 12px; align-items: center; }
.cd-track-label { font-size: 12.5px; font-weight: 600; }
.cd-tl-cpu { color: var(--cd-dim2); } .cd-tl-1 { color: #B69BFF; } .cd-tl-2 { color: #5AD1B0; }
.cd-track { position: relative; height: 34px; background: var(--cd-panel-sunk); border-radius: 8px; overflow: hidden; }
.cd-seg { position: absolute; top: 4px; bottom: 4px; border-radius: 5px; }
.cd-scale { position: relative; height: 20px; margin-left: 132px; margin-top: 8px; }
.cd-tick { position: absolute; transform: translateX(-50%); font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: var(--cd-dim); }
.cd-playhead { position: absolute; top: -142px; bottom: 0; width: 2px; background: #FFF; box-shadow: 0 0 8px 1px rgba(255,255,255,.6); pointer-events: none; }

.cd-controls { display: flex; align-items: center; gap: 10px; margin-top: 26px; flex-wrap: wrap; }
.cd-btn { display: inline-flex; align-items: center; gap: 8px; height: 42px; border-radius: 11px; font-family: 'Space Grotesk', sans-serif; font-size: 14.5px; cursor: pointer; }
.cd-btn-play { padding: 0 20px; background: #6A54F5; color: #fff; border: none; font-weight: 600; transition: background .25s ease; }
.cd-btn-play:hover { background: #7B67FF; }
.cd-btn-ghost { padding: 0 16px; background: var(--cd-panel-hover); color: var(--cd-text); border: 1px solid var(--cd-border2); font-weight: 500; font-size: 14px; transition: border-color .25s ease; }
.cd-btn-ghost:hover { border-color: #6A54F5; }
.cd-divider { width: 1px; height: 26px; background: var(--cd-border2); margin: 0 4px; }
.cd-speed-label { font-size: 13px; color: var(--cd-dim2); }
.cd-speeds { display: inline-flex; background: var(--cd-panel-sunk); border: 1px solid var(--cd-border2); border-radius: 10px; padding: 3px; gap: 2px; }
.cd-speeds button { min-width: 44px; height: 30px; padding: 0 10px; border: none; border-radius: 7px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: background .2s ease, color .2s ease; }
.cd-loop { padding: 0 15px; font-weight: 500; font-size: 14px; border: 1px solid var(--cd-border2); transition: all .2s ease; }

.cd-legend { display: flex; gap: 22px; margin-top: 22px; flex-wrap: wrap; }
.cd-legend span { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--cd-muted); }
.cd-lg { width: 14px; height: 14px; border-radius: 4px; }

.cd-stats { padding: 18px 32px 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.cd-stat { background: var(--cd-panel); border: 1px solid var(--cd-border); border-radius: 14px; padding: 20px 22px; }
.cd-stat-accent { background: var(--cd-panel-accent); border-color: #6A54F5; }
.cd-stat-val { font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 700; }
.cd-stat-unit { font-size: 14px; color: var(--cd-dim2); }
.cd-stat-lbl { font-size: 12.5px; color: var(--cd-dim2); margin-top: 4px; }

.cd-explain-wrap { padding: 26px 32px 70px; }
.cd-explain { background: var(--cd-panel); border: 1px solid var(--cd-border); border-left: 3px solid #8B7BFF; border-radius: 14px; padding: 24px 26px; }
.cd-explain h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: var(--cd-text); }
.cd-explain p { font-size: 14.5px; line-height: 1.65; color: var(--cd-muted); margin: 0; max-width: 74ch; }

@media (max-width: 820px) {
  .cd-panels { grid-template-columns: 1fr; }
  .cd-stats { grid-template-columns: repeat(2, 1fr); }
  .cd-title { font-size: 32px; }
}
@media (prefers-reduced-motion: reduce) { .coro-demo * { animation: none !important; } }
</style>
