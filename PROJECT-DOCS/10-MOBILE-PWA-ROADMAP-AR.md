> تحديث تنفيذ 2026-11-14: تم تنفيذ أول ميزتين من Phase A (مكتبة المستخدم فقط + شريط التنقل على Episode Options). اقرأ `11-PHASE-A-PAIR-01-AR.md` للحالة الفعلية؛ بقيت بقية بنود Phase A/Phase B مخططة.

# The Everything — تقرير مقارنة منصات الأنمي وخطة تطوير تجربة PWA على الجوال

- تاريخ البحث والفحص: 2026-11-14.
- المصدر المحلي: ملفات `TheEverything-CREDITS-FULL.zip` المفكوكة في مجلد `theeverything_work`، آخر نسخة متاحة في المحادثة أثناء الدراسة.
- نوع العمل: **بحث وتدقيق ملفات فقط؛ لم تُنفذ تغييرات في وظائف الموقع ولا في Supabase.**
- اللغة: المالك بالعربية، لكن **جميع واجهات الموقع بالإنجليزية فقط**.
- منهجية المقارنة: عينة ممثلة من مواقع وتطبيقات مهمة، وليست ادعاءً بفحص جميع مواقع الأنمي. حالة الميزة تعني ما يظهر في كود ZIP الحالي، ولا تثبت النشر أو نجاحها الفعلي على Cloudflare.

## 1. أنظمة المنافسين والميزات المفيدة

| المنصة | ما أمكن توثيقه | فكرة مناسبة لموقعنا |
| --- | --- | --- |
| Crunchyroll | Watchlist/Crunchylists، Continue Watching، Mark as Watched، خيارات ترجمة وصوت، توصيات، Skip Intro، AutoPlay، ملفات متعددة | Continue Watching حقيقي، قائمة شخصية، next episode، UI مشغل متجاوب. انتبه: بعض الميزات تتطلب التحكم بالمشغل. |
| AniList | قوائم مشاهدة بحالة وتقدم وتقييم، إحصاءات، تخصيص، توصيات ومجتمع | درجات ومتابعة تقدم وحالات Paused/Dropped وقوائم شخصية وإحصاءات. |
| AnimeSchedule.net | جدول أسبوعي بحسب اليوم والمنطقة، مواعيد خام/مترجم/مدبلج، تنبيهات | جدول شخصي وتنبيهات حسب المتابعة والتوقيت المحلي مع بيان مصدر التوقيت. |
| Netflix | Resume/Autoplay/Smart Downloads في تطبيقات رسمية | استكمال الحلقات، التحكم في AutoPlay. التنزيل الذكي أوفلاين غير مضمون مع مضيف VOE/iframe خارجي ويحتاج حقوقًا وتحكمًا مباشرًا في ملفات الفيديو. |

مراجع رسمية ومباشرة:
- https://help.crunchyroll.com/hc/en-us/articles/22728708616852-Getting-started-on-Crunchyroll-website
- https://help.crunchyroll.com/hc/en-us/articles/31320247305748-How-do-I-mark-episodes-seasons-and-shows-as-watched
- https://help.crunchyroll.com/hc/en-us/articles/18184740052628-How-do-I-add-shows-to-my-Watchlist-Crunchylist
- https://help.crunchyroll.com/hc/en-us/articles/20369940738708-What-is-the-Skip-Intro-feature
- https://anilist.co/
- https://animeschedule.net/
- https://help.netflix.com/en/node/101262
- https://help.netflix.com/en/node/121518

## 2. المميزات الموجودة فعليًا في الملفات

| مجال | حالة ملفات المشروع | أدلة محلية |
| --- | --- | --- |
| قابلية التثبيت | Manifest + standalone + icons 192/512 + install helper | `manifest.webmanifest`, `mobile-pwa.js`, `icons/` |
| واجهة تبويب سفلي | أربعة تبويبات Home / Anime / Wallpapers / Profile على شاشة أقل من 768px | `mobile-pwa.js` |
| Offline fallback | صفحات `index.html`, `anime.html`, `wallpaper.html` فقط عند تعذر الشبكة، **ولا يوجد حفظ أصول كافية للمشاهدة الأوفلاين** | `service-worker.js` |
| بحث الأنمي | بحث بأسماء متعددة + تصنيفات + ترتيب، صفحة Supabase بحجم 48 | `anime.js`, `anime-title-search-v32.js` |
| جدول عرض | جدول عام حسب اليوم، يقتصر على Ongoing من سنة الإصدار الحالية، بدون ضمان دقة وقت الحلقة | `weekly-schedule-v24.js`, `schedule.html` |
| مكتبة المستخدم | Watching / Completed / Plan to Watch + Favorite فقط | `anime-library.js` |
| النشاط | تسجيل فتح حلقة أو طلب تنزيل، وليس إكمال مشاهدة أو ثانيه الاستكمال | `episode-activity-v37.js`, `watch.js` |
| Player | VOE / فيديو مباشر / iframe متنوع، server switching وnext/previous؛ fullscreen مقيد بالمضيف | `watch.js`, `episode-data.js` |
| Filler/Arcs | موجود للأنميات المدعومة مع مصدر بيانات خارجي والكاش، لا إسناد لمحتوى غير موثق | `episode-guides.js`, `anime-details.js` |

## 3. فجوات فعلية أو محدودة وجدناها

1. **أداء المكتبة والبروفايل:** `my-anime.html` و`profile.html` يحملان `anime-data.js` الذي يجلب كل صفوف الكتالوج على دفعات متسلسلة من 500 وبـ`select=*`، ثم `anime-library.js` يطابقها مع سجلات المستخدم؛ هذا مكلف مع 6,000 سجل تقريبًا (قد يصل إلى 13 طلبًا على الأقل). الأفضل جلب مكتبة المستخدم نفسها ثم بيانات أنميها فقط باستعلام أو View مخصص ومفهرس.
2. **التقدم الحقيقي:** لا توجد خاصية موثقة لتسجيل `currentTime` والفيديو المفتوح من المشغل. تسجيل فتح الحلقة ≠ مشاهدة الحلقة كاملة. مع iframe خارجي (VOE وغيره) لا يمكن قراءة وقت الفيديو بسبب Same-Origin Policy إلا إذا وفر المشغل API رسمية تسمح بذلك.
3. **حالات القائمة:** لا توجد حالتا Paused/Dropped في واجهة المكتبة الحالية ولا حقل `episode progress` ظاهر هنا.
4. **الإشعارات:** لا يوجد `PushManager` أو `serviceworker.push` أو `Notification.requestPermission` ولا تخزين اشتراكات push في الملفات المفحوصة.
5. **تحديثات PWA:** الـcache الحالي يعتمد على رقم ثابت للـSW و3 صفحات HTML فقط؛ لا يوجد تطبيق واضح لاستراتيجية versioned static assets / offline fallback غني / update available message.
6. **تجربة الخيارات:** `episode-choice.html` لا يحمّل `mobile-pwa.js` أو `mobile-pwa.css`، مما يقطع تنقل التطبيق الموحد في صفحة مهمة. يحتاج تعديلًا حذرًا حتى لا يغطي التبويب السفلي أزرار المشاهدة/التنزيل.
7. **ملاحة التبويب:** `mobile-pwa.js` لا يتعرف على `episode-choice` بوصفه تبويب Anime عند تفعيل التنقل لاحقًا، و`films` و`schedule` غير ممثلين في خرائط التبويب الحالية.
8. **جدول شخصي:** الصفحة الحالية تسرد عددًا محدودًا حسب اليوم والسنة، لكن لا تعرض بالضرورة حسابًا تنازليًا بالدقيقة أو قائمة متابعات الشخص أو وقت صدور ترجمته، ولا تدّعي ذلك.
9. **المراجعات والتوصيات:** لا توجد منظومة مراجعات/تعليقات ولا Recommend engine كاملة متحققة من الكود (يحتاج فحص قواعد Supabase قبل التنفيذ).
10. **Shortcut App Manifest:** `manifest.webmanifest` لا يحتوي على `shortcuts`، ويمكن إضافتها على الأنظمة التي تدعمها، خصوصًا Android؛ لا ينبغي ضمانها على iPhone.

## 4. التصميم المستهدف لجوال The Everything

### Home عند فتح التطبيق من الأيقونة
1. Header صغير: الشعار + بحث + أيقونة حساب/إشعارات (لا تستنزف مساحة الشاشة).
2. Continue Watching: عودة للحلقة الأخيرة مع التمييز بين «Opened» و«Completed»؛ إن لم يتوفر وقت مشاهدة داخل iframe، الزر هو **Resume episode** دون ادعاء حفظ الدقيقة.
3. New Episodes in My List: آخر الحلقات المتوفرة للمستخدم حسب المصدر المخزن في Supabase.
4. Trending/Featured / For You عند توفر بيانات ذات معنى موثوق.
5. Week Schedule strip مع يوم اليوم والوقت المحلي.
6. بطاقات مناسبة للمس، مع Lazy Images وSkeletons ودون حجب واجهة الصفحة أثناء انتظار API.

### شريط التنقل المقترح (خمسة أقسام)
Home | Anime | Schedule | Wallpapers | My List

- البروفايل متاح دائمًا من أيقونة الحساب في Header.
- لا تطبق هذا تغييرًا فورًا دون اختبار حجم الشاشة وإمكانية الوصول.
- احتفظ بـBack داخل القصة Episode → Options → Watch/Back → Anime Details، دون استخدام `history.back()` العشوائي.

### My List
Watching, Plan to Watch, Completed, Paused, Dropped, Favorites؛ أزرار `+1 Episode`, `Mark as Watched`, `Next Episode` عند وجود سجل متوافق؛ كل تغيير عبر Supabase Auth وRLS.

### Schedule
My Schedule / All Schedule، التاريخ حسب منطقة المستخدم، «New episode» مستند إلى رصيد حلقات فعلي، «Airing at» مستند إلى وقت بث موثق وليس افتراضًا من سنة الأنمي.

## 5. ترتيب التنفيذ الموصى به

**Phase A — الأساس والأداء (قبل الميزات الجديدة):**
- إصلاح my-anime/profile لعدم تحميل الكتالوج كاملًا.
- توحيد navigation بين Anime Details وEpisode Choice وWatch، مع safe-area على الجوال ومنع أزرار محجوبة.
- جعل PWA يحمّل shell ثابتًا وأصول CSS/JS اللازمة للأوفلاين الأساسي فقط، دون وضع إعلانات أو auth أو فيديو في cache.
- تحسين آلية تحديث Service Worker، وإظهار تحديث التطبيق عند الحاجة، دون تفريغ بيانات المستخدم.
- فحص install standalone على iPhone وAndroid فعليًا.

**Phase B — أهم ميزات الأنمي:**
- أضف سجل حالة watched منفصل عن سجل opened، وتقدم الحلقة بحسب الحساب، مع ترحيل SQL غير مدمر ومراجعة RLS.
- صمم Continue Watching وNext Episode وMy List على الشاشة الرئيسية، مع graceful fallback لسيرفر iframe.
- أضف Paused/Dropped واختيار تقييم الأنمي، مع اختبارات مخطط Supabase الحالي قبل أي SQL.
- اجعل My Schedule شخصيًا، وحافظ على القيود الحالية وعدم اختلاق مواعيد.

**Phase C — خصائص التطبيق:**
- إشعارات اختيارية للحلقات الجديدة مع تفعيل من ضغط المستخدم وموافقة صريحة، خدمة push واشتراكات خاصة مع RLS، rate limits وإمكانية الإلغاء.
- مزايا Android manifest shortcuts، وضبط icons والسلوك المناسب لكل نظام.
- تخصيص التوصيات وقوائم المستخدم والتقييمات والمراجعات لاحقًا؛ لا تبدأ بمجتمع مفتوح قبل وضع أدوات الإبلاغ والإشراف.

## 6. حدود تقنية وقانونية لا يجوز تجاوزها

- iPhone يدعم Web Push لتطبيقات Home Screen منذ iOS 16.4؛ يجب تثبيت التطبيق ومنح الإذن طوعًا، ولا تضمن وصول كل تنبيه أو أن جميع الأجهزة تدعم كل خيار.
- `Add to Home Screen` على iOS يتم عادة من قائمة المشاركة؛ لا يوجد prompt install عام من الموقع مثل بعض متصفحات Android.
- PiP/Fullscreen/Skip Intro/Auto resume مستحيلة أو محدودة في بعض embeds إذا لم يمنح مضيف الفيديو تحكمًا برمجيًا؛ وجود `iframe allow=` لا يضمن قدرة الموقع على التحكم في الفيديو الداخلي.
- لا تخزن VOE أو محتوى أوفلاين غير مصرح باستخدامه؛ لا تُعامل روابط صفحات VOE كملفات MP4 مباشرة.
- حافظ على بيانات Supabase، فرض RLS الحقيقي، التوافق مع Cloudflare Pages، وكل نصوص الواجهة بالإنجليزية فقط.

مراجع تقنية:
- https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- https://developer.apple.com/documentation/safari-release-notes/safari-16_4-release-notes
- https://web.dev/learn/pwa/installation
- https://web.dev/learn/pwa/enhancements
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/fullscreen
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/picture-in-picture

## 7. شروط قبول تسبق إطلاق تحديث الجوال

- لا يبدأ تحميل ملفات 6,000 أنمي عند فتح My List أو Profile.
- تظهر أول شاشة قابلة للتفاعل قبل انتهاء كل الطلبات الثانوية.
- حفظ/إلغاء/تحديث تقدم المستخدم يكون صحيحًا مع وضع Guest وLogged-in وRLS.
- التنقل متسق عند فتح التطبيق من Home Screen، وبعد العودة من VOE وOptions.
- يتم اختبار iPhone Safari standalone وAndroid Chrome installed PWA على الأقل على أجهزة حقيقية أو اختبار متصفح موثق.
- لا تظهر شارات Filler أو مواعيد عرض أو تقدم فيديو غير متحقق منها.
- لا SQL مدمر ولا حذف فيديوهات أو أنميات؛ كل تطوير في ملفين FULL/PATCH مع الوثائق إن تعلق بالكود.
