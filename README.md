# קליקרים ימות המשיח — VPS היברידי (רב-משתמשים)

מערכת הצבעה/חידון חי בטלפון. **ימות = שכבת הטלפון** (נגישות כשרה, בלי עלות דקות, TTS עברי). **השרת הזה = המוח בזמן אמת** (WebSocket, ריבוי חדרים).

מבוסס על הספרייה **[yemot-router2](https://github.com/ShlomoCode/yemot-router2)** (ShlomoCode) — שומרת את מצב השיחה אוטומטית, כך שהקוד לינארי ופשוט.

---

## מה זה עושה
- מתקשר מחייג לקו ימות → מקיש **קוד חדר** → מקיש **תשובה** (1–6).
- השרת רושם **מיידית** ומשדר לדשבורד ב-WebSocket (בלי דיליי).
- **מספר טלפון אחד** משרת **אינסוף חדרים** במקביל (multi-tenant).

---

## הרצה מקומית (לבדיקה)
```bash
npm install
npm start          # טוען .env אוטומטית אם קיים (Node 24)
```
- **דשבורד מנחה** (שליטה): http://localhost:3000/dashboard.html?room=1234
- **מסך הקרנה לקהל** (מקרן): http://localhost:3000/presenter.html?room=1234
- שלוחת ימות תפנה לשורש: `https://YOUR-DOMAIN/`

## אבטחה (מומלץ לייצור/השכרה)
כדי שאף אחד לא יזייף הצבעות מהדפדפן — הגדר טוקן סוד:
1. העתק `.env.example` ל-`.env`, קבע `YEMOT_SECRET=מחרוזת_אקראית`.
2. בימות (ext.ini): `api_add_0=secret=אותה_מחרוזת`.
בפיתוח אפשר להשאיר ריק (אימות מבוטל).

---

## חיבור לימות (ext.ini של שלוחת ה-API)
```ini
type=api
api_link=https://YOUR-DOMAIN/
```
> ימות דורש **HTTPS**. ב-VPS השתמש ב-Caddy/Nginx ל-SSL (ראה למטה).

---

## העלאה ל-VPS (Hetzner / DigitalOcean)
```bash
# 1. שרת Ubuntu, התקנת Node
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

# 2. העלאת הקוד + התקנה
npm install

# 3. הרצה תמידית (שורד ריסטארט)
sudo npm i -g pm2
pm2 start server.js --name clickers
pm2 save && pm2 startup

# 4. HTTPS אוטומטי עם Caddy (Caddyfile):
#    your-domain.com {
#        reverse_proxy localhost:3000
#    }
```

---

## API של השרת (לניהול/הרחבה)
| שיטה | נתיב | פעולה |
|------|------|-------|
| POST | `/api/:room/questions` | טעינת מאגר שאלות מראש |
| POST | `/api/:room/start` | התחלת משחק (שאלה ראשונה) |
| POST | `/api/:room/open` | פתיחה/סגירת הצבעה (`{active:true/false}`) |
| POST | `/api/:room/reveal` | חשיפת תשובה + ניקוד |
| POST | `/api/:room/next` | שאלה הבאה (או סיום) |
| POST | `/api/:room/end` \| `/reset` | סיום / איפוס ללובי |
| POST | `/api/:room/players` \| `/branding` | רישום שמות / מיתוג |
| GET  | `/api/:room/results` | תוצאות נוכחיות (JSON) |
| WS   | `/?room=CODE` | זרם עדכונים חי לדשבורד |

---

## מדרוג לעתיד (כשמשכירים)
- **מסד קבוע** — להחליף את ה-`Map` בזיכרון ב-Redis/Postgres (לשמירת היסטוריה).
- **פאנל לקוחות** — כל לקוח מנהל את החדר/השאלות שלו.
- **זיהוי מתקשר** — שיוך אוטומטי לחדר לפי `call.phone` (קבוצות סגורות).
- **חיוב** — מנוי per-חדר. ראה `../09_מודל_עסקי.md`.

---

## הערות
- **מצב נוכחי:** MVP בזיכרון — נתונים נמחקים בכל ריסטארט. מספיק לבדיקות ולמשחקים חיים; להיסטוריה הוסף מסד.
- הקוד משתמש ב-ESM (`import`) ולכן `"type":"module"` ב-package.json.
