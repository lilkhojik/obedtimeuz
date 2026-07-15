// Creates or resets the single admin account.
// Usage:
//   node scripts/create-admin.js <username> <password>
// If a user with that username already exists, its password is updated instead.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Usage: node scripts/create-admin.js <username> <password>');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters long.');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);

if (existing) {
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?').run(hash, username);
  console.log(`Password updated for admin user "${username}".`);
} else {
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`Admin user "${username}" created.`);
}
