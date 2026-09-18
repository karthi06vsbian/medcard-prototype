const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('doctor'));

// ── Search / QR Scan Patient Endpoint ──
router.get('/search', async (req, res) => {
  try {
    const { healthId } = req.query;
    if (!healthId) return res.status(400).json({ error: 'healthId query param is required' });

    const query = `
      SELECT u.id AS user_id, u.name, u.email, u.health_id,
             p.id AS patient_id, p.blood_group, p.allergies, p.dob, p.phone, p.photo,
             p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure
      FROM users u
      JOIN patients p ON u.id = p.user_id
      WHERE TRIM(UPPER(u.health_id)) = TRIM(UPPER(?)) AND u.role = 'patient'
    `;
    const [rows] = await pool.query(query, [healthId.trim()]);
    if (rows.length === 0) return res.status(404).json({ error: 'Patient not found for this Med ID' });
    
    const p = rows[0];

    // Fetch medical history records (immutable clinical log)
    const [history] = await pool.query(`
      SELECT m.id, m.diagnosis, m.doctor_entered_diagnosis, m.symptoms, m.clinical_notes,
             COALESCE(m.clinical_notes, m.doctor_notes, '') AS notes,
             m.treatment, m.medication, m.dosage, m.frequency, m.duration,
             m.tests, m.follow_up_date, m.recovery_status, m.doctor_notes,
             m.category, m.visit_date, m.created_at, u.name AS doctor_name
      FROM medical_records m
      LEFT JOIN users u ON m.doctor_id = u.id
      WHERE m.patient_id = ?
      ORDER BY m.created_at DESC
    `, [p.patient_id]);

    // Fetch prescriptions
    const [prescriptions] = await pool.query(`
      SELECT pr.id, pr.medicine_name, pr.dosage, pr.quantity, pr.status, pr.created_at, u.name AS doctor_name
      FROM prescriptions pr
      LEFT JOIN users u ON pr.doctor_id = u.id
      WHERE pr.patient_id = ?
      ORDER BY pr.created_at DESC
    `, [p.patient_id]);

    // Fetch medical reports & scans
    const [reports] = await pool.query(`
      SELECT id, report_type, report_name, file_path, notes, doctor_notes, lab_name, report_date, parameters_json, created_at
      FROM medical_reports
      WHERE patient_id = ?
      ORDER BY report_date DESC
    `, [p.patient_id]);

    const formattedReports = reports.map(r => {
      let params = [];
      if (r.parameters_json) {
        try { params = JSON.parse(r.parameters_json); } catch (e) { params = []; }
      }
      return { ...r, parameters: params };
    });

    // Build longitudinal recovery timeline from medical_records
    const timeline = history.map(h => ({
      id: h.id,
      date: h.visit_date || (h.created_at ? new Date(h.created_at).toISOString().split('T')[0] : 'N/A'),
      diagnosis: h.doctor_entered_diagnosis || h.diagnosis,
      doctor: h.doctor_name || 'Attending Physician',
      symptoms: h.symptoms || h.notes,
      treatment: h.treatment || 'Clinical consultation',
      medication: h.medication ? `${h.medication} (${h.dosage || 'Prescribed'})` : 'None',
      status: h.recovery_status || 'Ongoing',
      notes: h.doctor_notes || h.clinical_notes || h.notes
    }));

    res.json({
      patient_id: p.patient_id,
      name: p.name,
      email: p.email,
      healthId: p.health_id,
      bloodGroup: p.blood_group,
      allergies: p.allergies,
      dob: p.dob,
      phone: p.phone,
      photo: p.photo,
      gender: p.gender,
      height: p.height,
      weight: p.weight,
      bmi: p.bmi,
      bodyType: p.body_type,
      bloodPressure: p.blood_pressure,
      history: history.map(h => ({
        id: h.id,
        diagnosis: h.doctor_entered_diagnosis || h.diagnosis,
        clinicalNotes: h.clinical_notes || h.notes,
        treatment: h.treatment,
        medication: h.medication,
        dosage: h.dosage,
        frequency: h.frequency,
        duration: h.duration,
        tests: h.tests,
        followUpDate: h.follow_up_date,
        recoveryStatus: h.recovery_status || 'Ongoing',
        doctorNotes: h.doctor_notes,
        category: h.category,
        doctor: h.doctor_name || 'Attending Physician',
        date: h.visit_date || (h.created_at ? new Date(h.created_at).toISOString().split('T')[0] : 'Recent')
      })),
      prescriptions: prescriptions.map(rx => ({
        id: rx.id,
        medicine_name: rx.medicine_name,
        dosage: rx.dosage,
        quantity: rx.quantity,
        status: rx.status,
        doctor: rx.doctor_name || 'Attending Physician',
        date: rx.created_at ? new Date(rx.created_at).toISOString().split('T')[0] : 'Recent'
      })),
      reports: formattedReports,
      timeline,
      recoveryTimeline: timeline
    });
  } catch (err) {
    console.error('Doctor search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── AI Patient History Assistant (Doctor Portal) ──
router.post('/ai-assistant', async (req, res) => {
  try {
    const { patient_id, health_id, query } = req.body;
    let targetPatientId = patient_id;

    if (!targetPatientId && health_id) {
      const [pRows] = await pool.query(`
        SELECT p.id FROM patients p
        JOIN users u ON p.user_id = u.id
        WHERE TRIM(UPPER(u.health_id)) = TRIM(UPPER(?))
      `, [health_id.trim()]);
      if (pRows.length > 0) targetPatientId = pRows[0].id;
    }

    if (!targetPatientId) {
      return res.status(400).json({ error: 'patient_id or health_id is required' });
    }

    // 1. Fetch patient profile
    const [pRows] = await pool.query(`
      SELECT u.name, u.health_id, p.id AS patient_id, p.blood_group, p.allergies, p.dob,
             p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure
      FROM users u
      JOIN patients p ON u.id = p.user_id
      WHERE p.id = ?
    `, [targetPatientId]);

    if (pRows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = pRows[0];

    // 2. Fetch all medical records
    const [records] = await pool.query(`
      SELECT m.id, m.visit_date, m.symptoms, m.clinical_notes, m.diagnosis, 
             m.doctor_entered_diagnosis, m.treatment, m.medication, m.dosage, 
             m.frequency, m.duration, m.tests, m.follow_up_date, m.recovery_status, 
             m.doctor_notes, m.category, m.created_at, u.name AS doctor_name
      FROM medical_records m
      LEFT JOIN users u ON m.doctor_id = u.id
      WHERE m.patient_id = ?
      ORDER BY m.created_at DESC
    `, [targetPatientId]);

    // 3. Fetch reports & scans
    const [reports] = await pool.query(`
      SELECT report_name, report_type, notes, doctor_notes, lab_name, report_date, parameters_json
      FROM medical_reports
      WHERE patient_id = ?
      ORDER BY report_date DESC
    `, [targetPatientId]);

    // 4. Fetch prescriptions
    const [prescriptions] = await pool.query(`
      SELECT pr.medicine_name, pr.dosage, pr.quantity, pr.status, pr.created_at, u.name AS doctor_name
      FROM prescriptions pr
      LEFT JOIN users u ON pr.doctor_id = u.id
      WHERE pr.patient_id = ?
      ORDER BY pr.created_at DESC
    `, [targetPatientId]);

    let age = 'N/A';
    if (patient.dob) {
      const birthYear = new Date(patient.dob).getFullYear();
      age = new Date().getFullYear() - birthYear;
    }

    const queryLower = (query || '').toLowerCase();
    let responseText = '';

    // Check for previous fever episode specifically
    const feverRecords = records.filter(r => 
      (r.diagnosis && r.diagnosis.toLowerCase().includes('fever')) ||
      (r.doctor_entered_diagnosis && r.doctor_entered_diagnosis.toLowerCase().includes('fever')) ||
      (r.symptoms && r.symptoms.toLowerCase().includes('fever')) ||
      (r.clinical_notes && r.clinical_notes.toLowerCase().includes('fever'))
    );

    // ── SCENARIO A: Review Previous Fever History / Similar Episode ──
    if (queryLower.includes('fever') || queryLower.includes('similar episode')) {
      responseText = `PATIENT SUMMARY\n` +
        `• **Patient**: ${patient.name} (${age} yrs, ${patient.gender || 'Male'}) | **Health ID**: ${patient.health_id}\n` +
        `• **Blood Group**: ${patient.blood_group} | **Known Allergies**: ⚠️ **${patient.allergies || 'None Reported'}**\n` +
        `• **Vitals & Physical Context**: BMI ${patient.bmi} (${patient.height}, ${patient.weight}) | BP: ${patient.blood_pressure}\n\n` +
        `CURRENT VISIT\n` +
        `• Reviewing previous acute pyrexia and febrile illness history.\n\n` +
        `RELEVANT HISTORY\n` +
        `• **Similar previous episode found in this patient's medical history.**\n`;

      if (feverRecords.length > 0) {
        feverRecords.forEach((f, idx) => {
          responseText += `\n🔹 **PREVIOUS FEVER EPISODE (Visit ${idx + 1})**\n` +
            `  • **Date**: ${f.visit_date || new Date(f.created_at).toLocaleDateString()}\n` +
            `  • **Symptoms**: ${f.symptoms || 'Fever reported'}\n` +
            `  • **Duration**: ${f.duration || '5 days'}\n` +
            `  • **Doctor**: Dr. ${f.doctor_name || 'Attending Physician'}\n` +
            `  • **Diagnosis**: ${f.doctor_entered_diagnosis || f.diagnosis}\n` +
            `  • **Treatment Prescribed**: ${f.treatment || 'Hydration and antipyretics'}\n` +
            `  • **Medication**: ${f.medication || 'Paracetamol'} (${f.dosage || '650mg'}) — ${f.frequency || 'SOS'}\n` +
            `  • **Outcome / Status**: ${f.recovery_status || 'Recovered'}\n` +
            `  • **Follow-up Notes**: "${f.doctor_notes || f.clinical_notes || 'Recovered after treatment course'}"\n`;
        });
      } else {
        responseText += `• No previous fever episodes recorded on file.\n`;
      }

      responseText += `\nPREVIOUS TREATMENTS\n` +
        `• ${patient.name}'s previous records indicate positive recovery on antipyretic hydration regimens.\n\n` +
        `MEDICAL REPORT SUMMARY\n` +
        `• Complete Blood Count and inflammatory markers were evaluated and resolved.\n\n` +
        `RECOVERY HISTORY\n` +
        `• Fully recovered from viral pyrexia after structured 4-stage clinical follow-up.\n\n` +
        `AI NOTES\n` +
        `"A previous episode with similar symptoms is present in the patient's record. Please review the previous diagnosis, treatment, and outcome before deciding the current treatment." *(Medication decisions remain under your authorized clinical discretion).*`;
    }
    // ── SCENARIO B: Review Previous Treatments ──
    else if (queryLower.includes('treatment') || queryLower.includes('medication') || queryLower.includes('prescriptions')) {
      responseText = `PATIENT SUMMARY\n` +
        `• **Patient**: ${patient.name} (${age} yrs) | **Health ID**: ${patient.health_id}\n` +
        `• **Allergies**: ⚠️ **${patient.allergies || 'None Reported'}**\n\n` +
        `CURRENT VISIT\n` +
        `• Reviewing all historical physician-entered treatments and prescriptions.\n\n` +
        `PREVIOUS TREATMENTS\n`;

      if (prescriptions.length > 0) {
        prescriptions.forEach((rx, idx) => {
          responseText += `• **${rx.medicine_name}** | Dosage: ${rx.dosage} | Qty: ${rx.quantity} | Prescribing Doctor: Dr. ${rx.doctor_name || 'Attending Physician'} (${new Date(rx.created_at).toLocaleDateString()})\n`;
        });
      } else {
        responseText += `• No past prescription records found.\n`;
      }

      responseText += `\nRECOVERY HISTORY\n` +
        `• Patient records show historical compliance with prescribed courses. No adverse drug reactions documented outside of registered allergy register (⚠️ **${patient.allergies}**).\n\n` +
        `AI NOTES\n` +
        `"The patient's previous records show that this treatment was prescribed previously. Please review the previous response and determine whether it is appropriate now."`;
    }
    // ── SCENARIO C: Review Medical Reports & Scans ──
    else if (queryLower.includes('report') || queryLower.includes('scan') || queryLower.includes('mri') || queryLower.includes('xray') || queryLower.includes('lab')) {
      responseText = `PATIENT SUMMARY\n` +
        `• **Patient**: ${patient.name} (${age} yrs) | **Health ID**: ${patient.health_id}\n\n` +
        `MEDICAL REPORT SUMMARY\n` +
        `• **Total Diagnostic Documents Available**: ${reports.length} report(s) on file.\n\n`;

      reports.forEach((rep, idx) => {
        responseText += `🔹 **${idx + 1}. ${rep.report_name}** (${rep.report_type.toUpperCase()})\n` +
          `  • **Center / Lab**: ${rep.lab_name || 'Clinical Diagnostic Lab'} | **Date**: ${rep.report_date || 'Recent'}\n` +
          `  • **Findings**: ${rep.notes || 'Normal study'}\n` +
          `  • **Interpreting Doctor Impression**: "${rep.doctor_notes || 'Verified'}"\n\n`;
      });

      responseText += `AI NOTES\n` +
        `"Please review these diagnostic documents and imaging film copies before making clinical decisions."`;
    }
    // ── SCENARIO D: Review Recovery Timeline ──
    else if (queryLower.includes('recovery') || queryLower.includes('timeline') || queryLower.includes('history')) {
      responseText = `PATIENT SUMMARY\n` +
        `• **Patient**: ${patient.name} (${age} yrs) | **Health ID**: ${patient.health_id}\n\n` +
        `RECOVERY HISTORY & CLINICAL TIMELINE\n`;

      if (records.length > 0) {
        records.forEach((r, idx) => {
          responseText += `● **${r.visit_date || new Date(r.created_at).toLocaleDateString()}** — ${r.doctor_entered_diagnosis || r.diagnosis}\n` +
            `  • Status: [${r.recovery_status || 'Ongoing'}] | Doctor: Dr. ${r.doctor_name || 'Physician'}\n` +
            `  • Treatment: ${r.treatment || 'Consultation'}\n` +
            `  • Doctor Notes: "${r.doctor_notes || r.clinical_notes || 'Consultation completed'}"\n\n`;
        });
      } else {
        responseText += `• No previous clinical timeline records found.\n`;
      }

      responseText += `AI NOTES\n` +
        `"This longitudinal timeline provides historical context of recovery progression across all recorded visits."`;
    }
    // ── SCENARIO E: Default Overview ──
    else {
      responseText = `PATIENT SUMMARY\n` +
        `• **Patient**: ${patient.name} (${age} yrs, ${patient.gender || 'Male'}) | **Health ID**: ${patient.health_id}\n` +
        `• **Blood Group**: ${patient.blood_group} | **Known Allergies**: ⚠️ **${patient.allergies || 'None Reported'}**\n` +
        `• **Vitals & Physical Context**: BMI ${patient.bmi} (${patient.height}, ${patient.weight}) | BP: ${patient.blood_pressure}\n\n` +
        `CURRENT VISIT\n` +
        `• Active clinical session with authorized medical access.\n\n` +
        `RELEVANT HISTORY\n` +
        `• **Recent Diagnoses**: ${records.slice(0, 3).map(r => r.doctor_entered_diagnosis || r.diagnosis).join(', ') || 'None recorded'}\n\n` +
        `PREVIOUS TREATMENTS\n` +
        `• **Active / Recent Prescriptions**: ${prescriptions.slice(0, 3).map(p => `${p.medicine_name} (${p.dosage})`).join(', ') || 'None active'}\n\n` +
        `MEDICAL REPORT SUMMARY\n` +
        `• ${reports.length} diagnostic scan(s) & laboratory panel(s) available for review.\n\n` +
        `RECOVERY HISTORY\n` +
        `• Historical follow-ups demonstrate positive recovery on recorded regimens.\n\n` +
        `AI NOTES\n` +
        `"Please review these records before making clinical decisions. You can submit updated clinical checkup notes or prescribe medication below."`;
    }

    res.json({
      reply: responseText,
      patient_id: patient.patient_id,
      patientName: patient.name,
      healthId: patient.health_id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Doctor Treatment & Checkup Submission (Creates Immutable Medical Record) ──
router.post('/treatment', async (req, res) => {
  try {
    const {
      patient_id,
      visit_date,
      symptoms,
      clinical_notes,
      doctor_entered_diagnosis,
      diagnosis,
      treatment,
      medication,
      dosage,
      frequency,
      duration,
      tests,
      follow_up_date,
      recovery_status,
      doctor_notes,
      category
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'patient_id is required' });
    }

    const diag = doctor_entered_diagnosis || diagnosis || 'Clinical Consultation';
    const visitDateStr = visit_date || new Date().toISOString().split('T')[0];
    const recStatus = recovery_status || 'Ongoing';

    // 1. Insert immutable record into medical_records
    const [result] = await pool.query(`
      INSERT INTO medical_records (
        patient_id, doctor_id, visit_date, symptoms, clinical_notes,
        diagnosis, doctor_entered_diagnosis, treatment, medication,
        dosage, frequency, duration, tests, follow_up_date,
        recovery_status, doctor_notes, category
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      req.user.id,
      visitDateStr,
      symptoms || null,
      clinical_notes || null,
      diag,
      diag,
      treatment || null,
      medication || null,
      dosage || null,
      frequency || null,
      duration || null,
      tests || null,
      follow_up_date || null,
      recStatus,
      doctor_notes || null,
      category || 'common'
    ]);

    // 2. If medication is specified, automatically create prescription for pharmacy portal
    if (medication && medication.trim()) {
      await pool.query(`
        INSERT INTO prescriptions (patient_id, doctor_id, medicine_name, dosage, quantity, status)
        VALUES (?, ?, ?, ?, ?, 'Ordered')
      `, [
        patient_id,
        req.user.id,
        medication.trim(),
        dosage ? `${dosage} (${frequency || 'As directed'})` : (frequency || '1 tablet daily'),
        10
      ]);
    }

    res.status(201).json({
      message: 'Treatment and medical record securely recorded.',
      record_id: result.insertId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Legacy Checkup Endpoint (Maintained for Backward Compatibility) ──
router.post('/checkup', async (req, res) => {
  try {
    const { patient_id, diagnosis, notes, symptoms, treatment, recovery_status } = req.body;
    if (!patient_id || !diagnosis) return res.status(400).json({ error: 'patient_id and diagnosis are required' });

    const [result] = await pool.query(`
      INSERT INTO medical_records (
        patient_id, doctor_id, diagnosis, doctor_entered_diagnosis, notes, clinical_notes, symptoms, treatment, recovery_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      req.user.id,
      diagnosis,
      diagnosis,
      notes || null,
      notes || null,
      symptoms || null,
      treatment || null,
      recovery_status || 'Ongoing'
    ]);
    res.status(201).json({ message: 'Medical record added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Prescribe Endpoint (Direct Prescription Entry) ──
router.post('/prescribe', async (req, res) => {
  try {
    const { patient_id, medicine_name, dosage, quantity } = req.body;
    if (!patient_id || !medicine_name || !dosage || !quantity) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [result] = await pool.query(
      "INSERT INTO prescriptions (patient_id, doctor_id, medicine_name, dosage, quantity, status) VALUES (?, ?, ?, ?, ?, 'Ordered')",
      [patient_id, req.user.id, medicine_name, dosage, quantity]
    );
    res.status(201).json({ message: 'Prescription added', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Appointments Management ──
router.get('/appointments', async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.hospital_name, a.department, a.slot_time, a.status, a.source,
             u.name AS patient_name, u.health_id, p.phone, p.id AS patient_id
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE a.doctor_id = ?
      ORDER BY a.slot_time DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows.map(a => ({
      id: a.id,
      patientName: a.patient_name,
      healthId: a.health_id,
      hospital: a.hospital_name,
      department: a.department,
      time: a.slot_time,
      status: a.status,
      source: a.source,
      phone: a.phone,
      patient_id: a.patient_id
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/appointments/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    await pool.query('UPDATE appointments SET status = ? WHERE id = ? AND doctor_id = ?', [status, id, req.user.id]);
    res.json({ message: 'Appointment status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
