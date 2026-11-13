# سياق المشروع — المواصفات المطلوبة

## المعلومات الثابتة
- الاسم: **The Everything**. أقسام Anime، Wallpapers، User Profiles، Admin Dashboard، وقسم Films موجود بملفات أولية/قيد التطوير.
- الواجهة: HTML + CSS + JavaScript. الاستضافة: GitHub → Cloudflare Pages. قواعد البيانات/المصادقة: Supabase / Supabase Auth. بيانات الأنمي: Tenrai (مرتبطة بمعرف MAL). PWA للأندرويد وiOS.
- الهوية: Black / Dark Navy / Purple / Blue / Pink، تصميم متجاوب سريع، مؤثرات خفيفة. لا مكتبات ثقيلة بلا داعٍ.
- واجهة المستخدم ونصوصها بالإنجليزية؛ النقاش والتعليمات مع المالك بالعربية.

## Anime / Home
- Home نظيفة مع صور Aizen وSpider-Man في Hero، ومقترح Featured Anime carousel لخمس عناصر. Latest Anime وLatest Episodes مكانهما صفحة Anime، لا Home.
- مكتبة آلاف الأنميات (حجم مستهدف نحو 6,000+). بحث بأسماء English/Japanese/Alternative، Filters وSorting وPagination؛ 48 بطاقة/صفحة كانت سياسة سابقة. لا تحمّل 6,000 سجل وصورة دفعة واحدة بلا سبب.
- تفاصيل الأنمي بالترتيب: **Episodes → Parts/Related Anime → Characters**. الشخصيات الخمس الأولى ثم Show All. العلاقات Prequel/Sequel/Alternative/Other ويجب ألا تفتح عنوانًا خاطئًا.
- Latest/Featured والجدول الأسبوعي مستقل عن التفاصيل؛ اجعل الجدول يعكس الأنميات المعروضة حاليًا لا سنة الإصدار وحدها.

## Episodes / Video
- اختيار الحلقة يفتح `episode-choice.html` لخياري **Watch Episode / Download Episode**، ثم `watch.html` لتشغيل مسموح به. سيرفرات VOE وVidea وHGCloud، Fullscreen تابع لدعم iframe والسيرفر الخارجي.
- VOE watch URL ليس رابط MP4 مباشر. تنزيل ملف فقط إذا الرابط المباشر صحيح ومصرّح به.
- للعضو المسجل: تسجيل فتح المشاهدة وطلب التنزيل ببيانات خاصة به وRLS؛ **فتح صفحة ليس إكمال مشاهدة، وطلب تنزيل ليس إكمال تنزيل**. الزائر لا يسجل نشاطًا.
- لا تغير ترقيم الحلقات الأصلي أو روابط الفيديو المحفوظة.

## Auto Filler / Story Arcs
- التصنيف من بيانات مصدرية فقط، آليًا: FILLER، MIXED، RECAP، ANIME CANON. Canon العادية قد لا تحتاج شارة.
- الفلاتر All Episodes / Hide Filler / Canon Only / Filler Only؛ وStory Arc عند توفر حدود موثوقة.
- إذا البيانات غير متوفرة، الحالة Unknown، ولا اختراع Canon أو أركات. لا تطبق فهرس ترقيم الأنمي الأصلي على مواسم مستقلة تبدأ من 1.
- وحدة الواجهة الموحّدة `episode-guides.js` / `episode-guides.css` ونقطة API `functions/api/episode-guide.js`، والمعلومات متاحة عند فتح الأنمي فقط.

## Admin / Wallpapers / Account
- إضافة أنمي منفرد وبالجملة (500 عنوان/دفعة) مع تخطي المكرر والحفاظ على القديم وجلب شخصيات الجديد تلقائيًا؛ الإيقاف والاستئناف عند تعثر API.
- Admin Episodes يجب ألا يحمّل جميع الحلقات، ويدعم البحث وإضافة مفردة/جماعية وسيرفرات متعددة وPreview ومنع التكرارات.
- Wallpapers منفصلة، مفضلة ورفع وتنزيل وصور مستخدم وتوافق للجوال. Profile: avatar/cover/library/watch activity.
- صفحات About, Contact, Privacy, Terms, DMCA والتنقل والتذييل مطلوبة؛ قبول AdSense لا يمكن ضمانه.

## قاعدة النطاق
المزايا المذكورة أعلاه **مطالب ومرجع تصميم**، وليست تأكيدًا أن كل وظيفة مكتملة أو متصلة بالإنتاج. اقرأ الكود واختبر كل جزء قبل اعتماد حالته.
