const express = require('express');
const db      = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router  = express.Router();

router.get('/market', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await db.get('SELECT * FROM market_settings WHERE id=1');
    const holidays = await db.all('SELECT * FROM market_holidays ORDER BY date');
    res.json({ settings, holidays });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/market', authenticate, requireAdmin, async (req, res) => {
  try {
    const { open_time, close_time, timezone } = req.body;
    if (!open_time || !close_time) return res.status(400).json({ error: 'open_time and close_time required' });
    await db.run(`UPDATE market_settings SET open_time=?,close_time=?,timezone=COALESCE(?,timezone),updated_at=datetime('now') WHERE id=1`,
      [open_time, close_time, timezone || null]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/holidays', authenticate, requireAdmin, async (req, res) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'date and name required' });
    await db.run('INSERT INTO market_holidays (date,name) VALUES (?,?)', [date, name]);
    res.status(201).json({ success: true });
  } catch (err) { res.status(409).json({ error: 'Holiday on that date already exists' }); }
});

router.delete('/holidays/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM market_holidays WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await db.all('SELECT id,full_name,username,email,role,cash_balance,created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const orders = await db.all(`SELECT o.*,u.username,s.ticker FROM orders o
      JOIN users u ON u.id=o.user_id JOIN stocks s ON s.id=o.stock_id
      ORDER BY o.created_at DESC LIMIT 500`);
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
