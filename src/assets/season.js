// Sezon efektleri. Yalnızca site.js'te bir sezon açıkken main.js tarafından yüklenir.
// Hafif tutmak için: tek canvas, az parçacık, sekme gizliyken durur,
// "hareketi azalt" tercihinde canvas hiç çalışmaz (yalnızca durağan süsler kalır).

const root = document.documentElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const svgNS = 'http://www.w3.org/2000/svg';

export function start(season) {
  const cleanups = [];
  const add = (el) => { document.body.append(el); cleanups.push(() => el.remove()); return el; };

  if (season === 'yilbasi') add(lights());
  if (season === 'halloween') { add(cobweb()); add(spider()); }
  if (!reduceMotion) cleanups.push(particles(season === 'yilbasi' ? snow : bats));

  return { stop: () => cleanups.forEach((fn) => fn()) };
}

// ── Durağan süsler ──

function lights() {
  const wrap = document.createElement('div');
  wrap.className = 'fx-lights';
  wrap.setAttribute('aria-hidden', 'true');
  const colors = ['#e5484d', '#f5c542', '#30a46c', '#3e8ed0'];
  const draw = () => {
    const w = innerWidth, step = w < 640 ? 46 : 64, n = Math.ceil(w / step) + 1;
    let wire = 'M0 4', bulbs = '';
    for (let i = 0; i < n; i++) {
      const x = i * step, mid = x + step / 2;
      wire += ` Q${mid} 22 ${x + step} 4`;
      bulbs += `<g class="fx-bulb" style="--c:${colors[i % 4]};animation-delay:${(i % 5) * 0.45}s">`
        + `<rect x="${mid - 2.5}" y="12" width="5" height="5" rx="1" fill="#3a3f48"/>`
        + `<ellipse cx="${mid}" cy="23" rx="4.5" ry="7" fill="${colors[i % 4]}"/></g>`;
    }
    wrap.innerHTML = `<svg width="${w}" height="34" viewBox="0 0 ${w} 34"><path d="${wire}" fill="none" stroke="#3a3f48" stroke-width="1.5"/>${bulbs}</svg>`;
  };
  draw();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 150); });
  return wrap;
}

function cobweb() {
  const el = document.createElement('div');
  el.className = 'fx-web';
  el.setAttribute('aria-hidden', 'true');
  // Köşeden yayılan 5 iplik + aralarında kavisli halkalar
  const spokes = [0, 22, 45, 68, 90].map((a) => {
    const r = (a * Math.PI) / 180;
    return [Math.cos(r) * 150, Math.sin(r) * 150];
  });
  let d = spokes.map(([x, y]) => `M0 0L${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  for (const k of [0.25, 0.45, 0.65, 0.85]) {
    for (let i = 0; i < spokes.length - 1; i++) {
      const [x1, y1] = spokes[i], [x2, y2] = spokes[i + 1];
      d += `M${(x1 * k).toFixed(1)} ${(y1 * k).toFixed(1)}Q${((x1 + x2) * k * 0.42).toFixed(1)} ${((y1 + y2) * k * 0.42).toFixed(1)} ${(x2 * k).toFixed(1)} ${(y2 * k).toFixed(1)}`;
    }
  }
  el.innerHTML = `<svg width="150" height="150" viewBox="0 0 150 150"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1"/></svg>`;
  return el;
}

function spider() {
  const el = document.createElement('div');
  el.className = 'fx-spider';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="fx-thread"></span><svg width="26" height="22" viewBox="0 0 26 22" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linecap="round">
    <path fill="none" d="M9 9 3 4M9 11 1 10M9 13 3 18M17 9l6-5M17 11l8-1M17 13l6 5"/>
    <ellipse cx="13" cy="12" rx="5" ry="6"/><circle cx="13" cy="5" r="3"/></svg>`;
  return el;
}

// ── Canvas parçacıkları ──

function particles(kind) {
  const canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  let w, h, items, color, raf, last = 0;

  const readColor = () => { color = getComputedStyle(root).getPropertyValue('--fx').trim() || '#888'; };
  const resize = () => {
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  readColor();
  items = kind.create(w, h, w < 640 ? 0.5 : 1);

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = color;
    for (const p of items) kind.step(ctx, p, dt, now / 1000, w, h);
    raf = requestAnimationFrame(frame);
  };
  const play = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); };
  const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : play());
  const themeObserver = new MutationObserver(readColor);
  const scheme = matchMedia('(prefers-color-scheme: dark)');

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVisibility);
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  scheme.addEventListener('change', readColor);
  play();

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    themeObserver.disconnect();
    scheme.removeEventListener('change', readColor);
    canvas.remove();
  };
}

const rand = (a, b) => a + Math.random() * (b - a);

const snow = {
  create(w, h, density) {
    return Array.from({ length: Math.round(70 * density) }, () => ({
      x: rand(0, w), y: rand(-h, h), r: rand(1, 3.2), vy: rand(18, 45), sway: rand(10, 30), phase: rand(0, 6.28),
    }));
  },
  step(ctx, p, dt, t, w, h) {
    p.y += p.vy * dt;
    if (p.y > h + 5) { p.y = -5; p.x = rand(0, w); }
    const x = p.x + Math.sin(t * 0.8 + p.phase) * p.sway;
    ctx.globalAlpha = 0.35 + p.r / 5;
    ctx.beginPath();
    ctx.arc(x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  },
};

const bats = {
  create(w, h, density) {
    return Array.from({ length: Math.round(7 * density) || 3 }, () => this.spawn(w, h, rand(-w * 0.2, w)));
  },
  spawn(w, h, x = -40) {
    return { x, base: rand(h * 0.08, h * 0.6), vx: rand(40, 90), amp: rand(15, 45), freq: rand(0.6, 1.4), phase: rand(0, 6.28), s: rand(1.1, 2.2), flap: rand(7, 11) };
  },
  step(ctx, p, dt, t, w, h) {
    p.x += p.vx * dt;
    if (p.x > w + 40) Object.assign(p, this.spawn(w, h));
    const y = p.base + Math.sin(t * p.freq + p.phase) * p.amp;
    const f = Math.sin(t * p.flap + p.phase) * 3.5; // kanat çırpma
    ctx.globalAlpha = 0.75;
    ctx.save();
    ctx.translate(p.x, y);
    ctx.scale(p.s, p.s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 2, 3.2, 0, 0, Math.PI * 2);
    for (const dir of [-1, 1]) {
      ctx.moveTo(dir * 1.5, -1);
      ctx.quadraticCurveTo(dir * 6, -5 + f, dir * 12, -2 + f);
      ctx.quadraticCurveTo(dir * 9.5, 0.5 + f * 0.5, dir * 8.5, 3);
      ctx.quadraticCurveTo(dir * 5, 1, dir * 1.5, 2);
    }
    ctx.fill();
    ctx.restore();
  },
};
