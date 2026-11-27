// Animated circuit-board background: PCB traces, chips and pads, with
// glowing "current" pulses travelling along the traces.
(() => {
  const canvas = document.getElementById("circuit");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const G = 26; // grid cell size in px
  // 8 directions: E, SE, S, SW, W, NW, N, NE
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const rand = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rand(a, b + 1));

  let W, H, DPR, BH, buf, traces, pads, chips, pulses, offset = 0, lastT = 0;
  let lastW = 0, lastH = 0;

  function build() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    lastW = W; lastH = H;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    BH = Math.round(H * 1.6); // taller buffer enables scroll parallax
    buf = document.createElement("canvas");
    buf.width = W * DPR;
    buf.height = BH * DPR;
    const b = buf.getContext("2d");
    b.scale(DPR, DPR);

    const cols = Math.floor(W / G);
    const rows = Math.floor(BH / G);
    const occ = new Set();
    const key = (x, y) => x + "," + y;
    const inb = (x, y) => x > 1 && y > 1 && x < cols - 1 && y < rows - 1;
    const px = (c) => c * G + G / 2;

    traces = []; pads = []; chips = []; pulses = [];

    // Chips
    const nChips = Math.max(4, Math.round((cols * rows) / 520));
    for (let n = 0; n < nChips * 3 && chips.length < nChips; n++) {
      const w = ri(4, 7), h = ri(3, 5);
      const x = ri(5, Math.max(6, cols - w - 5));
      const y = ri(4, Math.max(5, rows - h - 4));
      let ok = true;
      for (let i = x - 3; i <= x + w + 3 && ok; i++)
        for (let j = y - 3; j <= y + h + 3; j++)
          if (occ.has(key(i, j))) { ok = false; break; }
      if (!ok) continue;
      for (let i = x; i <= x + w; i++)
        for (let j = y; j <= y + h; j++) occ.add(key(i, j));
      chips.push({ x, y, w, h });
    }

    // Grow a trace from a cell, turning in 45/90 degree steps
    function grow(sx, sy, dir, prefix) {
      const cells = [[sx, sy]];
      let x = sx, y = sy, d = dir;
      occ.add(key(x, y));
      const segs = ri(3, 7);
      for (let s = 0; s < segs; s++) {
        const len = ri(2, 9);
        let moved = 0;
        for (let i = 0; i < len; i++) {
          const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
          if (!inb(nx, ny) || occ.has(key(nx, ny))) break;
          if (DIRS[d][0] && DIRS[d][1] && occ.has(key(nx, y)) && occ.has(key(x, ny))) break;
          x = nx; y = ny;
          occ.add(key(x, y));
          moved++;
        }
        if (!moved) break;
        cells.push([x, y]);
        const turn = Math.random() < 0.8 ? 1 : 2;
        d = (d + (Math.random() < 0.5 ? turn : -turn) + 8) % 8;
      }
      if (cells.length < 3) return null;
      const pts = (prefix ? [prefix] : []).concat(cells).map(([cx, cy]) => [px(cx), px(cy)]);
      return pts;
    }

    function addTrace(pts, hasPad) {
      if (!pts) return;
      const cum = [0];
      for (let i = 1; i < pts.length; i++)
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const end = pts[pts.length - 1];
      let padIdx = -1;
      if (hasPad !== false) {
        pads.push({ x: end[0], y: end[1], flash: 0 });
        padIdx = pads.length - 1;
      }
      traces.push({ pts, cum, len: cum[cum.length - 1], padIdx });
    }

    // Traces fanning out of chip pins
    chips.forEach((c) => {
      for (let k = 1; k < c.h; k++) {
        if (Math.random() < 0.85 && !occ.has(key(c.x - 1, c.y + k))) addTrace(grow(c.x - 1, c.y + k, 4, [c.x, c.y + k]));
        if (Math.random() < 0.85 && !occ.has(key(c.x + c.w + 1, c.y + k))) addTrace(grow(c.x + c.w + 1, c.y + k, 0, [c.x + c.w, c.y + k]));
      }
      for (let k = 1; k < c.w; k += 1) {
        if (Math.random() < 0.6 && !occ.has(key(c.x + k, c.y - 1))) addTrace(grow(c.x + k, c.y - 1, 6, [c.x + k, c.y]));
        if (Math.random() < 0.6 && !occ.has(key(c.x + k, c.y + c.h + 1))) addTrace(grow(c.x + k, c.y + c.h + 1, 2, [c.x + k, c.y + c.h]));
      }
    });

    // Free-standing traces between pads
    const attempts = Math.round((cols * rows) / 38);
    for (let n = 0; n < attempts; n++) {
      const x = ri(2, cols - 3), y = ri(2, rows - 3);
      if (occ.has(key(x, y))) continue;
      addTrace(grow(x, y, ri(0, 3) * 2, null));
    }

    // ---- Draw static layer ----
    b.clearRect(0, 0, W, BH);
    b.lineJoin = "round";
    b.lineCap = "round";

    // chips
    chips.forEach((c) => {
      const x = px(c.x), y = px(c.y), w = c.w * G, h = c.h * G;
      b.fillStyle = "rgba(12,12,12,0.85)";
      b.strokeStyle = "rgba(255,255,255,0.2)";
      b.lineWidth = 1.2;
      b.beginPath();
      b.roundRect(x, y, w, h, 6);
      b.fill();
      b.stroke();
      b.strokeStyle = "rgba(255,255,255,0.08)";
      b.beginPath();
      b.roundRect(x + 8, y + 8, w - 16, h - 16, 4);
      b.stroke();
      b.fillStyle = "rgba(255,90,31,0.5)";
      b.beginPath();
      b.arc(x + 14, y + 14, 2.2, 0, Math.PI * 2);
      b.fill();
    });

    // traces
    b.strokeStyle = "rgba(255,255,255,0.1)";
    b.lineWidth = 1.4;
    traces.forEach((t) => {
      b.beginPath();
      b.moveTo(t.pts[0][0], t.pts[0][1]);
      for (let i = 1; i < t.pts.length; i++) b.lineTo(t.pts[i][0], t.pts[i][1]);
      b.stroke();
    });

    // vias at some bends
    b.strokeStyle = "rgba(255,255,255,0.16)";
    b.lineWidth = 1;
    traces.forEach((t) => {
      for (let i = 1; i < t.pts.length - 1; i++) {
        if (Math.random() < 0.25) {
          b.beginPath();
          b.arc(t.pts[i][0], t.pts[i][1], 2.4, 0, Math.PI * 2);
          b.stroke();
        }
      }
    });

    // pads
    pads.forEach((p) => {
      b.fillStyle = "rgba(12,12,12,0.9)";
      b.strokeStyle = "rgba(255,255,255,0.26)";
      b.lineWidth = 1.2;
      b.beginPath();
      b.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      b.fill();
      b.stroke();
    });

    // initial pulses spread along their traces
    const target = pulseTarget();
    for (let i = 0; i < target; i++) spawn(null, true);

    canvas.style.opacity = "0.32"; // overall visibility of the background
  }

  const pulseTarget = () => Math.max(12, Math.min(90, Math.round(traces.length * 0.22)));

  function spawn(tr, spread, startD, speed) {
    if (!traces.length) return;
    const t = tr || traces[ri(0, traces.length - 1)];
    pulses.push({
      tr: t,
      d: startD != null ? startD : spread ? rand(-t.len * 0.2, t.len) : -rand(0, 40),
      v: speed || rand(70, 150),
      tail: rand(70, 150),
      hit: false,
    });
  }

  function pointAt(t, d) {
    d = Math.max(0, Math.min(t.len, d));
    let i = 1;
    while (i < t.cum.length - 1 && t.cum[i] < d) i++;
    const a = t.pts[i - 1], c = t.pts[i];
    const seg = t.cum[i] - t.cum[i - 1] || 1;
    const k = (d - t.cum[i - 1]) / seg;
    return [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k];
  }

  function drawFrame(dt) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const max = document.documentElement.scrollHeight - H;
    const p = max > 0 ? scrollY / max : 0;
    const target = -p * (BH - H);
    offset += (target - offset) * (reduced ? 1 : 0.1);

    ctx.drawImage(buf, 0, offset, W, BH);
    if (reduced) return;

    ctx.save();
    ctx.translate(0, offset);
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // update + draw pulses
    for (let i = pulses.length - 1; i >= 0; i--) {
      const q = pulses[i];
      q.d += q.v * dt;
      const t = q.tr;
      if (!q.hit && q.d >= t.len) {
        q.hit = true;
        if (t.padIdx >= 0) pads[t.padIdx].flash = 1;
      }
      if (q.d - q.tail > t.len) { pulses.splice(i, 1); continue; }
      if (q.d < 0) continue;

      const head = Math.min(q.d, t.len);
      const tailD = Math.max(0, q.d - q.tail);
      const n = Math.max(2, Math.ceil((head - tailD) / 5));
      ctx.lineWidth = 2;
      let prev = pointAt(t, tailD);
      for (let k = 1; k <= n; k++) {
        const pt = pointAt(t, tailD + ((head - tailD) * k) / n);
        const a = (k / n) * (k / n);
        ctx.strokeStyle = `rgba(255,${90 + (a * 90) | 0},${31 + (a * 70) | 0},${(a * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(prev[0], prev[1]);
        ctx.lineTo(pt[0], pt[1]);
        ctx.stroke();
        prev = pt;
      }
      if (q.d <= t.len) {
        const [hx, hy] = pointAt(t, q.d);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14);
        g.addColorStop(0, "rgba(255,150,70,0.85)");
        g.addColorStop(1, "rgba(255,90,31,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx, hy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // pad flashes
    pads.forEach((pd) => {
      if (pd.flash <= 0) return;
      pd.flash = Math.max(0, pd.flash - dt * 1.3);
      const r = 5 + (1 - pd.flash) * 14;
      ctx.strokeStyle = `rgba(255,120,50,${(pd.flash * 0.8).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pd.x, pd.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,150,70,${(pd.flash * 0.7).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(pd.x, pd.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // keep the circuit alive
    if (pulses.length < pulseTarget() && Math.random() < 0.25) spawn();
  }

  function loop(now) {
    const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05);
    lastT = now;
    drawFrame(dt);
    requestAnimationFrame(loop);
  }

  // Energize traces near the cursor / on click
  function energizeNear(mx, my, radius, limit) {
    const by = my - offset;
    const found = [];
    traces.forEach((t) => {
      for (let i = 0; i < t.pts.length - 1; i++) {
        const dx = t.pts[i][0] - mx, dy = t.pts[i][1] - by;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) { found.push({ t, d: t.cum[i], dist }); break; }
      }
    });
    found.sort((a, b) => a.dist - b.dist);
    found.slice(0, limit).forEach((f) => {
      if (pulses.length < 140) spawn(f.t, false, f.d, rand(220, 320));
    });
  }

  let lastMove = 0;
  if (!reduced && matchMedia("(hover: hover)").matches) {
    addEventListener("mousemove", (e) => {
      const now = performance.now();
      if (now - lastMove < 300) return;
      lastMove = now;
      energizeNear(e.clientX, e.clientY, 110, 1);
    }, { passive: true });
  }
  addEventListener("click", (e) => {
    if (!reduced) energizeNear(e.clientX, e.clientY, 220, 7);
  });

  // Rebuild on meaningful resize
  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (innerWidth !== lastW || Math.abs(innerHeight - lastH) > 200) {
        build();
        if (reduced) drawFrame(0);
      }
    }, 250);
  });

  build();
  if (reduced) {
    drawFrame(0);
    addEventListener("scroll", () => drawFrame(0), { passive: true });
  } else {
    requestAnimationFrame(loop);
  }
})();
