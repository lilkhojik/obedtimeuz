require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const db = require('./db');
const DEFAULT_CONTENT = require('./default-content');
const auth = require('./auth');
const { sendRequestEmail } = require('./mailer');
const { sendRequestTelegram } = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PANEL_PATH = process.env.ADMIN_PANEL_PATH || '/panel-8f2k9x71';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE).toLowerCase() === 'true';

app.disable('x-powered-by');
app.set('trust proxy', 1); // needed for correct req.ip behind a reverse proxy

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// ---------- Static files ----------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));

// ================================================================
// PUBLIC API
// ================================================================

function mergedContent(lang) {
  const base = DEFAULT_CONTENT[lang] || DEFAULT_CONTENT.uz;
  const rows = db.prepare('SELECT field_key, value FROM content WHERE lang = ?').all(lang);
  const overrides = Object.fromEntries(rows.map((r) => [r.field_key, r.value]));
  return { ...base, ...overrides };
}

app.get('/api/content', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  res.json(mergedContent(lang));
});

app.get('/api/dishes', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  const rows = db.prepare('SELECT * FROM dishes ORDER BY sort_order ASC, id ASC').all();
  res.json(rows.map((d) => ({
    id: d.id,
    image: d.image_path ? `/uploads/${d.image_path}` : null,
    emoji: d.emoji || '🍽️',
    name: (lang === 'ru' ? d.name_ru : d.name_uz) || d.name_uz || d.name_ru || '',
    price: d.price || ''
  })));
});

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Juda ko'p urinish, birozdan so'ng qayta urinib ko'ring." }
});

app.post('/api/requests', requestLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 200);
  const phone = String(req.body.phone || '').trim().slice(0, 60);
  const company = String(req.body.company || '').trim().slice(0, 200);
  const message = String(req.body.message || '').trim().slice(0, 2000);

  if (!name || !phone) {
    return res.status(400).json({ error: 'Ism va telefon raqami majburiy.' });
  }

  const info = db.prepare(
    'INSERT INTO requests (name, phone, company, message) VALUES (?, ?, ?, ?)'
  ).run(name, phone, company, message);

  // Best-effort notifications — the request is already safely stored above,
  // so a failure here never loses the lead, it just logs to the server console.
  const payload = { name, phone, company, message };
  sendRequestTelegram(payload).catch((err) => console.error('Telegram notify failed:', err.message));
  sendRequestEmail(payload).catch((err) => console.error('Email notify failed:', err.message));

  res.json({ ok: true, id: info.lastInsertRowid });
});

// ================================================================
// AUTH
// ================================================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (auth.isLocked(req, username)) {
    const mins = Math.ceil(auth.lockRemainingMs(req, username) / 60000);
    return res.status(429).json({ error: `Juda ko'p urinish. ${mins} daqiqadan so'ng qayta urining.` });
  }

  const admin = auth.findAdminByUsername(username);
  const ok = admin && auth.verifyPassword(password, admin.password_hash);

  if (!ok) {
    auth.registerFailedAttempt(req, username);
    return res.status(401).json({ error: "Login yoki parol noto'g'ri." });
  }

  auth.clearAttempts(req, username);
  const session = auth.createSession(admin.id);
  res.cookie('sid', session.id, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'strict',
    expires: new Date(session.expiresAt),
    path: '/'
  });
  res.json({ ok: true });
});

app.post('/api/auth/logout', (req, res) => {
  auth.destroySession(req.cookies && req.cookies.sid);
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const session = auth.getSession(req.cookies && req.cookies.sid);
  res.json({ authenticated: !!session });
});

// ================================================================
// ADMIN API (all routes below require a valid session)
// ================================================================

const adminApi = express.Router();
adminApi.use(auth.requireAuth);

// ---- Requests ----
adminApi.get('/requests', (req, res) => {
  const rows = db.prepare('SELECT * FROM requests ORDER BY id DESC').all();
  res.json(rows);
});

adminApi.delete('/requests/:id', (req, res) => {
  db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Dishes ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, crypto.randomBytes(12).toString('hex') + (ext || '.jpg'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

adminApi.get('/dishes', (req, res) => {
  const rows = db.prepare('SELECT * FROM dishes ORDER BY sort_order ASC, id ASC').all();
  res.json(rows);
});

adminApi.post('/dishes', (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const name_uz = String(req.body.name_uz || '').trim().slice(0, 200);
    const name_ru = String(req.body.name_ru || '').trim().slice(0, 200);
    const price = String(req.body.price || '').trim().slice(0, 60);
    if (!name_uz && !name_ru) {
      return res.status(400).json({ error: 'Kamida bitta tilda nom kiriting.' });
    }
    const emojiList = ['🍚', '🍜', '🥟', '🍲', '🥗', '🍢', '🍛', '🥘'];
    const emoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM dishes').get().m;

    const info = db.prepare(
      'INSERT INTO dishes (image_path, emoji, name_uz, name_ru, price, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(req.file ? req.file.filename : null, emoji, name_uz, name_ru, price, maxOrder + 1);

    res.json({ ok: true, id: info.lastInsertRowid });
  });
});

adminApi.delete('/dishes/:id', (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id);
  if (dish && dish.image_path) {
    const filePath = path.join(__dirname, 'uploads', dish.image_path);
    fs.unlink(filePath, () => {});
  }
  db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ---- Content ----
adminApi.get('/content', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  res.json(mergedContent(lang));
});

adminApi.put('/content', (req, res) => {
  const lang = req.body.lang === 'ru' ? 'ru' : 'uz';
  const fields = req.body.fields || {};
  const upsert = db.prepare(
    'INSERT INTO content (lang, field_key, value) VALUES (?, ?, ?) ' +
    'ON CONFLICT(lang, field_key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction((entries) => {
    entries.forEach(([key, value]) => upsert.run(lang, key, String(value ?? '')));
  });
  tx(Object.entries(fields));
  res.json({ ok: true });
});

// ---- Settings (email / Telegram delivery config) ----
const SECRET_KEYS = new Set(['smtp_pass', 'telegram_bot_token']);

adminApi.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = {};
  const keys = [
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'notify_email_to',
    'telegram_bot_token', 'telegram_chat_id'
  ];
  keys.forEach((k) => {
    if (SECRET_KEYS.has(k)) {
      out[k + '_configured'] = !!(map[k] || process.env[k.toUpperCase()]);
    } else {
      out[k] = map[k] || process.env[k.toUpperCase()] || '';
    }
  });
  res.json(out);
});

adminApi.put('/settings', (req, res) => {
  const body = req.body || {};
  const allowed = [
    'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from', 'notify_email_to',
    'telegram_bot_token', 'telegram_chat_id'
  ];
  const upsert = db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  const tx = db.transaction(() => {
    allowed.forEach((key) => {
      const val = body[key];
      // Blank secret fields mean "leave unchanged" so the admin never has to
      // re-paste a token/password just to edit something else on this tab.
      if (val === undefined) return;
      if (SECRET_KEYS.has(key) && val === '') return;
      upsert.run(key, String(val));
    });
  });
  tx();
  res.json({ ok: true });
});

app.use('/api/admin', adminApi);

// Friendly JSON 401 for any admin API auth failure instead of leaking stack traces
app.use('/api/admin', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

// ================================================================
// Hidden admin panel page (not linked from the public site)
// ================================================================
app.get(ADMIN_PANEL_PATH, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// ================================================================
// Fallback + error handling
// ================================================================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`ObedTime server running on http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}${ADMIN_PANEL_PATH}`);
});
