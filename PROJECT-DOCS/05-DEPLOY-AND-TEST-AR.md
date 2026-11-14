## تركيب إصلاح JWT expired (2026-11-14)
- أساس التحديث: `TheEverything-MYANIME-DETAILS-REDESIGN-FULL.zip`.
- استعمل PATCH فوق هذا الأساس، أو ارفع محتوى FULL الجديد كله إلى جذر مستودع GitHub.
- اختبر حفظ Favorite/Watch status في صفحة تفاصيل الأنمي ومكتبته وفي Profile.
- عند انتهاء جلسة صالح تجديدها يجب الاستمرار بلا خطأ؛ إذا انتهى Refresh Token نفسه فسيظهر رابط Log in again.
- لا SQL جديد ولا تغييرات على RLS. اختبار Supabase/Cloudflare الحي مطلوب بعد النشر.

## التحديث الأحدث: Profile Background Browser Fix
- ارفع PATCH بعد `TheEverything-APP-SHELL-01-FULL.zip` فقط، أو ارفع FULL كاملًا.
- ارفع `profile-v9.css` و`profile.html` مع الوثائق، وامسح كاش المتصفح عند الحاجة؛ نسخة CSS الجديدة تحمل `?v=20261114-bgfix1`.
- تأكد من ظهور خلفية صفحة Profile في كمبيوتر وجوال المتصفح والتطبيق المثبت، وبعد الضغط على Remove background.
- لا SQL جديد. راجع `14-PROFILE-PAGE-BACKGROUND-BROWSER-FIX-AR.md`.

## تركيب APP-SHELL-01 — تصميم التطبيق المثبت منفصل عن المتصفح
1. استخدم FULL ZIP أو PATCH فوق `TheEverything-PWA-PAIR02-FULL.zip` بالضبط. لا تنسخ PATCH فوق إصدار أقدم إذا لم ترفع PAIR02.
2. ارفع إلى جذر GitHub بما يشمل الثلاثة ملفات `app-standalone-*`. لا SQL جديد.
3. افحص على الهاتف نفسه: افتح Safari/Chrome من رابط عادي (الموقع القديم)، ثم افتح الأيقونة المثبتة Add to Home Screen (واجهة التطبيق المختلفة).
4. افحص التنقل بين Home / Anime / Wallpapers / Library / Profile، وصفحة تفاصيل الأنمي وEpisode Options وWatch، والبحث والفلاتر.
5. افحص Portrait والجهاز ذي Notch والأزرار السفلية، ثم استعمل حسابًا مسجلًا لإظهار بيانات المكتبة والمتابعة، دون كشف بيانات حساب آخر.
6. لو ظهر شكل قديم بعد النشر، راجع شبكة المتصفح للتأكد من تحميل `app-standalone.css?v=app1` و`app-standalone.js?v=app1` ومن أن `html` يحمل class `te-app-mode` في وضع التطبيق المثبت.
7. الموقع العادي يجب ألا يحتوي على `te-app-mode`، وألا يظهر فيه رأس/تبويبات التطبيق الجديدة.

## طريقة تركيب PWA Pair 02 (2026-11-14)
**ابدأ من FULL أو PATCH الخاص بإصدار PAIR01 فقط.** احتفظ بنسخة احتياطية من قاعدة Supabase/المستودع؛ ثم راجع وشغل `PROJECT-DOCS/SUPABASE-PAIR02-LIBRARY-STATUSES.sql` في Supabase SQL Editor قبل استخدام Paused/Dropped. ارفع ملفات FULL أو PATCH فوق PAIR01 إلى جذر GitHub، مع مراعاة أن عمليات نسخ ZIP لا تحذف ملفات قديمة خارج التحديث.

- تأكد من ظهور Continue Watching على Home **بعد فتح حلقة بحساب مسجل فعليًا**؛ من المفترض ألا يظهر للزائر ولا للحساب بلا سجل. زر البطاقة يذهب إلى Episode Options. يجب أن يختفي القسم فور تسجيل الخروج.
- تحقق من حالات Paused / Dropped في My Anime وProfile وAnime Details، وحفظ الحالة والمفضلة والفلتر. إذا ظهر SQL constraint error فراجع تنفيذ SQL الجديدة.
- إذا لم يظهر سجل Home، تحقق من إعداد v37/RLS وجدول `user_episode_activity` ووظيفة `site_record_episode_action`؛ هذه الدفعة لا تنشئ الجدول. راجع `12-PWA-PAIR-02-AR.md`.
- اختبارات محلية: `node PROJECT-DOCS/TESTS/pwa-pair02-smoke.cjs` ثم الاختبار السابق `pwa-pair01-smoke.cjs` واختبارات Guide. لا توجد تجربة حقيقية لصفحة Cloudflare أو Supabase حتى توثّق.

## طريقة تركيب PWA Pair 01 (2026-11-14)
ارفع FULL ZIP أو استبدل الملفات الموجودة في PATCH ZIP داخل جذر مستودع GitHub. لا توجد أوامر SQL جديدة. افحص حساب Logged in/Guest والمكتبة وصفحة Episode Options على الجوال بعد النشر. تعليمات التحقق مفصلة في `11-PHASE-A-PAIR-01-AR.md`. تحديث query version لـ`mobile-pwa.js` مقصود للتخلص من النسخة السابقة المخزنة.

# تركيب النسخة الموحدة والتحقق

## الخيار الأفضل: FULL ZIP
1. خذ نسخة احتياطية من مستودع GitHub، واحتفظ بنسخة احتياطية من قاعدة Supabase (دون الحاجة لتغييرها الآن).
2. افتح ZIP وضع **محتويات مجلد الموقع الداخلي** في جذر المستودع الذي ينشر منه Cloudflare Pages (لا تضف مستوى مجلدًا خاطئًا).
3. انسخ الملفات كلها مع المحافظة على مجلدي `functions/` و`image/` و`icons/`، **واحذف ملفات v38/v39 الثمانية القديمة المذكورة في manifest لأنها لن تُحذف تلقائيًا عند نسخ ZIP فوق مستودع سابق**، ثم Commit / Push.
4. تأكد من نجاح نشر Cloudflare Pages، وحدث الصفحة مع تجاوز الكاش `Ctrl+Shift+R`.
5. افتح `anime-details.html?id=<actual-anime-id>`:
   - أنمي قصير غير مدعوم: يجب ألا يظهر شريط Episode Guide أو خيار Arc فارغ.
   - Bleach الأصلي، MAL 269: يفترض ظهور تصنيف الأركات فور اكتمال تحميل قائمة الحلقات (المصدر المحلي)، وتحديث بياناتها من المصدر خارجيًا في الخلفية.
   - عند نجاح الدليل لا يظهر شريط الحالة؛ تظهر خيارات Story Arc وEpisode Type عند وجود بيانات متحققة.
   - لا يظهر رقم v39 في واجهة المستخدم مطلقًا.
6. جرّب التنقل: Anime → Details → Episode → Options → Back to episodes → Back to anime. يجب الوصول إلى `anime.html` بدل العودة إلى Options.
7. جرّب Watch أيضًا؛ زر الرجوع العلوي يجب أن يتجه إلى صفحة الحلقات لا صفحة Options.

## لو ستستخدم PATCH ZIP على مشروع قديم
- انسخ الملفات الجديدة/المعدلة فوق المشروع مع المحافظة على هيكل المجلدات.
- احذف **الملفات الثمانية** المكتوبة في `PROJECT-DOCS/PATCH-DELETE-OLD-FILES.txt` المرفق مع PATCH. هذه الملفات لا تدخل ضمن الوحدة الجديدة ولا يجب نشر نسختين متعارضتين.
- لا تحذف بقية أصول الموقع أو المجلدات. لا SQL جديد لهذا التحديث.

## التحقق على الموقع المنشور
- `https://YOUR-DOMAIN/episode-guides.js`: يجب أن يرجع JavaScript، لا 404 أو HTML.
- `https://YOUR-DOMAIN/episode-guides.css`: يجب أن يرجع CSS.
- `https://YOUR-DOMAIN/api/episode-guide?mal_id=21`: يجب أن يرجع JSON صحيحًا عندما تكون وظيفة Cloudflare والمصدر متاحين. 404 غالبًا يعني خلل نشر Function أو مسار البناء. 503 يعني عدم توفر المصدر/فشل الطلب؛ لا تدّع نجاح المصدر عند ذلك.
- افتح الصفحة الرسمية لأنمي لديك وقارن MAL ID وتطابق الأرقام. اختبر One Piece والأنميات التي لا تتوفر لها بيانات، وتأكد أن الحلقات تبقى متاحة عند فشل الدليل.
- جرّب Show More والبحث وHide Filler / Filler Only / Story Arc عند توفر مصدرية كافية.
- افحص Console وNetwork للتأكد من عدم وجود استدعاءات لأسماء v38/v39 القديمة.
- تأكد أن Watch/Download وAdmin وProfile وWallpapers لم تتأثر. اختبر مستخدمًا مسجلًا وزائرًا قبل اعتماد RLS/تتبع النشاط.

## فحوص محلية
- شغّل `node PROJECT-DOCS/TESTS/episode-guide-smoke.cjs` من جذر الموقع.
- تجربة Chromium تفاعلية عبر `python PROJECT-DOCS/TESTS/episode-ui-browser.py` ممكنة على جهاز يدعم تصفّح localhost؛ يستخدم Mock بدلاً من Supabase الحي. المحاولة في بيئة إعداد هذه الحزمة أعادت `ERR_BLOCKED_BY_ADMINISTRATOR` لكل URL، فلم تُعتمد كاختبار ناجح.
- Syntax check: `node --check episode-guides.js && node --check anime-details.js && node --check functions/api/episode-guide.js` (في بعض إعدادات Node يجب التعامل مع `export` في Pages Function كـES module).
- الاختبار المحلي لا يعني أن Pages Functions أو Supabase أو مواقع بيانات الأطراف الثالثة تعمل حيًا.


## تحديث 2026-11-14 — اعتماد بيانات الحلقات
1. استخدم FULL ZIP بدل القديم، أو استبدل فقط الملفات الموجودة في PATCH ZIP دون تغيير روابط الحلقات أو البيانات.
2. بعد النشر، افتح One Piece وانتقل إلى الحلقات: يفترض عدم وجود سطر مصدر/ترخيص طويل بين الفلاتر وأول أرك.
3. في أسفل Anime Details اضغط `Data Sources & Credits` وتحقق من الانتقال إلى قسم About ورؤية روابط FillerLists ورخصة CC BY-SA 4.0 وملاحظة التعديلات.
4. تحقق من عمل Story Arc / Episode Type كما كان سابقًا. في حال ظهور التعديل القديم نظف Cache أو أجرِ Hard Reload.
5. لا تحتاج إلى SQL أو إعادة استيراد بيانات؛ هذا تعديل نصوص/واجهة فقط.

## 2026-11-14 — PATCH تسريع خلفيات Profile
- الأساس: `TheEverything-PROFILE-BG-FIX-FULL.zip` أو النسخة المطابقة له على GitHub.
- ارفع محتويات PATCH إلى جذر المستودع، وتأكد من وصول `profile-background-fast.js` والملفين `profile-cover.js` و`profile-page-background.js` و`profile.html`.
- اختبر الخلفيتين بعد الدخول وبعد العودة إلى Profile في الجلسة نفسها، وبعد رفع/حذف صورة، ثم على حساب مختلف. راقب استجابة Network؛ أول تحميل يتطلب الشبكة.
- لا SQL. اختبار خدمة Supabase الحية وCloudflare وجهاز PWA الفعلي لم يجر محليًا.
