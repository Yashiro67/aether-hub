'use strict';
/* ============================================================
   index.js · landing page: starfield, shooting stars, enter
============================================================ */
const cv = document.getElementById('stars');
const cx = cv.getContext('2d');
let W, H, stars = [], meteor = null;

function resize(){
  W = cv.width = innerWidth * devicePixelRatio;
  H = cv.height = innerHeight * devicePixelRatio;
}
addEventListener('resize', resize); resize();

for (let i = 0; i < 260; i++) stars.push({
  x: Math.random(), y: Math.random(),
  r: Math.random()*1.4 + 0.3, tw: Math.random()*6.28, sp: Math.random()*0.5 + 0.2
});

function spawnMeteor(){
  meteor = { x: Math.random()*0.7 + 0.15, y: Math.random()*0.35 + 0.05,
             vx: -(Math.random()*0.25 + 0.2), vy: Math.random()*0.12 + 0.06, life: 1 };
}
setInterval(()=>{ if (!meteor && Math.random() < 0.55) spawnMeteor(); }, 3200);

let t = 0;
(function draw(){
  requestAnimationFrame(draw);
  t += 0.016;
  cx.clearRect(0, 0, W, H);
  for (const s of stars){
    const a = 0.35 + 0.65 * Math.abs(Math.sin(t*s.sp + s.tw));
    cx.globalAlpha = a;
    cx.fillStyle = '#cdd9ff';
    const y = (s.y + t*0.0022*s.sp) % 1;
    cx.beginPath();
    cx.arc(s.x*W, y*H, s.r*devicePixelRatio, 0, 6.28);
    cx.fill();
  }
  if (meteor){
    meteor.x += meteor.vx*0.016; meteor.y += meteor.vy*0.016; meteor.life -= 0.014;
    if (meteor.life <= 0 || meteor.x < 0) meteor = null;
    else {
      const mx = meteor.x*W, my = meteor.y*H;
      const g = cx.createLinearGradient(mx, my, mx - meteor.vx*W*0.35, my - meteor.vy*H*0.35);
      g.addColorStop(0, 'rgba(220,235,255,' + (0.9*meteor.life) + ')');
      g.addColorStop(1, 'rgba(220,235,255,0)');
      cx.globalAlpha = 1; cx.strokeStyle = g; cx.lineWidth = 1.6*devicePixelRatio;
      cx.beginPath(); cx.moveTo(mx, my);
      cx.lineTo(mx - meteor.vx*W*0.35, my - meteor.vy*H*0.35);
      cx.stroke();
    }
  }
  cx.globalAlpha = 1;
})();

document.getElementById('enter').addEventListener('click', ()=>{
  document.body.classList.add('leaving');
  setTimeout(()=>location.href = 'html/hub.html', 900);
});

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e=>e.preventDefault());
