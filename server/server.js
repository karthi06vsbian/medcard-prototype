const express = require('express');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(compression());
// Safe body parsing for both standalone Express and Vercel serverless runtime
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.json({ limit: '20mb' })(req, res, next);
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return next();
  }
  express.urlencoded({ limit: '20mb', extended: true })(req, res, next);
});
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

// Mount routes
app.get('/api/healthcheck', async (req, res) => {
  try {
    const pool = require('./config/db');
    const [rows] = await pool.query('SELECT count(*) as count FROM users');
    res.json({ ok: true, userCount: rows[0].count, dbFile: pool._db?.name });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, stack: err.stack });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/doctor', require('./routes/doctor'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/ambulance', require('./routes/ambulance'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5001;

// Only listen if executed directly as a standalone script (not when imported as a serverless module)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`MediCard server running on port ${PORT}`));
}

module.exports = app;
