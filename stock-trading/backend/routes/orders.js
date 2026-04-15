const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const { isMarketOpen } = require('../utils/market');
const router  = express.Router();

const GRACE_PERIOD_MS = 60 * 1000; // 1 minute pending before execution

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

    // Hold funds/shares now — execution happens after the grace period
    await db.transaction(async trx => {
      const user = await trx.raw('SELECT * FROM users WHERE id=?', [req.user.id]).then(r => r[0]);
      if (!user) throw new Error('User not found');

      if (type === 'buy') {
        if (user.cash_balance < total_amount) throw new Error('Insufficient cash balance');
        if (stock.available_volume < quantity) throw new Error('Insufficient stock volume available');
        // Hold cash and reserve volume
        await trx.raw(`UPDATE users SET cash_balance=cash_balance-?,updated_at=datetime('now') WHERE id=?`, [total_amount, user.id]);
        await trx.raw(`UPDATE stocks SET available_volume=available_volume-?,updated_at=datetime('now') WHERE id=?`, [quantity, stock_id]);
      } else {
        const holding = await trx.raw('SELECT * FROM portfolio WHERE user_id=? AND stock_id=?', [user.id, stock_id]).then(r => r[0]);
        if (!holding || holding.quantity < quantity) throw new Error('Insufficient shares to sell');
        // Hold shares by removing from portfolio temporarily
        const newQty = holding.quantity - quantity;
        if (newQty === 0) {
          await trx.raw('DELETE FROM portfolio WHERE user_id=? AND stock_id=?', [user.id, stock_id]);
        } else {
          await trx.raw(`UPDATE portfolio SET quantity=?,updated_at=datetime('now') WHERE user_id=? AND stock_id=?`, [newQty, user.id, stock_id]);
        }
      }

      await trx.raw(`INSERT INTO orders (id,user_id,stock_id,type,status,quantity,price,total_amount) VALUES (?,?,?,'${type}','pending',?,?,?)`,
        [orderId, user.id, stock_id, quantity, price, total_amount]);
    });

    const order = await db.get('SELECT * FROM orders WHERE id=?', [orderId]);
    const updatedUser = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    res.status(201).json({ order, cash_balance: updatedUser.cash_balance, message: 'Order pending. You have 60 seconds to cancel.' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const order = await db.get('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'pending') return res.status(400).json({ error: 'Only pending orders can be cancelled' });

    await db.transaction(async trx => {
      if (order.type === 'buy') {
        // Refund held cash and restore reserved volume
        await trx.raw(`UPDATE users SET cash_balance=cash_balance+?,updated_at=datetime('now') WHERE id=?`, [order.total_amount, order.user_id]);
        await trx.raw(`UPDATE stocks SET available_volume=available_volume+?,updated_at=datetime('now') WHERE id=?`, [order.quantity, order.stock_id]);
      } else {
        // Restore held shares back to portfolio
        const holding = await trx.raw('SELECT * FROM portfolio WHERE user_id=? AND stock_id=?', [order.user_id, order.stock_id]).then(r => r[0]);
        if (holding) {
          await trx.raw(`UPDATE portfolio SET quantity=quantity+?,updated_at=datetime('now') WHERE user_id=? AND stock_id=?`, [order.quantity, order.user_id, order.stock_id]);
        } else {
          await trx.raw(`INSERT INTO portfolio (user_id,stock_id,quantity,avg_cost) VALUES (?,?,?,?)`, [order.user_id, order.stock_id, order.quantity, order.price]);
        }
      }
      await trx.raw(`UPDATE orders SET status='cancelled',cancelled_at=datetime('now') WHERE id=?`, [order.id]);
    });

    const updatedUser = await db.get('SELECT cash_balance FROM users WHERE id=?', [req.user.id]);
    res.json({ success: true, cash_balance: updatedUser.cash_balance });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Executes all pending orders older than the grace period — called by the background worker in server.js
async function executePendingOrders() {
  try {
    const cutoffMs = Date.now() - GRACE_PERIOD_MS;
    const cutoff   = new Date(cutoffMs).toISOString().replace('T', ' ').slice(0, 19);
    const pending  = await db.all(`SELECT * FROM orders WHERE status='pending' AND created_at <= ?`, [cutoff]);

    for (const order of pending) {
      await db.transaction(async trx => {
        const txId  = uuidv4();
        const stock = await trx.raw('SELECT * FROM stocks WHERE id=?', [order.stock_id]).then(r => r[0]);

        if (order.type === 'buy') {
          // Cash & volume already held — add shares to portfolio
          const holding = await trx.raw('SELECT * FROM portfolio WHERE user_id=? AND stock_id=?', [order.user_id, order.stock_id]).then(r => r[0]);
          if (holding) {
            const newQty  = holding.quantity + order.quantity;
            const newCost = ((holding.avg_cost * holding.quantity) + order.total_amount) / newQty;
            await trx.raw(`UPDATE portfolio SET quantity=?,avg_cost=?,updated_at=datetime('now') WHERE user_id=? AND stock_id=?`, [newQty, newCost, order.user_id, order.stock_id]);
          } else {
            await trx.raw(`INSERT INTO portfolio (user_id,stock_id,quantity,avg_cost) VALUES (?,?,?,?)`, [order.user_id, order.stock_id, order.quantity, order.price]);
          }
        } else {
          // Shares already held — release cash and restore available volume
          await trx.raw(`UPDATE users SET cash_balance=cash_balance+?,updated_at=datetime('now') WHERE id=?`, [order.total_amount, order.user_id]);
          await trx.raw(`UPDATE stocks SET available_volume=available_volume+?,updated_at=datetime('now') WHERE id=?`, [order.quantity, order.stock_id]);
        }

        await trx.raw(`UPDATE orders SET status='executed',executed_at=datetime('now') WHERE id=?`, [order.id]);
        await trx.raw(`INSERT INTO transactions (id,user_id,type,amount,description,order_id) VALUES (?,?,?,?,?,?)`,
          [txId, order.user_id, order.type === 'buy' ? 'trade_buy' : 'trade_sell', order.total_amount,
           `${order.type === 'buy' ? 'Bought' : 'Sold'} ${order.quantity} share(s) of ${stock.ticker} @ $${order.price.toFixed(2)}`, order.id]);
      });
    }
  } catch (err) {
    console.error('Order execution worker error:', err);
  }
}

module.exports = router;
module.exports.executePendingOrders = executePendingOrders;
