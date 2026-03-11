require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

async function seed() {
  await db.ready;
  console.log('Seeding database...');

  const adminId = uuidv4();
  await db.run(`INSERT OR IGNORE INTO users (id,full_name,username,email,password,role,cash_balance) VALUES (?,?,?,?,?,'admin',100000)`,
    [adminId, 'System Administrator', 'admin', 'admin@tradingapp.com', bcrypt.hashSync('Admin1234!', 10)]);

  const custId = uuidv4();
  await db.run(`INSERT OR IGNORE INTO users (id,full_name,username,email,password,role,cash_balance) VALUES (?,?,?,?,?,'customer',50000)`,
    [custId, 'Demo Trader', 'demo', 'demo@tradingapp.com', bcrypt.hashSync('Demo1234!', 10)]);

  const stocks = [
    { company_name: 'Apple Inc.',          ticker: 'AAPL', volume: 1000000, price: 185.50 },
    { company_name: 'Microsoft Corp.',     ticker: 'MSFT', volume: 800000,  price: 415.20 },
    { company_name: 'Alphabet Inc.',       ticker: 'GOOGL',volume: 600000,  price: 172.80 },
    { company_name: 'Amazon.com Inc.',     ticker: 'AMZN', volume: 700000,  price: 188.40 },
    { company_name: 'NVIDIA Corp.',        ticker: 'NVDA', volume: 900000,  price: 875.00 },
    { company_name: 'Meta Platforms Inc.', ticker: 'META', volume: 500000,  price: 520.10 },
    { company_name: 'Tesla Inc.',          ticker: 'TSLA', volume: 1200000, price: 177.60 },
    { company_name: 'JPMorgan Chase',      ticker: 'JPM',  volume: 400000,  price: 198.30 },
    { company_name: 'Johnson & Johnson',   ticker: 'JNJ',  volume: 350000,  price: 152.70 },
    { company_name: 'Berkshire Hathaway',  ticker: 'BRK',  volume: 200000,  price: 350.80 },
  ];

  for (const s of stocks) {
    const existing = await db.get('SELECT id FROM stocks WHERE ticker=?', [s.ticker]);
    if (!existing) {
      const id = uuidv4();
      await db.run(`INSERT INTO stocks (id,company_name,ticker,total_volume,available_volume,initial_price,
        current_price,open_price,high_price,low_price,prev_close) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [id, s.company_name, s.ticker, s.volume, s.volume, s.price, s.price, s.price, s.price, s.price, s.price]);
      await db.run(`INSERT INTO price_history (stock_id,price,volume) VALUES (?,?,0)`, [id, s.price]);
    }
  }

  console.log('✅ Seed complete!');
  console.log('   Admin:  admin / Admin1234!');
  console.log('   Demo:   demo  / Demo1234!');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
