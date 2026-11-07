// Kullanım: npm run new-post -- "Yazının Başlığı"
import { existsSync, writeFileSync } from 'node:fs';
import { slug } from '../eleventy.config.js';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Başlık gerekli: npm run new-post -- "Yazının Başlığı"');
  process.exit(1);
}

const file = `src/posts/${slug(title)}.md`;
if (existsSync(file)) {
  console.error(`Bu isimde bir yazı zaten var: ${file}`);
  process.exit(1);
}

writeFileSync(
  file,
  `---
title: '${title.replace(/'/g, "''")}'
date: ${new Date().toISOString().slice(0, 10)}
description: ''
tags: []
draft: true
---

Yazına buradan başla.
`,
);
console.log(`Oluşturuldu: ${file}\nYayınlamak için draft: false yap.`);
