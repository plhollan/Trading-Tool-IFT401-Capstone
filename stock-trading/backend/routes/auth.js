const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');
const router  = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { full_name, username, email, password } = req.body;
    if (!full_name || !username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await db.get('SELECT id FROM users WHERE username=? OR email=?', [username.toLowerCase(), email.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Username or email already in use' });
    const hash = bcrypt.hashSync(password, 10);
    const id   = uuidv4();
    await db.run(`INSERT INTO users (id,full_name,username,email,password,role,cash_balance) VALUES (?,?,?,?,?,'customer',0)`,
      [id, full_name, username.toLowerCase(), email.toLowerCase(), hash]);
    const token = jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    const user  = await db.get('SELECT id,full_name,username,email,role,cash_balance FROM users WHERE id=?', [id]);
    res.status(201).json({ token, user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await db.get('SELECT * FROM users WHERE username=? OR email=?', [username.toLowerCase(), username.toLowerCase()]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    const { password: _pw, ...safe } = user;
    res.json({ token, user: safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
