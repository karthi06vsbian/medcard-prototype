let app;
let initError = null;

try {
  app = require('../server/server');
} catch (err) {
  initError = err;
  console.error('API Init Error:', err);
}

module.exports = (req, res) => {
  if (initError) {
    return res.status(500).json({
      error: 'Backend Initialization Error on Vercel',
      message: initError.message,
      code: initError.code,
      stack: initError.stack
    });
  }
  return app(req, res);
};
