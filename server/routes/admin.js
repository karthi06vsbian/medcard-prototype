const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Ensure local uploads directory for patient photos exists
const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'photos');
if (!fs.existsSync(PHOTOS_DIR)) {
  fs.mkdirSync(PHOTOS_DIR, { recursive: true });
}

// Helper to save base64 photo locally to server/uploads/photos/
function savePhotoLocally(photoData) {
  if (!photoData || typeof photoData !== 'string') return null;
  if (photoData.startsWith('/uploads/')) return photoData; // already saved path

  if (photoData.startsWith('data:image')) {
    try {
      const matches = photoData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches) return photoData;

      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `photo-${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
      const filePath = path.join(PHOTOS_DIR, filename);

      fs.writeFileSync(filePath, buffer);
      return `/uploads/photos/${filename}`;
    } catch (err) {
      console.error('Error saving photo locally:', err);
      return photoData;
    }
  }
  return photoData;
}

router.use(verifyToken, requireRole('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [[{ total_patients }]] = await pool.query("SELECT COUNT(*) AS total_patients FROM users WHERE role = 'patient'");
    const [[{ total_doctors }]] = await pool.query("SELECT COUNT(*) AS total_doctors FROM users WHERE role = 'doctor'");
    const [[{ total_appointments }]] = await pool.query("SELECT COUNT(*) AS total_appointments FROM appointments WHERE DATE(slot_time) = date('now')");
    const [[{ total_sos }]] = await pool.query("SELECT COUNT(*) AS total_sos FROM sos_requests WHERE DATE(created_at) = date('now')");
    const [[{ active_pharmacies }]] = await pool.query("SELECT COUNT(*) AS active_pharmacies FROM users WHERE role = 'pharmacy'");
    
    res.json({
      totalPatients: total_patients || 0,
      totalDoctors: total_doctors || 0,
      appointmentsToday: total_appointments || 0,
      sosAlertsToday: total_sos || 0,
      activePharmacies: active_pharmacies || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/patients', async (req, res) => {
  try {
    const query = `
      SELECT u.id AS user_id, u.name, u.email, u.health_id AS healthId, u.created_at,
             p.id AS patient_id, p.blood_group AS bloodGroup, p.allergies, p.dob, p.phone, p.photo
      FROM users u
      LEFT JOIN patients p ON u.id = p.user_id
      WHERE u.role = 'patient'
      ORDER BY u.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create New Patient User ID with local photo saving
router.post('/patients', async (req, res) => {
  try {
    const { name, email, password, dob, bloodGroup, phone, allergies, photo } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Save photo locally to server/uploads/photos/
    const localPhotoPath = savePhotoLocally(photo);

    // Generate unique Med ID based on DOB + Timestamp combination
    const cleanDob = dob ? dob.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const timeSuffix = Date.now().toString().slice(-6);
    const healthId = `MID-${cleanDob}-${timeSuffix}`;

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userResult] = await pool.query(
      "INSERT INTO users (name, email, password, role, health_id) VALUES (?, ?, ?, 'patient', ?)",
      [name, email, hashedPassword, healthId]
    );
    const userId = userResult.insertId;

    const [patientResult] = await pool.query(
      "INSERT INTO patients (user_id, blood_group, allergies, dob, phone, photo) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, bloodGroup || 'O+', allergies || 'None', dob || null, phone || '', localPhotoPath]
    );

    res.status(201).json({
      message: 'Patient created successfully',
      patient: {
        user_id: userId,
        patient_id: patientResult.insertId,
        name,
        email,
        healthId,
        bloodGroup: bloodGroup || 'O+',
        allergies: allergies || 'None',
        dob: dob || '',
        phone: phone || '',
        photo: localPhotoPath
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit Patient Personal Information (Name, Email, DOB, Blood Group, Phone, Allergies, Photo)
router.put('/patients/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { name, email, dob, bloodGroup, phone, allergies, photo } = req.body;

    // Find existing patient record
    const [existing] = await pool.query(
      "SELECT u.id AS user_id, p.id AS patient_id, p.photo FROM users u JOIN patients p ON u.id = p.user_id WHERE p.id = ? OR u.id = ?",
      [patientId, patientId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const userId = existing[0].user_id;
    const pId = existing[0].patient_id;

    // Save photo locally if new image uploaded
    let photoPath = existing[0].photo;
    if (photo) {
      photoPath = savePhotoLocally(photo);
    }

    // Update users table (name, email)
    if (name || email) {
      await pool.query(
        "UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?",
        [name, email, userId]
      );
    }

    // Update patients table (blood_group, allergies, dob, phone, photo)
    await pool.query(
      "UPDATE patients SET blood_group = ?, allergies = ?, dob = ?, phone = ?, photo = ? WHERE id = ?",
      [bloodGroup || 'O+', allergies || 'None', dob || null, phone || '', photoPath, pId]
    );

    res.json({ message: 'Patient information updated successfully', photo: photoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Patient Photo Endpoint
router.put('/patients/:patientId/photo', async (req, res) => {
  try {
    const { photo } = req.body;
    const { patientId } = req.params;
    if (!photo) return res.status(400).json({ error: 'Photo data is required' });

    const localPhotoPath = savePhotoLocally(photo);

    await pool.query('UPDATE patients SET photo = ? WHERE id = ? OR user_id = ?', [localPhotoPath, patientId, patientId]);
    res.json({ message: 'Patient photo updated successfully', photo: localPhotoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/doctors', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'doctor' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/doctors', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'doctor')",
      [name, email, hashedPassword]
    );
    res.status(201).json({ message: 'Doctor created', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/doctors/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role = 'doctor'", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/pharmacies', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'pharmacy' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ambulances', async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name, email, created_at FROM users WHERE role = 'ambulance' ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role != 'admin'", [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/chart-data', async (req, res) => {
  try {
    const query = `
      SELECT DATE(slot_time) AS date, COUNT(*) AS count
      FROM appointments
      WHERE slot_time >= date('now', '-7 days')
      GROUP BY DATE(slot_time)
      ORDER BY DATE(slot_time) ASC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
