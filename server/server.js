const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));

// Mount routes
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
