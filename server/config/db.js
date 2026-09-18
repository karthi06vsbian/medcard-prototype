const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath = path.join(__dirname, '..', '..', 'medicard.db');

// In serverless environments (e.g. Vercel), the root filesystem is read-only.
// Copy the fixed demo database to /tmp so reading & writing succeed.
if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION) {
  const tmpDbPath = path.join('/tmp', 'medicard.db');
  try {
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'medicard.db'),
        path.join(process.cwd(), 'server', 'medicard.db'),
        path.join(__dirname, '..', '..', 'medicard.db'),
        path.join(__dirname, '..', 'medicard.db'),
        path.join(__dirname, 'medicard.db'),
        '/var/task/medicard.db'
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          fs.copyFileSync(candidate, tmpDbPath);
          console.log('Copied database to /tmp from:', candidate);
          break;
        }
      }
    }
    if (fs.existsSync(tmpDbPath)) {
      dbPath = tmpDbPath;
    }
  } catch (err) {
    console.warn('Vercel serverless /tmp db setup notice:', err.message);
  }
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
try {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (pragmaErr) {
  console.warn('SQLite pragma notice:', pragmaErr.message);
}

// Ensure extra clinical fields exist on medical_records and chatbot_logs
const ensureColumns = () => {
  try {
    const medicalCols = db.pragma('table_info(medical_records)').map(c => c.name);
    const newMedicalCols = [
      { name: 'visit_date', type: 'TEXT' },
      { name: 'symptoms', type: 'TEXT' },
      { name: 'clinical_notes', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'doctor_entered_diagnosis', type: 'TEXT' },
      { name: 'treatment', type: 'TEXT' },
      { name: 'medication', type: 'TEXT' },
      { name: 'dosage', type: 'TEXT' },
      { name: 'frequency', type: 'TEXT' },
      { name: 'duration', type: 'TEXT' },
      { name: 'tests', type: 'TEXT' },
      { name: 'follow_up_date', type: 'TEXT' },
      { name: 'recovery_status', type: 'TEXT DEFAULT "Ongoing"' },
      { name: 'doctor_notes', type: 'TEXT' }
    ];

    for (const col of newMedicalCols) {
      if (!medicalCols.includes(col.name)) {
        db.exec(`ALTER TABLE medical_records ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    const patientCols = db.pragma('table_info(patients)').map(c => c.name);
    if (!patientCols.includes('preferred_language')) {
      db.exec(`ALTER TABLE patients ADD COLUMN preferred_language TEXT DEFAULT 'en'`);
    }

    const logCols = db.pragma('table_info(chatbot_logs)').map(c => c.name);
    if (!logCols.includes('duration_days')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN duration_days INTEGER DEFAULT 1`);
    }
    if (!logCols.includes('triage_category')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN triage_category TEXT DEFAULT 'GREEN'`);
    }
    if (!logCols.includes('escalation_flag')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN escalation_flag INTEGER DEFAULT 0`);
    }
    if (!logCols.includes('doctor_id')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN doctor_id INTEGER NULL`);
    }
    if (!logCols.includes('sender_message')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN sender_message TEXT`);
    }
    if (!logCols.includes('ai_response')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN ai_response TEXT`);
    }
    if (!logCols.includes('language')) {
      db.exec(`ALTER TABLE chatbot_logs ADD COLUMN language TEXT DEFAULT 'en'`);
    }
  } catch (err) {
    console.error('Column migration notice:', err.message);
  }
};
ensureColumns();

// Create a mysql2-compatible wrapper so all route files work unchanged
const pool = {
  query: async (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      
      // Determine if this is a SELECT or a mutating query
      const trimmed = sql.trim().toUpperCase();
      if (trimmed.startsWith('SELECT') || trimmed.startsWith('SHOW') || trimmed.startsWith('PRAGMA')) {
        const rows = stmt.all(...params);
        return [rows, []];
      } else {
        const result = stmt.run(...params);
        return [{ insertId: result.lastInsertRowid, affectedRows: result.changes }, []];
      }
    } catch (err) {
      throw err;
    }
  },
  // Expose raw db for seed script
  _db: db
};

module.exports = pool;
