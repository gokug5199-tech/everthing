## 2026-11-14 — JWT Expired Recovery في Anime Library
- `anime-library.js`: استرجاع الجلسة عند انتهاء JWT في قراءة المكتبة وحفظ/حذف حالات الأنمي والمفضلة، ومقارنة المستخدم قبل كل كتابة.
- `my-anime.html`, `profile.html`, `anime-detail-auth-v22.js`: cache busting للملف المُصلح.
- رسالة Log in again عند تعذر التجديد بدل عرض JWT expired الخام.
- لا SQL ولا تعديل بيانات؛ اختبار محلي Mock، ولم يتم اختبار الحساب الحقيقي.

## 2026-11-14 — تسريع صور خلفيات Profile
- إضافة `profile-background-fast.js`، كاش `sessionStorage` محدود المدة لكل مستخدم ولكل صورة؛ لا إعادة إنشاء Signed URL في كل دخول إلى Profile أثناء الجلسة.
- تعديل `profile-cover.js` و`profile-page-background.js` لجعل خلفيتي الصفحة والبطاقة تظهران من الكاش قبل انتظار الشبكة، مع تحقق خلفي من Supabase، ومعالجة الحذف والحسابات والروابط المنتهية.
- ضبط ضغط JPEG للصور الجديدة عند 1600×900 إلى 0.84 و`cacheControl` ساعة. الصور القديمة لم تتغير.
- `profile.html`: ملف الكاش الجديد وpreconnect وcache-busting للسكريبتين.
- اختبارات `profile-images-fast-smoke.cjs` و`profile-background-css-smoke.py` محليًا، دون اتصال حقيقي بـCloudflare أو Supabase.
- لا SQL، لا تعديل بيانات، ولا أي مساس بتصميم المتصفح أو التطبيق.

## 2026-11-14 — Profile background browser visibility fix
- `profile-v9.css`: جعل خلفية صفحة Profile الشخصية تتقدم على خلفية الثيم العامة ذات `background: ... !important`، وإضافة قاعدة محددة لنسخة التطبيق المثبتة فقط.
- `profile.html`: cache-busting خاص بملف CSS المعدل.
- لا تعديل على Supabase أو صور المستخدم أو SQL أو وظائف رفع/إزالة الخلفيات. مراجعة: `14-PROFILE-PAGE-BACKGROUND-BROWSER-FIX-AR.md`.
- تحقق ثابت من CSS وHTML وفحوص JavaScript المحلية؛ لم يتم اختبار Supabase أو Cloudflare المنشورين.

## 2026-11-14 — APP-SHELL-01: تصميم PWA مستقل عن نسخة المتصفح
- 23 صفحة HTML أصبحت تحمل بوت كشف standalone مبكرًا، CSS تطبيق منفصلًا في آخر Head، وسكربت لتكوين الرأس والتبويبات.
- شريط تطبيق علوي، تنقل سفلي من 5 تبويبات Home/Anime/Wallpapers/Library/Profile.
- Home App Dashboard جديدة وواجهة Featured/بحث/أركات/خلفيات/مكتبة/بروفايل مناسبة للمس؛ بيانات Supabase ومنطق الاستيراد والأركات لم تتغير.
- نافذة المتصفح المعتادة (بما فيها Safari/Chrome على الجوال) لم تتغير إلا بتحميل ملفات صغيرة تظل غير نشطة خارج standalone.
- لا SQL. الاختبارات محلية ومحدودة؛ ليس اختبارًا لإنتاج Cloudflare أو iOS/Android الفعلي. التفاصيل في `13-STANDALONE-APP-REDESIGN-AR.md`.

## 2026-11-14 — PWA Pair 02: Continue Watching + Paused/Dropped
- `continue-watching.js` و`continue-watching.css` وقسم Home الجديد: يظهر فقط بعد تسجيل دخول له سجل فتح حلقات من v37، ويعرض أحدث حلقة فُتحت لكل أنمي؛ يحترم الخصوصية ويبقي خيار Watch/Download.
- توسيع `anime-library.js` إلى `paused` و`dropped` مع شارات وتبويبات؛ تعديل `anime-detail-auth-v22.js` لتحديث cache-busting.
- `SUPABASE-PAIR02-LIBRARY-STATUSES.sql` يعدل CHECK constraint فحسب، ولا يتعامل مع بيانات صفوف المستخدمين. يحتاج تشغيلًا يدويًا من المالك.
- اختبار Fake Supabase للميزة، ولا ادعاء اختبار حسابات أو أجهزة حقيقية.

## 2026-11-14 — PWA Pair 01: Library Performance + Episode Choice Navigation
- إزالة `anime-data.js` من My Anime وProfile؛ `anime-library.js` يجلب بيانات الأنمي المرتبطة بمكتبة الحساب فحسب، مع أعمدة محددة بدلاً من `select=*` للكتالوج.
- تفعيل شريط الجوال المشترك في `episode-choice.html`، وربط الصفحة بتبويب Anime؛ تحديث query versions للـPWA في HTML لمنع الكاش القديم.
- توثيق التعديل في `11-PHASE-A-PAIR-01-AR.md` وإضافة فحص Fake Supabase/PWA Navigation.
- لا SQL ولا تغييرات بالبيانات أو الروابط. الاختبار المحلي فقط؛ Cloudflare/Supabase الحقيقيان بحاجة تحقق.

# سجل التغييرات

## 2026-11-14 — اعتمادات Episode Guides داخل About بدل قائمة الحلقات
- إزالة النص التفصيلي عن FillerLists والرخصة من تحت الفلاتر في `anime-details.html` و`anime-details.js`، مع إزالة CSS القديم لهذه السطر.
- إضافة رابط صغير `Data Sources & Credits` في أسفل صفحة تفاصيل الأنمي يؤدي إلى `about.html#data-sources-credits`.
- إنشاء قسم الاعتمادات في About: FillerLists والمصادر الأصلية، CC BY-SA 4.0، وصف التعديلات ونشر المرجع المحلي تحت رخصة المشاركة بالمثل، مع روابط المصادر.
- لا تغيير في فلترة الحلقات أو الأركات أو طلبات الشبكة أو Supabase أو روابط الفيديو. لا SQL.
- زيادة رقم استعلام cache-busting لـCSS/JS صفحة التفاصيل فقط.
- الملفات: `anime-details.html`, `anime-details.js`, `episode-guides.css`, `about.html`, `PROJECT-DOCS/00-START-HERE-AR.md`, `PROJECT-DOCS/04-CHANGELOG-AR.md`, `PROJECT-DOCS/05-DEPLOY-AND-TEST-AR.md`, `PROJECT-DOCS/09-TEST-RESULTS-AR.md`, `PROJECT-DOCS/RELEASE-MANIFEST.json`, `PROJECT-DOCS/TESTS/credits-smoke.py`, `PROJECT-DOCS/TESTS/episode-guide-smoke.cjs` (إزالة تثبيت رقم الإصدار في الاختبار).


## 2026-11-13 — تحسين Episode Guides والرجوع (بعد التوحيد)
**الهدف:** معالجة ملاحظات المستخدم المصورة دون تغيير Supabase أو إعادة بناء الموقع.

- إخفاء شريط الحالة الكبير افتراضيًا، وعدم عرض أي واجهة دليل لأنمي لا توجد له بيانات مرتبطة بحلقاته. التحذير مع Retry يبقى فقط عند فشل حقيقي لدليل أنمي مدعوم دون بيانات متاحة.
- تخطّي استعلامات Guide غير المفيدة للأنميات القصيرة غير المعروفة (أقل من 60 حلقة)، مع الإبقاء على البحث التصنيفي للأنميات الطويلة غير المعروفة عند وجود MAL ID.
- بدء جلب دليل الأنميات المعرّفة مسبقًا بالتوازي مع استعلام `EpisodeAPI.list`، واستخدام LocalStorage cache فورًا عند توفره، وإبقاء البيانات المتحققة القديمة عند انقطاع المصدر.
- إضافة **17 حدًّا موثقًا لأركات Bleach الأصلي (الحلقات 1–366، MAL 269)**، قابلة للعرض دون طلب خارجي. مصدر: https://fillerlists.com/bleach (راجعه الموقع في 2026-11-13؛ مصدره يذكر آخر فحص 2026-11-03). القيم مقتبسة/مكيّفة تحت CC BY-SA 4.0، المصدر وترخيصه وروابط الاعتماد ظاهرة في الصفحة. لم نخمّن Canon لما لم يُوثَّق من الحلقات، والمواسم الأخرى مستقلة.
- ربط زر Back العلوي في Anime Details بـ`anime.html` مباشرًا بدل `history.back()`, حتى لا يعيد المستخدم لصفحة خيارات الحلقة. خيار `Back to episodes` يستخدم `history.back()` إن كان المرجع هو نفس صفحة حلقات الأنمي، وإلا `location.replace()` للعنوان الثابت. زر Watch العلوي يتجه مباشرة لقائمة الحلقات.
- تحديث query parameters لملفات JS/CSS لإبطال الكاش القديم بعد النشر.
- الملفات: `episode-guides.js`, `episode-guides.css`, `anime-details.js`, `anime-details.html`, `episode-choice-v37.js`, `episode-choice.html`, `watch.html`, `PROJECT-DOCS/*`.
- لا تغيير في Supabase/البيانات/SQL/روابط الفيديو/Cloudflare Function/باقي الصفحات.
- **التحقق:** فحص صياغة JS، واختبارات Node mock وتحقق مراجع ملفات؛ اختبار Chromium الفعلي لم ينجح بسبب حظر تشغيل جميع الروابط في بيئة الفحص، ولا يعني هذا عيبًا مثبتًا بالموقع. لا نؤكد أداء السيرفر الخارجي أو النشر.

## 2026-11-13 — توحيد v38 / v39 بدون إعادة بناء الموقع
**نوع التحديث:** تنظيم / دمج وحدة قائمة، وليس ضمانًا لإصلاح شبكة الإنتاج أو تحسين الأداء العام.

### تغييرات فعلية
- استُبدلت الوحدتان القديمتان `episode-guides-v38.js` و`episode-guides-v39.js` بوحدة واحدة مستخدمة: `episode-guides.js`، تعتمد منطق v39 الأكثر شمولًا (fallback ومطابقة بيانات ومؤشرات حالة وRetry)، وقد كانت v38 JS غير مستخدمة في HTML قبل الدمج.
- دُمج تصميم `episode-guides-v38.css` و`episode-guides-v39.css` بالكامل في `episode-guides.css` بدون CSS `@import` إلى ملف قديم.
- تم تعديل `anime-details.html` ليستدعي ملف JS وCSS الموحدين مع query parameter جديد لتحديث الكاش، وإزالة رقم الإصدار من شريط `EPISODE GUIDE`.
- تم تعديل `anime-details.js` لاستدعاء `window.TEEpisodeGuides` بدل واجهة باسم إصدار، وتحسين نص خطأ اختفاء ملف JS.
- تم تحديث عنوان التعليق في `functions/api/episode-guide.js` دون تغيير سلوك نقطة API.
- تم تغيير مفتاح LocalStorage لبيانات الدليل إلى اسم ثابت خالٍ من رقم إصدار؛ قد يعاد جلب الدليل عند أول زيارة بعد النشر.
- أُزيلت **ثمانية ملفات قديمة مكررة** من النسخة الكاملة: أربعة ملفات JS/CSS وأربعة README/INSTALL تخص v38/v39. استُوعبت تعليماتها هنا وفي دليل النشر. النسخة PATCH تتطلب حذفها يدويًا كما في `PATCH-DELETE-OLD-FILES.txt`.
- أُضيف مجلد `PROJECT-DOCS/` وملف `README.md` في الجذر لتسهيل استكمال العمل مستقبلًا.

### خارج النطاق / لم نتعامل معه
- لم يُغيَّر ترقيم أو روابط الحلقات، ولم تُنفّذ SQL أو تعديلات حية على Supabase.
- لم نعد تصميم الصفحات الأخرى ولم نفحص النشر الفعلي على Cloudflare أو صلاحية مصادر FillerLists الحية.
- ملفات أخرى ذات أسماء إصدارات أقدم تؤدي وظائف مختلفة وتُركت منعًا لكسر التبعيات. طلب الدمج هنا كان لملفات v38/v39 الخاصة بنفس Episode Guides.

### تذكير
في أي تعديل قادم أضف تاريخًا واضحًا، قائمة الملفات المعدلة/المحذوفة، الاختبارات التي أجريت فعلًا، وما لم يُختبر.
