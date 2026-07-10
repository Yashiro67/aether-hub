'use strict';
/* ============================================================
   warframe.js · embers, scroll reveals, counters, progress
============================================================ */

/* ---------- ember background ---------- */
const cv = document.getElementById('bg'), cx = cv.getContext('2d');
let W, H;
function resize(){ W = cv.width = innerWidth*devicePixelRatio; H = cv.height = innerHeight*devicePixelRatio; }
addEventListener('resize', resize); resize();

const pts = [];
for (let i = 0; i < 170; i++) pts.push({
  x: Math.random(), y: Math.random(),
  s: Math.random()*1.7 + 0.4, v: Math.random()*0.028 + 0.008, ph: Math.random()*6.28
});
(function draw(){
  requestAnimationFrame(draw);
  const T = performance.now()/1000;
  cx.clearRect(0, 0, W, H);
  for (const p of pts){
    const y = ((p.y - T*p.v) % 1 + 1) % 1;
    const x = (p.x + Math.sin(T*0.5 + p.ph)*0.015);
    cx.globalAlpha = 0.16 + 0.4*Math.abs(Math.sin(T*1.1 + p.ph));
    cx.fillStyle = p.ph < 3.8 ? '#d9b678' : '#6fd4c4';
    cx.fillRect(x*W, y*H, p.s*devicePixelRatio, p.s*devicePixelRatio);
  }
  cx.globalAlpha = 1;
})();

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver(es=>{
  es.forEach(e=>{ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold: 0.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ---------- animated counters ---------- */
const cio = new IntersectionObserver(es=>{
  es.forEach(e=>{
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, target = +el.dataset.count, suf = el.dataset.suffix || '';
    const t0 = performance.now(), dur = 1800;
    (function tick(now){
      const k = Math.min(1, (now - t0)/dur), v = Math.round(target*(1 - Math.pow(1 - k, 3)));
      el.textContent = v + suf;
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  });
}, {threshold: 0.6});
document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));

/* ---------- progress bar ---------- */
const prog = document.getElementById('progress');
addEventListener('scroll', ()=>{
  const h = document.documentElement;
  prog.style.width = (scrollY/(h.scrollHeight - h.clientHeight)*100) + '%';
}, {passive: true});

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e=>e.preventDefault());
