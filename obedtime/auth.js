const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000; // 15 minutes

function createSession(adminId) {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('INSERT INTO sessions (id, admin_id, expires_at) VALUES (?, ?, ?)').run(id, adminId, expiresAt);
  return { id, expiresAt };
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  return row;
}

function destroySession(sessionId) {
  if (sessionId) db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

function attemptKey(req, username) {
  return `${req.ip}:${(username || '').toLowerCase()}`;
}

function isLocked(req, username) {
  const row = db.prepare('SELECT * FROM login_attempts WHERE key = ?').get(attemptKey(req, username));
  if (!row || !row.locked_until) return false;
  return new Date(row.locked_until).getTime() > Date.now();
}

function lockRemainingMs(req, username) {
  const row = db.prepare('SELECT * FROM login_attempts WHERE key = ?').get(attemptKey(req, username));
  if (!row || !row.locked_until) return 0;
  return Math.max(0, new Date(row.locked_until).getTime() - Date.now());
}

function registerFailedAttempt(req, username) {
  const key = attemptKey(req, username);
  const row = db.prepare('SELECT * FROM login_attempts WHERE key = ?').get(key);
  const attempts = (row ? row.attempts : 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
    db.prepare(
      'INSERT INTO login_attempts (key, attempts, locked_until) VALUES (?, 0, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET attempts = 0, locked_until = excluded.locked_until'
    ).run(key, lockedUntil);
  } else {
    db.prepare(
      'INSERT INTO login_attempts (key, attempts, locked_until) VALUES (?, ?, NULL) ' +
      'ON CONFLICT(key) DO UPDATE SET attempts = excluded.attempts, locked_until = NULL'
    ).run(key, attempts);
  }
}

function clearAttempts(req, username) {
  db.prepare('DELETE FROM login_attempts WHERE key = ?').run(attemptKey(req, username));
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function findAdminByUsername(username) {
  return db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
}

function requireAuth(req, res, next) {
  const sessionId = req.cookies && req.cookies.sid;
  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.adminId = session.admin_id;
  next();
}

module.exports = {
  createSession, getSession, destroySession,
  isLocked, lockRemainingMs, registerFailedAttempt, clearAttempts,
  verifyPassword, findAdminByUsername, requireAuth
};
