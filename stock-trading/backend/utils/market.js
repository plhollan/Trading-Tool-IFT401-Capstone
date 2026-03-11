const db = require('../db');

async function isMarketOpen() {
  const settings = await db.get('SELECT * FROM market_settings WHERE id = 1');
  if (!settings) return false;
  const now = new Date();
  const etString = now.toLocaleString('en-US', { timeZone: settings.timezone });
  const et = new Date(etString);
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const dateStr = et.toISOString().slice(0, 10);
  const holiday = await db.get('SELECT id FROM market_holidays WHERE date = ?', [dateStr]);
  if (holiday) return false;
  const [openH, openM]   = settings.open_time.split(':').map(Number);
  const [closeH, closeM] = settings.close_time.split(':').map(Number);
  const minuteNow   = et.getHours() * 60 + et.getMinutes();
  const minuteOpen  = openH * 60 + openM;
  const minuteClose = closeH * 60 + closeM;
  return minuteNow >= minuteOpen && minuteNow < minuteClose;
}

async function getMarketSettings() {
  return db.get('SELECT * FROM market_settings WHERE id = 1');
}

module.exports = { isMarketOpen, getMarketSettings };
