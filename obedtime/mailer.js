const nodemailer = require('nodemailer');
const db = require('./db');

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value ? row.value : fallback;
}

async function sendRequestEmail({ name, phone, company, message }) {
  const host = getSetting('smtp_host', process.env.SMTP_HOST || '');
  const user = getSetting('smtp_user', process.env.SMTP_USER || '');
  const pass = getSetting('smtp_pass', process.env.SMTP_PASS || '');
  const port = Number(getSetting('smtp_port', process.env.SMTP_PORT || '587'));
  const from = getSetting('smtp_from', process.env.SMTP_FROM || 'ObedTime <no-reply@obedtime.uz>');
  const to = getSetting('notify_email_to', process.env.NOTIFY_EMAIL_TO || '');

  if (!host || !user || !pass || !to) {
    return { skipped: true, reason: 'Email is not configured yet.' };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  await transporter.sendMail({
    from,
    to,
    subject: "ObedTime — yangi so'rov / новая заявка",
    text:
      `Ism / Имя: ${name}\n` +
      `Telefon / Телефон: ${phone}\n` +
      (company ? `Kompaniya / Компания: ${company}\n` : '') +
      (message ? `Xabar / Сообщение: ${message}\n` : '')
  });

  return { skipped: false };
}

module.exports = { sendRequestEmail, getSetting };
