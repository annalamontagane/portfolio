// Bitmap Flow Field background
// For background of visualizations home page 

// Inspo: 
// https://codingtrain.github.io/website-archive/learning/noise/
// https://www.youtube.com/watch?v=VtpF-m3KyEk 
// https://ca.pinterest.com/4ana72/uni-inspo/355portfolio/ 

const PX = 8;

const BANDS = [
  { lo: 0.00, hi: 0.42, r: 250, g: 255, b: 236, glyph: 'none'  },
  { lo: 0.42, hi: 0.55, r: 250, g: 255, b: 236, glyph: 'bit'   },
  { lo: 0.55, hi: 0.67, r: 243, g: 191, b: 236, glyph: 'none'  },
  { lo: 0.67, hi: 0.74, r: 175, g: 220, b: 251, glyph: 'cross' },
  { lo: 0.74, hi: 0.80, r: 175, g: 220, b: 251, glyph: 'bit'   },
  { lo: 0.80, hi: 0.91, r: 130, g:  43, b:  51, glyph: 'none'  },
  { lo: 0.91, hi: 1.00, r: 130, g:  43, b:  51, glyph: 'dot'   },
];

let COLS, ROWS;
let energy    = [];
let ripple    = [];
let velocity  = [];
let bitMap    = [];
let speckleMap = [];

const NOISE_SCALE = 0.055;
const NOISE_SPEED = 0.0004;
let zOff = 0;

let mx = -9999, my = -9999;
let pmx = -9999, pmy = -9999;

const HOVER_RADIUS   = 4;
const HOVER_STRENGTH = 0.7;
const RIPPLE_DECAY   = 0.9993;
const RIPPLE_SPREAD  = 0.28;

// Auto wander
// After IDLE_TIMEOUT ms with no mouse movement, a virtual cursor
// For functionality on mobile & tablet 
// Wanders autonomously using Perlin noise
// Real mouse takes over instantly on any movement
const IDLE_TIMEOUT = 3000;
let lastMouseMove  = 0;
let wanderX, wanderY;
let wanderT        = 0;

// Clear 
const CLEAR_PAD = 56;
const FADE_BAND = 80;

let clearZones = [];

function updateClearZones() {
  clearZones = [];
  document.querySelectorAll('.pixel-clear').forEach(el => {
    const r = el.getBoundingClientRect();
    clearZones.push({
      x: r.left   - CLEAR_PAD,
      y: r.top    - CLEAR_PAD,
      w: r.width  + CLEAR_PAD * 2,
      h: r.height + CLEAR_PAD * 2,
    });
  });
}

// Returns: 'remap' = inside zone (remap crimson→blue), 'draw' = normal
function clearOpacity(cx, cy) {
  for (const z of clearZones) {
    const dLeft   = cx - z.x;
    const dRight  = (z.x + z.w) - (cx + PX);
    const dTop    = cy - z.y;
    const dBottom = (z.y + z.h) - (cy + PX);

    if (dLeft < 0 || dRight < 0 || dTop < 0 || dBottom < 0) continue;

    const minDist  = Math.min(dLeft, dRight, dTop, dBottom);
    const jitter   = noise(cx * 0.015, cy * 0.015) * FADE_BAND * 0.5;
    const softDist = minDist - jitter;

    if (softDist <= 0) return 'draw';
    return 'remap';
  }
  return 'draw';
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('position', 'fixed');
  cnv.style('top', '0');
  cnv.style('left', '0');
  cnv.style('z-index', '0');
  cnv.style('pointer-events', 'none');

  document.body.insertBefore(cnv.elt, document.body.firstChild);

  document.addEventListener('mousemove', e => {
    pmx = mx; pmy = my;
    mx = e.clientX; my = e.clientY;
    lastMouseMove = Date.now();
  });

  noSmooth();
  colorMode(RGB, 255);
  buildGrid();
}

function buildGrid() {
  COLS       = ceil(width  / PX) + 1;
  ROWS       = ceil(height / PX) + 1;
  energy     = new Float32Array(COLS * ROWS);
  ripple     = new Float32Array(COLS * ROWS);
  velocity   = new Float32Array(COLS * ROWS);
  bitMap     = new Uint8Array(COLS * ROWS).map(() => floor(random(2)));
  speckleMap = Array.from({length: COLS * ROWS}, () => random());
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      energy[idx(c, r)] = noise(c * NOISE_SCALE, r * NOISE_SCALE);
}

function idx(c, r) { return c + r * COLS; }

function draw() {
  background('#faffec');
  updateClearZones();
  updateWander();
  updateNoise();
  applyMouseRipple();
  propagateRipple();
  renderGrid();
  drawCursor();
}

// Auto wander logic
function updateWander() {
  const idle = Date.now() - lastMouseMove > IDLE_TIMEOUT;
  if (!idle) return;

  // Initialise to centre on first activation
  if (wanderX === undefined) {
    wanderX = width  * 0.5;
    wanderY = height * 0.5;
  }

  wanderT += 0.004;
  const angle = noise(wanderT, 0) * TWO_PI * 2;
  const speed = 1.8;
  wanderX += cos(angle) * speed;
  wanderY += sin(angle) * speed;

  // Soft nudge away from edges
  const margin = 80;
  if (wanderX < margin)          wanderX += 2;
  if (wanderX > width  - margin) wanderX -= 2;
  if (wanderY < margin)          wanderY += 2;
  if (wanderY > height - margin) wanderY -= 2;

  pmx = mx; pmy = my;
  mx = wanderX; my = wanderY;
}

// Perlin drift
function updateNoise() {
  zOff += NOISE_SPEED;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = idx(c, r);
      energy[i] = lerp(energy[i], noise(c * NOISE_SCALE, r * NOISE_SCALE, zOff), 0.04);
    }
}

// Mouse ripple logic
function applyMouseRipple() {
  if (mx < 0) return;

  const steps = 5;
  for (let s = 0; s <= steps; s++) {
    const t  = s / steps;
    const ix = lerp(pmx < 0 ? mx : pmx, mx, t);
    const iy = lerp(pmy < 0 ? my : pmy, my, t);
    const gc = floor(ix / PX);
    const gr = floor(iy / PX);

    for (let dr = -HOVER_RADIUS; dr <= HOVER_RADIUS; dr++) {
      for (let dc = -HOVER_RADIUS; dc <= HOVER_RADIUS; dc++) {
        const c = gc + dc, r = gr + dr;
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue;
        const d = sqrt(dc * dc + dr * dr);
        if (d > HOVER_RADIUS) continue;
        const strength = HOVER_STRENGTH * exp(-d * d / (2 * (HOVER_RADIUS * 0.5) * (HOVER_RADIUS * 0.5)));
        ripple[idx(c, r)] += strength * 0.08;
      }
    }
  }
}

// Wave propagation logic
function propagateRipple() {
  const next = new Float32Array(ripple.length);
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      const i   = idx(c, r);
      const lap = (
        ripple[idx(c-1,r)] + ripple[idx(c+1,r)] +
        ripple[idx(c,r-1)] + ripple[idx(c,r+1)]
      ) * 0.25 - ripple[i];
      velocity[i] += lap * RIPPLE_SPREAD;

      const x    = c * PX, y = r * PX;
      const zone = clearOpacity(x, y);
      const decay = (zone === 'remap') ? 0.85 : RIPPLE_DECAY;

      next[i]      = (ripple[i] + velocity[i]) * decay;
      velocity[i] *= 0.88;
    }
  }
  ripple = next;
}

// Renderrrr :) 
function renderGrid() {
  noStroke();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = c * PX, y = r * PX;

      const zone = clearOpacity(x, y);
      const i    = idx(c, r);
      const e    = constrain(energy[i] + ripple[i], 0, 1);
      const band = bandFor(e);

      if (band.r === 250 && band.g === 255 && band.b === 236) continue;

      if (zone === 'remap') {
        const isCrimson = band.r === 130 && band.g === 43 && band.b === 51;
        fill(isCrimson ? 175 : band.r, isCrimson ? 220 : band.g, isCrimson ? 251 : band.b, 190);
      } else {
        fill(band.r, band.g, band.b);
      }

      rect(x, y, PX, PX);

      if (band.glyph !== 'none' && zone === 'draw') {
        drawGlyph(band.glyph, x, y, band, i);
      }
    }
  }
}

function bandFor(e) {
  for (const b of BANDS) if (e >= b.lo && e < b.hi) return b;
  return BANDS[BANDS.length - 1];
}

function drawGlyph(type, x, y, band, cellIdx) {
  const cx   = x + PX * 0.5;
  const cy   = y + PX * 0.5;
  const sw   = max(1, floor(PX * 0.14));
  const dark = (band.r + band.g + band.b) < 400;
  const [fr, fg, fb] = dark ? [250, 255, 236] : [130, 43, 51];

  if (type === 'dot') {
    noStroke(); fill(fr, fg, fb, 200);
    ellipse(cx, cy, PX * 0.44, PX * 0.44);
  } else if (type === 'cross') {
    noFill(); stroke(fr, fg, fb, 190); strokeWeight(sw);
    const arm = PX * 0.28;
    line(cx - arm, cy, cx + arm, cy);
    line(cx, cy - arm, cx, cy + arm);
  } else if (type === 'bit') {
    noStroke(); fill(fr, fg, fb, 210);
    textAlign(CENTER, CENTER);
    textSize(PX * 0.72);
    textStyle(BOLD);
    text(bitMap[cellIdx] ? '1' : '0', cx, cy + PX * 0.04);
  }

  noStroke(); textStyle(NORMAL);
}

// Cursor indicator logic
function drawCursor() {
  // Hide cursor indicator during auto-wander
  if (Date.now() - lastMouseMove > IDLE_TIMEOUT) return;
  if (mx < 0) return;
  if (clearOpacity(mx, my) !== 'draw') return;
  const sx = floor(mx / PX) * PX;
  const sy = floor(my / PX) * PX;
  noFill();
  stroke(130, 43, 51, 120);
  strokeWeight(1);
  rect(sx - HOVER_RADIUS * PX, sy - HOVER_RADIUS * PX,
       HOVER_RADIUS * PX * 2 + PX, HOVER_RADIUS * PX * 2 + PX);
  stroke(130, 43, 51, 200);
  strokeWeight(1.5);
  rect(sx, sy, PX, PX);
}

// Resize (yay accessibility)
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildGrid();
}