# Sendi System Truth Map

מטרת המסמך: למפות איפה נמצאת האמת של המערכת כרגע, מה נגזר ממנה, ומה נשמר מחוץ ל-state ועלול לייצר מידע ישן, כפילויות או קפיצות בסימולציה.

תאריך סקירה: 2026-04-25.

## תקציר מנהלים

האמת הקנונית של הדמו אמורה להיות `DeliveryState`, שמוגדר ב-`src/app/types/delivery.types.ts` ומוחזק דרך `DeliveryProvider`.

בפועל, `DeliveryProvider` עושה הרבה יותר מדי:

- מחזיק state גלובלי.
- טוען ושומר localStorage.
- מאפס מערכת.
- יוצר משלוחים.
- מריץ scheduler.
- מריץ auto-assign.
- מריץ מנוע תנועה גלובלי.
- כותב מיקומי שליחים ל-localStorage.

כלומר יש מקור אמת אחד לכאורה, אבל כמה מערכות משניות שמחזיקות אמת תפעולית משלהן. זה מקור מרכזי לבאגים שחוזרים אחרי איפוס, קפיצות מיקום, ושוני בין מה שה-LIVE מציג לבין מה שה-reducer יודע.

## מקור האמת הקנוני

### `DeliveryState`

מוגדר ב-`src/app/types/delivery.types.ts`.

שדות עיקריים:

- `isSystemOpen`
- `autoAssignEnabled`
- `timeMultiplier`
- `deliveries`
- `couriers`
- `shiftTemplates`
- `weeklyShiftConfig`
- `shifts`
- `restaurants`
- `customers`
- `activityLogs`
- `deliveryBalance`
- `stats`

זה צריך להיות מקור האמת היחיד לכל מצב עסקי: משלוחים, שליחים, משמרות, מסעדות, יתרה וסטטיסטיקות.

### Seed/reset

המצב ההתחלתי נבנה ב-`src/app/context/delivery-bootstrap.ts` דרך `createInitialDeliveryState`.

ברירת מחדל:

- מערכת סגורה: `isSystemOpen: false`.
- שיבוץ אוטומטי כבוי: `autoAssignEnabled: false`.
- זמן אמת: `timeMultiplier: 1`.
- אין משלוחים חיים.
- 24 שליחים seeded, כולם offline וללא משלוחים פעילים.
- מסעדות seeded עם קצב משלוחים לפי סוג.
- יתרת משלוחים התחלתית: `500`.

קצבי מסעדות:

- פיצה/המבורגר/סושי: משלוח אחד כל 6 דקות, עד 10 בשעה.
- איטלקי: משלוח אחד כל 12 דקות, עד 5 בשעה.
- סיני/תאילנדי/מקסיקני/ים תיכוני/בשרים/הודי/default: משלוח אחד כל 20 דקות, עד 3 בשעה.

## Provider: שכבת אמת מעורבת

קובץ: `src/app/context/delivery.context.tsx`.

תפקידים שנמצאים כרגע באותו מקום:

- Persistence: `sendi-delivery-state`.
- Epoch/reset sync: `sendi-delivery-state-epoch`.
- Restore/sanitize: `loadInitialState`, `sanitizeLoadedDeliveryState`.
- Delivery generator: `generateDelivery`.
- Delivery scheduler: `spawnEligibleDelivery`.
- Auto assign interval.
- Global progress engine interval.
- Reset flow.

נקודות חשובות:

- Scheduler רץ רק כשהמערכת פתוחה.
- tick כל 5 שניות, מחולק ב-`timeMultiplier`.
- יש מרווח גלובלי מינימלי של 12 שניות בין משלוחים.
- יש capacity דינמי למשלוחים פעילים לפי מספר מסעדות פעילות/שליחים במשמרת.
- המנוע הגלובלי מתקדם כל שנייה גם כש-LIVE לא פתוח, כל עוד האפליקציה רצה.

## Reducer: שכבת שינוי עסקית

קובץ: `src/app/context/delivery.reducer.ts`.

פעולות מרכזיות:

- System:
  - `TOGGLE_SYSTEM`
  - `TOGGLE_AUTO_ASSIGN`
  - `SET_TIME_MULTIPLIER`
  - `RESET_SYSTEM`

- Deliveries:
  - `ADD_DELIVERY`
  - `ASSIGN_COURIER`
  - `UNASSIGN_COURIER`
  - `UPDATE_STATUS`
  - `UPDATE_DELIVERY`
  - `COMPLETE_DELIVERY`
  - `CANCEL_DELIVERY`
  - `DELETE_DELIVERY`
  - `REORDER_DELIVERY`

- Couriers/shifts:
  - `UPDATE_COURIER_STATUS`
  - `START_COURIER_SHIFT`
  - `END_COURIER_SHIFT`
  - `CREATE_SHIFT_TEMPLATE`
  - `UPDATE_SHIFT_TEMPLATE`
  - `DELETE_SHIFT_TEMPLATE`
  - `ENSURE_WEEK_SHIFTS`
  - `ASSIGN_COURIER_TO_SHIFT`
  - `START_SHIFT_ASSIGNMENT`
  - `END_SHIFT_ASSIGNMENT`

- Restaurants:
  - `ADD_RESTAURANT`
  - `TOGGLE_RESTAURANT`
  - `UPDATE_RESTAURANT`
  - `REMOVE_RESTAURANT`
  - `SET_RESTAURANTS`

ה-reducer הוא המקום הנכון לשינויים עסקיים, אבל חלק מהשינויים עדיין מגיעים אליו אחרי חישובים שנעשו מחוץ לו ב-Provider או במסכי UI.

## אמת כפולה/נגזרת

### משלוח פעיל לשליח

כיום יש שתי אמיתות:

- `delivery.courierId`
- `courier.activeDeliveryIds`

הן מתעדכנות יחד ברוב הזרימות, אבל זה עדיין duplication. אם action אחד יעדכן רק צד אחד, שליח יכול להיראות פנוי במסך אחד ועסוק במסך אחר.

המלצה לשלב הבא: לבחור אמת אחת. עדיף `delivery.courierId/status` כאמת, ו-`activeDeliveryIds` כ-derived selector או cache שנבנה ב-sanitizer בלבד.

### סטטוס משלוח

כיום יש:

- `delivery.status`
- `assignedAt`, `pickedUpAt`, `deliveredAt`
- `coupled_time`, `started_pickup`, `arrived_at_rest`, `took_it_time`, `started_dropoff`, `arrived_at_client`, `delivered_time`

זה נותן תאימות לדאטה חיצוני, אבל כרגע גם ה-state machine וגם timestamps מנהלים אמת. צריך להגדיר state machine ברור:

`pending -> assigned -> at_pickup/waiting_pickup -> delivering -> delivered/cancelled`

ואז timestamps יהיו תוצר של transitions, לא מקור אמת עצמאי.

### כסף

קובץ טוב שכבר קיים: `src/app/utils/delivery-finance.ts`.

הוא מאחד שדות legacy:

- מחיר לקוח: `price` / `sum_cash`
- מחיר מסעדה: `rest_price` / `restaurantPrice`
- תשלום שליח: `runner_price` / `courierPayment`
- טיפ: `runner_tip`
- עמלה: `commissionAmount` או חישוב fallback

המלצה: כל המסכים חייבים להשתמש רק ב-helpers האלה, לא לגשת ישירות לשדות כסף.

## LIVE ומסלולים

### מנוע תנועה

קובץ: `src/app/live/live-simulation-engine.ts`.

האמת התנועתית כרגע:

- מקבל `DeliveryState`.
- מקבל `currentPositions`.
- מקבל `routeStopOrders`.
- מחזיר:
  - מיקומי שליחים חדשים.
  - עדכוני phase.
  - עדכוני status.

הוא משתמש ב-`buildDefaultRouteStopIds` וב-`routeStopOrders` כדי לבחור תחנה הבאה.

### Route geometry

קובץ: `src/app/live/route-geometry.ts`.

משמש גם למפה וגם למנוע:

- `buildSimulatedGpsRoutePath`
- `getRoutePathDistanceKm`
- `advanceAlongRoutePath`

זה שיפור טוב: לפחות המפה והמנוע כבר משתמשים באותה גאומטריה מדומה.

### LIVE page

קובץ: `src/app/pages/live-manager.tsx`.

מחזיק state מקומי חשוב:

- `routeStopOrders`
- `courierPositions`
- `simPositions`
- UI selection/highlight

נקודת סיכון גדולה: יש שני מקורות מיקום:

- engine פנימי דרך localStorage: `sendi-live-manager-courier-positions`.
- WebSocket חיצוני: `ws://localhost:8765`.

ב-`useLiveManagerData`, אם לשליח יש משלוח פעיל והמנוע נתן מיקום, משתמשים במנוע. אם אין משלוח פעיל, המסך יכול להשתמש ב-`simPositions` מה-WebSocket. זה מסביר תחושת קפיצה/אי-עקביות כשמעבירים בין מצבים.

### Manual assignment

קובץ: `src/app/live/use-live-assignment-flow.ts`.

בעת אישור שיבוץ:

- בונה `pickupBatchId`.
- בונה `smartStops`.
- כותב `routeStopOrders`.
- קורא `assignCourier` לכל משלוח נבחר.

הבעיה המבנית: route plan נוצר ב-UI ונשמר ב-localStorage, לא ב-`DeliveryState`. כלומר התוכנית של המסלול היא לא חלק מהאמת העסקית.

המלצה: להכניס `routePlan` לתוך state/reducer, או לפחות ליצור domain object כגון `CourierRoutePlan`.

## localStorage inventory

Business/persistence:

- `sendi-delivery-state`: state מלא של המערכת.
- `sendi-delivery-state-epoch`: זיהוי reset/סנכרון טאבים.

LIVE:

- `sendi-live-manager-route-stop-orders`: סדר תחנות למסלולים.
- `sendi-live-manager-courier-positions`: מיקומי שליחים מהמנוע.
- `sendi-live-manager-courier-positions-ts`: timestamps למיקומים.
- `sendi-live-manager-on-shift-only`: פילטר שליחים ב-LIVE.
- `liveManagerPanelSize`: גודל פאנל LIVE.

Lists/UI:

- `deliveries-column-order`
- `deliveries-visible-columns`
- `couriers-visible-columns-v1`
- `restaurants-column-order-v3`
- `restaurants-visible-columns-v1`
- `shifts-collapsed-templates`
- column presets דרך `column-selector`

Zones:

- `delivery_zones_v1`

Auth/theme/language:

- `isAuthenticated`
- theme/language keys דרך contexts נפרדים.

Reset כרגע מנקה הרבה מפתחות דרך `RESET_STORAGE_KEYS` ו-prefixes, וזה טוב. אבל יש עדיין צורך להגדיר רשימת storage רשמית אחת כדי שלא יצוצו keys חדשים שלא מתאפסים.

## זרימות מערכת

### איפוס

`SettingsPage -> resetSystem -> createInitialDeliveryState -> clearSystemResetStorage -> RESET_SYSTEM -> reload`

מה נכון:

- יוצר state חדש.
- מאפס counters/refs.
- מנקה keys מרכזיים.
- מעלה epoch חדש.
- reload כדי לסגור effects ישנים.

מה עדיין מסוכן:

- כל localStorage key חדש שלא נכנס לרשימה או prefix עלול להישאר.
- אם יש מקור חיצוני כמו WebSocket, reset לא שולט בו.

### פתיחת קבלת משלוחים

`TOGGLE_SYSTEM -> scheduler starts -> spawnEligibleDelivery -> ADD_DELIVERY`

Guardים:

- מערכת פתוחה.
- יתרה חיובית.
- capacity פעילה.
- מרווח גלובלי.
- מסעדה פעילה.
- interval פר מסעדה.
- cap שעתי פר מסעדה.

כפילות:

- גם scheduler וגם reducer בודקים capacity/קצב מסעדה. זה לא רע כ-defense, אבל צריך לאחד חישוב לתוך פונקציה אחת.

### שיבוץ ידני

`LIVE UI -> smartStops/localStorage -> ASSIGN_COURIER`

ה-reducer:

- בודק `canCourierAcceptDelivery`.
- קובע `courierId`.
- קובע `assignedAt`, `coupled_time`.
- קובע `pickupBatchId`.
- מחשב ETA למסעדה וללקוח.
- מוסיף משלוח ל-`courier.activeDeliveryIds`.

הבעיה: סדר התחנות לא נשמר כחלק מה-action העסקי, אלא localStorage/UI.

### תנועה ומסירה

`DeliveryProvider interval -> advanceLiveSimulation -> UPDATE_DELIVERY / COMPLETE_DELIVERY`

המנוע:

- מוצא תחנה הבאה לפי route stop order.
- מזיז שליח.
- כשהגיע למסעדה: מסמן arrived או delivering אם מוכן.
- כשהגיע ללקוח: `COMPLETE_DELIVERY`.

הבעיה: המנוע מחזיר partial updates, ואז Provider מתרגם ל-actions. חלק מה-state machine נמצא במנוע וחלק ב-reducer.

## מוקדי סיכון לפי חומרה

1. Provider מנופח מדי
   - אותו קובץ מנהל state, persistence, reset, generator, scheduler, auto assign ותנועה.
   - שינוי קטן שם יכול לשבור הרבה אזורים.

2. route plan מחוץ ל-state
   - `routeStopOrders` נשמר ב-LIVE/localStorage ולא ב-reducer.
   - זה מסביר הבדלים בין "מה האלגוריתם תכנן" לבין "מה המערכת זוכרת".

3. שני מקורות מיקום
   - מנוע פנימי + WebSocket חיצוני.
   - צריך להחליט מי האמת בזמן משלוח חי.

4. כפילות `courier.activeDeliveryIds` מול `delivery.courierId`
   - פוטנציאל לסטטוס שליח שגוי.

5. כפילות lifecycle/timestamps
   - `status` + הרבה שדות זמן legacy.
   - צריך reducer transitions מסודרים.

6. capacity/interval מחושבים בכמה מקומות
   - scheduler, reducer, bootstrap.
   - צריך domain helper אחד.

7. localStorage לא מנוהל דרך registry אחד
   - יש keys מפוזרים במסכים.
   - reset צריך מקור אמת אחד למפתחות.

8. Customers כמעט לא משתתפים באמת
   - `customers` seeded אבל משלוחים שנוצרים לא מעדכנים customer aggregates.

## החלטות מומלצות לשלב 2

## מה כבר יושם בשלב ייצוב 1

1. localStorage ו-reset
   - נוסף registry אחד: `src/app/context/delivery-storage.ts`.
   - `DeliveryProvider`, LIVE, משלוחים, שליחים, משמרות, מסעדות ואזורי משלוח משתמשים באותם keys.
   - reset מנקה דרך רשימת keys/prefixes אחת במקום רשימות מפוזרות.

2. route plan כמקור אמת
   - נוסף `courierRoutePlans` ל-`DeliveryState`.
   - LIVE עדיין משקף ל-localStorage לתאימות, אבל מקור האמת הוא state/reducer.
   - מנוע התנועה הגלובלי משתמש עכשיו ב-`stateRef.current.courierRoutePlans`, כך שהוא ממשיך להתחשב במסלול גם כשה-LIVE לא פתוח.

3. invariant בין משלוחים לשליחים
   - נוסף `delivery-state-invariants.ts`.
   - אחרי כל reducer action המערכת גוזרת מחדש `courier.activeDeliveryIds` וסטטוס `busy/available` מתוך המשלוחים הפעילים.
   - זה מצמצם מצבים שבהם שליח נראה פנוי למרות שיש לו משלוח, או להפך.

4. אימות
   - `npm run build` עבר בהצלחה.
   - `/live` ו-`/restaurants` מחזירים `200 OK` מהשרת המקומי.
   - לוג הדפדפן המקומי עדיין הכיל שאריות HMR ישנות בזמן הבדיקה, לכן מומלץ לרענן/להפעיל מחדש dev server לפני בדיקת UI עמוקה.

## שלב 2 המעודכן אחרי הייצוב

1. לפרק את `DeliveryProvider` לארבעה מודולים:
   - `delivery-persistence`
   - `delivery-scheduler`
   - `delivery-generator`
   - `delivery-progress-engine`

2. להפוך את route plan למודל עשיר:
   - `CourierRoutePlan`
   - `RouteStop`
   - `plannedRoute`
   - `actualTrack`

3. לבנות state machine סגור למשלוחים:
   - action אחד לכל מעבר קריטי.
   - timestamps מתעדכנים רק בתוך transition.
   - לצמצם `UPDATE_DELIVERY` חופשי בשדות lifecycle.

4. להפריד planned GPS מול actual GPS:
   - planned route מוצג כקו מקווקו.
   - actual courier track מוצג כמסלול נסיעה בפועל.
   - אם שליח "חותך סמטה", זה צריך להופיע כסטייה בפועל ולא לשכתב את התכנון.

5. לבנות בדיקות תרחיש:
   - reset נקי.
   - מסעדה אחת + שליח אחד + משלוח אחד.
   - שליח עם שני משלוחים, כולל איסוף ואז שתי מסירות.
   - תנועה ממשיכה מחוץ ל-LIVE.
   - route stop order נשמר אחרי reload.

## החלטות מומלצות לשלב 2 - גרסה מקורית

1. להוציא מ-`DeliveryProvider` ארבעה מודולים:
   - `delivery-persistence`
   - `delivery-scheduler`
   - `delivery-generator`
   - `delivery-progress-engine`

2. להכניס route plan ל-domain:
   - `CourierRoutePlan`
   - `RouteStop`
   - `plannedRoute`
   - `actualTrack`

3. להפוך localStorage ל-registry אחד:
   - רשימת keys רשמית.
   - clear/reset ממקום אחד.
   - הפרדה בין business persistence לבין UI preferences.

4. לבחור אמת אחת לעומס שליח:
   - עדיפות: לגזור עומס מ-`deliveries`.
   - אם משאירים `activeDeliveryIds`, לעדכן רק דרך reducer invariant אחד.

5. לכתוב state machine למשלוחים:
   - action אחד לכל transition.
   - timestamps מתעדכנים רק בתוך transition.
   - בלי `UPDATE_DELIVERY` חופשי לסטטוסים קריטיים.

6. לבנות בדיקות תרחיש:
   - reset נקי.
   - מסעדה אחת + שליח אחד + משלוח אחד.
   - שליח עם שני משלוחים.
   - שליח ממשיך תנועה מחוץ ל-LIVE.
   - route stop order נשמר אחרי reload.
