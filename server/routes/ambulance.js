const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('ambulance'));

router.get('/alerts', async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.location_text, s.status, s.created_at,
             u.name AS patient_name, u.health_id, p.phone
      FROM sos_requests s
      JOIN patients p ON s.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE (s.ambulance_id = ? OR s.ambulance_id IS NULL)
        AND s.status != 'Completed'
      ORDER BY s.created_at DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/alerts/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Alert Sent', 'Dispatched', 'Reached Patient', 'En Route to Hospital', 'Completed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.query(
      'UPDATE sos_requests SET status = ?, ambulance_id = COALESCE(ambulance_id, ?) WHERE id = ?',
      [status, req.user.id, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'SOS request not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.location_text, s.status, s.created_at,
             u.name AS patient_name, u.health_id, p.phone
      FROM sos_requests s
      JOIN patients p ON s.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE s.ambulance_id = ? AND s.status = 'Completed'
      ORDER BY s.created_at DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
