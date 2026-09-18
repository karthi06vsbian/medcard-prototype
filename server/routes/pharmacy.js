const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('pharmacy'));

router.get('/orders', async (req, res) => {
  try {
    const query = `
      SELECT p.id, p.medicine_name, p.dosage, p.quantity, p.status, p.created_at,
             pat_user.name AS patient_name, pat_user.health_id,
             doc_user.name AS doctor_name
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.id
      JOIN users pat_user ON pat.user_id = pat_user.id
      JOIN users doc_user ON p.doctor_id = doc_user.id
      ORDER BY p.created_at DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Ordered', 'Packed', 'Out for Delivery', 'Delivered'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const [result] = await pool.query('UPDATE prescriptions SET status = ? WHERE id = ?', [status, req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    res.json({ message: 'Status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
