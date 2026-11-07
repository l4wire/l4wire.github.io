// Blogun tüm kişisel ayarları burada.
export default {
  title: 'l4wire',
  // Deploy ettiğinde gerçek adresinle değiştir (ör. https://blogum.pages.dev)
  url: 'https://l4wire.github.io',
  lang: 'tr',
  description: 'Sızma testi, CTF çözümleri ve savunma üzerine Türkçe teknik notlar.',

  // Sezon efekti: 'standart' | 'halloween' | 'yilbasi' | 'otomatik'
  // otomatik: ziyaretçinin tarihine göre 20 Ekim–2 Kasım Halloween, 15 Aralık–7 Ocak yılbaşı, diğer günler standart.
  mode: 'yilbasi',

  // Ana sayfadaki profil alanı
  author: {
    name: 'l4wire',
    role: 'Cybersecurity Learner',
    // Kendi fotoğrafını src/assets/ içine koy ve yolunu yaz, ör. '/assets/avatar.jpg'
    avatar: '/assets/avatar.svg',
    bio: 'Sistemleri anlamak için önce nasıl bozulduklarını öğreniyorum. Burada çözdüğüm makineleri, lab notlarımı ve savunma tarafında işe yarayan şeyleri yazıyorum.',
  },

  // icon: github | linkedin | x | mail | rss | globe
  links: [
    { name: 'GitHub', icon: 'github', url: 'https://github.com/' },
    { name: 'LinkedIn', icon: 'linkedin', url: 'https://linkedin.com/' },
    { name: 'E-posta', icon: 'mail', url: 'mailto:ornek@example.com' },
    { name: 'RSS', icon: 'rss', url: '/feed.xml' },
  ],

  // Kategori açıklamaları (isteğe bağlı). Anahtar, yazılardaki `category` ile birebir aynı olmalı.
  categories: {
    'Web Güvenliği': 'XSS, SQLi, SSRF ve OWASP Top 10 üzerine notlar.',
    'Ağ Güvenliği': 'Keşif, tarama, trafik analizi ve ağ servisleri.',
    CTF: 'HackTheBox, TryHackMe ve yarışma çözümleri.',
    Savunma: 'Log analizi, tespit ve sistem sıkılaştırma.',
    Genel: 'Blog hakkında duyurular ve rehberler.',
  },

  // Ana sayfada gösterilecek yazı sayısı (geri kalanı arşivde)
  homePosts: 7,
};
