const db = require('./db');

function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row && row.value ? row.value : fallback;
}

async function sendRequestTelegram({ name, phone, company, message }) {
  const token = getSetting('telegram_bot_token', process.env.TELEGRAM_BOT_TOKEN || '');
  const chatId = getSetting('telegram_chat_id', process.env.TELEGRAM_CHAT_ID || '');

  if (!token || !chatId) {
    return { skipped: true, reason: 'Telegram is not configured yet.' };
  }

  const text =
    "Yangi so'rov — ObedTime\n" +
    `Ism: ${name}\n` +
    `Telefon: ${phone}\n` +
    (company ? `Kompaniya: ${company}\n` : '') +
    (message ? `Xabar: ${message}` : '');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Telegram API error ${res.status}: ${body}`);
  }
  return { skipped: false };
}

module.exports = { sendRequestTelegram, getSetting };
