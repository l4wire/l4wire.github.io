const root = document.documentElement;
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// ── Tema ──
document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
  const dark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  store.set('theme', root.dataset.theme);
});

// ── Sezon efektleri (yalnızca bir sezon açıksa yüklenir) ──
const season = root.dataset.season;
const fxBtn = document.querySelector('[data-fx-toggle]');
if (season && fxBtn) {
  let fx = null;
  const run = async (on) => {
    fxBtn.setAttribute('aria-pressed', String(on));
    if (on && !fx) {
      const mod = await import('/assets/season.js');
      // Modül yüklenirken kapatıldıysa başlatma
      if (!fx && fxBtn.getAttribute('aria-pressed') === 'true') fx = mod.start(season);
    }
    if (!on && fx) { fx.stop(); fx = null; }
  };
  fxBtn.hidden = false;
  fxBtn.addEventListener('click', () => {
    const on = root.dataset.fx === 'off';
    if (on) delete root.dataset.fx; else root.dataset.fx = 'off';
    store.set('fx', on ? 'on' : 'off');
    run(on);
  });
  run(root.dataset.fx !== 'off');
}

// ── Mobil menü ──
const menuBtn = document.querySelector('.menu-toggle');
const menu = document.getElementById('menu');
const setMenu = (open) => {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
};
menuBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu(!menu.classList.contains('open'));
});
document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// ── Kod blokları: dil etiketi + kopyala ──
const ICON_COPY = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const ICON_DONE = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

document.querySelectorAll('.prose pre').forEach((pre) => {
  const box = document.createElement('div');
  box.className = 'code';
  pre.replaceWith(box);
  box.append(pre);

  if (pre.dataset.lang) {
    const lang = document.createElement('span');
    lang.className = 'code-lang';
    lang.textContent = pre.dataset.lang;
    box.append(lang);
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'code-copy';
  btn.setAttribute('aria-label', 'Kodu kopyala');
  btn.innerHTML = ICON_COPY;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ''));
      btn.innerHTML = ICON_DONE;
      btn.dataset.done = '';
      btn.setAttribute('aria-label', 'Kopyalandı');
      setTimeout(() => {
        btn.innerHTML = ICON_COPY;
        delete btn.dataset.done;
        btn.setAttribute('aria-label', 'Kodu kopyala');
      }, 1600);
    } catch {}
  });
  box.append(btn);
});

// ── İçindekiler: geniş ekranda açık, okunan başlığı işaretle ──
const toc = document.querySelector('.toc');
if (toc) {
  const wide = matchMedia('(min-width: 1081px)');
  const sync = () => { toc.open = wide.matches; };
  sync();
  wide.addEventListener('change', sync);

  const links = [...toc.querySelectorAll('a')];
  const targets = links.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  const mark = () => {
    let current = null;
    for (const t of targets) if (t.getBoundingClientRect().top < 140) current = t;
    links.forEach((a) => a.classList.toggle('active', current && a.hash === `#${current.id}`));
  };
  addEventListener('scroll', mark, { passive: true });
  mark();
}

// ── Arama ──
// Build sonrası Pagefind tam metin indeksini kullanır; yoksa (npm run dev)
// başlık, açıklama ve etiketlerden oluşan /search-index.json'a düşer.
const dialog = document.querySelector('dialog.search');
const input = dialog.querySelector('input');
const list = dialog.querySelector('.search-results');
const status = dialog.querySelector('.search-status');
const HINT = status.textContent;

let engine;
const getEngine = () =>
  (engine ??= (async () => {
    try {
      const pf = await import('/pagefind/pagefind.js');
      await pf.init?.();
      return async (q) => {
        const res = await pf.debouncedSearch(q, {}, 150);
        if (!res) return null;
        const data = await Promise.all(res.results.slice(0, 8).map((r) => r.data()));
        return data.map((d) => ({ url: d.url, title: d.meta?.title ?? d.url, excerpt: d.excerpt }));
      };
    } catch {
      const index = await fetch('/search-index.json').then((r) => r.json());
      return async (q) => {
        const terms = q.toLocaleLowerCase('tr').split(/\s+/).filter(Boolean);
        return index
          .filter((p) => terms.every((t) => p.text.includes(t)))
          .slice(0, 8)
          .map((p) => ({ url: p.url, title: p.title, excerpt: '' }));
      };
    }
  })());

let seq = 0;
input.addEventListener('input', async () => {
  const q = input.value.trim();
  const id = ++seq;
  if (!q) {
    list.innerHTML = '';
    status.textContent = HINT;
    status.hidden = false;
    return;
  }
  const hits = await (await getEngine())(q);
  if (hits === null || id !== seq) return;
  list.innerHTML = hits
    .map((h) => `<li><a href="${esc(h.url)}"><strong>${esc(h.title)}</strong>${h.excerpt ? `<p>${h.excerpt}</p>` : ''}</a></li>`)
    .join('');
  status.hidden = hits.length > 0;
  status.textContent = `“${q}” ile eşleşen yazı yok. Daha kısa ya da farklı bir kelime dene.`;
});

const openSearch = () => {
  if (dialog.open) return;
  dialog.showModal();
  input.select();
  getEngine();
};
document.querySelectorAll('[data-search-open]').forEach((b) => b.addEventListener('click', openSearch));
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
document.addEventListener('keydown', (e) => {
  const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
  else if (e.key === '/' && !typing) { e.preventDefault(); openSearch(); }
});
