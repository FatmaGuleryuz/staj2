# SahaKONTROL (SiteSnagPro)

İnşaat şantiyelerindeki kalite kontrol, denetim ve kusur takip süreçlerini dijitalleştiren; çevrimdışı öncelikli (**Offline-First**) mimariye sahip **B2B ConTech** mobil uygulaması.

---

##  Proje Amacı

Şantiyelerde (özellikle bodrum katlarda ve kaba inşaat sahalarında) hücresel internet bağlantısının sık sık kesilmesi veya çekmemesi nedeniyle kağıt-kalem veya anlık mesajlaşma araçlarıyla yürütülen süreçler veri kaybına, takip aksaklıklarına ve maliyetli hatalı imalatlara yol açar. 

**SahaKONTROL**, internet bağlantısı tamamen kopsa dahi saha mühendislerinin ve taşeronların veri girmesini, görev atamasını ve iş bitiminde resmi PDF denetim tutanağı düzenlemesini sağlar.

---

##  Temel Özellikler

* **Offline-First & Arka Plan Senkronizasyonu:** İnternet yokken açılan kusur kayıtları yerel kuyrukta toplanır; bağlantı sağlandığında arka planda otomatik olarak Supabase bulut veritabanına aktarılır.
* **Rol Tabanlı Yetkilendirme (RBAC):** Mühendis (inşaat, elektrik, mekanik) ve taşeron rolleri için özelleştirilmiş ekranlar ve işlem yetkileri.
* **Çoklu Kiracılık (Multi-Tenancy):** `company_id` bazlı veri izolasyonu ile şirket verilerinin birbirinden ayrılması.
* **Fotoğraf & Çizim (Markup):** Çekilen şantiye kusur fotoğrafı üzerinde çizim/işaretleme desteği.
* **Dijital İmza & PDF Raporu:** Çözülen işlerin saha şefi/mühendis tarafından ekranda imzalanıp kapatılması ve tek tuşla A4 formatında resmi PDF tutanak çıktısı üretilmesi.

---

##  Teknoloji Yığını

* **Mobil İstemci:** React Native (Expo SDK 54), TypeScript
* **Backend & Veritabanı:** Supabase (PostgreSQL, Storage, Auth)
* **State & Caching:** Zustand, TanStack Query
* **Yerel Depolama & Ağ Takibi:** AsyncStorage, NetInfo
* **Medya & Doküman:** expo-image-picker, expo-print, expo-sharing

---

##  Hızlı Başlangıç

### 1. Projeyi İndirin ve Bağımlılıkları Yükleyin

```bash
git clone [https://github.com/kullanici-adi/SiteSnagPro.git](https://github.com/kullanici-adi/SiteSnagPro.git)
cd SiteSnagPro
npm install
```
### 2. Ortam Değişkenlerini Ekleyin
```
EXPO_PUBLIC_SUPABASE_URL=[https://sizin-proje-url.supabase.co](https://sizin-proje-url.supabase.co)
EXPO_PUBLIC_SUPABASE_ANON_KEY=sizin-anon-public-key
```
### 3. Uygulamayı Başlatın
```
npx expo start
