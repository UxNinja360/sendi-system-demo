# הוראות לעדכון Sidebar

עדכנתי את ה-imports להוסיף `User` מ-lucide-react.

עכשיו צריך להוסיף את הקישור "הגדרות חשבון" ב-3 מקומות ב-sidebar.tsx:

## 1. Mobile Menu (סביב שורה 697-715)
אחרי הקישור "מראה" ולפני "הגדרות מערכת", הוסף:
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

## 2. Desktop Collapsed (סביב שורה 729-747)
אחרי הקישור ל-`/settings` ולפני `/help`, הוסף:
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

## 3. Desktop Expanded (סביב שורה 750-770)
אחרי הקישור ל-`/settings` ולפני `/help`, הוסף:
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
