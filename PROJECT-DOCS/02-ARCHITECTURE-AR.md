# خريطة البنية — مبنية على مراجعة ZIP الموحد

## جذر الاستضافة
- `index.html`, `anime.html`, `anime-details.html`, `episode-choice.html`, `watch.html` — مسار التصفح والحلقة.
- `admin.html`, `admin.js`, `episode-admin.js`, `bulk-anime-v16.js`, `admin-anime-meta.js` — عمليات الإدارة والاستيراد.
- `anime-detail-loader-v22.js` و`anime-detail-quickstart-v22.js` — تجهيز بيانات الأنمي في التفاصيل؛ `anime-details.js` — واجهة الحلقات وأقسامها.
- `episode-data.js` — قراءات الحلقات من Supabase والتعامل مع مصادر VOE/Videa/HGCloud والروابط الموروثة.
- `episode-guides.js` — **وحدة Filler/Arcs موحّدة**: مطابقة MAL والعنوان بحذر، طلب JSON، عرض المصادر الاحتياطية المؤقتة، cache، حالات عدم توفر البيانات. التصدير العام: `window.TEEpisodeGuides`.
- `episode-guides.css` — **ملف التصميم الموحّد** لعناصر التصنيفات/الأركات وشريط حالة الجلب (لا CSS @import لنسخ أقدم).
- `functions/api/episode-guide.js` — Cloudflare Pages Function تستقبل `mal_id` وتطلب دليل FillerLists أو بيانات Tenrai عند توفرها. لا تعيد بث الفيديو.
- `episode-choice-v37.js`, `episode-activity-v37.js`, `watch.js`, `profile.js`, `profile-episodes-v37.css` — تجربة المشاهدة وسجل نشاط الحساب (وجود الملفات لا يثبت عمل RLS حيًا).
- `anime.html`, `anime.js`, `anime-page.js`, `anime-library.js` — القائمة والمكتبة والواجهة.
- `featured-admin.js`, `featured-public.js`, `admin-featured-search-v35.js` — واجهة Featured وإدارتها.
- `wallpaper.html`, `my-wallpapers.html`, `user-wallpapers.html`, `profile.html`, `login.html`, `settings.html`, `schedule.html`, `films.html` — الأقسام الأخرى.
- `manifest.webmanifest`, `service-worker.js`, `mobile-pwa.js` — PWA.
- `image/`, `icons/` — أصول صور/أيقونات محلية، لا تمسحها عند تركيب PATCH.
- `docs/`, `deatals/` — وثائق وملفات SQL قديمة من مراحل سابقة؛ لا تشغّل SQL منها عشوائيًا.

## ترتيب تحميل نظام الحلقات في anime-details.html
1. `anime-detail-loader-v22.js` يجهز بيانات الأنمي.
2. `episode-data.js` يعرف `window.EpisodeAPI` لقراءة الحلقات.
3. `episode-guides.js` يعرف `window.TEEpisodeGuides`.
4. `anime-details.js` يرسم الحلقات ويطبق نتائج الدليل عند وصولها.
5. `episode-guides.css` ينسق عناصر الواجهة (محمّل ضمن head).

## اعتمادات خارجية تحتاج تحقق حي عند المشاكل
- Supabase REST/Auth/RLS وصلاحيات الأعضاء والإدارة.
- Tenrai والبيانات المتاحة حاليًا.
- FillerLists JSON ومطابقة معرف العنوان ورخصة البيانات.
- Cloudflare Pages Functions وتوجيه `/api/episode-guide`.
- توافق مزودات المشاهدة الخارجية مع الـ iframe وfullscreen.

**ملاحظة:** لم تتم إعادة بناء أو فصل التقنية إلى إطار JS جديد، ولم يتغير استضافة المشروع.
