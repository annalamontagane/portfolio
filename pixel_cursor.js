// ================================================================
//  pixel_cursor.js — Animated pixel art cursor
//  Flowing trail with Perlin noise, pulsing head, hover state.
//  Same visual language as vis_background.js
// ================================================================

(function () {
  const PX    = 8;
  const TRAIL = 28;
  const SPEED = 0.12;

  const C = {
    cream:   [250, 255, 236],
    pink:    [243, 191, 236],
    blue:    [175, 220, 251],
    crimson: [130,  43,  51],
  };

  // ── TINY PERLIN NOISE ─────────────────────────────────────────
  const P = new Uint8Array(512);
  const _p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) _p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_p[i], _p[j]] = [_p[j], _p[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = _p[i & 255];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lp(a, b, t) { return a + t * (b - a); }
  function grad(h, x, y) {
    const v = h & 3, u = v < 2 ? x : y, w = v < 2 ? y : x;
    return ((v & 1) ? -u : u) + ((v & 2) ? -w : w);
  }
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = P[X] + Y, b = P[X + 1] + Y;
    return lp(lp(grad(P[a], x, y), grad(P[b], x-1, y), u),
              lp(grad(P[a+1], x, y-1), grad(P[b+1], x-1, y-1), u), v);
  }

  // ── STATE ─────────────────────────────────────────────────────
  let canvas, ctx;
  let mx = -999, my = -999;
  let cx = -999, cy = -999;
  let t = 0;
  let isHovering = false;
  let hoverT = 0;
  const trail = [];

  // Public API — lets index.html toggle the cursor on/off
  let enabled = true;
  window.pixelCursor = {
    enable()  { enabled = true;  applyStyle(); },
    disable() { enabled = false; applyStyle(); ctx?.clearRect(0, 0, canvas?.width, canvas?.height); },
  };

  function applyStyle() {
    if (!styleEl) return;
    styleEl.textContent = enabled
      ? '*, *::before, *::after { cursor: none !important; }'
      : '';
  }

  // ── SETUP ─────────────────────────────────────────────────────
  let styleEl;
  function init() {
    styleEl = document.createElement('style');
    styleEl.textContent = '*, *::before, *::after { cursor: none !important; }';
    document.head.appendChild(styleEl);

    canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;image-rendering:pixelated;';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx = canvas.getContext('2d');
    document.body.appendChild(canvas);

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
      const el = document.elementFromPoint(mx, my);
      isHovering = el ? isInteractive(el) : false;
    });
    document.addEventListener('mouseleave', () => { mx = -999; });
    window.addEventListener('resize', () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    cx = window.innerWidth / 2;
    cy = window.innerHeight / 2;
    for (let i = 0; i < TRAIL; i++) trail.push({ x: cx, y: cy });

    requestAnimationFrame(loop);
  }

  function isInteractive(el) {
    while (el && el !== document.body) {
      const tag = el.tagName?.toLowerCase();
      if (['a','button','input','select','textarea','label'].includes(tag)) return true;
      if (el.getAttribute?.('role') === 'button') return true;
      try {
        if (window.getComputedStyle(el).cursor === 'pointer') return true;
      } catch(e) {}
      el = el.parentElement;
    }
    return false;
  }

  // ── HELPERS ───────────────────────────────────────────────────
  function snap(v) { return Math.floor(v / PX) * PX; }

  function cell(x, y, rgb, alpha) {
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    ctx.fillRect(snap(x), snap(y), PX, PX);
    ctx.globalAlpha = 1;
  }

  function trailColor(frac) {
    if (frac < 0.25) return C.cream;
    if (frac < 0.50) return C.pink;
    if (frac < 0.75) return C.blue;
    return C.crimson;
  }

  // ── DRAW TRAIL ────────────────────────────────────────────────
  function drawTrail() {
    for (let i = 0; i < trail.length; i++) {
      const frac  = i / (trail.length - 1);
      const alpha = frac * frac * 0.75;
      const angle = noise2(i * 0.18 + t * 1.2, t * 0.7) * Math.PI * 2;
      const amp   = (1 - frac) * PX * 1.4;
      const nx    = trail[i].x + Math.cos(angle) * amp;
      const ny    = trail[i].y + Math.sin(angle) * amp;
      const rgb   = isHovering ? (frac > 0.6 ? C.crimson : C.blue) : trailColor(frac);

      cell(nx, ny, rgb, alpha);

      if (frac > 0.3 && noise2(i * 0.4 + t, i * 0.3) > 0.3) {
        const a2 = noise2(i * 0.25 + t * 0.5, t * 1.1) * Math.PI * 2;
        cell(trail[i].x + Math.cos(a2) * PX * 2, trail[i].y + Math.sin(a2) * PX * 2, rgb, alpha * 0.4);
      }
    }
  }

  // ── DRAW CURSOR HEAD ─────────────────────────────────────────
  function drawHead() {
    const sx = snap(cx);
    const sy = snap(cy);

    if (isHovering) {
      hoverT = Math.min(1, hoverT + 0.1);
      const arm = Math.round(lp(2, 5, hoverT));

      for (let i = -arm; i <= arm; i++) {
        cell(sx + i * PX, sy, i === 0 ? C.cream : C.blue, 0.9 - Math.abs(i) * 0.12);
        if (i !== 0) cell(sx, sy + i * PX, C.pink, 0.9 - Math.abs(i) * 0.12);
      }

      const corners = [[1,1],[1,-1],[-1,1],[-1,-1]];
      corners.forEach(([dx, dy], ci) => {
        const sparkAlpha = 0.4 + noise2(t * 2 + ci, t * 1.3) * 0.5;
        const d = Math.round(lp(1, arm - 1, hoverT));
        cell(sx + dx * d * PX, sy + dy * d * PX, C.blue, sparkAlpha * 0.8);
      });

      cell(sx, sy, C.cream, 1.0);

    } else {
      hoverT = Math.max(0, hoverT - 0.08);
      const pulse = 1.5 + noise2(t * 1.8, 0) * 1.0;

      for (let dr = -3; dr <= 3; dr++) {
        for (let dc = -3; dc <= 3; dc++) {
          const dist = Math.sqrt(dc * dc + dr * dr);
          if (dist > pulse + 0.5) continue;
          const px = sx + dc * PX, py = sy + dr * PX;

          if (dist < 0.6) {
            cell(px, py, C.cream, 1.0);
          } else if (dist < pulse - 0.3) {
            const n = noise2(dc * 0.8 + t * 2, dr * 0.8 + t * 1.5);
            cell(px, py, n > 0.2 ? C.crimson : C.pink, 0.85 - dist * 0.1);
          } else {
            cell(px, py, C.blue, 0.5 - (dist - pulse) * 0.8);
          }
        }
      }
    }
  }

  // ── MAIN LOOP ─────────────────────────────────────────────────
  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    t += 0.018;

    if (enabled && mx > 0) {
      cx += (mx - cx) * SPEED;
      cy += (my - cy) * SPEED;
      trail.push({ x: cx, y: cy });
      if (trail.length > TRAIL) trail.shift();
      drawTrail();
      drawHead();
    }

    requestAnimationFrame(loop);
  }

  // ── BOOT ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();