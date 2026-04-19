# הוראות להוספת קישור "הגדרות חשבון" לתפריט הצד

## קובץ לעריכה
`/src/app/components/layout/sidebar.tsx`

## השינויים הנדרשים

צריך להוסיף את הקישור "הגדרות חשבון" ב-**3 מקומות** בקובץ:

---

### 1. תפריט מובייל (Mobile Menu)
**מיקום:** אחרי שורה 706 (אחרי סגירת div של "מראה")

**הקוד להוספה:**
```tsx
              <div 
                onClick={() => handleNav('/account')}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                }`}
              >
                <User size={20} className="stroke-[1.5px]" />
                <span className="text-sm font-medium">הגדרות חשבון</span>
              </div>
```

---

### 2. תפריט דסקטופ מכווץ (Desktop Collapsed)
**מיקום:** אחרי שורה 738 (אחרי סגירת div של Settings)

**הקוד להוספה:**
```tsx
                <div 
                  onClick={() => handleNav('/account')}
                  className={`flex items-center justify-center p-2.5 cursor-pointer transition-colors rounded-md mx-1 ${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }`}
                  title="הגדרות חשבון"
                >
                  <User size={20} className="stroke-[1.5px]" />
                </div>
```

---

### 3. תפריט דסקטופ מורחב (Desktop Expanded)
**מיקום:** אחרי שורה 760 (אחרי סגירת div של Settings)

**הקוד להוספה:**
```tsx
                <div 
                  onClick={() => handleNav('/account')}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                    location.pathname === '/account' ? 'bg-[#0d0d12] dark:bg-[#262626] text-[#fafafa] dark:text-[#fafafa]' : 'text-[#36394a] dark:text-[#d4d4d4] hover:bg-[#f5f5f5] dark:hover:bg-[#404040]'
                  }`}
                >
                  <User size={20} className="stroke-[1.5px]" />
                  <span className="text-sm font-medium">הגדרות חשבון</span>
                </div>
```

---

## איך לזהות את המקום הנכון?

### למקום 1 (Mobile):
חפש את הקוד:
```tsx
              </div>
              <div 
                onClick={() => handleNav('/settings')}
```
והוסף את קוד חשבון **לפני** ה-div של settings.

### למקום 2 (Desktop Collapsed):
חפש את הקוד:
```tsx
                </div>
                <div 
                  onClick={() => handleNav('/help')}
```
בתוך הבלוק של `{isCollapsed ? (` והוסף את קוד חשבון **לפני** ה-div של help.

### למקום 3 (Desktop Expanded):
חפש את הקוד:
```tsx
                </div>
                <div 
                  onClick={() => handleNav('/help')}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors mt-1 ${
```
בתוך הבלוק של `) : (` והוסף את קוד חשבון **לפני** ה-div של help.

---

## בדיקה
לאחר השינוי, תיבדק שהקישור מופיע:
1. במובייל - בתפריט הצד
2. בדסקטופ - כשהתפריט פתוח (expanded)
3. בדסקטופ - כשהתפריט מכווץ (collapsed)

---

## שים לב!
- ה-icon `User` כבר מיובא בקובץ (שורה 30) ✅
- הנתיב `/account` כבר מוגדר ב-routes.tsx ✅
- הקומפוננטה AccountSettings כבר קיימת ומוכנה לשימוש ✅
