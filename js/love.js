'use strict';
/* ============================================================
   love.js · the question page: buttons, hearts, sparkles,
   parallax, and the burst when she says yes
============================================================ */
const yesBtn = document.getElementById('yesBtn');
const noBtn = document.getElementById('noBtn');

let noClicks = 0;
const maxClicks = 6;

const noTexts = ["Nie", "Jesteś pewna?", "Naprawdę? 🥲", "Zastanów się!", "Ostatnia szansa!", "Proszę? 🥺"];

noBtn.addEventListener('click', () => {
  noClicks++;

  if (noClicks >= maxClicks) {
    // Yes takes over the entire page. Re-parent it to <body> first:
    // the heart's CSS animation makes it a transformed ancestor, which
    // would trap position:fixed and offset the fullscreen button.
    noBtn.style.display = 'none';
    yesBtn.style.transform = '';
    yesBtn.textContent = 'Tak 💖';
    document.body.appendChild(yesBtn);
    yesBtn.classList.add('fullscreen');
    return;
  }

  // Shrink No, grow Yes (transform only, so the layout stays intact)
  noBtn.textContent = noTexts[Math.min(noClicks, noTexts.length - 1)];
  noBtn.style.opacity = String(1 - noClicks * 0.06);

  const noScale = 1 - noClicks * 0.07;
  const yesGrow = 1 + noClicks * 0.35;
  yesBtn.style.transform = 'scale(' + yesGrow + ')';

  // Slide No to the right so the growing Yes never covers it.
  // Scaling is visual only, so compute the visual half-widths and push
  // No until the two pills no longer overlap (clamped to the viewport).
  const yesW = yesBtn.offsetWidth;
  const noW = noBtn.offsetWidth;
  const centerDist = (noBtn.offsetLeft + noW / 2) - (yesBtn.offsetLeft + yesW / 2);
  const needed = (yesW * yesGrow) / 2 + (noW * noScale) / 2 + 14;
  let dx = Math.max(0, needed - centerDist);
  const wrapLeft = noBtn.parentElement.getBoundingClientRect().left;
  const noCenterX = wrapLeft + noBtn.offsetLeft + noW / 2;
  dx = Math.min(dx, Math.max(0, window.innerWidth - 12 - (noW * noScale) / 2 - noCenterX));
  noBtn.style.transform = 'translateX(' + dx + 'px) scale(' + noScale + ')';
});

/* she said yes: hearts everywhere, then a soft bloom into the answer */
yesBtn.addEventListener('click', () => {
  for (let i = 0; i < 30; i++) {
    const el = document.createElement('div');
    el.className = 'burst';
    el.textContent = '♥';
    el.style.fontSize = (14 + Math.random() * 26) + 'px';
    el.style.setProperty('--bx', ((Math.random() * 2 - 1) * innerWidth * 0.45) + 'px');
    el.style.setProperty('--by', ((Math.random() * 2 - 1) * innerHeight * 0.45) + 'px');
    el.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(el);
  }
  document.body.classList.add('leaving');
  setTimeout(() => window.location.href = 'love-yes.html', 900);
});

/* gentle parallax so the scene breathes with the cursor */
const scene = document.querySelector('.scene');
addEventListener('pointermove', e => {
  const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
  scene.style.transform = 'translate(' + (nx * -14) + 'px, ' + (ny * -10) + 'px)';
});

/* delicate ♥ glyphs floating up in the background */
function spawnHeart() {
  const el = document.createElement('div');
  el.className = 'floatHeart';
  el.textContent = '♥';
  el.style.left = Math.random() * 96 + 'vw';
  el.style.fontSize = (10 + Math.random() * 20) + 'px';
  el.style.color = 'rgba(214, 51, 108, ' + (0.3 + Math.random() * 0.35) + ')';
  const dur = 9 + Math.random() * 8;
  el.style.animationDuration = dur + 's';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), dur * 1000);
}
setInterval(spawnHeart, 900);
for (let i = 0; i < 5; i++) setTimeout(spawnHeart, i * 350);

/* twinkling sparkles scattered around the page */
const sparkleChars = ['✦', '✧', '❋'];
for (let i = 0; i < 16; i++) {
  const s = document.createElement('div');
  s.className = 'sparkle';
  s.textContent = sparkleChars[i % sparkleChars.length];
  s.style.left = Math.random() * 96 + 'vw';
  s.style.top = Math.random() * 92 + 'vh';
  s.style.fontSize = (8 + Math.random() * 12) + 'px';
  s.style.animationDuration = (2.4 + Math.random() * 3) + 's';
  s.style.animationDelay = (Math.random() * 4) + 's';
  document.body.appendChild(s);
}

/* no browser context menu anywhere on the site */
addEventListener('contextmenu', e => e.preventDefault());
