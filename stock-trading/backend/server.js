require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const db        = require('./db');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/stocks',    require('./routes/stocks'));
app.use('/api/orders',    require('./routes/orders'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/admin',     require('./routes/admin'));
app.use('/api/market',    require('./routes/market'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => res.sendFile(path.join(buildPath, 'index.html')));
}

const PORT = process.env.PORT || 5000;

// Wait for DB to be ready before starting
db.ready.then(() => {
  const { startPriceGenerator } = require('./priceGenerator');
  const { executePendingOrders } = require('./routes/orders');
  startPriceGenerator();
  // Execute pending orders every 10 seconds after the 1-minute grace period
  setInterval(executePendingOrders, 10 * 1000);
  app.listen(PORT, () => {
    console.log(`🚀 Stock Trading API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
});
