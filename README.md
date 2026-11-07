# l4wire: siber güvenlik blogu

[Eleventy](https://www.11ty.dev/) ile üretilen, tamamen statik, sade bir blog. Framework JavaScript'i yok;
sayfalar düz HTML + tek bir CSS + küçük bir JS dosyası.

**Özellikler:** profil alanlı ana sayfa · kapak görselli yazı kartları (görsel yoksa otomatik desen) ·
arşiv (yıl/ay) · kategori ve etiket sayfaları · açık/koyu tema · Pagefind tam metin arama (`Ctrl+K` veya `/`) ·
yapışkan içindekiler · kopyalanabilir kod blokları · CTF zorluk damgası · Atom/RSS · sitemap · taslaklar · mobil uyumlu.

## Kullanım

```bash
npm install
npm run dev        # http://localhost:8080 (kaydettikçe yenilenir)
npm run build      # _site/ klasörüne statik site + arama indeksi
npm run preview    # build çıktısını yerelde test et
```

> `npm run dev` sırasında arama yalnızca başlık, açıklama ve etiketlerde çalışır.
> Tam metin arama `npm run build` sonrası aktif olur.

## Özelleştirme

| Ne? | Nerede? |
| --- | --- |
| Blog adı, adres, profil (isim, unvan, fotoğraf, hakkımda), linkler, kategori açıklamaları | `src/_data/site.js` |
| Profil fotoğrafı | dosyayı `src/assets/` içine koy, `site.js` > `author.avatar` |
| Sezon efekti (`standart`, `halloween`, `yilbasi`, `otomatik`) | `src/_data/site.js` > `mode` |
| Hakkında sayfası | `src/hakkinda.md` |
| Renkler, yazı tipleri, tüm stil | `src/assets/style.css` (en üstteki değişkenler) |
| Favicon | `src/favicon.svg` |

## Yazı yazmak

```bash
npm run new-post -- "Yazının Başlığı"
```

`src/posts/yazinin-basligi.md` oluşur (`draft: true` ile). Bitince `draft: false` yap.

```yaml
---
title: 'Yazının başlığı'
date: 2026-10-21
description: 'Kartta ve yazının başında görünen kısa özet.'
image: /assets/images/kapak.jpg   # İsteğe bağlı, ideal oran 1200×630
category: Web Güvenliği           # Tek kategori (yazılmazsa "Genel")
tags: [XSS, OWASP]
difficulty: Orta     # İsteğe bağlı: Kolay | Orta | Zor | Delirtici
draft: false
---
```

Yazılar şablon motorundan geçmez; `{{ 7*7 }}` gibi SSTI payload'ları olduğu gibi görünür.
Görselleri `src/assets/images/` içine koy. Kapak için frontmatter'a `image:` yaz; yazı içinde
`![açıklama](/assets/images/dosya.png)` kullan. Kapak görseli olmayan yazılara başlıktan otomatik bir desen üretilir.
Sosyal medya önizlemesi (`og:image`) için kapakları jpg/png/webp olarak kaydet; SVG'yi bu platformlar göstermez.

---

## Ücretsiz yayınlama

Adım adım kurulum, servis karşılaştırması ve ücret bilgileri için **[DEPLOY.md](DEPLOY.md)** dosyasına bak.
Kısaca: `npm run build` çalıştır ve oluşan `_site/` klasörünü Cloudflare Pages'e sürükle-bırak; ücret çıkmaz.
