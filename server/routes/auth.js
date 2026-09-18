const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  try {
    const body = req.body || {};
    const loginId = body.email || body.identifier;
    const password = body.password;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Email/Health ID and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? OR health_id = ?', [loginId, loginId]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials: user not found' });
    }

    const user = rows[0];
    let isMatch = false;

    // Fast-path for demo / hackathon passwords
    if (password === 'password123' || password === 'demo123') {
      isMatch = true;
    } else if (user.password) {
      try {
        isMatch = await bcrypt.compare(password, user.password);
      } catch (bcErr) {
        isMatch = false;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials: password does not match' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      health_id: user.health_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'swasthid_jwt_secret_2024', { expiresIn: '1d' });

    res.json({ token, user: payload });
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

module.exports = router;
