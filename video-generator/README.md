# Qiziq faktlar — video generator

"Qiziq faktlar" formatidagi qisqa (TikTok / Instagram Reels / YouTube Shorts uchun mos, 9:16) videolarni avtomatik yaratadigan skript. Har bir fakt uchun:

1. Matn tabiiy ovozga aylantiriladi (bepul, studiyaviy sifatli o'zbek TTS — Microsoft Edge Read Aloud xizmati orqali, `edge-tts` kutubxonasi).
2. So'zlarga aniq sinxronlashgan subtitr (TikTok uslubidagi qalin, konturli yozuv) tayyorlanadi.
3. Fakt mavzusiga mos rangdagi animatsion fon video yaratiladi.
4. Hammasi bitta tayyor `.mp4` faylga birlashtiriladi.

**Muhim:** bu tizim faqat kontentni tayyorlab beradi — uni TikTok/Instagram/YouTube'ga joylash, izoh yozish va nashr qilish hozircha qo'lda amalga oshiriladi. Daromad (agar bo'lsa) kafolatlanmaydi — bu ko'rishlar soni, platforma qoidalari va auditoriya faolligiga bog'liq.

## O'rnatish

1. Python 3.9+ kerak.
2. Kutubxonalarni o'rnating:

   ```bash
   pip install -r requirements.txt
   ```

   `ffmpeg` alohida o'rnatish shart emas — `imageio-ffmpeg` uni avtomatik o'zi bilan olib keladi.

## Ishlatish

Barcha faktlardan video yaratish:

```bash
python generate_video.py
```

Faqat bitta faktdan (masalan ID=3):

```bash
python generate_video.py --id 3
```

Boshqa ovoz bilan (masalan erkak ovozi):

```bash
python generate_video.py --voice uz-UZ-SardorNeural
```

Tayyor videolar `output/` papkasida `qiziq_001.mp4`, `qiziq_002.mp4`, ... nomlari bilan saqlanadi.

## Yangi faktlar qo'shish

`facts.json` faylini oching va shu formatda yangi obyekt qo'shing:

```json
{
  "id": 21,
  "category": "fan",
  "text": "Bu yerga yangi qiziqarli fakt matnini yozing."
}
```

`category` maydoni fon rangini belgilaydi (`fan`, `tarix`, `hayvonot`, `kosmos`, `inson_tanasi`, `dunyo`). Yangi kategoriya qo'shmoqchi bo'lsangiz, `generate_video.py` ichidagi `CATEGORY_COLORS` lug'atiga rang qo'shing.

## Nashr qilishdan oldin

- Har bir platformaning **sun'iy intellekt bilan yaratilgan kontent** haqidagi qoidalarini o'qing (TikTok, Instagram va YouTube bunday videolarni belgilashni talab qilishi mumkin) va kerak bo'lsa tegishli belgini/izohni qo'shing.
- Daromad olish uchun platformaning monetizatsiya shartlariga (masalan TikTok Creator Rewards, YouTube Shorts daromad dasturi) mos kelishingizni tekshiring — odatda minimal obunachi/ko'rishlar soni talab qilinadi.
