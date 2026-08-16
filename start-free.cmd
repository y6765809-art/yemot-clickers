@echo off
REM ── הפעלה חינמית: שרת מקומי + מנהרת Cloudflare (HTTPS ציבורי לימות) ──
cd /d "%~dp0"
echo מפעיל את שרת הקליקרים...
start "clickers-server" cmd /k "npm start"
timeout /t 3 >nul
echo.
echo ================================================================
echo  המנהרה עולה. חפש למטה שורה עם כתובת:  https://XXXX.trycloudflare.com
echo  1) העתק אותה
echo  2) בימות (ext.ini של שלוחת ה-API):   api_link=https://XXXX.trycloudflare.com/
echo  3) דשבורד:  https://XXXX.trycloudflare.com/dashboard.html?room=1234
echo  * הכתובת מתחלפת בכל הרצה. לכתובת קבועה - מנהרה עם שם (בהמשך).
echo ================================================================
echo.
REM --protocol http2 חיוני ברשתות שחוסמות QUIC/UDP (כולל סינון כשר)
cloudflared tunnel --url http://localhost:3000 --protocol http2
