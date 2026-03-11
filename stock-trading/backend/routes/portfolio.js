const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const router  = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const holdings = await db.all(`SELECT p.quantity,p.avg_cost,p.updated_at,
      s.id AS stock_id,s.ticker,s.company_name,s.current_price,s.open_price,s.high_price,s.low_price
      FROM portfolio p JOIN stocks s ON s.id=p.stock_id WHERE p.user_id=? ORDER BY s.ticker`, [req.user.id]);
    const user = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    const portfolio_value = holdings.reduce((sum, h) => sum + h.quantity * h.current_price, 0);
    res.json({ cash_balance: user.cash_balance, portfolio_value, total_value: user.cash_balance + portfolio_value, holdings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await db.all(`SELECT t.*,s.ticker FROM transactions t
      LEFT JOIN orders o ON o.id=t.order_id LEFT JOIN stocks s ON s.id=o.stock_id
      WHERE t.user_id=? ORDER BY t.created_at DESC LIMIT 200`, [req.user.id]);
    res.json({ transactions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/deposit', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    const val = parseFloat(amount);
    await db.transaction(async trx => {
      await trx.raw(`UPDATE users SET cash_balance=cash_balance+?,updated_at=datetime('now') WHERE id=?`, [val, req.user.id]);
      await trx.raw(`INSERT INTO transactions (id,user_id,type,amount,description) VALUES (?,?,'deposit',?,?)`,
        [uuidv4(), req.user.id, val, `Deposit of $${val.toFixed(2)}`]);
    });
    const user = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    res.json({ cash_balance: user.cash_balance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });
    const val = parseFloat(amount);
    await db.transaction(async trx => {
      const user = await trx.raw('SELECT cash_balance FROM users WHERE id=?', [req.user.id]).then(r => r[0]);
      if (user.cash_balance < val) throw new Error('Insufficient cash balance');
      await trx.raw(`UPDATE users SET cash_balance=cash_balance-?,updated_at=datetime('now') WHERE id=?`, [val, req.user.id]);
      await trx.raw(`INSERT INTO transactions (id,user_id,type,amount,description) VALUES (?,?,'withdrawal',?,?)`,
        [uuidv4(), req.user.id, val, `Withdrawal of $${val.toFixed(2)}`]);
    });
    const user = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    res.json({ cash_balance: user.cash_balance });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
