/* ============================================================
   MARVEL CINEMATIC PRESENTATION — script.js
   ============================================================ */

'use strict';

/* ── Slide data ─────────────────────────────────────────────
   Box-office data sourced from Box Office Mojo / filmdb.co.uk
   (all figures approximate worldwide theatrical gross, USD)
   ─────────────────────────────────────────────────────────── */
const BOX_OFFICE = [
  { title: 'Avengers: Endgame',          gross: 2.80, year: 2019, top: true  },
  { title: 'Spider-Man: Brand New Day',  gross: 2.52, year: 2026, top: false },
  { title: 'Avengers: Infinity War',     gross: 2.05, year: 2018, top: false },
  { title: 'Spider-Man: No Way Home',    gross: 2.02, year: 2021, top: false },
  { title: 'The Avengers',               gross: 1.52, year: 2012, top: false },
  { title: 'Avengers: Age of Ultron',    gross: 1.40, year: 2015, top: false },
  { title: 'Black Panther',              gross: 1.35, year: 2018, top: false },
  { title: 'Deadpool & Wolverine',       gross: 1.34, year: 2024, top: false },
  { title: 'Captain America: Civil War', gross: 1.16, year: 2016, top: false },
  { title: 'Iron Man 3',                 gross: 1.22, year: 2013, top: false },
];

/* ── State ──────────────────────────────────────────────────*/
let currentSlide = 0;
const TOTAL = 6;
let chartAnimated = false;
let snapAnimated  = false;

/* ── DOM refs ───────────────────────────────────────────────*/
const slides      = Array.from(document.querySelectorAll('.slide'));
const btnPrev     = document.getElementById('btn-prev');
const btnNext     = document.getElementById('btn-next');
const counter     = document.getElementById('slide-counter');
const progressBar = document.getElementById('progress-bar');

/* ============================================================
   BAR CHART — Build HTML
   ============================================================ */
function buildChart() {
  const container = document.getElementById('bar-chart');
  if (!container) return;

  const maxGross = BOX_OFFICE[0].gross; // 2.80 (Endgame)

  BOX_OFFICE.forEach(film => {
    const pct = (film.gross / maxGross) * 100;

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-title">${film.title} <span style="color:rgba(255,255,255,0.3);font-size:0.65em">(${film.year})</span></div>
      <div class="bar-track">
        <div class="bar-fill${film.top ? ' top' : ''}" data-pct="${pct.toFixed(1)}"></div>
      </div>
      <div class="bar-value">$${film.gross.toFixed(2)}B</div>
    `;
    container.appendChild(row);
  });
}

function animateChart() {
  if (chartAnimated) return;
  chartAnimated = true;

  document.querySelectorAll('.bar-fill').forEach((bar, i) => {
    setTimeout(() => {
      bar.style.width = bar.dataset.pct + '%';
    }, i * 90);
  });
}

/* ============================================================
   SNAP PARTICLE EFFECT — Slide 6
   Full pixel-based disintegration: text renders onto an
   offscreen canvas, pixels are sampled and animated as
   individual particles flying away from right → left,
   giving the authentic Thanos snap look.
   ============================================================ */

function runSnapEffect() {
  if (snapAnimated) return;
  snapAnimated = true;

  const canvas = document.getElementById('snap-canvas');
  const ctx    = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  /* ── 1. Draw "THANK YOU!" onto an offscreen canvas ───────*/
  const off    = document.createElement('canvas');
  off.width    = canvas.width;
  off.height   = canvas.height;
  const offCtx = off.getContext('2d');

  const cx = canvas.width  / 2;
  const cy = canvas.height / 2 - 40;        // slightly above centre

  const fontSize = Math.min(canvas.width * 0.16, 160);

  offCtx.textAlign    = 'center';
  offCtx.textBaseline = 'middle';

  /* "THANK" — white */
  offCtx.font      = `900 ${fontSize}px 'Bebas Neue', 'Arial Black', sans-serif`;
  offCtx.fillStyle = '#ffffff';
  offCtx.fillText('THANK', cx, cy - fontSize * 0.52);

  /* "YOU!" — red */
  offCtx.fillStyle = '#c0141c';
  offCtx.fillText('YOU!', cx, cy + fontSize * 0.52);

  /* ── 2. Sample every Nth pixel into particles ────────────*/
  const imgData = offCtx.getImageData(0, 0, off.width, off.height);
  const pixels  = imgData.data;
  const STEP    = 3;   // sample 1 in every 3 pixels — good density
  const particles = [];

  for (let py = 0; py < off.height; py += STEP) {
    for (let px = 0; px < off.width; px += STEP) {
      const idx   = (py * off.width + px) * 4;
      const alpha = pixels[idx + 3];
      if (alpha < 80) continue;              // skip near-transparent pixels

      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const color = `rgb(${r},${g},${b})`;

      /* Delay: pixels on the right side start disintegrating first */
      const normalX  = px / off.width;      // 0 (left) → 1 (right)
      const delay    = normalX * 90;         // right pixels: longer delay before hold, so they go first

      /* Velocity: rightmost particles explode hardest */
      const power = 0.4 + normalX * 2.2;
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = power * (0.6 + Math.random() * 1.4);

      particles.push({
        ox: px, oy: py,          // original position
        x:  px, y:  py,          // current position
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 1.5,
        color,
        size:    1 + Math.random() * 1.5,
        alpha:   1,
        delay,                   // frames before this particle starts moving
        fadeSpeed: 0.008 + Math.random() * 0.006,
        active:  false,
      });
    }
  }

  /* ── 3. Animate ──────────────────────────────────────────*/
  let frame = 0;

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let allDone = true;

    particles.forEach(p => {
      if (frame < p.delay) {
        /* Particle still "solid" — draw it at original position */
        ctx.globalAlpha = 1;
        ctx.fillStyle   = p.color;
        ctx.fillRect(p.ox, p.oy, p.size, p.size);
        allDone = false;
        return;
      }

      /* Start moving */
      p.active = true;
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.06;    // gentle gravity
      p.vx *= 0.98;
      p.alpha -= p.fadeSpeed;

      if (p.alpha <= 0) return;
      allDone = false;

      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    frame++;

    if (!allDone && frame < 400) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* Short delay so slide fade-in finishes first, then start canvas */
  setTimeout(tick, 500);
}

function resetSnap() {
  const title  = document.getElementById('snap-title');
  const canvas = document.getElementById('snap-canvas');

  title.style.opacity    = '1';
  title.style.clipPath   = '';
  title.style.filter     = '';
  title.style.transition = '';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  snapAnimated = false;
}

/* ============================================================
   SLIDE NAVIGATION
   ============================================================ */
function goToSlide(index) {
  if (index < 0 || index >= TOTAL) return;

  slides[currentSlide].classList.remove('active');

  currentSlide = index;
  slides[currentSlide].classList.add('active');

  updateUI();

  /* Slide-specific triggers */
  if (currentSlide === 4) animateChart();   // Slide 5 (index 4)
  if (currentSlide === 5) runSnapEffect();  // Slide 6 (index 5)
  if (currentSlide !== 5) resetSnap();
}

function updateUI() {
  counter.textContent = `${currentSlide + 1} / ${TOTAL}`;
  progressBar.style.width = `${((currentSlide + 1) / TOTAL) * 100}%`;

  btnPrev.disabled = currentSlide === 0;
  btnNext.disabled = currentSlide === TOTAL - 1;
  btnPrev.style.opacity = currentSlide === 0       ? '0.35' : '1';
  btnNext.style.opacity = currentSlide === TOTAL-1 ? '0.35' : '1';
}

/* ── Button events ──────────────────────────────────────────*/
btnPrev.addEventListener('click', () => goToSlide(currentSlide - 1));
btnNext.addEventListener('click', () => goToSlide(currentSlide + 1));

/* ── Keyboard events ────────────────────────────────────────*/
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goToSlide(currentSlide + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goToSlide(currentSlide - 1);
});

/* ── Touch / swipe ──────────────────────────────────────────*/
let touchStartX = 0;
document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });

document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) {
    dx < 0 ? goToSlide(currentSlide + 1) : goToSlide(currentSlide - 1);
  }
}, { passive: true });

/* ── Resize: update canvas ──────────────────────────────────*/
window.addEventListener('resize', () => {
  const canvas = document.getElementById('snap-canvas');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

/* ============================================================
   INIT
   ============================================================ */
buildChart();
updateUI();
