const express = require('express');
const { isMarketOpen, getMarketSettings } = require('../utils/market');
const db = require('../db');
const router = express.Router();

router.get('/status', async (req, res) => {
  try {
    const open     = await isMarketOpen();
    const settings = await getMarketSettings();
    const holidays = await db.all('SELECT * FROM market_holidays ORDER BY date');
    res.json({ is_open: open, settings, holidays });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
