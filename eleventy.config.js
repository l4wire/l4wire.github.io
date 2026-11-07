import { feedPlugin } from '@11ty/eleventy-plugin-rss';
import markdownItAnchor from 'markdown-it-anchor';
import { createHighlighter } from 'shiki';
import site from './src/_data/site.js';

const TR = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' };
export const slug = (s) =>
  String(s)
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c])
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Görseli olmayan yazılar için başlıktan türetilen, her seferinde aynı çıkan kapak deseni.
// Renkler CSS değişkenlerinden gelir; açık/koyu temaya kendiliğinden uyar.
function coverSvg(seed = '') {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), h | 1);
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
  const W = 1200, H = 630, parts = [];
  const kind = Math.floor(rand() * 3);

  if (kind === 0) {
    // Bit haritası: sağa doğru yoğunlaşan bloklar
    const s = 42;
    for (let y = 0; y < H / s; y++)
      for (let x = 0; x < W / s; x++) {
        const r = rand(), d = x / (W / s);
        if (r < d * 0.55) {
          const fill = r < d * 0.06 ? 'var(--cv-accent)' : r < d * 0.25 ? 'var(--cv-2)' : 'var(--cv-1)';
          parts.push(`<rect x="${x * s + 3}" y="${y * s + 3}" width="${s - 6}" height="${s - 6}" rx="3" fill="${fill}"/>`);
        }
      }
  } else if (kind === 1) {
    // Radar: eş merkezli halkalar ve birkaç "host"
    const cx = 700 + rand() * 300, cy = 160 + rand() * 300;
    for (let r = 60; r < 1100; r += 70) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--cv-1)" stroke-width="2"/>`);
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2, r = 70 + rand() * 520;
      const hot = i < 2;
      parts.push(`<circle cx="${(cx + Math.cos(a) * r).toFixed(1)}" cy="${(cy + Math.sin(a) * r).toFixed(1)}" r="${hot ? 11 : 6}" fill="${hot ? 'var(--cv-accent)' : 'var(--cv-2)'}"/>`);
    }
  } else {
    // Log satırları: farklı uzunlukta yatay çubuklar
    for (let y = 70, i = 0; y < H - 40; y += 46, i++) {
      let x = 80 + (rand() < 0.3 ? 60 : 0);
      while (x < W - 120) {
        const w = 40 + rand() * 220;
        const r = rand();
        const fill = r < 0.05 ? 'var(--cv-accent)' : r < 0.35 ? 'var(--cv-2)' : 'var(--cv-1)';
        parts.push(`<rect x="${x.toFixed(0)}" y="${y}" width="${Math.min(w, W - 80 - x).toFixed(0)}" height="18" rx="9" fill="${fill}"/>`);
        x += w + 22;
        if (rand() < 0.18) break;
      }
    }
  }

  return `<svg class="cover-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${H}" fill="var(--cv-bg)"/>${parts.join('')}</svg>`;
}

const LANGS = [
  'bash', 'shell', 'powershell', 'python', 'javascript', 'typescript', 'json', 'yaml', 'html', 'css',
  'php', 'sql', 'c', 'cpp', 'go', 'rust', 'java', 'http', 'nginx', 'dockerfile', 'ini', 'xml', 'diff', 'markdown',
];

export default async function (eleventyConfig) {
  const isBuild = process.env.ELEVENTY_RUN_MODE === 'build';

  // ── Markdown: başlık bağlantıları + Shiki (açık/koyu çift tema) ──
  const shiki = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: LANGS });
  eleventyConfig.amendLibrary('md', (md) => {
    md.set({ typographer: false });
    md.use(markdownItAnchor, { slugify: slug, tabIndex: false });
    md.options.highlight = (code, lang) => {
      const l = shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
      const html = shiki.codeToHtml(code, { lang: l, themes: { light: 'github-light', dark: 'github-dark' } });
      return l === 'text' && !lang ? html : html.replace('<pre ', `<pre data-lang="${lang}" `);
    };
  });

  // ── Koleksiyonlar ──
  const published = (api) =>
    api.getFilteredByGlob('src/posts/*.md').filter((p) => !(isBuild && p.data.draft));

  // Eski → yeni (RSS eklentisi bu sırayı bekler). Listelerde `| reverse` kullan.
  eleventyConfig.addCollection('posts', published);

  // Yazıları bir alana göre gruplar: [{ name, slug, posts (yeni → eski) }]
  const groupBy = (api, namesOf) => {
    const map = new Map();
    for (const p of published(api)) {
      for (const name of namesOf(p)) {
        const s = slug(name);
        const g = map.get(s) ?? { name, slug: s, posts: [] };
        g.posts.push(p);
        map.set(s, g);
      }
    }
    return [...map.values()]
      .map((g) => ({ ...g, posts: g.posts.reverse() }))
      .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'tr'));
  };
  eleventyConfig.addCollection('tagList', (api) => groupBy(api, (p) => p.data.tags ?? []));
  eleventyConfig.addCollection('categoryList', (api) => groupBy(api, (p) => [p.data.category]));

  // ── Filtreler ──
  eleventyConfig.addFilter('slug', slug);
  eleventyConfig.addFilter('date', (d, style = 'long') => {
    const opts = { timeZone: 'UTC', day: 'numeric', month: style === 'short' ? 'short' : 'long' };
    if (style !== 'short') opts.year = 'numeric';
    return new Date(d).toLocaleDateString('tr-TR', opts);
  });
  eleventyConfig.addFilter('iso', (d) => new Date(d).toISOString());
  eleventyConfig.addFilter('month', (d) => new Date(d).toLocaleDateString('tr-TR', { timeZone: 'UTC', month: 'long' }));
  eleventyConfig.addFilter('day', (d) => new Date(d).getUTCDate());
  eleventyConfig.addFilter('groupByMonth', (posts) => {
    const groups = [];
    for (const p of posts) {
      const key = new Date(p.date).getUTCMonth();
      if (groups.at(-1)?.key !== key) groups.push({ key, date: p.date, posts: [] });
      groups.at(-1).posts.push(p);
    }
    return groups;
  });
  eleventyConfig.addFilter('cover', coverSvg);
  eleventyConfig.addFilter('year', (d) => (d === 'now' ? new Date() : new Date(d)).getUTCFullYear());
  eleventyConfig.addFilter('readingTime', (html = '') => {
    const words = html.replace(/<pre[\s\S]*?<\/pre>/g, ' ').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  });
  eleventyConfig.addFilter('groupByYear', (posts) => {
    const groups = [];
    for (const p of posts) {
      const y = new Date(p.date).getUTCFullYear();
      if (groups.at(-1)?.year !== y) groups.push({ year: y, posts: [] });
      groups.at(-1).posts.push(p);
    }
    return groups;
  });
  // Render edilmiş HTML'den h2/h3 başlıklarını çıkarır (içindekiler için)
  eleventyConfig.addFilter('toc', (html = '') =>
    [...html.matchAll(/<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g)].map(([, depth, id, text]) => ({
      depth: Number(depth),
      id,
      text: text.replace(/<[^>]+>/g, '').trim(),
    })),
  );
  eleventyConfig.addFilter('neighbors', (posts, url) => {
    const i = posts.findIndex((p) => p.url === url);
    return { older: posts[i - 1], newer: posts[i + 1] };
  });
  eleventyConfig.addFilter('searchIndex', (posts) =>
    JSON.stringify(
      posts.map((p) => ({
        url: p.url,
        title: p.data.title,
        text: [p.data.title, p.data.description, ...(p.data.tags ?? [])].join(' ').toLocaleLowerCase('tr'),
      })),
    ),
  );

  // ── RSS (Atom) ──
  eleventyConfig.addPlugin(feedPlugin, {
    type: 'atom',
    outputPath: '/feed.xml',
    collection: { name: 'posts', limit: 20 },
    metadata: {
      language: site.lang,
      title: site.title,
      subtitle: site.description,
      base: site.url,
      author: { name: site.author },
    },
  });

  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/favicon.svg': 'favicon.svg' });
  eleventyConfig.addWatchTarget('src/assets');

  return {
    dir: { input: 'src', output: '_site', includes: '_includes', data: '_data' },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
