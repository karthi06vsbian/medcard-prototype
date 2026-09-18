module.exports = (req, res) => {
  let sqliteStatus = "untested";
  let errorMsg = null;
  try {
    const Database = require('better-sqlite3');
    sqliteStatus = "better-sqlite3 loaded successfully";
  } catch (err) {
    sqliteStatus = "failed to load better-sqlite3";
    errorMsg = { message: err.message, stack: err.stack };
  }

  res.json({
    status: "ok",
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL,
    sqliteStatus,
    errorMsg
  });
};
