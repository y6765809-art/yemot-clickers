// ============================================================
// server.js — קליקרים ימות המשיח · משחק חידון מלא (v3)
// מאגר שאלות מראש · זרימת משחק · חשיפה · ניקוד · מסך מנצח
// ימות = טלפון | השרת = מוח המשחק | yemot-router2 (ShlomoCode)
// ============================================================

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import { YemotRouter } from 'yemot-router2';

const PORT = process.env.PORT || 3000;
const YEMOT_SECRET = process.env.YEMOT_SECRET || '';
const POINTS_CORRECT = 10;

// ── מצב משחק לכל חדר ──
// phase: lobby → question → revealed → (next|ended)
const rooms = new Map();
function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, {
      questions: [],        // [{ text, options:[...], correct }]
      idx: -1,              // אינדקס שאלה נוכחית (-1 = לובי)
      phase: 'lobby',       // lobby | question | revealed | ended
      active: false,        // הצבעה פתוחה?
      votes: new Map(),     // phone -> digit (לשאלה הנוכחית)
      scores: new Map(),    // phone -> ניקוד מצטבר
      players: new Map(),   // טלפון-מנורמל -> שם (רישום מראש)
      branding: { logo: '', title: 'חידון קליקרים' } // מיתוג: לוגו (dataURL) + כותרת
    });
  }
  return rooms.get(code);
}
const curQ = r => (r.idx >= 0 && r.idx < r.questions.length) ? r.questions[r.idx] : null;
const numOpts = q => { const n = (q?.options || []).filter(x => x && String(x).trim()).length; return n >= 2 ? n : 2; };
const mask = p => { const s = String(p); return s.length > 4 ? '…' + s.slice(-4) : s; };
const normPhone = p => String(p).replace(/\D/g, '').replace(/^0+/, '');
// שם להצגה: שם רשום אם קיים, אחרת 4 ספרות אחרונות
const displayName = (r, p) => r.players.get(normPhone(p)) || mask(p);

function leaderboard(r) {
  return [...r.scores.entries()].map(([p, pts]) => ({ name: displayName(r, p), pts }))
    .sort((a, b) => b.pts - a.pts);
}

function state(r) {
  const q = curQ(r);
  const revealed = r.phase === 'revealed' || r.phase === 'ended';
  const counts = {};
  for (const d of r.votes.values()) counts[d] = (counts[d] || 0) + 1;
  let correctVoters = [];
  if (revealed && q && q.correct != null)
    correctVoters = [...r.votes.entries()].filter(([, d]) => String(d) === String(q.correct)).map(([p]) => displayName(r, p));
  const lb = leaderboard(r);
  return {
    phase: r.phase, idx: r.idx, totalQuestions: r.questions.length,
    title: r.branding.title, hasLogo: !!r.branding.logo,
    active: r.active, revealed,
    correct: (revealed && q) ? q.correct : null, // ברמה העליונה — הדפים קוראים d.correct
    question: q ? { text: q.text, options: q.options,
                    correct: revealed ? q.correct : null } : null,
    counts, total: r.votes.size,
    correctVoters, leaderboard: lb.slice(0, 10),
    winner: r.phase === 'ended' ? (lb[0] || null) : null,
    podium: r.phase === 'ended' ? lb.slice(0, 3) : []
  };
}

// ── WebSocket ──
const wsClients = new Map();
function broadcast(code) {
  const set = wsClients.get(code); if (!set) return;
  const payload = JSON.stringify({ type: 'update', room: code, ...state(getRoom(code)) });
  for (const ws of set) if (ws.readyState === 1) ws.send(payload);
}

// ── Express ──
const app = express();
app.use(express.json());
app.use(express.static('public'));

// שמירת מאגר השאלות (מראש)
app.post('/api/:room/questions', (req, res) => {
  const r = getRoom(req.params.room);
  r.questions = Array.isArray(req.body.questions) ? req.body.questions.map(q => ({
    text: q.text || '',
    options: (Array.isArray(q.options) ? q.options : []).slice(0, 6),
    correct: q.correct != null ? Number(q.correct) : null
  })) : [];
  broadcast(req.params.room);
  res.json({ ok: true, ...state(r) });
});

// התחלת משחק
app.post('/api/:room/start', (req, res) => {
  const r = getRoom(req.params.room);
  if (!r.questions.length) return res.json({ ok: false, error: 'אין שאלות במאגר' });
  r.idx = 0; r.phase = 'question'; r.active = true;
  r.votes.clear(); r.scores.clear();
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

app.post('/api/:room/open', (req, res) => {
  const r = getRoom(req.params.room); r.active = !!req.body.active;
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

// חשיפת תשובה + ניקוד (פעם אחת לשאלה)
app.post('/api/:room/reveal', (req, res) => {
  const r = getRoom(req.params.room); const q = curQ(r);
  if (r.phase === 'question' && q && q.correct != null) {
    for (const [p, d] of r.votes.entries())
      if (String(d) === String(q.correct)) r.scores.set(p, (r.scores.get(p) || 0) + POINTS_CORRECT);
  }
  r.phase = 'revealed'; r.active = false;
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

// שאלה הבאה (או סיום אם נגמרו)
app.post('/api/:room/next', (req, res) => {
  const r = getRoom(req.params.room);
  if (r.idx + 1 < r.questions.length) {
    r.idx++; r.phase = 'question'; r.active = true; r.votes.clear();
  } else {
    r.phase = 'ended'; r.active = false;
  }
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

app.post('/api/:room/end', (req, res) => {
  const r = getRoom(req.params.room); r.phase = 'ended'; r.active = false;
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

app.post('/api/:room/reset', (req, res) => {
  const r = getRoom(req.params.room);
  r.idx = -1; r.phase = 'lobby'; r.active = false; r.votes.clear(); r.scores.clear();
  broadcast(req.params.room); res.json({ ok: true, ...state(r) });
});

app.get('/api/:room/results', (req, res) => res.json(state(getRoom(req.params.room))));

// ── רישום שמות משתתפים (טלפון → שם) ──
app.get('/api/:room/players', (req, res) => {
  const r = getRoom(req.params.room);
  res.json({ players: [...r.players.entries()].map(([phone, name]) => ({ phone, name })) });
});
app.post('/api/:room/players', (req, res) => {
  const r = getRoom(req.params.room);
  r.players.clear();
  (Array.isArray(req.body.players) ? req.body.players : []).forEach(p => {
    if (p && p.phone && p.name) r.players.set(normPhone(p.phone), String(p.name).slice(0, 40));
  });
  broadcast(req.params.room);
  res.json({ ok: true, count: r.players.size });
});

// ── מיתוג: לוגו + כותרת ──
app.get('/api/:room/branding', (req, res) => res.json(getRoom(req.params.room).branding));
app.post('/api/:room/branding', (req, res) => {
  const r = getRoom(req.params.room);
  if (typeof req.body.title === 'string') r.branding.title = req.body.title.slice(0, 80);
  if (typeof req.body.logo === 'string') r.branding.logo = req.body.logo.slice(0, 800000); // dataURL עד ~600KB
  const set = wsClients.get(req.params.room);
  if (set) for (const ws of set) if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'branding' }));
  broadcast(req.params.room);
  res.json({ ok: true });
});

// ── שלוחת ימות ──
const router = YemotRouter({
  printLog: true, timeout: '30s',
  uncaughtErrorHandler: async (err, call) => {
    // רוב ה"שגיאות" הן פשוט חוסר הקשה (timeout) או ניתוק — לא צריך להבהיל
    console.error('Yemot handler ended:', err && err.message);
    try { await call.id_list_message([{ type: 'text', data: 'לא התקבלה הקשה. תודה ולהתראות' }]); } catch {}
  }
});

router.get('/', async (call) => {
  if (YEMOT_SECRET && call.values.secret !== YEMOT_SECRET) return call.hangup();

  const code = await call.read(
    [{ type: 'text', data: 'הקישו את קוד החדר' }],
    'tap', { val_name: 'ROOM', min_digits: 3, max_digits: 6, sec_wait: 10 });
  const r = getRoom(code);
  const q = curQ(r);

  if (r.phase !== 'question' || !r.active || !q) {
    await call.id_list_message([{ type: 'text', data: 'אין כרגע שאלה פעילה, נסו שוב מאוחר יותר' }]);
    return call.hangup();
  }

  // הקראת השאלה + התשובות בשמותיהן
  const n = numOpts(q); const opts = q.options || [];
  let prompt = q.text ? q.text + '. ' : '';
  for (let i = 0; i < n; i++) {
    const label = (opts[i] && String(opts[i]).trim()) ? opts[i] : ('אפשרות ' + (i + 1));
    prompt += `לתשובה ${label} הקישו ${i + 1}. `;
  }
  const answer = await call.read(
    [{ type: 'text', data: prompt }],
    'tap', { val_name: 'ANSWER', min_digits: 1, max_digits: 1,
             digits_allowed: Array.from({ length: n }, (_, i) => i + 1), sec_wait: 15 });

  r.votes.set(call.phone, String(answer));
  broadcast(code);
  await call.id_list_message([{ type: 'text', data: 'תודה, קולך נקלט' }]);
  return call.hangup();
});
app.use(router);

// ── שרת + WebSocket ──
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  const code = new URL(req.url, 'http://x').searchParams.get('room');
  if (!code) return ws.close();
  if (!wsClients.has(code)) wsClients.set(code, new Set());
  wsClients.get(code).add(ws);
  ws.send(JSON.stringify({ type: 'update', room: code, ...state(getRoom(code)) }));
  ws.on('close', () => wsClients.get(code)?.delete(ws));
});
server.listen(PORT, () => {
  console.log(`✅ קליקרים · משחק חידון v3 · פורט ${PORT}`);
  console.log(`   דשבורד: /dashboard.html?room=1234   הקרנה: /presenter.html?room=1234`);
});
