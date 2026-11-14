## 2026-11-14 — JWT Expired Recovery (Mock)
- PASS: local simulated upsert and delete retry once after expired JWT.
- PASS: failed refresh leaves data unchanged and shows sign-in message; account mismatch blocks writes.
- PASS: PWA pair01, pair02 and Episode Guide mocks; updated older assertions to match the latest designs.
- PASS: Node syntax and local asset path checks; **NOT TESTED**: live Supabase, Cloudflare, browser device session renewal.

## 2026-11-14 — Profile Background Browser Fix
- PASS: اختبارات `python PROJECT-DOCS/TESTS/profile-background-css-smoke.py` لأولوية CSS على ثيم v12 والـPWA وشمول رفع/حذف الخلفيات مع cache busting.
- PASS: `node PROJECT-DOCS/TESTS/app-shell-smoke.cjs` و`node PROJECT-DOCS/TESTS/pwa-pair02-smoke.cjs` و`node PROJECT-DOCS/TESTS/pwa-pair01-smoke.cjs` و`node PROJECT-DOCS/TESTS/episode-guide-smoke.cjs` (ظهرت رسائل mock offline متوقعة).
- PASS: `node --check` لكل ملفات JavaScript في الجذر.
- NOT TESTED: الحساب الحقيقي، Supabase Storage، النشر على Cloudflare، أجهزة iPhone/Android الحقيقية. يتطلب تحققًا بعد النشر.

## APP-SHELL-01 — 2026-11-14
- ملفات JS الجديدة صالحة نحويًا في Node.
- تمت مراجعة وجود ملفات CSS/JS المتعلقة بوضع التطبيق على جميع صفحات HTML الحالية.
- تمت معاينة التكوين المحلي باستخدام Chromium `page.set_content` لمحاكاة PWA عند عرض 390px، وظهرت خمس تبويبات دون تجاوز عرض الصفحة في العينات التي جربناها.
- **لا** نقول إن اختبار التصفح الفعلي نجح؛ الطلب إلى localhost أعاد `ERR_BLOCKED_BY_ADMINISTRATOR`. لم نفحص بيانات Supabase الحية، ولا تطبيقًا مثبتًا على هاتف حقيقي.

## 2026-11-14 — PWA Pair 02 (محاكاة محلية)
- فحص `node --check` لـ50 ملف JavaScript في جذر الموقع: صفر أخطاء.
- فحص 506 إشارات ثابتة محلية لملفات وروابط HTML ضمن 23 صفحة: صفر ملفات مفقودة.
- إعادة تشغيل `episode-guide-smoke.cjs` و`credits-smoke.py`: نجاح؛ أخطاء `Mock offline` المتوقعة تظهر ضمن اختبار fallback فقط.
- `node PROJECT-DOCS/TESTS/pwa-pair02-smoke.cjs`: حالات Continue Watching (بما فيها تكرار الحلقات ضمن نفس الأنمي، تسجيل الخروج، ضيف، أخطاء الجدول، وسلامة روابط الصور)، وحالات Paused / Dropped وحفظ المفضلة، وفحص ترحيل SQL.
- إعادة تشغيل `pwa-pair01-smoke.cjs` للتحقق من عدم كسر سرعة المكتبة وشريط الجوال.
- تجارب Supabase/Cloudflare الحقيقية، استجابة RLS الفعلية، والتصفح على iPhone/Android **لم تحصل** في بيئة التطوير؛ الفحوص السابقة لا تثبت ذلك.

## 2026-11-14 — PWA Pair 01 (فحوص Mock)
- `node PROJECT-DOCS/TESTS/pwa-pair01-smoke.cjs`: 5 حالات ناجحة — مكتبة من 2/51/0، زائر، وصفحة خيارات الحلقة (الأنمي محدد في شريط التنقل).
- `node --check`: نجح فحص 49 ملف JS في جذر المشروع، 0 إخفاقات.
- Static HTML asset references: جرى فحص 373 مرجع CSS/JS محليًا داخل 23 صفحة HTML، ولم يُعثر على ملف مفقود.
- **القيود:** Fake Supabase وFake DOM فقط؛ لا فحص متصفح/Cloudflare/Supabase حي، ولا قياسات زمن شبكة.

# نتائج الفحص المحلي — آخر تحديث 2026-11-13

## تحديث السلاسة والرجوع
- `node --check`: نجح لملفات JS المعدلة (والنتيجة تشمل لاحقًا فحص جميع ملفات JS).
- `node PROJECT-DOCS/TESTS/episode-guide-smoke.cjs`: نجح بعد توسيع اختبارات عدم جلب دليل لأنمي قصير، والمراجع، وBleach مع الـ17 أرك، والكاش، والاستجابة المحاكية لـCloudflare.
- فحص نهائي بعد التعديل: **50 ملف JavaScript** ناجح في `node --check`، و**23 صفحة HTML** بدون ملفات `src`/`href` محلية مفقودة، ولا توجد مراجع نشطة لملفات `episode-guides-v38/v39`.
- محاولة اختبار تفاعلي بـPlaywright/Chromium: **لم تعمل بسبب حظر التصفح في بيئة التنفيذ** (`ERR_BLOCKED_BY_ADMINISTRATOR` لملف محلي وlocalhost وحتى data URL). لا نعتبرها نجاحًا، ولا نستنتج عطلًا في الموقع منها. أُرفق سيناريو الاختبار بـ`TESTS/episode-ui-browser.py` لتشغيله في بيئة تسمح بالمتصفح.
- مراجعة علنية: حدود الأركات الـ17 لنطاق Bleach 1–366 مأخوذة من https://fillerlists.com/bleach؛ مصدر البيانات وتراخيصه عند https://fillerlists.com/data، وتمت المحافظة على الترقيم الأصلي.
- **لم نختبر** Cloudflare Pages الحقيقي، أو استجابة Supabase الحقيقية، أو سرعة الشبكة الحية، أو أداء Safari/iPhone/Android؛ لا SQL جديد.

## الفحص السابق للتوحيد
 على **ملفات ZIP المرفوعة بعد التعديل**، وليست على نطاق Cloudflare Pages الحي.

- تم استخراج وفحص البنية، وعدد ملفات JavaScript الحالي 50.
- فحص `node --check` لملفات JavaScript الخمسين: **نجح، 0 أخطاء صياغة**.
- فحص 23 صفحة HTML بحثًا عن روابط `src`/`href` محلية مفقودة: **0 ملفات مفقودة** (فحص ملفات ثابت فقط، لا يضمن صحة الروابط الديناميكية).
- تدقيق الإحالات النشطة لملفات `episode-guides-v38/v39` أو الكائن القديم: **لا توجد في ملفات HTML/JS/CSS التي تعمل على الموقع**.
- تم تشغيل `node PROJECT-DOCS/TESTS/episode-guide-smoke.cjs` ونجح: مراجع CSS/JS، مطابقة MAL، عدم افتراض Canon للحلقات المجهولة، fallback عند انقطاع الشبكة، مثال بيانات API، Mock لطلب Cloudflare، والتخزين المؤقت.
- لا توجد أي تعديلات SQL؛ لم يُستخدم اتصال فعلي بـSupabase، ولم يتم نشر أو اختبار Cloudflare live، ولم تُجر تجربة Visual Browser على iPhone/Android، ولم يتم اختبار FillerLists أو Tenrai الحيين.

**قبل اعتبار العمل منتجًا:** نفذ فحوص الموقع المنشور وفق `05-DEPLOY-AND-TEST-AR.md`.


## فحص 2026-11-14 — نقل Data Sources & Credits
- يتم فحص صياغة JavaScript باستخدام `node --check`.
- تم إضافة فحص محلي `PROJECT-DOCS/TESTS/credits-smoke.py` للتأكد من إزالة الـDOM القديم، ووجود رابط القسم، وظهور روابط المصدر والترخيص والإسناد.
- اختبارات وحدة Episode Guides السابقة تعاد كما هي للتأكد من عدم لمس سلوك الأركات والفلاتر.
- لم يُنفذ اختبار حي لموقع Cloudflare / Supabase أو المتصفحات والأجهزة الحقيقية.

## 2026-11-14 — تحسين سرعة خلفيات Profile
- Node mock: `profile-images-fast-smoke.cjs` يختبر Cold/Warm/Expiry، حسابين مختلفين، Background/Cover، الحذف وعدم توفر sessionStorage.
- CSS smoke تم تحديثه ليتحقق من وجود الملف المشترك واحتفاظه بقواعد الإظهار، بعد نقل الإضافة/الحذف إلى Helper.
- لا قياسات حية للزمن بعد النشر أو اتصال Supabase الإنتاجي.
