# 🚀 פריסה קבועה (חינם) — GitHub + Render.com

מדריך להעלאת שרת הקליקרים לאוויר עם כתובת HTTPS **קבועה**, בלי שהמחשב שלך יצטרך להישאר דלוק.

---

## שלב 1 — העלאה ל-GitHub

הריפו כבר אותחל ובוצע commit ראשון (על ידי Claude). נותר רק לדחוף אותו ל-GitHub:

1. היכנס ל-[github.com/new](https://github.com/new), צור ריפו חדש בשם `yemot-clickers` (ריק — בלי README).
2. בתיקיית הפרויקט הרץ (החלף `USERNAME` בשם המשתמש שלך):
   ```bash
   git remote add origin https://github.com/USERNAME/yemot-clickers.git
   git branch -M main
   git push -u origin main
   ```
   > אם יש לך **GitHub Desktop** — פשוט "Add Local Repository" → בחר את תיקיית `vps-clickers` → "Publish repository".

---

## שלב 2 — חיבור ל-Render

1. היכנס ל-[render.com](https://render.com) והירשם עם חשבון GitHub (חינם).
2. **New → Blueprint** → בחר את הריפו `yemot-clickers`.
   Render יזהה את `render.yaml` אוטומטית ויגדיר הכל.
3. לחץ **Apply**. אחרי ~2 דקות תקבל כתובת קבועה כמו:
   ```
   https://yemot-clickers.onrender.com
   ```

**זהו!** הקישורים שלך:
- מנחה: `https://yemot-clickers.onrender.com/dashboard.html?room=1234`
- מקרן: `https://yemot-clickers.onrender.com/presenter.html?room=1234`

---

## שלב 3 — חיבור לימות (אופציונלי, כשמוכנים)

1. בשלוחת ה-API בימות: `api_link=https://yemot-clickers.onrender.com/`
2. אבטחה: בלוח Render → **Environment** → הכנס ערך אקראי ל-`YEMOT_SECRET`,
   ובימות (ext.ini): `api_add_0=secret=<אותו ערך>`.

---

## הערות חשובות

- **התוכנית החינמית של Render "נרדמת"** אחרי 15 דקות ללא פעילות; הכניסה הראשונה אחרי שינה לוקחת ~30 שניות להתעורר. לפני משחק — פשוט פתח את הקישור דקה מראש. (לשדרוג לתוכנית שלא נרדמת: ~$7/חודש.)
- **נתונים בזיכרון בלבד** — שאלות/ניקוד נמחקים בכל פריסה מחדש (ריסטארט). מספיק למשחק חי; להיסטוריה קבועה צריך מסד (Redis/Postgres) — ראה roadmap ב-`../09_מודל_עסקי.md`.
- **עדכון קוד:** כל `git push` ל-`main` מפעיל פריסה מחדש אוטומטית ב-Render.
