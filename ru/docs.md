---
layout: docs
lang: ru
path_key: "/docs.html"
nav_active: docs
permalink: /ru/docs.html
page_title: "Документация"
description: "Документация TrueAsync. Узнайте, как установить и использовать настоящие асинхронные примитивы для PHP."
---

## Введение {#introduction}

`PHP TrueAsync` — проект, реализующий настоящую асинхронность в PHP путём изменения Zend-ядра, библиотеки ввода вывода,
библиотек для работы с Базами Данных, сокетами, а также других функций.

`PHP TrueAsync` реализует парадигму прозрачной асинхронности без цветных функций, 
которая минимизирует изменения в коде и устраняет сегментированность библиотек.
Другими словами, используя корутины, вы используете те же самые функции без изменений или с минимальными изменениями.

## Карта изучения {#learning-map}

<div class="learning-map-wrap" markdown="0">
<style>
.learning-map-wrap .lm-hint {
    text-align: center;
    font-size: 0.85em;
    color: var(--color-text-secondary);
    margin-bottom: 10px;
}
.learning-map-wrap .lm-container {
    width: 100%;
    max-width: 620px;
    margin: 0 auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    background: var(--color-bg-subtle);
    overflow: hidden;
}
.learning-map-wrap .lm-container svg {
    display: block;
    width: 100%;
    height: auto;
}
.learning-map-wrap .lm-link {
    display: block;
    text-align: center;
    margin-top: 10px;
    font-size: 0.85em;
}
.learning-map-wrap .node { cursor: pointer; transition: opacity 0.25s; }
.learning-map-wrap .node.dimmed { opacity: 0.12; }
.learning-map-wrap .node .node-bg { transition: stroke-width 0.2s, filter 0.2s; }
.learning-map-wrap .node.highlighted .node-bg { stroke-width: 2.5; }
.learning-map-wrap .edge { transition: opacity 0.25s; }
.learning-map-wrap .edge.dimmed { opacity: 0.04 !important; }
.learning-map-wrap .edge.highlighted { opacity: 0.8 !important; stroke-width: 2.5 !important; }
.learning-map-wrap .group-zone { opacity: 0.75; transition: opacity 0.3s; }
.learning-map-wrap .group-zone.dimmed { opacity: 0.05; }
@keyframes lmBadgePop {
    0% { transform: scale(0); opacity: 0; }
    60% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
}
.learning-map-wrap .order-badge-g { opacity: 0; animation: lmBadgePop 0.35s ease forwards; }
@keyframes lmEdgeDraw {
    from { stroke-dashoffset: 800; }
    to { stroke-dashoffset: 0; }
}
.learning-map-wrap .edge-anim { stroke-dasharray: 800; animation: lmEdgeDraw 1.2s ease forwards; }
.learning-map-wrap .lm-tooltip {
    position: fixed; pointer-events: none;
    background: #fff; border: 1px solid var(--color-border);
    border-radius: var(--radius-lg); padding: 10px 14px;
    font-size: 0.82em; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    z-index: 100; opacity: 0; transition: opacity 0.18s;
    max-width: 320px; line-height: 1.45;
}
.learning-map-wrap .lm-tooltip.visible { opacity: 1; }
.learning-map-wrap .lm-tooltip .tt-title { font-weight: 700; margin-bottom: 2px; font-size: 1.05em; }
.learning-map-wrap .lm-tooltip .tt-desc { color: var(--color-text-secondary); margin-bottom: 4px; }
.learning-map-wrap .lm-tooltip .tt-group { font-size: 0.88em; font-weight: 500; }
.learning-map-wrap .lm-tooltip .tt-order { font-size: 0.85em; margin-top: 3px; font-weight: 600; }
.learning-map-wrap .lm-tooltip .tt-code {
    margin-top: 6px; padding: 6px 8px; background: #F3F4F6;
    border-radius: 6px; font-family: 'Fira Mono', monospace;
    font-size: 0.82em; line-height: 1.5; color: #1F2937;
    white-space: pre; overflow-x: auto; border: 1px solid #E5E7EB;
}
.learning-map-wrap .lm-tooltip .tt-code .kw { color: #7C3AED; font-weight: 600; }
.learning-map-wrap .lm-tooltip .tt-code .fn { color: #2563EB; }
.learning-map-wrap .lm-tooltip .tt-code .str { color: #16A34A; }
.learning-map-wrap .lm-tooltip .tt-code .var { color: #0891B2; }
.learning-map-wrap .lm-tooltip .tt-code .cm { color: #9CA3AF; font-style: italic; }
.learning-map-wrap .lm-tooltip .tt-code .num { color: #EA580C; }
.learning-map-wrap .lm-tooltip .tt-sub {
    font-size: 0.85em; margin-top: 5px; color: var(--color-text-secondary);
    border-top: 1px solid var(--color-border); padding-top: 5px;
}
.learning-map-wrap .lm-tooltip .tt-sub a {
    display: block; color: var(--color-primary); text-decoration: none; padding: 1px 0;
}
.learning-map-wrap .lm-tooltip .tt-sub a:hover { text-decoration: underline; }
</style>
<p class="lm-hint">Наведите на узел для подробностей. Нажмите для перехода к документации.</p>
<div class="lm-container">
<svg id="lmSvg" viewBox="0 0 600 590" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
<defs>
<marker id="lmArrPurple" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#6B58FF" opacity="0.65"/></marker>
<marker id="lmArrBlue" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#2563EB" opacity="0.65"/></marker>
<marker id="lmArrRed" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#DC2626" opacity="0.65"/></marker>
<marker id="lmArrTeal" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#0891B2" opacity="0.65"/></marker>
<marker id="lmArrViolet" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#8B5CF6" opacity="0.65"/></marker>
<marker id="lmArrGreen" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse"><polygon points="0 0,10 3.5,0 7" fill="#16A34A" opacity="0.65"/></marker>
<filter id="lmShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.06"/></filter>
</defs>
<g id="lmZones"></g>
<g id="lmEdges"></g>
<g id="lmNodes"></g>
</svg>
</div>
<div class="lm-tooltip" id="lmTooltip">
<div class="tt-title" id="lmTtTitle"></div>
<div class="tt-desc" id="lmTtDesc"></div>
<div class="tt-group" id="lmTtGroup"></div>
<div class="tt-order" id="lmTtOrder"></div>
<div class="tt-code" id="lmTtCode"></div>
<div class="tt-sub" id="lmTtSub"></div>
</div>
<a class="lm-link" href="/ru/interactive/learning-map.html">Полная интерактивная версия &rarr;</a>
<script>
(function(){
var GRP = {
    primitives:   {color:'#6B58FF',bg:'rgba(107,88,255,0.12)',border:'rgba(107,88,255,0.50)',arrow:'url(#lmArrPurple)',label:'Базовые примитивы'},
    sync:         {color:'#2563EB',bg:'rgba(37,99,235,0.12)',border:'rgba(37,99,235,0.50)',arrow:'url(#lmArrBlue)',label:'Синхронизация'},
    cancellation: {color:'#DC2626',bg:'rgba(220,38,38,0.12)',border:'rgba(220,38,38,0.50)',arrow:'url(#lmArrRed)',label:'Cancellation'},
    structural:   {color:'#0891B2',bg:'rgba(8,145,178,0.12)',border:'rgba(8,145,178,0.50)',arrow:'url(#lmArrTeal)',label:'Стр. конкурентность'},
    context:      {color:'#8B5CF6',bg:'rgba(139,92,246,0.12)',border:'rgba(139,92,246,0.50)',arrow:'url(#lmArrViolet)',label:'Context'},
    iterate:      {color:'#F59E0B',bg:'rgba(245,158,11,0.12)',border:'rgba(245,158,11,0.50)',arrow:'url(#lmArrAmber)',label:'iterate()'},
    resources:    {color:'#16A34A',bg:'rgba(22,163,74,0.12)',border:'rgba(22,163,74,0.50)',arrow:'url(#lmArrGreen)',label:'Ресурсы и пулы'}
};
var nodes = [
    {id:'coroutines',title:'Корутины',desc:'Базовая единица асинхронности — запуск параллельных задач',
     code:'<span class="var">$coro</span> = <span class="fn">spawn</span>(<span class="kw">function</span>() {\n  <span class="fn">echo</span> <span class="str">"async!"</span>;\n});',
     url:'/ru/docs/concepts/coroutines.html',group:'primitives',order:1,cx:250,cy:55,w:130,h:44},
    {id:'future',title:'Future',desc:'Получить результат асинхронной операции',
     code:'<span class="var">$coro</span> = <span class="fn">spawn</span>(<span class="var">$task</span>);\n<span class="var">$result</span> = <span class="fn">await</span>(<span class="var">$coro</span>);',
     url:'/ru/docs/concepts/future.html',group:'primitives',order:null,cx:470,cy:55,w:110,h:44},
    {id:'await-funcs',title:'await, await_all',desc:'Ожидание одной или нескольких корутин',
     code:'<span class="var">$results</span> = <span class="fn">await_all</span>(<span class="var">$tasks</span>);\n<span class="var">$first</span> = <span class="fn">await_first_success</span>(<span class="var">$tasks</span>);',
     url:'/ru/docs/reference/supported-functions.html',group:'sync',order:2,cx:250,cy:150,w:160,h:44},
    {id:'channels',title:'Каналы',desc:'Передавать данные между корутинами',
     code:'<span class="var">$ch</span> = <span class="kw">new</span> Async\\<span class="fn">Channel</span>(<span class="num">10</span>);\n<span class="var">$ch</span>-><span class="fn">send</span>(<span class="str">"data"</span>);\n<span class="var">$val</span> = <span class="var">$ch</span>-><span class="fn">recv</span>();',
     url:'/ru/docs/concepts/channels.html',group:'sync',order:null,cx:470,cy:150,w:110,h:44},
    {id:'cancellation',title:'Cancellation',desc:'Отменять корутины и управлять таймаутами',
     code:'<span class="var">$coro</span>-><span class="fn">cancel</span>();\n<span class="cm">// или с таймаутом:</span>\n<span class="fn">await</span>(<span class="var">$coro</span>, <span class="fn">timeout</span>(<span class="num">5000</span>));',
     url:'/ru/docs/concepts/cancellation.html',group:'cancellation',order:3,cx:300,cy:245,w:150,h:44},
    {id:'scope',title:'Scope',desc:'Контролировать время жизни группы корутин',
     code:'<span class="var">$scope</span> = <span class="kw">new</span> Async\\<span class="fn">Scope</span>();\n<span class="fn">spawn_with</span>(<span class="var">$scope</span>, <span class="var">$task</span>);',
     url:'/ru/docs/concepts/scope.html',group:'structural',order:4,cx:250,cy:340,w:110,h:44},
    {id:'taskgroup',title:'TaskGroup',desc:'Группировать задачи для совместного управления (планируется)',
     code:'<span class="cm">// Планируемая функция</span>\n<span class="var">$group</span> = <span class="kw">new</span> <span class="fn">TaskGroup</span>();\n<span class="var">$group</span>-><span class="fn">spawn</span>(<span class="var">$task</span>);',
     url:'#',group:'structural',order:null,planned:true,cx:470,cy:340,w:130,h:44},
    {id:'context',title:'Context',desc:'Хранить данные привязанные к корутине (напр. токен авторизации)',
     code:'<span class="var">$ctx</span> = <span class="fn">current_context</span>();\n<span class="var">$ctx</span>-><span class="fn">set</span>(<span class="str">\'auth_token\'</span>, <span class="var">$token</span>);\n<span class="var">$v</span> = <span class="var">$ctx</span>-><span class="fn">find</span>(<span class="str">\'auth_token\'</span>);',
     url:'/ru/docs/concepts/context.html',group:'context',order:5,cx:300,cy:435,w:120,h:44},
    {id:'iterate',title:'iterate()',desc:'Параллельная обработка коллекций с контролем конкурентности',
     code:'<span class="fn">iterate</span>(<span class="var">$items</span>, <span class="kw">function</span>(<span class="var">$v</span>, <span class="var">$k</span>) {\n  <span class="fn">echo</span> <span class="str">"$k: $v\\n"</span>;\n}, <span class="fn">concurrency</span>: <span class="num">4</span>);',
     url:'/ru/docs/reference/iterate.html',group:'iterate',order:null,cx:125,cy:532,w:120,h:44},
    {id:'pool',title:'Async\\Pool',desc:'Переиспользовать дорогие ресурсы (соединения, воркеры)',
     code:'<span class="var">$pool</span> = <span class="kw">new</span> <span class="fn">Pool</span>(\n  <span class="fn">factory</span>: <span class="kw">fn</span>() => <span class="kw">new</span> <span class="fn">Conn</span>(),\n  <span class="fn">max</span>: <span class="num">10</span>\n);',
     url:'/ru/docs/concepts/pool.html',group:'resources',order:6,cx:350,cy:532,w:130,h:44},
    {id:'pdo-pool',title:'PDO Pool',desc:'Пул соединений с базой данных',
     code:'<span class="var">$pdo</span> = <span class="kw">new</span> <span class="fn">PDO</span>(<span class="var">$dsn</span>, <span class="var">$user</span>, <span class="var">$pwd</span>, [\n  PDO::<span class="fn">ATTR_POOL_MAX</span> => <span class="num">10</span>\n]);',
     url:'/ru/docs/concepts/pdo-pool.html',group:'resources',order:null,cx:510,cy:532,w:110,h:44}
];
var edges = [
    {from:'coroutines',to:'await-funcs',type:'path'},
    {from:'await-funcs',to:'cancellation',type:'path'},
    {from:'cancellation',to:'scope',type:'path'},
    {from:'scope',to:'context',type:'path'},
    {from:'context',to:'pool',type:'path'},
    {from:'scope',to:'taskgroup',type:'path'},
    {from:'pool',to:'pdo-pool',type:'path'},
    {from:'coroutines',to:'future',type:'related'},
    {from:'coroutines',to:'channels',type:'related'}
];
var subPages = {
    'coroutines':[
        {label:'spawn()',url:'/ru/docs/reference/spawn.html'},
        {label:'spawn_with()',url:'/ru/docs/reference/spawn-with.html'}],
    'future':[{label:'await()',url:'/ru/docs/reference/await.html'}],
    'await-funcs':[
        {label:'await_all()',url:'/ru/docs/reference/await-all.html'},
        {label:'await_first_success()',url:'/ru/docs/reference/await-first-success.html'},
        {label:'delay()',url:'/ru/docs/reference/delay.html'},
        {label:'suspend()',url:'/ru/docs/reference/suspend.html'}],
    'cancellation':[
        {label:'cancel()',url:'/ru/docs/concepts/cancellation.html'},
        {label:'protect()',url:'/ru/docs/reference/protect.html'},
        {label:'timeout()',url:'/ru/docs/reference/timeout.html'}],
    'scope':[
        {label:'Scope',url:'/ru/docs/concepts/scope.html'},
        {label:'Scope::inherit()',url:'/ru/docs/concepts/scope.html'}],
    'context':[
        {label:'current_context()',url:'/ru/docs/reference/current-context.html'},
        {label:'coroutine_context()',url:'/ru/docs/reference/coroutine-context.html'}],
    'pool':[{label:'Pool::tryAcquire()',url:'/ru/docs/concepts/pool.html'}]
};
var groupZones = [
    {group:'primitives',label:'Базовые примитивы',x:140,y:10,w:400,h:85,rx:14},
    {group:'sync',label:'Синхронизация',x:100,y:105,w:440,h:85,rx:14},
    {group:'cancellation',label:'Cancellation',x:170,y:200,w:260,h:85,rx:14},
    {group:'structural',label:'Стр. конкурентность',x:140,y:295,w:400,h:85,rx:14},
    {group:'context',label:'Context',x:185,y:390,w:230,h:85,rx:14},
    {group:'iterate',label:'iterate()',x:30,y:485,w:190,h:90,rx:14},
    {group:'resources',label:'Ресурсы и пулы',x:245,y:485,w:330,h:90,rx:14}
];
var NS='http://www.w3.org/2000/svg';
var svg=document.getElementById('lmSvg');
var tip=document.getElementById('lmTooltip');
var eG=document.getElementById('lmEdges');
var nG=document.getElementById('lmNodes');
var zG=document.getElementById('lmZones');
var nMap={},nEls={},eEls=[],zEls={},adjM={},hovId=null;
nodes.forEach(function(n){nMap[n.id]=n;adjM[n.id]=new Set();});
edges.forEach(function(e){adjM[e.from].add(e.to);adjM[e.to].add(e.from);});
groupZones.forEach(function(z){
    var g=GRP[z.group],el=document.createElementNS(NS,'g');
    el.classList.add('group-zone');el.dataset.group=z.group;
    var r=document.createElementNS(NS,'rect');
    r.setAttribute('x',z.x);r.setAttribute('y',z.y);r.setAttribute('width',z.w);r.setAttribute('height',z.h);
    r.setAttribute('rx',z.rx);r.setAttribute('fill',g.bg);r.setAttribute('stroke',g.border);
    r.setAttribute('stroke-width','1');r.setAttribute('stroke-dasharray','6 3');el.appendChild(r);
    var t=document.createElementNS(NS,'text');
    t.setAttribute('x',z.x+12);t.setAttribute('y',z.y+16);
    t.setAttribute('font-family','Fira Sans,sans-serif');t.setAttribute('font-size','11');
    t.setAttribute('font-weight','600');t.setAttribute('fill',g.color);t.setAttribute('opacity','0.7');
    t.textContent=z.label;el.appendChild(t);zG.appendChild(el);zEls[z.group]=el;
});
function exitPt(n,a){var hw=n.w/2,hh=n.h/2,c=Math.cos(a),s=Math.sin(a);
    var tx=c?hw/Math.abs(c):9999,ty=s?hh/Math.abs(s):9999,t=Math.min(tx,ty);
    return{x:n.cx+c*t,y:n.cy+s*t};}
function calcPath(f,t){var dx=t.cx-f.cx,dy=t.cy-f.cy,d=Math.sqrt(dx*dx+dy*dy);
    if(d<1)return null;var a=Math.atan2(dy,dx),s=exitPt(f,a),e=exitPt(t,a+Math.PI);
    var mx=(s.x+e.x)/2,my=(s.y+e.y)/2,ux=dx/d,uy=dy/d,off=Math.min(d*0.12,30);
    return'M'+s.x+','+s.y+' Q'+(mx-uy*off)+','+(my+ux*off)+' '+e.x+','+e.y;}
edges.forEach(function(e,i){
    var f=nMap[e.from],t=nMap[e.to],d=calcPath(f,t);if(!d)return;
    var g=GRP[f.group],p=document.createElementNS(NS,'path');
    p.setAttribute('d',d);p.setAttribute('fill','none');
    if(e.type==='path'){p.setAttribute('stroke',g.color);p.setAttribute('stroke-width','2');
        p.setAttribute('opacity','0.5');p.setAttribute('marker-end',g.arrow);
        p.classList.add('edge','edge-path','edge-anim');p.style.animationDelay=(i*0.05)+'s';
    }else{p.setAttribute('stroke','#94A3B8');p.setAttribute('stroke-width','1.5');
        p.setAttribute('stroke-dasharray','5 4');p.setAttribute('opacity','0.25');
        p.classList.add('edge','edge-related');}
    p.dataset.from=e.from;p.dataset.to=e.to;eG.appendChild(p);
    eEls.push({el:p,from:e.from,to:e.to,type:e.type});
});
nodes.forEach(function(n){
    var g=document.createElementNS(NS,'g');g.classList.add('node');
    g.dataset.id=n.id;g.dataset.group=n.group;var grp=GRP[n.group];
    var hw=n.w/2,hh=n.h/2,rx=Math.min(hh,14);
    var r=document.createElementNS(NS,'rect');
    r.setAttribute('x',n.cx-hw);r.setAttribute('y',n.cy-hh);r.setAttribute('width',n.w);
    r.setAttribute('height',n.h);r.setAttribute('rx',rx);r.setAttribute('fill','#fff');
    r.setAttribute('stroke',grp.border);r.setAttribute('stroke-width','1.5');
    r.setAttribute('filter','url(#lmShadow)');r.classList.add('node-bg');
    if(n.planned){r.setAttribute('stroke-dasharray','6 3');r.setAttribute('opacity','0.65');}
    g.appendChild(r);
    var bar=document.createElementNS(NS,'rect');
    bar.setAttribute('x',n.cx-hw);bar.setAttribute('y',n.cy-hh);bar.setAttribute('width',4);
    bar.setAttribute('height',n.h);bar.setAttribute('rx',2);bar.setAttribute('fill',grp.color);
    bar.setAttribute('opacity',n.planned?'0.4':'0.7');
    var cp=document.createElementNS(NS,'clipPath');var cid='lmc-'+n.id;cp.id=cid;
    var cr=document.createElementNS(NS,'rect');
    cr.setAttribute('x',n.cx-hw);cr.setAttribute('y',n.cy-hh);cr.setAttribute('width',n.w);
    cr.setAttribute('height',n.h);cr.setAttribute('rx',rx);cp.appendChild(cr);g.appendChild(cp);
    bar.setAttribute('clip-path','url(#'+cid+')');g.appendChild(bar);
    var tt=document.createElementNS(NS,'text');
    tt.setAttribute('x',n.cx+2);tt.setAttribute('y',n.cy);tt.setAttribute('text-anchor','middle');
    tt.setAttribute('dominant-baseline','central');tt.setAttribute('font-family','Fira Sans,sans-serif');
    tt.setAttribute('font-size','13');tt.setAttribute('font-weight','600');tt.setAttribute('fill',grp.color);
    tt.setAttribute('pointer-events','none');tt.textContent=n.title;
    if(n.planned)tt.setAttribute('opacity','0.65');g.appendChild(tt);
    if(n.order){
        var bx=n.cx+hw-2,by=n.cy-hh-2;var bg=document.createElementNS(NS,'g');
        bg.classList.add('order-badge-g');bg.style.animationDelay=(n.order*0.08)+'s';
        bg.style.transformOrigin=bx+'px '+by+'px';
        var bc=document.createElementNS(NS,'circle');
        bc.setAttribute('cx',bx);bc.setAttribute('cy',by);bc.setAttribute('r',11);
        bc.setAttribute('fill',grp.color);bg.appendChild(bc);
        var bt=document.createElementNS(NS,'text');
        bt.setAttribute('x',bx);bt.setAttribute('y',by);bt.setAttribute('text-anchor','middle');
        bt.setAttribute('dominant-baseline','central');bt.setAttribute('font-family','Fira Sans,sans-serif');
        bt.setAttribute('font-size','9');bt.setAttribute('font-weight','700');bt.setAttribute('fill','#fff');
        bt.setAttribute('pointer-events','none');bt.textContent=n.order;bg.appendChild(bt);g.appendChild(bg);
    }
    g.addEventListener('mouseenter',function(ev){onEnter(n.id,ev);});
    g.addEventListener('mouseleave',function(){onLeave();});
    g.addEventListener('click',function(){if(n.url&&n.url!=='#')window.location.href=n.url;});
    nG.appendChild(g);nEls[n.id]=g;
});
function onEnter(id,ev){
    hovId=id;var nb=adjM[id]||new Set(),ag=new Set();ag.add(nMap[id].group);
    Object.keys(nEls).forEach(function(nid){
        if(nid===id||nb.has(nid)){nEls[nid].classList.remove('dimmed');nEls[nid].classList.add('highlighted');ag.add(nMap[nid].group);}
        else{nEls[nid].classList.add('dimmed');nEls[nid].classList.remove('highlighted');}});
    eEls.forEach(function(e){
        if(e.from===id||e.to===id){e.el.classList.remove('dimmed');e.el.classList.add('highlighted');}
        else{e.el.classList.add('dimmed');e.el.classList.remove('highlighted');}});
    Object.keys(zEls).forEach(function(g){
        if(ag.has(g))zEls[g].classList.remove('dimmed');else zEls[g].classList.add('dimmed');});
    showTip(id,ev);
}
function onLeave(){hovId=null;
    Object.keys(nEls).forEach(function(nid){nEls[nid].classList.remove('dimmed','highlighted');});
    eEls.forEach(function(e){e.el.classList.remove('dimmed','highlighted');});
    Object.keys(zEls).forEach(function(g){zEls[g].classList.remove('dimmed');});
    tip.classList.remove('visible');tip.style.pointerEvents='none';
}
function showTip(id,ev){
    var n=nMap[id];if(!n)return;var g=GRP[n.group];
    document.getElementById('lmTtTitle').textContent=n.title;
    document.getElementById('lmTtDesc').textContent=n.desc||'';
    var ge=document.getElementById('lmTtGroup');ge.textContent=g.label;ge.style.color=g.color;
    var oe=document.getElementById('lmTtOrder');
    if(n.order){oe.textContent='Шаг '+n.order+' из 6';oe.style.color=g.color;oe.style.display='';}
    else{oe.style.display='none';}
    var ce=document.getElementById('lmTtCode');
    if(n.code){ce.innerHTML=n.code;ce.style.display='';}else{ce.style.display='none';}
    var se=document.getElementById('lmTtSub');
    if(subPages[id]){var h='';subPages[id].forEach(function(p){h+='<a href="'+p.url+'">'+p.label+'</a>';});
        se.innerHTML=h;se.style.display='';tip.style.pointerEvents='auto';}
    else{se.innerHTML='';se.style.display='none';tip.style.pointerEvents='none';}
    posTip(ev);tip.classList.add('visible');
}
function posTip(ev){var x=ev.clientX+16,y=ev.clientY+16;
    var tw=tip.offsetWidth||200,th=tip.offsetHeight||80;
    if(x+tw>window.innerWidth-10)x=ev.clientX-tw-12;
    if(y+th>window.innerHeight-10)y=ev.clientY-th-12;
    tip.style.left=x+'px';tip.style.top=y+'px';
}
svg.addEventListener('mousemove',function(ev){if(hovId)posTip(ev);});
if('ontouchstart' in window){
    svg.addEventListener('touchstart',function(ev){
        var t=ev.target.closest('.node');
        if(t){var id=t.dataset.id;
            if(hovId===id){var n=nMap[id];if(n&&n.url&&n.url!=='#')window.location.href=n.url;}
            else{onEnter(id,{clientX:ev.touches[0].clientX,clientY:ev.touches[0].clientY});ev.preventDefault();}
        }else{onLeave();}},{passive:false});
}
})();
</script>
</div>

## Установка {#installation}

`PHP TrueAsync` доступен в трёх вариантах:
* Docker образ
* Готовые пакеты для популярных дистрибутивов
* Исходный код для сборки вручную


