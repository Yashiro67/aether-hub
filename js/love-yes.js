'use strict';
/* ============================================================
   love-yes.js · the answer page: dot-heart, starfield,
   rising hearts, and heart-bursts wherever she clicks
============================================================ */
const heartCanvas = document.getElementById('heart');
const hctx = heartCanvas.getContext('2d');
const starCanvas = document.getElementById('stars');
const sctx = starCanvas.getContext('2d');

function resize() {
  heartCanvas.width = starCanvas.width = window.innerWidth;
  heartCanvas.height = starCanvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

/* ---------- background: twinkling sparkles + rising mini-hearts ---------- */
const stars = [];
for (let i = 0; i < 110; i++) {
  stars.push({
    x: Math.random(), y: Math.random(),
    r: 0.4 + Math.random() * 1.4,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random(),
    gold: Math.random() < 0.22
  });
}

const risers = [];
function spawnRiser() {
  risers.push({
    x: Math.random(),
    y: 1.08,
    size: 5 + Math.random() * 11,
    vy: 0.0006 + Math.random() * 0.0012,
    sway: Math.random() * Math.PI * 2,
    alpha: 0.18 + Math.random() * 0.35
  });
}
setInterval(spawnRiser, 1000);

/* clicking anywhere releases a little swarm of hearts from that spot */
addEventListener('pointerdown', e => {
  for (let i = 0; i < 12; i++) {
    risers.push({
      x: e.clientX / innerWidth + (Math.random() - 0.5) * 0.07,
      y: e.clientY / innerHeight + (Math.random() - 0.5) * 0.05,
      size: 4 + Math.random() * 10,
      vy: 0.0012 + Math.random() * 0.0022,
      sway: Math.random() * Math.PI * 2,
      alpha: 0.45 + Math.random() * 0.4
    });
  }
});

function drawMiniHeart(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  for (let t = 0; t <= Math.PI * 2; t += 0.3) {
    const hx = 16 * Math.pow(Math.sin(t), 3);
    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    if (t === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawBackground(time) {
  sctx.clearRect(0, 0, starCanvas.width, starCanvas.height);

  for (const s of stars) {
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time / 600 * s.speed + s.phase));
    sctx.beginPath();
    sctx.arc(s.x * starCanvas.width, s.y * starCanvas.height, s.r * tw, 0, Math.PI * 2);
    sctx.fillStyle = s.gold
      ? `rgba(255, 214, 170, ${0.45 * tw})`
      : `rgba(255, 190, 215, ${0.5 * tw})`;
    sctx.fill();
  }

  for (let i = risers.length - 1; i >= 0; i--) {
    const h = risers[i];
    h.y -= h.vy * (starCanvas.height / 100) * 0.16;
    if (h.y < -0.1) { risers.splice(i, 1); continue; }
    const wob = Math.sin(time / 900 + h.sway) * 14;
    drawMiniHeart(sctx, h.x * starCanvas.width + wob, h.y * starCanvas.height, h.size,
      `rgba(255, 105, 150, ${h.alpha})`);
  }
}

/* ---------- the big pulsing dot-heart ---------- */
/* Heart curve: x = 16sin^3(t), y = 13cos(t) - 5cos(2t) - 2cos(3t) - cos(4t) */
function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x, y: -y };
}

const dots = [];

/* several concentric outline layers; a fifth of the dots shimmer rose-gold */
for (let layer = 1; layer >= 0.35; layer -= 0.13) {
  const count = Math.floor(90 * layer);
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const p = heartPoint(t);
    dots.push({
      x: p.x * layer,
      y: p.y * layer,
      r: 2.2 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.18
    });
  }
}

/* random dots sprinkled inside the heart */
function insideHeart(x, y) {
  const nx = x / 16;
  const ny = -y / 16;
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
}

for (let i = 0; i < 260; i++) {
  const x = (Math.random() * 2 - 1) * 17;
  const y = (Math.random() * 2 - 1) * 17;
  if (insideHeart(x * 0.95, y * 0.95)) {
    dots.push({
      x, y,
      r: 1 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2,
      gold: Math.random() < 0.18
    });
  }
}

function draw(time) {
  drawBackground(time);
  hctx.clearRect(0, 0, heartCanvas.width, heartCanvas.height);

  const cx = heartCanvas.width / 2;
  const cy = heartCanvas.height / 2 + heartCanvas.height * 0.04;

  /* global heartbeat pulse */
  const beat = 1 + 0.06 * Math.sin(time / 350) + 0.03 * Math.sin(time / 175);
  const scale = Math.min(heartCanvas.width, heartCanvas.height) / 42 * beat;

  /* soft ambient glow behind the heart */
  const glow = hctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 22);
  glow.addColorStop(0, `rgba(255, 60, 120, ${0.16 + 0.05 * Math.sin(time / 350)})`);
  glow.addColorStop(1, 'rgba(255, 60, 120, 0)');
  hctx.fillStyle = glow;
  hctx.fillRect(0, 0, heartCanvas.width, heartCanvas.height);

  for (const d of dots) {
    /* each dot twinkles slightly out of phase */
    const tw = 0.6 + 0.4 * Math.sin(time / 400 + d.phase);
    const px = cx + d.x * scale;
    const py = cy + d.y * scale;

    hctx.beginPath();
    hctx.arc(px, py, d.r * beat, 0, Math.PI * 2);
    if (d.gold) {
      hctx.fillStyle = `rgba(255, ${Math.floor(185 + 45 * tw)}, ${Math.floor(150 + 40 * tw)}, ${0.45 + 0.5 * tw})`;
      hctx.shadowColor = 'rgba(255, 200, 160, 0.8)';
    } else {
      hctx.fillStyle = `rgba(255, ${Math.floor(70 + 90 * tw)}, ${Math.floor(130 + 60 * tw)}, ${0.5 + 0.5 * tw})`;
      hctx.shadowColor = 'rgba(255, 92, 138, 0.8)';
    }
    hctx.shadowBlur = 12 * tw;
    hctx.fill();
  }
  hctx.shadowBlur = 0;

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e => e.preventDefault());
