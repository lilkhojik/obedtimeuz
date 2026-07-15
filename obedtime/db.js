const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'obedtime.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT
  );

  CREATE TABLE IF NOT EXISTS content (
    lang TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (lang, field_key)
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT,
    emoji TEXT,
    name_uz TEXT,
    name_ru TEXT,
    price TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    company TEXT,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Seed default dishes only if the table is empty, so re-running never
// duplicates or overwrites what an admin has already edited.
const dishCount = db.prepare('SELECT COUNT(*) AS c FROM dishes').get().c;
if (dishCount === 0) {
  const insert = db.prepare(`
    INSERT INTO dishes (image_path, emoji, name_uz, name_ru, price, sort_order)
    VALUES (@image_path, @emoji, @name_uz, @name_ru, @price, @sort_order)
  `);
  const seed = [
    { image_path: null, emoji: '🍚', name_uz: 'Osh (Palov)', name_ru: 'Плов', price: "25 000 so'm", sort_order: 1 },
    { image_path: null, emoji: '🍜', name_uz: "Lag'mon", name_ru: 'Лагман', price: "22 000 so'm", sort_order: 2 },
    { image_path: null, emoji: '🥟', name_uz: 'Manti', name_ru: 'Манты', price: "20 000 so'm", sort_order: 3 },
    { image_path: null, emoji: '🍲', name_uz: 'Norin', name_ru: 'Норин', price: "24 000 so'm", sort_order: 4 },
    { image_path: null, emoji: '🥟', name_uz: 'Chuchvara', name_ru: 'Чучвара', price: "20 000 so'm", sort_order: 5 }
  ];
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(seed);
}

module.exports = db;
