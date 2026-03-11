const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const { isMarketOpen } = require('../utils/market');
const router  = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const orders = await db.all(`SELECT o.*,s.ticker,s.company_name FROM orders o
      JOIN stocks s ON s.id=o.stock_id WHERE o.user_id=? ORDER BY o.created_at DESC LIMIT 100`, [req.user.id]);
    res.json({ orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { stock_id, type, quantity } = req.body;
    if (!stock_id || !type || !quantity) return res.status(400).json({ error: 'stock_id, type, and quantity required' });
    if (!['buy','sell'].includes(type)) return res.status(400).json({ error: 'type must be buy or sell' });
    if (quantity <= 0 || !Number.isInteger(quantity)) return res.status(400).json({ error: 'quantity must be a positive integer' });

    const open = await isMarketOpen();
    if (!open) return res.status(403).json({ error: 'Market is currently closed. Orders cannot be placed outside market hours.' });

    const stock = await db.get('SELECT * FROM stocks WHERE id=? AND is_active=1', [stock_id]);
    if (!stock) return res.status(404).json({ error: 'Stock not found' });

    const price        = stock.current_price;
    const total_amount = parseFloat((price * quantity).toFixed(2));
    const orderId      = uuidv4();
    const txId         = uuidv4();

    await db.transaction(async trx => {
      const user = await trx.raw('SELECT * FROM users WHERE id=?', [req.user.id]).then(r => r[0]);
      if (!user) throw new Error('User not found');

      if (type === 'buy') {
        if (user.cash_balance < total_amount) throw new Error('Insufficient cash balance');
        if (stock.available_volume < quantity) throw new Error('Insufficient stock volume available');
        await trx.raw(`UPDATE users SET cash_balance=cash_balance-?,updated_at=datetime('now') WHERE id=?`, [total_amount, user.id]);
        await trx.raw(`UPDATE stocks SET available_volume=available_volume-?,updated_at=datetime('now') WHERE id=?`, [quantity, stock_id]);
        const holding = await trx.raw('SELECT * FROM portfolio WHERE user_id=? AND stock_id=?', [user.id, stock_id]).then(r => r[0]);
        if (holding) {
          const newQty  = holding.quantity + quantity;
          const newCost = ((holding.avg_cost * holding.quantity) + total_amount) / newQty;
          await trx.raw(`UPDATE portfolio SET quantity=?,avg_cost=?,updated_at=datetime('now') WHERE user_id=? AND stock_id=?`, [newQty, newCost, user.id, stock_id]);
        } else {
          await trx.raw(`INSERT INTO portfolio (user_id,stock_id,quantity,avg_cost) VALUES (?,?,?,?)`, [user.id, stock_id, quantity, price]);
        }
      } else {
        const holding = await trx.raw('SELECT * FROM portfolio WHERE user_id=? AND stock_id=?', [user.id, stock_id]).then(r => r[0]);
        if (!holding || holding.quantity < quantity) throw new Error('Insufficient shares to sell');
        await trx.raw(`UPDATE users SET cash_balance=cash_balance+?,updated_at=datetime('now') WHERE id=?`, [total_amount, user.id]);
        await trx.raw(`UPDATE stocks SET available_volume=available_volume+?,updated_at=datetime('now') WHERE id=?`, [quantity, stock_id]);
        const newQty = holding.quantity - quantity;
        if (newQty === 0) {
          await trx.raw('DELETE FROM portfolio WHERE user_id=? AND stock_id=?', [user.id, stock_id]);
        } else {
          await trx.raw(`UPDATE portfolio SET quantity=?,updated_at=datetime('now') WHERE user_id=? AND stock_id=?`, [newQty, user.id, stock_id]);
        }
      }

      await trx.raw(`INSERT INTO orders (id,user_id,stock_id,type,status,quantity,price,total_amount,executed_at)
        VALUES (?,?,?,?,'executed',?,?,?,datetime('now'))`, [orderId, user.id, stock_id, type, quantity, price, total_amount]);
      await trx.raw(`INSERT INTO transactions (id,user_id,type,amount,description,order_id) VALUES (?,?,?,?,?,?)`,
        [txId, user.id, type==='buy'?'trade_buy':'trade_sell', total_amount,
         `${type==='buy'?'Bought':'Sold'} ${quantity} share(s) of ${stock.ticker} @ $${price.toFixed(2)}`, orderId]);
    });

    const order = await db.get('SELECT * FROM orders WHERE id=?', [orderId]);
    const updatedUser = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    res.status(201).json({ order, cash_balance: updatedUser.cash_balance });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await db.get('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled' });
    await db.run(`UPDATE orders SET status='cancelled',cancelled_at=datetime('now') WHERE id=?`, [order.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
