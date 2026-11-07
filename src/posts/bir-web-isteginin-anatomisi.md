---
layout: post.njk
title: 'Bir Web İsteğinin Anatomisi: Kapsülleme ve Paket Yolculuğu'
date: 2026-11-07
description: 'Wireshark yakalaması üzerinden bir HTTP isteğinin L2-L7 katmanlarında nasıl kapsüllendiğinin kanıtlı analizi.'
image: /assets/images/web-istegi-anatomisi.svg
category: Ağ Güvenliği
tags: [Wireshark, TCP/IP, RFC791, RFC1122, HTTP]
difficulty: Kolay
draft: false
---

Bu yazıda, ağ protokollerinin katmanlı yapısını soyut teorilerden çıkarıp gerçek bir trafik yakalaması üzerinde inceleyeceğiz. Wireshark aracıyla, Wireshark Sample Captures arşivinde yer alan [http.cap](https://wiki.wireshark.org/SampleCaptures#hypertext-transport-protocol-http) dosyasını ele alarak bir HTTP GET isteğinin L2'den L7'ye kadar nasıl kapsüllendiğini (encapsulation) adım adım analiz edeceğiz.

Dosyayı açtığımızda bizi 43 paketlik bir akış karşılıyor. Bu analizde, istemcinin web sunucusuna ilettiği ilk uygulama talebi olan **4 numaralı paketi** inceleyeceğiz:

> `4 | 0.911310 | 145.254.160.237 | 65.208.228.223 | HTTP | 533 | GET /download.html HTTP/1.1`

---

## Bölüm 1: Ethernet II ve Çerçeveleme (Katman 2)

Paket detay panelinde inceleyeceğimiz ilk katman, verinin yerel fiziksel hat üzerindeki taşınmasını sağlayan **Ethernet II** çerçevesidir. Bu katmanda cihazların donanımsal adresleri olan kaynak (Source) ve hedef (Destination) MAC adreslerini görürüz:

| Alan | Değer | Açıklama |
| :--- | :--- | :--- |
| **Source MAC** | `00:00:01:00:00:00` | İstek yapan istemci makinenin yerel ağ kartı |
| **Destination MAC** | `fe:ff:20:00:01:00` | İstemcinin varsayılan ağ geçidi (Default Gateway / Router) |
| **Type (EtherType)** | `0x0800` | Bir üst katmanda taşınan protokolün **IPv4** olduğunu belirtir |

Buradaki kritik nokta şudur: Hedef MAC adresi web sunucusunun değil, paketi yerel ağdan dış dünyaya çıkartacak olan yerel yönlendiricinin (router) arayüz adresidir.

---

## Bölüm 2: Internet Protocol Version 4 (Katman 3)

Bu katman ağlar arası mantıksal adresleme ve yönlendirme (routing) işlevini üstlenir:

| Alan | Değer |
| :--- | :--- |
| **Source IP** | `145.254.160.237` |
| **Destination IP** | `65.208.228.223` |

> **RFC 1122 Bölüm 1.1.3'e göre:**  
> *"IP, uçtan uca teslimat garantisi sunmayan, bağlantısız veya datagram tabanlı bir ağlar arası (internetwork) hizmettir. Bu nedenle, IP datagramları hedef ana makineye hasarlı, mükerrer (kopya), sıra dışı veya hiç ulaşmayabilir."*

İncelediğimiz pakette sadece IP adresleri değil, başlıkta yer alan kontrol alanları da önemli kanıtlar sunar:

* **Total Length:** `464` bayt (IP başlığı + TCP başlığı + HTTP verisi).
* **Flags:** `0x02` (Don't Fragment — DF biti set edilmiş). Yani paket yol üstünde MTU aşımı olsa bile parçalanmadan iletilmelidir.
* **Time To Live (TTL):** `47`. Bir paket geçtiği her yönlendiricide (hop) TTL değerini 1 azaltır. Başlangıç TTL değeri işletim sistemine göre genellikle 64, 128 veya 255'tir. Bu paketin 47 olması, istemci ile analiz noktası arasında yaklaşık 17 yönlendiriciden geçildiğini gösterir.
* **Protocol:** `6` (TCP). Bir üst katmandaki taşıma protokolünün TCP olduğunu doğrular.

---

## Bölüm 3: Transmission Control Protocol (Katman 4)

L3 güvenilirlik sunmadığı için, uçtan uca güvenilir, sıralı ve akış kontrollü iletim görevini **TCP** üstlenir:

| Alan | Değer | Anlamı |
| :--- | :--- | :--- |
| **Source Port** | `3372` | İstemci işletim sisteminin rastgele atadığı dinamik/ephemeral port |
| **Destination Port** | `80` | Hedef sunucuda HTTP servisini dinleyen standart servis portu |

TCP, veriyi segmentler halinde taşır. Başlıktaki Sequence ve Acknowledgment numaraları sayesinde paketlerin sırası kaybolmaz ve hedefe eksiksiz ulaştığı doğrulanır. Bu paket tek bir segment içinde 424 baytlık HTTP yükünü taşımaktadır.

---

## Bölüm 4: Hypertext Transfer Protocol (Katman 7)

Kullanıcının asıl iletmek istediği uygulama verisidir. Wireshark'ta pakete sağ tıklayıp **Follow → TCP Stream** dediğimizde, istemci ile sunucu arasındaki metin tabanlı diyaloğu net şekilde görürüz:

```http
GET /download.html HTTP/1.1
Host: www.ethereal.com
User-Agent: Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.6) Gecko/20040113
Accept: text/xml,application/xml,application/xhtml+xml,text/html;q=0.9,text/plain;q=0.8,image/png,image/jpeg,image/gif;q=0.2,*/*;q=0.1
Accept-Language: en-us,en;q=0.5
Accept-Encoding: gzip,deflate
Accept-Charset: ISO-8859-1,utf-8;q=0.7,*;q=0.7
Keep-Alive: 300
Connection: keep-alive
Referer: http://www.ethereal.com/development.html
```

Ve ardından sunucunun döndüğü HTTP 200 OK yanıtı:

```http
HTTP/1.1 200 OK
Date: Thu, 13 May 2004 10:17:12 GMT
Server: Apache
Last-Modified: Tue, 20 Apr 2004 13:17:00 GMT
ETag: "9a01a-4696-7e354b00"
Accept-Ranges: bytes
Content-Length: 18070
Content-Type: text/html; charset=ISO-8859-1
```

İstemci `/download.html` kaynağını talep etmiş, sunucu ise Apache üzerinde barındırdığı 18.070 baytlık HTML içeriğiyle başarılı (200 OK) bir yanıt dönmüştür.

---

## Bölüm 5: Kapsülleme (Encapsulation) Mantığı

İletişim en üstten en alta doğru şu sırada gerçekleşir:

1. **Uygulama (L7):** `GET /download.html HTTP/1.1` verisi oluşturulur.
2. **Taşıma (L4):** Veriye TCP başlığı (Port 3372 → 80, Seq/Ack) eklenir → **TCP Segmenti**.
3. **Ağ (L3):** Segmentin önüne IP başlığı (Kaynak/Hedef IP, TTL, Protokol 6) eklenir → **IP Paketi**.
4. **Veri Bağı (L2):** Paketin önüne Ethernet başlığı (Kaynak/Hedef MAC, EtherType `0x0800`) ve sonuna FCS hata kontrolü eklenir → **Ethernet Çerçevesi (Frame)**.
5. **Fiziksel (L1):** Çerçeve bakır/fiber kablo üzerinden elektrik sinyalleri veya ışık palsleri (bitler) olarak hatta iletilir.

Alıcı tarafta ise süreç tam tersi işler (**Decapsulation**): Her katman kendine ait başlığı okuyup soyar ve kalan yükü (payload) bir üst katmana devreder:  
`Bits → Frame → Packet → Segment → Data`

Her katmanın varoluş amacını şu sorularla özetleyebiliriz:

| Katman | Sorduğu Temel Soru |
| :--- | :--- |
| **7. Application** | Uygulama hangi ağ servisini talep ediyor? |
| **6. Presentation** | Veri nasıl kodlanacak, formatlanacak veya şifrelenecek? |
| **5. Session** | İletişim oturumu nasıl kurulacak ve yönetilecek? |
| **4. Transport** | Veri hangi servis sürecine iletilecek ve nasıl güvene alınacak? |
| **3. Network** | Hangi mantıksal hedefe, hangi yönlendirme rotasıyla gidilecek? |
| **2. Data Link** | Yerel ağ hattında paket hangi komşu cihaza/ağ geçidine aktarılacak? |
| **1. Physical** | Bit dizilimi fiziksel ortamda nasıl iletilecek? |

## Bölüm 6: Yönlendiricinin (Router) Rolü: IP mi Değişir, MAC mi?

Bir paket internet üzerinde hedefe ilerlerken şu adımlardan geçer:

1. Gelen Ethernet çerçevesi açılır ve FCS doğrulanır.
2. IP başlığı okunarak yönlendirme tablosundaki (routing table) en uygun rota aranır.
3. TTL değeri 1 azaltılır.
4. Başlık değiştiği için IPv4 başlık sağlama toplamı (checksum) yeniden hesaplanır.
5. Yeni çıkış arayüzüne göre **tamamen yeni bir Ethernet başlığı** yazılır.
6. Paket sonraki sıçramaya (next-hop) gönderilir.

Bu süreçte **Kaynak ve Hedef IP adresleri yol boyunca sabit kalır** (NAT senaryoları hariç). Ancak **MAC adresleri her yönlendirici geçişinde (hop-by-hop) tamamen değişir.** Paket her yerel hat üzerinde o anki göndericinin ve o anki alıcı ağ geçidinin MAC adresini taşır.

---

## Sonuç

Wireshark üzerinden incelediğimiz tek bir HTTP paketi, ağ mimarisinin bağımsız ama uyumlu katmanlar halinde nasıl çalıştığını somutlaştırmaktadır. L2 yerel teslimatı, L3 küresel rotalamayı, L4 uçtan uca güvenilirliği sağlarken L7 kullanıcının doğrudan etkileşime girdiği web deneyimini oluşturur.