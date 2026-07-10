'use strict';
/* ============================================================
   hub.js · world select: starfield, live card scenes, 3D tilt
============================================================ */

/* ---------- background starfield ---------- */
const cv = document.getElementById('stars'), cx = cv.getContext('2d');
let W, H;
function resize(){ W = cv.width = innerWidth*devicePixelRatio; H = cv.height = innerHeight*devicePixelRatio; }
addEventListener('resize', resize); resize();

const stars = [];
for (let i = 0; i < 220; i++) stars.push({
  x: Math.random(), y: Math.random(),
  r: Math.random()*1.3 + 0.3, tw: Math.random()*6.28, sp: Math.random()*0.5 + 0.2
});
let t = 0;
(function draw(){
  requestAnimationFrame(draw);
  t += 0.016;
  cx.clearRect(0, 0, W, H);
  cx.fillStyle = '#cdd9ff';
  for (const s of stars){
    cx.globalAlpha = 0.3 + 0.6*Math.abs(Math.sin(t*s.sp + s.tw));
    cx.beginPath();
    cx.arc(s.x*W, ((s.y + t*0.002*s.sp) % 1)*H, s.r*devicePixelRatio, 0, 6.28);
    cx.fill();
  }
  cx.globalAlpha = 1;
})();

/* ---------- per-card mini scenes ---------- */
document.querySelectorAll('.card canvas').forEach(c=>{
  const ctx = c.getContext('2d');
  const fx = c.dataset.fx;
  let w, h;
  const fit = ()=>{ w = c.width = c.clientWidth*devicePixelRatio; h = c.height = c.clientHeight*devicePixelRatio; };
  new ResizeObserver(fit).observe(c); fit();

  if (fx === 'galaxy'){
    const pts = [];
    for (let i = 0; i < 600; i++){
      const r = Math.pow(Math.random(), 0.6)*0.46;
      const arm = Math.random() < 0.5 ? 0 : Math.PI;
      const th = -r*7 + arm + (Math.random()-0.5)*0.5;
      pts.push({r, th, s: Math.random()*1.1 + 0.4});
    }
    (function anim(){
      requestAnimationFrame(anim);
      ctx.clearRect(0, 0, w, h);
      const T = performance.now()/1000;
      ctx.fillStyle = '#bcd0ff';
      for (const p of pts){
        const a = p.th + T*0.12;
        const x = (0.5 + p.r*Math.cos(a))*w, y = (0.42 + p.r*Math.sin(a)*0.45)*h;
        ctx.globalAlpha = 0.25 + 0.5*Math.abs(Math.sin(T*p.s + p.th*5));
        ctx.fillRect(x, y, p.s*devicePixelRatio, p.s*devicePixelRatio);
      }
      ctx.globalAlpha = 1;
    })();
  }
  if (fx === 'hearts'){
    const pts = [];
    for (let i = 0; i < 42; i++) pts.push({
      x: Math.random(), y: Math.random(),
      s: 8 + Math.random()*11, v: 0.025 + Math.random()*0.045, ph: Math.random()*6.28
    });
    (function anim(){
      requestAnimationFrame(anim);
      ctx.clearRect(0, 0, w, h);
      const T = performance.now()/1000;
      for (const p of pts){
        const y = ((p.y - T*p.v) % 1 + 1) % 1;
        const x = p.x + Math.sin(T*0.8 + p.ph)*0.03;
        ctx.globalAlpha = 0.18 + 0.4*Math.abs(Math.sin(T + p.ph));
        ctx.fillStyle = p.ph < 3.14 ? '#ff9dbd' : '#ffd6e8';
        ctx.font = (p.s*devicePixelRatio) + 'px serif';
        ctx.fillText('♥', x*w, y*h);
      }
      ctx.globalAlpha = 1;
    })();
  }
  if (fx === 'embers'){
    const pts = [];
    for (let i = 0; i < 130; i++) pts.push({
      x: Math.random(), y: Math.random(),
      s: Math.random()*1.6 + 0.5, v: Math.random()*0.05 + 0.02, ph: Math.random()*6.28
    });
    (function anim(){
      requestAnimationFrame(anim);
      ctx.clearRect(0, 0, w, h);
      const T = performance.now()/1000;
      for (const p of pts){
        const y = ((p.y - T*p.v) % 1 + 1) % 1;
        const x = p.x + Math.sin(T*0.7 + p.ph)*0.02;
        ctx.globalAlpha = 0.25 + 0.55*Math.abs(Math.sin(T*1.3 + p.ph));
        ctx.fillStyle = p.ph < 3.4 ? '#e8c47a' : '#7fe0d0';
        ctx.fillRect(x*w, y*h, p.s*devicePixelRatio, p.s*devicePixelRatio);
      }
      ctx.globalAlpha = 1;
    })();
  }
});

/* ---------- 3D tilt + curtain navigation ---------- */
document.querySelectorAll('a.card').forEach(card=>{
  card.addEventListener('pointermove', e=>{
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left)/r.width - 0.5, py = (e.clientY - r.top)/r.height - 0.5;
    card.style.transform = `perspective(700px) rotateY(${px*9}deg) rotateX(${-py*9}deg) translateY(-4px)`;
  });
  card.addEventListener('pointerleave', ()=>{ card.style.transform = ''; });
  card.addEventListener('click', e=>{
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(()=>location.href = card.getAttribute('href'), 750);
  });
});

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e=>e.preventDefault());
