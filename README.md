# qiziq-site

Instagram'dan video avtomatik yuklab, YouTube'ga joylab boruvchi n8n asosidagi
avtomatlashtirish (n8n workflow automation).

> **Muhim (huquqiy eslatma):** Bu pipeline faqat siz **litsenziya/ruxsat olgan**
> yoki o'zingizga tegishli bo'lgan Instagram kontenti uchun ishlatilishi kerak.
> Boshqa mualliflarning videolarini ruxsatsiz yuklab, YouTube'ga qayta joylash
> mualliflik huquqini buzadi va YouTube kanalingizni (reused content siyosati
> bo'yicha) blokka olib kelishi mumkin. Instagram Graph API'dan foydalanish esa
> scraping'dan farqli o'laroq — kontent egasi tomonidan berilgan rasmiy access
> token orqali ishlaydi.

## Qanday ishlaydi

`n8n` (ochiq manbali workflow automation) Docker orqali self-host qilinadi va
`n8n/workflows/instagram-to-youtube.json` workflow'i quyidagi bosqichlarni har
15 daqiqada bajaradi:

1. **Every 15 Minutes** — jadval bo'yicha ishga tushadi.
2. **Load Accounts** — `ACCOUNTS_JSON` env o'zgaruvchisidan kuzatiladigan
   Instagram akkountlar ro'yxatini o'qiydi.
3. **Fetch IG Media** — har bir akkount uchun Instagram Graph API
   (`/{ig-user-id}/media`) orqali so'nggi postlarni oladi.
4. **Split Media Items / Only Videos** — natijalarni bittalab ajratib, faqat
   video (`media_type = VIDEO`) postlarni qoldiradi.
5. **Skip Already Posted** — avval yuklangan postlarni (n8n workflow static
   data'da saqlanadigan ID ro'yxati orqali) o'tkazib yuboradi.
6. **Download Video** — video faylni Instagram'dan yuklab oladi.
7. **Upload to YouTube** — YouTube Data API orqali videoni sarlavha, tavsif
   (original post havolasi bilan) va maxfiylik darajasi bilan joylaydi.
8. **Mark As Posted** — muvaffaqiyatli joylangan post ID'sini "posted"
   ro'yxatiga qo'shadi, shu bilan takroriy joylashning oldini oladi.

## Talablar (setup'dan oldin)

### 1. Instagram tomoni — Graph API access token

Instagram'ning ommaviy/anonim video yuklab olish API'si yo'q. Ruxsat asosida
ishlash uchun har bir manba akkount **Business yoki Creator** turida bo'lishi
va Facebook Page'ga bog'langan bo'lishi kerak:

1. https://developers.facebook.com da yangi App yarating (turi: Business).
2. App'ga **Instagram Graph API** mahsulotini qo'shing.
3. Kontent egasi (yoki siz, agar akkount o'zingizniki bo'lsa) App'ga tegishli
   Instagram Business akkountni ulaydi va kerakli ruxsatlarni beradi
   (`instagram_basic`, `pages_show_list` va h.k.).
4. Short-lived token'ni long-lived (~60 kunlik) token'ga almashtiring:
   `GET https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token=...`
5. Akkountning `ig_user_id` (Instagram Business Account ID) qiymatini oling.
6. Bu token ~60 kunda eskiradi — muddati tugashidan oldin yangilab, `.env`
   faylidagi `ACCOUNTS_JSON`'ni yangilang.

### 2. YouTube tomoni — OAuth2 credential

1. https://console.cloud.google.com da loyiha yarating, **YouTube Data API
   v3**'ni yoqing.
2. OAuth 2.0 Client ID (turi: Web application) yarating. Authorized redirect
   URI sifatida n8n'ning OAuth callback manzilini kiriting (masalan
   `https://<sizning-domeningiz>/rest/oauth2-credential/callback`).
3. n8n YouTube node OAuth2 orqali ishlaydi, shuning uchun n8n **ochiq HTTPS
   domen** ortida ishlashi kerak (yoki test uchun Cloudflare Tunnel/ngrok kabi
   vosita).

## O'rnatish

```bash
cp .env.example .env
# .env faylini to'ldiring: parollar, N8N_ENCRYPTION_KEY, ACCOUNTS_JSON va h.k.
openssl rand -hex 32   # N8N_ENCRYPTION_KEY uchun tasodifiy qiymat

docker compose up -d
```

n8n `http://localhost:5678` (yoki sozlagan domeningiz) manzilida ochiladi,
`.env`dagi `N8N_BASIC_AUTH_USER` / `N8N_BASIC_AUTH_PASSWORD` bilan kiring.

### Workflow'ni import qilish

1. n8n UI'da **Workflows → Import from File** orqali
   `n8n/workflows/instagram-to-youtube.json` faylini yuklang.
2. **Upload to YouTube** node'ini oching va yangi **YouTube OAuth2 API**
   credential yarating (2-bosqichdagi Client ID/Secret bilan), so'ng shu
   credential'ni node'ga biriktiring.
3. Workflow'ni **Active** holatga o'tkazing.

### Manba akkountlarni sozlash

`.env` faylidagi `ACCOUNTS_JSON`'ga JSON massiv sifatida qo'shing:

```json
[
  { "name": "akkount1", "ig_user_id": "17841400000000000", "access_token": "EAAG..." },
  { "name": "akkount2", "ig_user_id": "17841400000000001", "access_token": "EAAG..." }
]
```

O'zgartirgandan so'ng: `docker compose up -d` (n8n konteynerini qayta
ishga tushiradi, yangi env qiymatini o'qiydi).

## Operatsion cheklovlar (bilib qo'yish kerak)

- **YouTube kvotasi**: standart YouTube Data API kvotasi kuniga 10 000 unit,
  har bir video upload ~1600 unit sarflaydi — ya'ni sukut bo'yicha kuniga
  taxminan **6 ta video** yuklash mumkin. Ko'proq kerak bo'lsa, Google Cloud
  Console'da kvota oshirishni so'rash kerak.
- **Instagram token muddati**: long-lived token ~60 kunda tugaydi, uni
  muntazam yangilab turish kerak, aks holda tegishli akkount uchun pipeline
  to'xtaydi.
- **Bitta YouTube kanal**: hozirgi workflow barcha manba akkountlardan kelgan
  videolarni bitta YouTube kanaliga (bitta credential) joylaydi. Bir nechta
  kanalga tarqatish kerak bo'lsa, workflow'ni akkount guruhlari bo'yicha
  nusxalash yoki credential'ni akkount asosida dinamik tanlashni qo'shish
  kerak bo'ladi.
- **Xatoliklarni kuzatish**: n8n **Executions** bo'limida muvaffaqiyatsiz
  ishga tushishlarni kuzatib boring (masalan, eskirgan token yoki YouTube
  kvota tugashi sabab bo'lishi mumkin).
