const jwt = require('jsonwebtoken');
const db  = require('../db');

const authenticate = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.get('SELECT id,username,email,full_name,role,cash_balance FROM users WHERE id=?', [decoded.id]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { authenticate, requireAdmin };
