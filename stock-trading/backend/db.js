const knex = require('knex');
const path = require('path');
const fs   = require('fs');

const DB_PATH = process.env.DB_PATH || './data/trading.db';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = knex({
  client: 'sqlite3',
  connection: { filename: DB_PATH },
  useNullAsDefault: true,
});

// Async helpers
db.get = (sql, params = []) => db.raw(sql, params).then(r => (r && r.length ? r[0] : undefined));
db.all = (sql, params = []) => db.raw(sql, params).then(r => r || []);
db.run = (sql, params = []) => db.raw(sql, params).then(() => {});

async function initSchema() {
  const conn = await db.client.acquireConnection();
  await new Promise((res, rej) => conn.run('PRAGMA journal_mode = WAL', err => err ? rej(err) : res()));
  await new Promise((res, rej) => conn.run('PRAGMA foreign_keys = ON', err => err ? rej(err) : res()));
  db.client.releaseConnection(conn);

  const tbls = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, full_name TEXT NOT NULL, username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer',
      cash_balance REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS stocks (
      id TEXT PRIMARY KEY, company_name TEXT NOT NULL, ticker TEXT UNIQUE NOT NULL,
      total_volume INTEGER NOT NULL, available_volume INTEGER NOT NULL,
      initial_price REAL NOT NULL, current_price REAL NOT NULL, open_price REAL NOT NULL,
      high_price REAL NOT NULL, low_price REAL NOT NULL, prev_close REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, stock_id TEXT NOT NULL REFERENCES stocks(id),
      price REAL NOT NULL, volume INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
      stock_id TEXT NOT NULL REFERENCES stocks(id), type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', quantity INTEGER NOT NULL,
      price REAL NOT NULL, total_amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), executed_at TEXT, cancelled_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL REFERENCES users(id),
      stock_id TEXT NOT NULL REFERENCES stocks(id), quantity INTEGER NOT NULL DEFAULT 0,
      avg_cost REAL NOT NULL DEFAULT 0.0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(user_id, stock_id))`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL,
      amount REAL NOT NULL, description TEXT, order_id TEXT REFERENCES orders(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS market_settings (
      id INTEGER PRIMARY KEY DEFAULT 1, open_time TEXT NOT NULL DEFAULT '09:30',
      close_time TEXT NOT NULL DEFAULT '16:00', timezone TEXT NOT NULL DEFAULT 'America/New_York',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS market_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE NOT NULL, name TEXT NOT NULL)`,
  ];

  for (const sql of tbls) await db.raw(sql);

  const idxs = [
    `CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`,
    `CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ph_stock ON price_history(stock_id)`,
  ];
  for (const sql of idxs) await db.raw(sql);

  const settings = await db.get(`SELECT id FROM market_settings WHERE id = 1`);
  if (!settings) {
    await db.run(`INSERT INTO market_settings (id,open_time,close_time,timezone) VALUES (1,'09:30','16:00','America/New_York')`);
  }

  const holidays = [
    ['2025-01-01',"New Year's Day"],['2025-01-20','Martin Luther King Jr. Day'],
    ['2025-02-17',"Presidents' Day"],['2025-04-18','Good Friday'],
    ['2025-05-26','Memorial Day'],['2025-06-19','Juneteenth'],
    ['2025-07-04','Independence Day'],['2025-09-01','Labor Day'],
    ['2025-11-27','Thanksgiving Day'],['2025-12-25','Christmas Day'],
    ['2026-01-01',"New Year's Day"],['2026-01-19','Martin Luther King Jr. Day'],
    ['2026-02-16',"Presidents' Day"],['2026-04-03','Good Friday'],
    ['2026-05-25','Memorial Day'],['2026-06-19','Juneteenth'],
    ['2026-07-03','Independence Day (Observed)'],['2026-09-07','Labor Day'],
    ['2026-11-26','Thanksgiving Day'],['2026-12-25','Christmas Day'],
  ];
  for (const [date, name] of holidays) {
    await db.run(`INSERT OR IGNORE INTO market_holidays (date,name) VALUES (?,?)`, [date, name]);
  }
}

const ready = initSchema().catch(err => { console.error('DB init failed:', err); process.exit(1); });
db.ready = ready;
module.exports = db;
