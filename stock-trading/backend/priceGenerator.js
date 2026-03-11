const db = require('./db');

const stockState = {};

function nextPrice(stock) {
  const state = stockState[stock.id] || { trend: (Math.random() - 0.5) * 0.002, momentum: 0 };
  const price         = stock.current_price;
  const openPrice     = stock.open_price;
  const volatility    = 0.003 + Math.random() * 0.002;
  const meanReversion = (openPrice - price) / openPrice * 0.1;
  const shock         = (Math.random() - 0.5) * 2 * volatility;
  const newMomentum   = state.momentum * 0.7 + state.trend * 0.15 + meanReversion * 0.15 + shock;
  const clampedMom    = Math.max(-0.02, Math.min(0.02, newMomentum));
  let newPrice        = Math.max(price * (1 + clampedMom), stock.initial_price * 0.1);
  newPrice            = Math.round(newPrice * 100) / 100;
  if (Math.random() < 0.05) state.trend = (Math.random() - 0.5) * 0.002;
  state.momentum = clampedMom;
  stockState[stock.id] = state;
  return newPrice;
}

async function updatePrices() {
  const stocks = await db.all('SELECT * FROM stocks WHERE is_active=1');
  await db.transaction(async trx => {
    for (const stock of stocks) {
      const newPrice = nextPrice(stock);
      const newHigh  = Math.max(stock.high_price, newPrice);
      const newLow   = Math.min(stock.low_price, newPrice);
      await trx.raw(`UPDATE stocks SET current_price=?,high_price=?,low_price=?,updated_at=datetime('now') WHERE id=?`,
        [newPrice, newHigh, newLow, stock.id]);
      await trx.raw(`INSERT INTO price_history (stock_id,price,volume) VALUES (?,?,?)`,
        [stock.id, newPrice, Math.floor(Math.random() * 5000 + 100)]);
    }
  });
}

async function resetDailyPrices() {
  const stocks = await db.all('SELECT * FROM stocks WHERE is_active=1');
  for (const stock of stocks) {
    await db.run(`UPDATE stocks SET prev_close=current_price,open_price=current_price,high_price=current_price,low_price=current_price,updated_at=datetime('now') WHERE id=?`, [stock.id]);
    delete stockState[stock.id];
  }
}

let priceInterval = null;
let lastResetDate = null;

function startPriceGenerator() {
  const { isMarketOpen } = require('./utils/market');
  const intervalMs = parseInt(process.env.PRICE_UPDATE_INTERVAL_MS) || 30000;
  priceInterval = setInterval(async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (lastResetDate !== todayStr) {
      await resetDailyPrices();
      lastResetDate = todayStr;
      console.log(`[PriceGen] Daily reset for ${todayStr}`);
    }
    const open = await isMarketOpen();
    if (open) await updatePrices();
  }, intervalMs);
  console.log(`[PriceGen] Started — updating every ${intervalMs / 1000}s`);
}

function stopPriceGenerator() {
  if (priceInterval) clearInterval(priceInterval);
}

module.exports = { startPriceGenerator, stopPriceGenerator, updatePrices };
