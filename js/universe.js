'use strict';
/* ================================================================
   universe.js · ÆTHER, an interactive particle universe
   raw WebGL, zero dependencies
================================================================ */
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl', {antialias:false, alpha:false, depth:false, powerPreference:'high-performance'});

if (!gl) {
  const d = document.createElement('div');
  d.className = 'nogl';
  d.textContent = 'Your browser could not summon WebGL, so the universe stays folded. Try Chrome or Edge with hardware acceleration enabled.';
  document.body.appendChild(d);
  throw new Error('no webgl');
}

/* ---------------- helpers ---------------- */
const rand = Math.random;
function gauss(){ return (rand()+rand()+rand()+rand()-2)*0.7; }
function compile(type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(vs, fs){
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
const lerp = (a,b,t)=>a+(b-a)*t;
const ease = t=>t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2;
function lerp3(a,b,t){ return [lerp(a[0],b[0],t), lerp(a[1],b[1],t), lerp(a[2],b[2],t)]; }

/* ---------------- particle shaders ---------------- */
const VS = `
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aSeed;
uniform mat4 uProj;
uniform mat3 uRot;
uniform float uDist;
uniform float uTime;
uniform float uMorph;
uniform vec2 uMouse;
uniform float uAspect;
uniform float uForce;
uniform vec3 uColA;
uniform vec3 uColB;
uniform float uPix;
varying vec3 vColor;
varying float vGlow;
void main(){
  /* staggered, eased morph so shapes dissolve organically */
  float t = clamp(uMorph*1.6 - aSeed.w*0.6, 0.0, 1.0);
  t = t*t*(3.0-2.0*t);
  vec3 p = mix(aFrom, aTo, t);

  /* perpetual breathing */
  float ph = uTime*0.6 + aSeed.x*6.2831;
  p += 0.022*(0.5+aSeed.y)*vec3(
      sin(ph+aSeed.y*7.0),
      cos(ph*1.3+aSeed.z*5.0),
      sin(ph*0.7+aSeed.x*9.0));

  /* burst of chaos mid-morph */
  float burst = sin(3.14159*t);
  p += burst*0.35*aSeed.w*vec3(
      sin(aSeed.y*21.0+uTime*2.0),
      cos(aSeed.z*17.0-uTime*1.7),
      sin(aSeed.x*13.0+uTime*2.3));

  vec3 q = uRot * p;
  q.z -= uDist;
  vec4 clip = uProj * vec4(q, 1.0);

  /* cursor gravity well (screen space) · tight radius around the cursor */
  vec2 ndc = clip.xy / clip.w;
  vec2 d = ndc - uMouse;
  d.x *= uAspect;
  float dist2 = dot(d,d);
  float push = uForce * exp(-dist2*340.0);
  vec2 dir = d / (sqrt(dist2)+0.001);
  dir.x /= uAspect;
  clip.xy += dir * push * 0.26 * clip.w;

  gl_Position = clip;

  float tw = 0.72 + 0.28*sin(uTime*(1.0+aSeed.z*3.0)+aSeed.x*40.0);
  float sz = uPix * (0.6+aSeed.w*1.7) * tw * (5.2/clip.w);
  gl_PointSize = clamp(sz, 0.7, 44.0);

  vec3 base = mix(uColA, uColB, fract(aSeed.x*3.7+aSeed.y));
  /* a few white-hot stars */
  if (aSeed.z > 0.965) base = mix(base, vec3(1.4), 0.85);
  vColor = base * (0.55+0.45*tw) * (0.75+0.6*aSeed.y);
  vGlow = 1.0 + burst*1.6 + push*7.0;
}`;

const FS = `
precision mediump float;
varying vec3 vColor;
varying float vGlow;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d2 = dot(uv,uv);
  if (d2 > 0.25) discard;
  float a = exp(-d2*11.0);
  float core = exp(-d2*40.0)*0.9;
  gl_FragColor = vec4(vColor * (a*0.55 + core) * vGlow, 1.0);
}`;

/* ---------------- background nebula shader ---------------- */
const BG_VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos; gl_Position = vec4(aPos,0.0,1.0); }`;

const BG_FS = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uAspect;
uniform float uYaw;
uniform vec3 uNebA;
uniform vec3 uNebB;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
             mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; }
  return v;
}
void main(){
  vec2 uv = vUv; uv.x *= uAspect;
  uv.x += uYaw*0.22;
  vec2 q = uv*1.4 + vec2(uTime*0.015, -uTime*0.008);
  float w = fbm(q + fbm(q*1.6)*0.7);
  vec3 col = mix(uNebA, uNebB, smoothstep(0.25,0.85,w)) * w * 0.34;

  /* pin-prick starfield */
  vec2 sp = uv*90.0;
  vec2 cell = floor(sp);
  float h = hash(cell);
  if (h > 0.994){
    vec2 c = fract(sp)-0.5;
    float s = exp(-dot(c,c)*18.0) * (0.4+0.6*sin(uTime*(1.0+h*4.0)+h*50.0));
    col += vec3(0.85,0.9,1.0)*s*0.5;
  }
  /* deep space falloff */
  col *= 1.0 - 0.45*length(vUv);
  gl_FragColor = vec4(col,1.0);
}`;

/* ---------------- shape generators ---------------- */
const N = 140000;

function shapeGalaxy(){
  const a = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    let x,y,z;
    const u = rand();
    if (u < 0.13){                       // core bulge
      x=gauss()*0.32; y=gauss()*0.22; z=gauss()*0.32;
    } else if (u < 0.18){                // halo
      x=gauss()*1.5; y=gauss()*0.9; z=gauss()*1.5;
    } else {                             // arms
      const r = Math.pow(rand(),0.62)*2.35;
      const arm = (rand()<0.5?0:Math.PI);
      const th = -r*2.1 + arm + gauss()*0.34*(1.15-r*0.28);
      x = r*Math.cos(th); z = r*Math.sin(th);
      y = gauss()*0.05*(1.5-r*0.45);
    }
    a[i*3]=x; a[i*3+1]=y; a[i*3+2]=z;
  }
  return a;
}

function shapePlanet(){
  const a = new Float32Array(N*3);
  const cx=Math.cos(0.42), sx=Math.sin(0.42);
  for(let i=0;i<N;i++){
    let x,y,z;
    if (rand() < 0.6){                   // globe
      const th = rand()*Math.PI*2, c = rand()*2-1;
      const s = Math.sqrt(1-c*c);
      const r = 1.12 + gauss()*0.02;
      x = r*s*Math.cos(th); y = r*c; z = r*s*Math.sin(th);
    } else {                             // rings with gaps
      let rr = 1.55 + rand()*0.85;
      if (rr>1.95 && rr<2.05) rr += 0.14;           // Cassini-style gap
      const th = rand()*Math.PI*2;
      x = rr*Math.cos(th); z = rr*Math.sin(th);
      y = gauss()*0.012;
    }
    const y2 = y*cx - z*sx, z2 = y*sx + z*cx;       // axial tilt
    a[i*3]=x; a[i*3+1]=y2; a[i*3+2]=z2;
  }
  return a;
}

function shapeKnot(){
  const a = new Float32Array(N*3);
  const p=2, q=3, S=0.58;
  for(let i=0;i<N;i++){
    const t = rand()*Math.PI*2;
    const r = Math.cos(q*t)+2.0;
    let x = r*Math.cos(p*t), y = -Math.sin(q*t)*1.15, z = r*Math.sin(p*t);
    x = x*S + gauss()*0.075;
    y = y*S + gauss()*0.075;
    z = z*S + gauss()*0.075;
    a[i*3]=x; a[i*3+1]=y; a[i*3+2]=z;
  }
  return a;
}

function shapeHelix(){
  const a = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const t = rand()*2-1;
    const ang = t*Math.PI*3.4;
    let x,y,z;
    const u = rand();
    if (u < 0.42){                       // strand A
      x=Math.cos(ang)*0.72; z=Math.sin(ang)*0.72; y=t*2.4;
    } else if (u < 0.84){                // strand B
      x=Math.cos(ang+Math.PI)*0.72; z=Math.sin(ang+Math.PI)*0.72; y=t*2.4;
    } else {                             // base-pair rungs
      const m = rand();
      x=Math.cos(ang)*0.72*(2*m-1); z=Math.sin(ang)*0.72*(2*m-1); y=t*2.4;
    }
    a[i*3]=x+gauss()*0.03; a[i*3+1]=y+gauss()*0.03; a[i*3+2]=z+gauss()*0.03;
  }
  return a;
}

function shapeBlackHole(){
  const a = new Float32Array(N*3);
  for(let i=0;i<N;i++){
    let x,y,z;
    const u = rand();
    if (u < 0.86){                       // accretion disk, dense inside
      const r = 0.52 + 1.95*Math.pow(rand(),2.2);
      const th = rand()*Math.PI*2 - r*0.7;
      x = r*Math.cos(th); z = r*Math.sin(th);
      y = gauss()*0.02*(0.4+r*0.35);
    } else if (u < 0.94){                // photon ring
      const th = rand()*Math.PI*2;
      const rr = 0.48+gauss()*0.012;
      x = rr*Math.cos(th); y = gauss()*0.15*Math.sin(th*3.0); z = rr*Math.sin(th);
    } else {                             // polar jets
      const s = rand(), sgn = rand()<0.5?-1:1;
      y = sgn*(0.25+2.1*s*s);
      const cr = 0.03+0.22*s;
      const th = rand()*Math.PI*2;
      x = cr*Math.cos(th); z = cr*Math.sin(th);
    }
    a[i*3]=x; a[i*3+1]=y; a[i*3+2]=z;
  }
  return a;
}

/* ---------------- scene definitions ---------------- */
/* each scene lists clickable features; the sample points anchor picking and the label line */
function ringPts(r, n, y){
  const a=[];
  for(let i=0;i<n;i++){ const t=i/n*6.2832; a.push([r*Math.cos(t), y||0, r*Math.sin(t)]); }
  return a;
}
function tiltPts(pts){
  const c=Math.cos(0.42), s=Math.sin(0.42);
  return pts.map(p=>[p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]);
}

const SCENES = [
  { title:'SPIRAL GALAXY',  sub:'140,000 SUNS · EVERY ONE OBEYS YOUR CURSOR',
    colA:[0.35,0.5,1.35], colB:[1.3,0.75,0.42], nebA:[0.18,0.22,0.55], nebB:[0.5,0.25,0.45],
    gen:shapeGalaxy, note:220.0,
    parts:[
      { name:'THE CORE',
        pts:ringPts(0.22,10).concat(ringPts(0.1,6), [[0,0,0]]),
        text:'The core bulge: billions of old golden suns crammed around the galaxy\'s heart, where a supermassive black hole waits.' },
      { name:'THE ARMS',
        pts:(()=>{ const a=[]; for(let i=0;i<28;i++){ const r=0.8+(i%14)/13*1.45, arm=(i<14?0:Math.PI), th=-r*2.1+arm; a.push([r*Math.cos(th), 0, r*Math.sin(th)]); } return a; })(),
        text:'The arms are not solid objects. They are cosmic traffic jams: waves where stars and gas pile up, and new blue suns ignite.' },
    ]},
  { title:'RINGED GIANT',   sub:'RIGHT DRAG TO ORBIT · SCROLL TO FALL CLOSER',
    colA:[0.25,0.9,1.0], colB:[1.25,0.95,0.5], nebA:[0.1,0.35,0.4], nebB:[0.45,0.35,0.15],
    gen:shapePlanet, note:246.9,
    parts:[
      { name:'THE GLOBE',
        pts:tiltPts((()=>{ const a=[]; for(let i=0;i<24;i++){ const y=1-2*(i+0.5)/24, r=Math.sqrt(1-y*y), t=i*2.399; a.push([1.12*r*Math.cos(t), 1.12*y, 1.12*r*Math.sin(t)]); } return a; })()),
        text:'A gas giant has no ground at all, just atmosphere thickening all the way down. Saturn could hold about 750 Earths.' },
      { name:'THE RINGS',
        pts:tiltPts(ringPts(1.7,16).concat(ringPts(2.15,16), ringPts(2.35,12))),
        text:'Rings of ice and rock: pieces from dust grains to the size of houses, each on its own orbit. Moons sweep the dark gaps clean, like Saturn\'s Cassini Division.' },
    ]},
  { title:'TORUS KNOT',     sub:'PURE MATHEMATICS · SET ON FIRE',
    colA:[1.3,0.3,0.85], colB:[0.3,0.85,1.3], nebA:[0.4,0.12,0.4], nebB:[0.1,0.3,0.55],
    gen:shapeKnot, note:196.0,
    parts:[
      { name:'THE CURVE',
        pts:(()=>{ const a=[], S=0.58; for(let i=0;i<36;i++){ const t=i/36*6.2832, r=Math.cos(3*t)+2; a.push([r*Math.cos(2*t)*S, -Math.sin(3*t)*1.15*S, r*Math.sin(2*t)*S]); } return a; })(),
        text:'One single closed curve, winding twice around a ring one way and three times the other. This is the trefoil: the simplest knot that cannot be untied.' },
    ]},
  { title:'THE HELIX',      sub:'FOUR BILLION YEARS OF SOURCE CODE',
    colA:[0.35,1.25,0.6], colB:[0.75,0.4,1.3], nebA:[0.1,0.35,0.2], nebB:[0.3,0.15,0.5],
    gen:shapeHelix, note:174.6,
    parts:[
      { name:'THE STRANDS',
        pts:(()=>{ const a=[]; for(let i=0;i<28;i++){ const t=(i/27)*2-1, ang=t*Math.PI*3.4+(i%2?Math.PI:0); a.push([Math.cos(ang)*0.72, t*2.4, Math.sin(ang)*0.72]); } return a; })(),
        text:'Two strands coiling around one axis. Uncoiled, the DNA packed into a single one of your cells is about two metres long.' },
      { name:'THE RUNGS',
        pts:(()=>{ const a=[]; for(let i=0;i<14;i++){ const t=(i/13)*2-1; a.push([0, t*2.4, 0]); } return a; })(),
        text:'The rungs are base pairs: four letters, A, T, G and C, spelling the entire build manual for a living thing.' },
    ]},
  { title:'EVENT HORIZON',  sub:'LIGHT CHECKS IN · IT DOES NOT CHECK OUT',
    colA:[1.4,0.55,0.18], colB:[1.2,0.15,0.25], nebA:[0.45,0.15,0.05], nebB:[0.2,0.05,0.25],
    gen:shapeBlackHole, note:146.8,
    parts:[
      { name:'ACCRETION DISK',
        pts:ringPts(1.3,14).concat(ringPts(1.9,14)),
        text:'The accretion disk: infalling matter whipped to millions of degrees by friction. Disks like this can outshine entire galaxies.' },
      { name:'PHOTON RING',
        pts:ringPts(0.48,14),
        text:'The photon ring: the altitude where gravity bends light itself into orbit. You are watching light circle the drain.' },
      { name:'POLAR JETS',
        pts:(()=>{ const a=[]; for(let i=0;i<12;i++){ const s=0.4+(i%6)/5*1.6, sgn=(i<6?1:-1); a.push([0, sgn*s, 0]); } return a; })(),
        text:'The polar jets: matter that missed the horizon, flung out along the poles at near light-speed.' },
    ]},
];

/* ---------------- GL setup ---------------- */
const prog = program(VS, FS);
const bgProg = program(BG_VS, BG_FS);
const U = {}, BU = {};
['uProj','uRot','uDist','uTime','uMorph','uMouse','uAspect','uForce','uColA','uColB','uPix']
  .forEach(n=>U[n]=gl.getUniformLocation(prog,n));
['uTime','uAspect','uYaw','uNebA','uNebB']
  .forEach(n=>BU[n]=gl.getUniformLocation(bgProg,n));

const locFrom = gl.getAttribLocation(prog,'aFrom');
const locTo   = gl.getAttribLocation(prog,'aTo');
const locSeed = gl.getAttribLocation(prog,'aSeed');
const bgLocPos = gl.getAttribLocation(bgProg,'aPos');

const seeds = new Float32Array(N*4);
for(let i=0;i<N*4;i++) seeds[i]=rand();

const bufFrom = gl.createBuffer();
const bufTo   = gl.createBuffer();
const bufSeed = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bufSeed);
gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

const bufQuad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);

const shapes = SCENES.map(s=>s.gen());
gl.bindBuffer(gl.ARRAY_BUFFER, bufFrom);
gl.bufferData(gl.ARRAY_BUFFER, shapes[0], gl.DYNAMIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, bufTo);
gl.bufferData(gl.ARRAY_BUFFER, shapes[0], gl.DYNAMIC_DRAW);

/* ---------------- camera & state ---------------- */
let W=0, H=0, aspect=1, pixelScale=1;
const proj = new Float32Array(16);
function resize(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  W = canvas.width  = innerWidth*dpr;
  H = canvas.height = innerHeight*dpr;
  canvas.style.width = innerWidth+'px';
  canvas.style.height = innerHeight+'px';
  aspect = W/H;
  pixelScale = dpr;
  gl.viewport(0,0,W,H);
  const f = 1/Math.tan(30*Math.PI/180), near=0.1, far=100;
  proj.set([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0]);
}
addEventListener('resize', resize); resize();

let yaw=0.6, pitch=-0.22, dist=4.4, distT=4.4;
let dragVX=0, dragVY=0;
let mouseX=0, mouseY=0, force=0, forceT=0;
let scene=0, prevScene=0, morph=1, morphStart=-10;
const MORPH_DUR = 2.6;
let started=false;
let t0 = performance.now();

/* palette state (JS-side lerp during morph) */
let colA=SCENES[0].colA.slice(), colB=SCENES[0].colB.slice();
let nebA=SCENES[0].nebA.slice(), nebB=SCENES[0].nebB.slice();

/* ---------------- audio ---------------- */
let AC=null, master=null, padGain=null, padOscs=[], muted=false;
function initAudio(){
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.3;
    const comp = AC.createDynamicsCompressor();
    master.connect(comp); comp.connect(AC.destination);

    /* cosmic delay tail */
    const delay = AC.createDelay(2); delay.delayTime.value = 0.48;
    const fb = AC.createGain(); fb.gain.value = 0.38;
    const damp = AC.createBiquadFilter(); damp.type='lowpass'; damp.frequency.value=1400;
    delay.connect(fb); fb.connect(damp); damp.connect(delay);
    delay.connect(master);
    AC._send = delay;
    startPad(SCENES[scene].note);
  }catch(e){ AC=null; }
}
function startPad(root){
  if(!AC) return;
  const now = AC.currentTime;
  if (padGain){
    const old = padGain, oldOscs = padOscs;
    old.gain.cancelScheduledValues(now);
    old.gain.setTargetAtTime(0, now, 1.2);
    setTimeout(()=>oldOscs.forEach(o=>{try{o.stop()}catch(e){}}), 5000);
  }
  padGain = AC.createGain(); padGain.gain.value = 0;
  padGain.gain.setTargetAtTime(0.055, now, 2.2);
  const filt = AC.createBiquadFilter(); filt.type='lowpass'; filt.frequency.value=900; filt.Q.value=0.6;
  padGain.connect(filt); filt.connect(master); filt.connect(AC._send);
  padOscs = [1, 1.5, 2, 2.973].map((ratio,i)=>{
    const o = AC.createOscillator();
    o.type = i<2 ? 'sawtooth' : 'sine';
    o.frequency.value = root*ratio*(i<2?0.5:1);
    o.detune.value = (rand()*2-1)*7;
    const g = AC.createGain(); g.gain.value = i<2?0.35:0.55;
    o.connect(g); g.connect(padGain);
    o.start();
    return o;
  });
  /* slow shimmer LFO on the filter */
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.07;
  const lg = AC.createGain(); lg.gain.value = 380;
  lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
  padOscs.push(lfo);
}
function chime(freq){
  if(!AC || muted) return;
  const now = AC.currentTime;
  [1,2.01,3.02].forEach((h,i)=>{
    const o = AC.createOscillator(); o.type='sine';
    o.frequency.value = freq*2*h;
    const g = AC.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.12/(i+1), now+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now+2.2);
    o.connect(g); g.connect(master); g.connect(AC._send);
    o.start(now); o.stop(now+2.4);
  });
}

/* ---------------- scene switching ---------------- */
const titleEl = document.getElementById('title');
const subEl = document.getElementById('sub');
const labelEl = document.getElementById('label');
const dotsEl = document.getElementById('dots');
SCENES.forEach((s,i)=>{
  const b = document.createElement('button');
  b.addEventListener('click', e=>{ e.stopPropagation(); goTo(i); });
  dotsEl.appendChild(b);
});
function updateHud(){
  labelEl.classList.remove('show');
  void labelEl.offsetWidth;                 // restart CSS animation
  titleEl.textContent = SCENES[scene].title;
  subEl.textContent = SCENES[scene].sub;
  labelEl.classList.add('show');
  [...dotsEl.children].forEach((d,i)=>d.classList.toggle('active', i===scene));
}
function goTo(i){
  if (i===scene) return;
  hideCallout();
  prevScene = scene; scene = ((i%SCENES.length)+SCENES.length)%SCENES.length;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufFrom);
  gl.bufferData(gl.ARRAY_BUFFER, shapes[prevScene], gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTo);
  gl.bufferData(gl.ARRAY_BUFFER, shapes[scene], gl.DYNAMIC_DRAW);
  morphStart = (performance.now()-t0)/1000;
  chime(SCENES[scene].note);
  startPad(SCENES[scene].note);
  updateHud();
  buildHotspots();
}
const next = ()=>goTo(scene+1);

/* ---------------- feature callouts (left-click a feature to inspect it) ---------------- */
const calloutText = document.getElementById('calloutText');
const calloutSvg  = document.getElementById('calloutSvg');
const calloutLine = document.getElementById('calloutLine');
const calloutDot  = document.getElementById('calloutDot');
let activePart = null, activeAnchor = null;
let lastRot = new Float32Array([1,0,0, 0,1,0, 0,0,1]);

/* the same transform the vertex shader applies, in JS, for picking + label anchoring */
function project(p){
  const m = lastRot;
  const qx = m[0]*p[0] + m[3]*p[1] + m[6]*p[2];
  const qy = m[1]*p[0] + m[4]*p[1] + m[7]*p[2];
  const qz = m[2]*p[0] + m[5]*p[1] + m[8]*p[2] - dist;
  const w = -qz;
  if (w < 0.1) return null;                  /* behind the camera */
  const f = 1.7320508;                       /* 1/tan(30deg), matches uProj */
  return [(f/aspect*qx/w*0.5+0.5)*innerWidth, (0.5-f*qy/w*0.5)*innerHeight];
}
function hideCallout(){
  activePart = null; activeAnchor = null;
  calloutText.classList.remove('show');
  calloutSvg.classList.remove('show');
}
function pick(cx, cy){
  let best=null, bestD=70;                   /* max grab distance in px */
  for (const part of SCENES[scene].parts){
    for (const p of part.pts){
      const s = project(p);
      if (!s) continue;
      const d = Math.hypot(s[0]-cx, s[1]-cy);
      if (d < bestD){ bestD=d; best={part, anchor:p}; }
    }
  }
  if (!best || best.part === activePart){ hideCallout(); return; }
  activePart = best.part; activeAnchor = best.anchor;
  calloutText.innerHTML = '<b></b>';
  calloutText.querySelector('b').textContent = best.part.name;
  calloutText.appendChild(document.createTextNode(best.part.text));
  calloutText.classList.add('show');
  calloutSvg.classList.add('show');
}
/* ---------------- clickable-feature markers ---------------- */
const hotspotsEl = document.getElementById('hotspots');
let hotspotList = [];
function buildHotspots(){
  hotspotsEl.innerHTML = '';
  hotspotList = SCENES[scene].parts.map(part=>{
    const el = document.createElement('div');
    el.className = 'hotspot';
    hotspotsEl.appendChild(el);
    return {el, part, anchor: part.pts[(part.pts.length*0.25)|0]};
  });
}
function updateHotspots(){
  hotspotsEl.classList.toggle('ready', morph > 0.95);
  for (const h of hotspotList){
    const s = project(h.anchor);
    if (!s){ h.el.style.display = 'none'; continue; }
    h.el.style.display = '';
    h.el.style.left = s[0]+'px';
    h.el.style.top  = s[1]+'px';
    h.el.classList.toggle('active', h.part === activePart);
  }
}
/* pointer cursor whenever a feature is within grabbing range */
function hoverHit(cx, cy){
  for (const part of SCENES[scene].parts)
    for (const p of part.pts){
      const s = project(p);
      if (s && Math.hypot(s[0]-cx, s[1]-cy) < 70) return true;
    }
  return false;
}

/* called every frame so the label follows the feature as it rotates */
function updateCallout(){
  if (!activePart) return;
  const s = project(activeAnchor);
  if (!s){ hideCallout(); return; }
  let dx = s[0]-innerWidth/2, dy = s[1]-innerHeight/2;
  const l = Math.hypot(dx, dy);
  if (l < 40){ dx=0.7; dy=-0.7; } else { dx/=l; dy/=l; }
  let tx = s[0]+dx*170, ty = s[1]+dy*120;
  tx = Math.min(Math.max(tx, 180), innerWidth-180);
  ty = Math.min(Math.max(ty, 110), innerHeight-150);
  const ex = s[0]+(tx-s[0])*0.8, ey = s[1]+(ty-s[1])*0.72;
  calloutLine.setAttribute('x1', s[0]); calloutLine.setAttribute('y1', s[1]);
  calloutLine.setAttribute('x2', ex);   calloutLine.setAttribute('y2', ey);
  calloutDot.setAttribute('cx', s[0]);  calloutDot.setAttribute('cy', s[1]);
  calloutText.style.left = tx+'px';
  calloutText.style.top  = ty+'px';
}

/* ---------------- input ---------------- */
let rDown=false, lDown=false, pMoved=0, pX=0, pY=0, downTime=0;
canvas.addEventListener('pointerdown', e=>{
  pX=e.clientX; pY=e.clientY;
  if (e.button===2){                       /* right button: orbit */
    rDown=true;
    canvas.setPointerCapture(e.pointerId);
  } else if (e.button===0){                /* left button: inspect a feature */
    lDown=true; pMoved=0; downTime=performance.now();
  }
});
canvas.addEventListener('pointermove', e=>{
  mouseX = (e.clientX/innerWidth)*2-1;
  mouseY = -((e.clientY/innerHeight)*2-1);
  forceT = 1;
  const dx=e.clientX-pX, dy=e.clientY-pY;
  if (lDown) pMoved += Math.abs(dx)+Math.abs(dy);
  if (rDown){
    dragVX = dx*0.006; dragVY = dy*0.006;
    yaw += dragVX; pitch += dragVY;
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
  }
  pX=e.clientX; pY=e.clientY;
  if (!rDown && !lDown) canvas.style.cursor = hoverHit(e.clientX, e.clientY) ? 'pointer' : 'crosshair';
});
addEventListener('pointerup', e=>{
  if (e.button===2){ rDown=false; }
  else if (e.button===0){
    /* a plain left click (no drag) inspects whatever feature is under the cursor */
    if (lDown && pMoved < 8 && performance.now()-downTime < 400 && started) pick(e.clientX, e.clientY);
    lDown=false;
  }
});
/* right button belongs to the orbit, so no browser context menu here */
addEventListener('contextmenu', e=>e.preventDefault());
addEventListener('wheel', e=>{
  distT = Math.max(2.2, Math.min(9, distT + e.deltaY*0.0022));
}, {passive:true});
addEventListener('keydown', e=>{
  if(!started) return;
  if (e.code==='Space'){ e.preventDefault(); next(); }
  else if (e.code==='KeyM') toggleMute();
});

const muteBtn = document.getElementById('mute');
function toggleMute(){
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted?0:0.3, AC.currentTime, 0.3);
  muteBtn.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
}
muteBtn.addEventListener('click', e=>{ e.stopPropagation(); toggleMute(); });

/* auto-start: the landing page was the intro, we arrive here from the hub */
document.getElementById('hud').classList.add('on');
started = true;
updateHud();
buildHotspots();
/* browsers only allow audio after a user gesture */
const armAudio = ()=>{ if(!AC) initAudio(); };
addEventListener('pointerdown', armAudio, {once:true});
addEventListener('keydown', armAudio, {once:true});

/* ---------------- render loop ---------------- */
gl.disable(gl.DEPTH_TEST);
let drawCount = N;
let frames=0, fpsClock=0, tuned=0;
let last = performance.now();

function frame(nowMs){
  requestAnimationFrame(frame);
  const now = (nowMs-t0)/1000;
  const dt = Math.min(0.05, (nowMs-last)/1000); last = nowMs;

  /* adaptive quality: two chances to shed load */
  if (started && tuned<2){
    frames++; fpsClock+=dt;
    if (fpsClock>2.5){
      const fps = frames/fpsClock;
      if (fps<34) drawCount = Math.floor(drawCount*0.55);
      else tuned=2;
      frames=0; fpsClock=0; tuned++;
    }
  }

  /* camera */
  if(!rDown){
    yaw += dragVX; pitch += dragVY;
    dragVX*=0.94; dragVY*=0.94;
    yaw += dt*0.11;
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
  }
  dist += (distT-dist)*Math.min(1,dt*4);
  force += (forceT-force)*Math.min(1,dt*6);
  forceT *= Math.pow(0.35, dt);

  const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  /* rot = rotX(pitch) * rotY(yaw), column-major mat3 */
  const rot = new Float32Array([
    cy,      sp*sy,   -cp*sy,
    0,       cp,       sp,
    sy,     -sp*cy,    cp*cy
  ]);
  lastRot = rot;
  updateCallout();
  updateHotspots();

  /* morph progress + palette lerp */
  morph = Math.min(1, (now-morphStart)/MORPH_DUR);
  const pt = ease(morph);
  colA = lerp3(SCENES[prevScene].colA, SCENES[scene].colA, pt);
  colB = lerp3(SCENES[prevScene].colB, SCENES[scene].colB, pt);
  nebA = lerp3(SCENES[prevScene].nebA, SCENES[scene].nebA, pt);
  nebB = lerp3(SCENES[prevScene].nebB, SCENES[scene].nebB, pt);

  /* ---- draw background ---- */
  gl.disable(gl.BLEND);
  gl.useProgram(bgProg);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufQuad);
  gl.enableVertexAttribArray(bgLocPos);
  gl.vertexAttribPointer(bgLocPos,2,gl.FLOAT,false,0,0);
  gl.uniform1f(BU.uTime, now);
  gl.uniform1f(BU.uAspect, aspect);
  gl.uniform1f(BU.uYaw, yaw);
  gl.uniform3fv(BU.uNebA, nebA);
  gl.uniform3fv(BU.uNebB, nebB);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.disableVertexAttribArray(bgLocPos);

  /* ---- draw particles ---- */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufFrom);
  gl.enableVertexAttribArray(locFrom);
  gl.vertexAttribPointer(locFrom,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufTo);
  gl.enableVertexAttribArray(locTo);
  gl.vertexAttribPointer(locTo,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufSeed);
  gl.enableVertexAttribArray(locSeed);
  gl.vertexAttribPointer(locSeed,4,gl.FLOAT,false,0,0);

  gl.uniformMatrix4fv(U.uProj,false,proj);
  gl.uniformMatrix3fv(U.uRot,false,rot);
  gl.uniform1f(U.uDist, dist);
  gl.uniform1f(U.uTime, now);
  gl.uniform1f(U.uMorph, morph);
  gl.uniform2f(U.uMouse, mouseX, mouseY);
  gl.uniform1f(U.uAspect, aspect);
  gl.uniform1f(U.uForce, force);
  gl.uniform3fv(U.uColA, colA);
  gl.uniform3fv(U.uColB, colB);
  gl.uniform1f(U.uPix, pixelScale);
  gl.drawArrays(gl.POINTS, 0, drawCount);
}
requestAnimationFrame(frame);
