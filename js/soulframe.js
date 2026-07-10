'use strict';
/* ============================================================
   soulframe.js · drifting fireflies + scroll reveals
============================================================ */
const cv = document.getElementById('bg'), cx = cv.getContext('2d');
let W, H;
function resize(){ W = cv.width = innerWidth*devicePixelRatio; H = cv.height = innerHeight*devicePixelRatio; }
addEventListener('resize', resize); resize();

/* fireflies: slow wandering points of pale green light */
const flies = [];
for (let i = 0; i < 70; i++) flies.push({
  x: Math.random(), y: Math.random(),
  a: Math.random()*6.28, v: 0.00012 + Math.random()*0.00025,
  s: 1 + Math.random()*1.8, ph: Math.random()*6.28, turn: (Math.random()-0.5)*0.02
});
(function draw(){
  requestAnimationFrame(draw);
  const T = performance.now()/1000;
  cx.clearRect(0, 0, W, H);
  for (const f of flies){
    f.a += f.turn + Math.sin(T*0.3 + f.ph)*0.01;
    f.x = ((f.x + Math.cos(f.a)*f.v) % 1 + 1) % 1;
    f.y = ((f.y + Math.sin(f.a)*f.v) % 1 + 1) % 1;
    const tw = 0.25 + 0.75*Math.abs(Math.sin(T*0.9 + f.ph));
    cx.globalAlpha = tw*0.7;
    cx.fillStyle = f.ph < 3.6 ? '#9ee0b6' : '#e6ecc9';
    cx.shadowColor = '#9ee0b6';
    cx.shadowBlur = 10*tw*devicePixelRatio;
    cx.beginPath();
    cx.arc(f.x*W, f.y*H, f.s*devicePixelRatio*tw, 0, 6.28);
    cx.fill();
  }
  cx.shadowBlur = 0;
  cx.globalAlpha = 1;
})();

/* scroll reveal */
const io = new IntersectionObserver(es=>{
  es.forEach(e=>{ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold: 0.15});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

/* ---------- hearts drifting up around the ask for Wika ---------- */
const cta = document.querySelector('.cta');
function spawnCtaHeart(){
  const el = document.createElement('div');
  el.className = 'cta-heart';
  el.textContent = '♥';
  el.style.left = (4 + Math.random()*92) + '%';
  el.style.fontSize = (11 + Math.random()*17) + 'px';
  const dur = 6 + Math.random()*5;
  el.style.animationDuration = dur + 's';
  cta.appendChild(el);
  setTimeout(()=>el.remove(), dur*1000);
}
let ctaTimer = null;
new IntersectionObserver(es=>{
  es.forEach(e=>{
    if (e.isIntersecting && !ctaTimer){
      ctaTimer = setInterval(spawnCtaHeart, 650);
      for (let i = 0; i < 5; i++) setTimeout(spawnCtaHeart, i*260);
    } else if (!e.isIntersecting && ctaTimer){
      clearInterval(ctaTimer); ctaTimer = null;
    }
  });
}, {threshold: 0.2}).observe(cta);

/* she clicked Zagram: a little celebration on the way out */
document.getElementById('zagram').addEventListener('click', ()=>{
  for (let i = 0; i < 18; i++) setTimeout(spawnCtaHeart, i*55);
});

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e=>e.preventDefault());
