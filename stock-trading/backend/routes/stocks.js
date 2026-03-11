const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

router.get('/', async (req, res) => {
  try {
    const stocks = await db.all(`SELECT id,company_name,ticker,total_volume,available_volume,
      current_price,open_price,high_price,low_price,prev_close,initial_price,is_active,created_at
      FROM stocks WHERE is_active=1 ORDER BY ticker`);
    res.json({ stocks });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:ticker', async (req, res) => {
  try {
    const stock = await db.get(`SELECT * FROM stocks WHERE ticker=? AND is_active=1`, [req.params.ticker.toUpperCase()]);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });
    const history = await db.all(`SELECT price,volume,recorded_at FROM price_history WHERE stock_id=? ORDER BY recorded_at DESC LIMIT 390`, [stock.id]);
    res.json({ stock, history: history.reverse() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { company_name, ticker, volume, initial_price } = req.body;
    if (!company_name || !ticker || !volume || !initial_price)
      return res.status(400).json({ error: 'company_name, ticker, volume, and initial_price are required' });
    if (volume <= 0 || initial_price <= 0)
      return res.status(400).json({ error: 'Volume and price must be positive' });
    const existing = await db.get('SELECT id FROM stocks WHERE ticker=?', [ticker.toUpperCase()]);
    if (existing) return res.status(409).json({ error: 'Ticker already exists' });
    const id = uuidv4();
    const price = parseFloat(initial_price);
    const vol   = parseInt(volume);
    await db.run(`INSERT INTO stocks (id,company_name,ticker,total_volume,available_volume,initial_price,
      current_price,open_price,high_price,low_price,prev_close) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [id, company_name, ticker.toUpperCase(), vol, vol, price, price, price, price, price, price]);
    await db.run(`INSERT INTO price_history (stock_id,price,volume) VALUES (?,?,0)`, [id, price]);
    const stock = await db.get('SELECT * FROM stocks WHERE id=?', [id]);
    res.status(201).json({ stock });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body;
    await db.run(`UPDATE stocks SET is_active=?,updated_at=datetime('now') WHERE id=?`, [is_active ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
