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
