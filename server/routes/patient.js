const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

router.use(verifyToken, requireRole('patient'));

router.get('/profile', async (req, res) => {
  try {
    const query = `
      SELECT u.id AS user_id, u.name, u.email, u.health_id,
             p.id AS patient_id, p.blood_group, p.allergies, p.dob, p.phone, p.photo,
             p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure
      FROM users u
      JOIN patients p ON u.id = p.user_id
      WHERE u.id = ?
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/medical-history', async (req, res) => {
  try {
    const query = `
      SELECT m.id, m.diagnosis, m.doctor_entered_diagnosis, m.notes, m.clinical_notes,
             m.symptoms, m.treatment, m.medication, m.dosage, m.frequency, m.duration,
             m.tests, m.follow_up_date, m.recovery_status, m.doctor_notes,
             m.category, m.visit_date, m.created_at, u.name AS doctor_name
      FROM medical_records m
      JOIN patients p ON m.patient_id = p.id
      LEFT JOIN users u ON m.doctor_id = u.id
      WHERE p.user_id = ?
      ORDER BY m.created_at DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/appointments', async (req, res) => {
  try {
    const query = `
      SELECT a.id, a.hospital_name, a.department, a.slot_time, a.status, a.source, u.name AS doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE p.user_id = ?
      ORDER BY a.slot_time DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const { doctor_id, hospital_name, department, slot_time, source } = req.body;
    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    
    const patient_id = patientRows[0].id;
    const [result] = await pool.query(
      'INSERT INTO appointments (patient_id, doctor_id, hospital_name, department, slot_time, source) VALUES (?, ?, ?, ?, ?, ?)',
      [patient_id, doctor_id, hospital_name, department, slot_time, source || 'manual']
    );
    res.status(201).json({ message: 'Appointment created', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/prescriptions', async (req, res) => {
  try {
    const query = `
      SELECT pr.id, pr.medicine_name, pr.dosage, pr.quantity, pr.status, pr.status AS delivery_status, pr.created_at, COALESCE(u.name, 'Self Order') AS doctor_name
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      LEFT JOIN users u ON pr.doctor_id = u.id
      WHERE p.user_id = ?
      ORDER BY pr.created_at DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/orders', async (req, res) => {
  try {
    const { medicine_name, dosage, quantity } = req.body;
    if (!medicine_name) {
      return res.status(400).json({ error: 'medicine_name is required' });
    }

    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    const [result] = await pool.query(
      "INSERT INTO prescriptions (patient_id, doctor_id, medicine_name, dosage, quantity, status) VALUES (?, NULL, ?, ?, ?, 'Ordered')",
      [patient_id, medicine_name, dosage || '1 tablet daily', quantity || 1]
    );

    res.status(201).json({ message: 'Medicine ordered successfully', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/language', async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    await pool.query('UPDATE patients SET preferred_language = ? WHERE user_id = ?', [language, req.user.id]);
    res.json({ message: 'Language updated', language });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update language' });
  }
});

router.post('/sos', async (req, res) => {
  try {
    const { location_text } = req.body;
    if (!location_text) return res.status(400).json({ error: 'location_text is required' });

    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    // Get a random ambulance
    const [ambulances] = await pool.query("SELECT id FROM users WHERE role = 'ambulance'");
    const randomAmbulanceId = ambulances.length > 0 ? ambulances[Math.floor(Math.random() * ambulances.length)].id : null;

    const [result] = await pool.query(
      'INSERT INTO sos_requests (patient_id, ambulance_id, location_text) VALUES (?, ?, ?)',
      [patient_id, randomAmbulanceId, location_text]
    );
    res.status(201).json({ message: 'SOS request sent', id: result.insertId, ambulance_assigned: randomAmbulanceId != null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Medical Reports ──
router.get('/reports', async (req, res) => {
  try {
    const query = `
      SELECT r.id, r.report_type, r.report_name, r.file_path, r.notes, r.doctor_notes, r.lab_name, r.report_date, r.parameters_json, r.created_at
      FROM medical_reports r
      JOIN patients p ON r.patient_id = p.id
      WHERE p.user_id = ?
      ORDER BY r.report_date DESC
    `;
    const [rows] = await pool.query(query, [req.user.id]);
    
    // Parse JSON parameters safely
    const formatted = rows.map(r => {
      let params = [];
      if (r.parameters_json) {
        try {
          params = JSON.parse(r.parameters_json);
        } catch (e) {
          params = [];
        }
      }
      return { ...r, parameters: params };
    });

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reports', upload.single('file'), async (req, res) => {
  try {
    const { report_type, report_name, notes, doctor_notes, lab_name, report_date, parameters_json } = req.body;
    if (!report_type || !report_name) {
      return res.status(400).json({ error: 'report_type and report_name are required' });
    }

    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    const file_path = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO medical_reports (patient_id, report_type, report_name, file_path, notes, doctor_notes, lab_name, report_date, parameters_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        patient_id,
        report_type,
        report_name,
        file_path,
        notes || null,
        doctor_notes || null,
        lab_name || 'Uploaded Document',
        report_date || new Date().toISOString().split('T')[0],
        parameters_json || null
      ]
    );

    res.status(201).json({ message: 'Report uploaded', id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Medi Card AI Health Assistant (Patient Side) ──
router.post('/chatbot', async (req, res) => {
  try {
    const { symptom_text } = req.body;
    if (!symptom_text) return res.status(400).json({ error: 'symptom_text is required' });

    // 1. Fetch complete authenticated patient record
    const patientQuery = `
      SELECT u.id AS user_id, u.name, u.email, u.health_id,
             p.id AS patient_id, p.blood_group, p.allergies, p.dob, p.phone,
             p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure
      FROM users u
      JOIN patients p ON u.id = p.user_id
      WHERE u.id = ?
    `;
    const [patientRows] = await pool.query(patientQuery, [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient = patientRows[0];
    const patient_id = patient.patient_id;

    // 2. Fetch all medical records (surgeries, checkups, longitudinal history)
    const [records] = await pool.query(`
      SELECT m.id, m.diagnosis, m.doctor_entered_diagnosis, m.notes, m.clinical_notes, 
             m.treatment, m.medication, m.dosage, m.frequency, m.duration, 
             m.recovery_status, m.doctor_notes, m.category, m.visit_date, m.created_at,
             u.name AS doctor_name
      FROM medical_records m
      LEFT JOIN users u ON m.doctor_id = u.id
      WHERE m.patient_id = ? 
      ORDER BY m.created_at DESC
    `, [patient_id]);

    // 3. Fetch all medical reports & diagnostic scans
    const [reports] = await pool.query(`
      SELECT id, report_type, report_name, file_path, notes, doctor_notes, lab_name, report_date, parameters_json 
      FROM medical_reports 
      WHERE patient_id = ? 
      ORDER BY report_date DESC
    `, [patient_id]);

    // 4. Fetch current doctor-entered prescriptions
    const [prescriptions] = await pool.query(`
      SELECT pr.id, pr.medicine_name, pr.dosage, pr.quantity, pr.status, pr.created_at,
             u.name AS doctor_name
      FROM prescriptions pr
      LEFT JOIN users u ON pr.doctor_id = u.id
      WHERE pr.patient_id = ? 
      ORDER BY pr.created_at DESC LIMIT 5
    `, [patient_id]);

    // 5. Fetch previous appointments
    const [appointments] = await pool.query(`
      SELECT a.id, a.hospital_name, a.department, a.slot_time, a.status, a.source,
             u.name AS doctor_name
      FROM appointments a
      LEFT JOIN users u ON a.doctor_id = u.id
      WHERE a.patient_id = ?
      ORDER BY a.slot_time DESC LIMIT 5
    `, [patient_id]);

    // Calculate age
    let age = 'N/A';
    if (patient.dob) {
      const birthYear = new Date(patient.dob).getFullYear();
      age = new Date().getFullYear() - birthYear;
    }

    const bodyType = patient.body_type || 'Mesomorph (Athletic)';
    const bmi = patient.bmi || '23.4';
    const height = patient.height || '178 cm';
    const weight = patient.weight || '74 kg';
    const bp = patient.blood_pressure || '120/80 mmHg';
    const allergies = patient.allergies || 'None Reported';

    const textLower = symptom_text.toLowerCase();

    // Check repeat symptom logs and track duration
    const [logs] = await pool.query(
      'SELECT id, symptom_text, duration_days, created_at FROM chatbot_logs WHERE patient_id = ? ORDER BY created_at DESC LIMIT 10',
      [patient_id]
    );

    const matchCount = logs.filter(l => 
      l.symptom_text && (
        l.symptom_text.toLowerCase().includes(textLower.slice(0, 15)) ||
        (textLower.includes('fever') && l.symptom_text.toLowerCase().includes('fever')) ||
        (textLower.includes('cough') && l.symptom_text.toLowerCase().includes('cough')) ||
        (textLower.includes('headache') && l.symptom_text.toLowerCase().includes('headache'))
      )
    ).length;

    // Detect duration mentions in text
    let mentionedDays = 1;
    const dayMatch = textLower.match(/(\d+)\s*(day|days|week|weeks)/);
    if (dayMatch) {
      const num = parseInt(dayMatch[1], 10);
      if (dayMatch[2].startsWith('week')) {
        mentionedDays = num * 7;
      } else {
        mentionedDays = num;
      }
    } else if (textLower.includes('since yesterday')) {
      mentionedDays = 2;
    } else if (textLower.includes('today')) {
      mentionedDays = 1;
    } else if (matchCount >= 2) {
      mentionedDays = matchCount + 1;
    }

    let zone = 'green';
    let reply = '';
    let isEscalated = false;
    let appointment_id = null;
    let suggest_appointment = false;
    let suggest_insurance = false;

    // ─────────────────────────────────────────────────────────────
    // SAFETY LAYER 1: EMERGENCY DETECTION (Pre-Response Guardrail)
    // ─────────────────────────────────────────────────────────────
    const isEmergency = 
      textLower.includes('chest pain') ||
      textLower.includes('shortness of breath') ||
      textLower.includes('difficulty breathing') ||
      textLower.includes('breathless') ||
      textLower.includes('cannot breathe') ||
      textLower.includes('cant breathe') ||
      textLower.includes('loss of consciousness') ||
      textLower.includes('unconscious') ||
      textLower.includes('fainted') ||
      textLower.includes('severe confusion') ||
      textLower.includes('seizure') ||
      textLower.includes('convulsion') ||
      textLower.includes('severe dehydration') ||
      textLower.includes('anaphylaxis') ||
      textLower.includes('severe allergic reaction') ||
      textLower.includes('heavy bleeding') ||
      textLower.includes('coughing blood') ||
      textLower.includes('vomiting blood') ||
      textLower.includes('stroke') ||
      textLower.includes('heart attack');

    if (isEmergency) {
      zone = 'red';
      reply = `⚠️ **This may require urgent medical attention.**\n\n` +
        `🔴 **EMERGENCY SAFETY ALERT** 🔴\n\n` +
        `SYMPTOM SUMMARY\n` +
        `• **Reported Symptoms**: High-risk acute clinical presentation indicating potential cardiovascular, respiratory, or neurological emergency.\n` +
        `• **Patient Record Cross-Check**: ${patient.name} (${age} yrs, Blood Group: ${patient.blood_group}) | **Known Allergies**: ⚠️ **${allergies}**\n\n` +
        `GENERAL GUIDANCE\n` +
        `• **Immediate Action**: Stop all physical activity immediately and sit upright in an open, well-ventilated space.\n` +
        `• **Do NOT drive yourself** to the hospital or ingest unprescribed home medications.\n` +
        `• Keep someone near you while emergency medical services arrive.\n\n` +
        `MONITOR\n` +
        `• Sudden worsening of chest tightness, radiation of pain to jaw/arm, severe dizziness, or blue discoloration of lips/fingertips.\n\n` +
        `WHEN TO SEE A DOCTOR\n` +
        `• **IMMEDIATELY**: These symptoms require emergency department evaluation and immediate clinical stabilization.\n\n` +
        `ACTION\n` +
        `🚨 **Click "Dispatch SOS Ambulance" below to immediately alert emergency medical responders.**`;
    }
    // ─────────────────────────────────────────────────────────────
    // SAFETY LAYER 2: MEDICAL REPORT ANALYSIS MODULE
    // ─────────────────────────────────────────────────────────────
    else if (
      textLower.includes('report') || 
      textLower.includes('scan') || 
      textLower.includes('mri') || 
      textLower.includes('xray') || 
      textLower.includes('x-ray') || 
      textLower.includes('blood test') || 
      textLower.includes('cbc') || 
      textLower.includes('ecg') || 
      textLower.includes('ultrasound') ||
      textLower.includes('lipid') ||
      textLower.includes('cholesterol') ||
      textLower.includes('sugar') ||
      textLower.includes('hba1c')
    ) {
      zone = 'green';
      
      if (reports.length === 0) {
        reply = `📋 **Medical Report Summary**\n\n` +
          `SYMPTOM SUMMARY\n` +
          `• You requested an analysis of medical diagnostic reports and scans.\n\n` +
          `GENERAL GUIDANCE\n` +
          `• No diagnostic reports or scan documents are currently uploaded to your file.\n` +
          `• You can upload your laboratory documents, X-rays, MRI scans, or ECGs under the **Medical Records > Reports & Scans** tab.\n\n` +
          `MONITOR\n` +
          `• Ensure all newly conducted laboratory reports are promptly digitized for clinical continuity.\n\n` +
          `WHEN TO SEE A DOCTOR\n` +
          `• Consult your doctor whenever you receive new laboratory findings for professional medical interpretation.\n\n` +
          `ACTION\n` +
          `• Upload reports in the Medical Records section or book a consultation with your physician.`;
      } else {
        reply = `📋 **Medical Report Summary**\n\n` +
          `*Cross-analysis of ${reports.length} verified diagnostic documents on file for ${patient.name} (${patient.health_id}):*\n\n`;

        let outOfRangeItems = [];
        let questionsForDoctor = [];

        reports.forEach((rep, idx) => {
          reply += `🔹 **${idx + 1}. ${rep.report_name}** (${rep.report_type.toUpperCase()})\n`;
          reply += `  • **Date**: ${rep.report_date ? new Date(rep.report_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'} | **Lab**: ${rep.lab_name || 'Verified Diagnostic Center'}\n`;
          reply += `  • **Findings**: ${rep.notes || 'Document recorded'}\n`;
          if (rep.doctor_notes) {
            reply += `  • **Doctor Notes**: "${rep.doctor_notes}"\n`;
          }

          if (rep.parameters_json) {
            try {
              const params = JSON.parse(rep.parameters_json);
              const paramList = params.map(p => {
                const isOutOfRange = p.status === 'high' || p.status === 'elevated' || p.status === 'low' || p.status === 'deficient';
                if (isOutOfRange) {
                  outOfRangeItems.push(`${p.parameter}: ${p.result} (Ref: ${p.normal_range})`);
                }
                return `${p.parameter}: ${p.result} [Ref: ${p.normal_range}]`;
              });
              reply += `  • **Extracted Parameters**: ${paramList.slice(0, 4).join(' | ')}\n`;
            } catch (e) {}
          }
          reply += `\n`;
        });

        reply += `📊 **Clinical Parameter Breakdown & Reference Comparison:**\n`;
        if (outOfRangeItems.length > 0) {
          reply += `• ⚠️ **Out-of-Range Parameters Observed**: ${outOfRangeItems.join(', ')}\n` +
            `• *Clinical Notice*: **This result is outside the reference range shown on the report. Discuss it with your doctor.** *(This is an analytical observation and not a medical diagnosis).* \n\n`;
          questionsForDoctor.push('What dietary or lifestyle modifications do you recommend based on these out-of-range parameters?');
          questionsForDoctor.push('Is any repeat or follow-up laboratory testing required?');
        } else {
          reply += `• ✅ **All measured laboratory parameters are within normal biological reference intervals.**\n\n`;
          questionsForDoctor.push('Are these diagnostic results consistent with my long-term health goals?');
        }

        reply += `💡 **Simple Medical Terminology Explanations:**\n` +
          `• **Hemoglobin (Hb)**: The protein in red blood cells that carries oxygen throughout your body.\n` +
          `• **HbA1c**: A measure of your average blood sugar levels over the past 2 to 3 months.\n` +
          `• **MRA 3D-TOF**: A non-invasive magnetic resonance scan showing healthy blood vessel architecture in the brain without radiation.\n` +
          `• **Cardiothoracic Ratio (CTR)**: Comparison of heart width to chest width on an X-ray (< 0.50 represents healthy normal heart size).\n\n` +
          `🩺 **Questions You May Discuss With Your Doctor:**\n`;
        questionsForDoctor.forEach(q => {
          reply += `• "${q}"\n`;
        });

        reply += `\n*Note: Laboratory findings must always be clinically correlated by your treating physician.*`;
      }
    }
    // ─────────────────────────────────────────────────────────────
    // SAFETY LAYER 3: SYMPTOM DURATION & PROLONGED EPISODES
    // ─────────────────────────────────────────────────────────────
    else if (mentionedDays >= 3 || matchCount >= 2) {
      zone = 'yellow';
      isEscalated = true;
      suggest_appointment = true;

      reply = `SYMPTOM SUMMARY\n` +
        `• **What you told me**: You reported persistent symptoms (${symptom_text}) that have continued for approximately **${mentionedDays} days**.\n` +
        `• **Patient Record Context**: ${patient.name} (${age} yrs, ${bodyType}) | **Allergies**: ⚠️ **${allergies}**\n` +
        `• **Previous Checkup Cross-Check**: Previous clinical history includes ${records.slice(0, 2).map(r => r.diagnosis).join(', ') || 'routine checks'}.\n\n` +
        `GENERAL GUIDANCE\n` +
        `• Stay adequately hydrated with 2.5–3.5 liters of clean warm fluids (water, clear vegetable soups, electrolyte solutions).\n` +
        `• Continue complete physical rest and avoid strenuous exertion.\n` +
        `• Eat light, easily digestible, warm meals (dal rice, steamed foods, broth).\n` +
        `• Do not initiate new unprescribed antibiotics or alter any existing medication dosages.\n\n` +
        `MONITOR\n` +
        `• Temperature exceeding 101°F (38.3°C), persistent vomiting, inability to retain fluids, or productive discolored sputum.\n` +
        `• Any emergence of chest pain, shortness of breath, or sudden dizziness.\n\n` +
        `WHEN TO SEE A DOCTOR\n` +
        `• ⚠️ **Your symptoms have continued longer than expected. Please consult a doctor.**\n` +
        `• A physician must conduct a physical examination and determine whether diagnostic investigations or prescription medications are warranted.\n\n` +
        `ACTION\n` +
        `[Book Doctor Appointment] — Click below to schedule a clinical consultation with your healthcare provider.`;

      // Auto-schedule in-person consultation if repeat log >= 2
      if (matchCount >= 2) {
        const [doctors] = await pool.query("SELECT id FROM users WHERE role = 'doctor' ORDER BY id LIMIT 1");
        if (doctors.length > 0) {
          const doctor_id = doctors[0].id;
          const slot_time = new Date();
          slot_time.setDate(slot_time.getDate() + 1);
          
          const [aptRes] = await pool.query(
            "INSERT INTO appointments (patient_id, doctor_id, hospital_name, department, slot_time, source) VALUES (?, ?, 'City Hospital Main Campus', 'General Medicine', ?, 'ai_chatbot')",
            [patient_id, doctor_id, slot_time.toISOString().replace('T', ' ').split('.')[0]]
          );
          appointment_id = aptRes.insertId;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────
    // SAFETY LAYER 4: COMMON, LOW-RISK MILD SYMPTOMS (CLARIFY & GUIDE)
    // ─────────────────────────────────────────────────────────────
    else if (
      textLower.includes('fever') ||
      textLower.includes('cold') ||
      textLower.includes('cough') ||
      textLower.includes('headache') ||
      textLower.includes('sore throat') ||
      textLower.includes('throat') ||
      textLower.includes('fatigue') ||
      textLower.includes('tired') ||
      textLower.includes('body pain') ||
      textLower.includes('weakness') ||
      textLower.includes('runny nose')
    ) {
      zone = 'green';
      suggest_appointment = false;

      let symptomName = 'mild cold / fever symptoms';
      if (textLower.includes('fever')) symptomName = 'fever & body warmth';
      else if (textLower.includes('cough')) symptomName = 'cough & throat irritation';
      else if (textLower.includes('headache')) symptomName = 'headache & fatigue';

      reply = `SYMPTOM SUMMARY\n` +
        `• **What you told me**: You are experiencing ${symptomName}.\n` +
        `• **Patient Record Context**: ${patient.name} (${age} yrs, ${bodyType}) | **Allergies**: ⚠️ **${allergies}**\n\n` +
        `🩺 **Clarifying Health Questions to Help Assess Your Status:**\n` +
        `1. *What specific symptoms are you experiencing right now?*\n` +
        `2. *When did they start (how many days)?*\n` +
        `3. *What is your body temperature, if measured with a thermometer?*\n` +
        `4. *Are your symptoms getting better or worse?*\n` +
        `5. *Are you experiencing difficulty breathing, chest pain, confusion, severe dehydration, seizures, or other emergency symptoms?*\n\n` +
        `GENERAL GUIDANCE\n` +
        `• **Adequate Rest**: Ensure 8 hours of restful, restorative sleep to support your immune system.\n` +
        `• **Hydration**: Drink 2.5 to 3.0 liters of warm fluids, herbal tea, or warm water throughout the day.\n` +
        `• **Comfortable Nutrition**: Consume light, warm, non-spicy meals such as vegetable soups, porridge, or khichdi.\n` +
        `• **Hygiene & Soothing**: Steam inhalation with warm water and warm saline gargles (3 times daily) for throat comfort.\n` +
        `• **Existing Prescriptions**: If your doctor has previously prescribed paracetamol for fever, follow their explicit instructions. Do not take unauthorized prescription drugs.\n\n` +
        `MONITOR\n` +
        `• Monitor your body temperature every 4 to 6 hours.\n` +
        `• Watch for any new red-flag symptoms: high fever exceeding 102°F, shortness of breath, stiff neck, or severe stomach pain.\n\n` +
        `WHEN TO SEE A DOCTOR\n` +
        `• If your symptoms persist for 3 or more days without improvement, or if they suddenly worsen, please schedule an appointment with your doctor.\n\n` +
        `ACTION\n` +
        `• Rest at home, stay hydrated, and use the button below if you would like to book a doctor consultation in advance.`;
    }
    // ─────────────────────────────────────────────────────────────
    // SAFETY LAYER 5: BODY INFORMATION & GENERAL HEALTH ADVICE
    // ─────────────────────────────────────────────────────────────
    else if (
      textLower.includes('body type') || 
      textLower.includes('diet') || 
      textLower.includes('workout') || 
      textLower.includes('exercise') || 
      textLower.includes('weight') || 
      textLower.includes('bmi') ||
      textLower.includes('fitness') ||
      textLower.includes('nutrition')
    ) {
      zone = 'green';
      reply = `🧬 **Patient Physical & Health Context Overview**\n\n` +
        `SYMPTOM SUMMARY\n` +
        `• You inquired about general lifestyle, physical context, and nutritional guidance.\n` +
        `• **Recorded Demographics**: ${patient.name} (${age} yrs, ${patient.gender || 'Male'}) | **Health ID**: ${patient.health_id}\n` +
        `• **Physical Attributes**: Height: ${height} | Weight: ${weight} | BMI: ${bmi} | Blood Pressure: ${bp}\n` +
        `• **Recorded Allergies**: ⚠️ **${allergies}**\n\n` +
        `GENERAL GUIDANCE\n` +
        `• **Balanced Nutrition**: Focus on whole foods—complex carbohydrates, lean dietary proteins, vegetables, and healthy fats.\n` +
        `• **Active Hydration**: Target 2.5–3.5 liters of clean water daily to support metabolic function.\n` +
        `• **Physical Activity**: Aim for at least 150 minutes of moderate aerobic exercise per week combined with 2 days of muscle-strengthening activities.\n` +
        `• **Allergy Caution**: Always verify ingredients in food and dietary supplements to ensure zero cross-contamination with **${allergies}**.\n\n` +
        `MONITOR\n` +
        `• Track regular vital signs (resting heart rate and blood pressure) during routine checkups.\n\n` +
        `WHEN TO SEE A DOCTOR\n` +
        `• Consult your physician or a registered clinical dietitian before starting any restrictive dietary regimen or intense physical training program.\n\n` +
        `*Clinical Rule: Individual medication requirements are determined strictly by licensed physicians based on clinical evaluation, not by generic body type categories.*`;
    }
    // ─────────────────────────────────────────────────────────────
    // SCENARIO 6: GREETING & GENERAL
    // ─────────────────────────────────────────────────────────────
    else if (textLower.match(/^(hi|hello|hey|good morning|good evening|good afternoon|namaste)/)) {
      zone = 'green';
      reply = `Hello **${patient.name}**! 👋 I'm the **Medi Card AI Health Assistant**.\n\n` +
        `🔒 **Your Clinical Records are Securely Synced:**\n` +
        `• **Patient**: ${patient.name} (${age} yrs) | **Health ID**: ${patient.health_id}\n` +
        `• **Blood Group**: ${patient.blood_group} | **Known Allergies**: ⚠️ **${allergies}**\n` +
        `• **Diagnostic Documents on File**: ${reports.length} laboratory & imaging reports\n` +
        `• **Medical History Records**: ${records.length} doctor-entered consultations & procedures\n\n` +
        `How can I assist you today? You can:\n` +
        `1. Describe any symptoms you are experiencing for safe triage and self-care guidance.\n` +
        `2. Ask for an analysis of your uploaded lab reports or scan documents.\n` +
        `3. Check your medication history and allergy safety.`;
    }
    else {
      zone = 'green';
      reply = `SYMPTOM SUMMARY\n` +
        `• **Inquiry**: "${symptom_text}"\n` +
        `• **Patient Record**: ${patient.name} (${age} yrs, ${patient.blood_group}) | **Allergies**: ⚠️ **${allergies}**\n\n` +
        `GENERAL GUIDANCE\n` +
        `• Maintain active daily hydration and adequate rest.\n` +
        `• If you are feeling unwell, describe your symptoms, when they began, and whether you have measured a temperature.\n` +
        `• For acute or emergency symptoms (chest pain, shortness of breath, severe pain), seek immediate clinical care.\n\n` +
        `MONITOR\n` +
        `• Watch for any persistent fever, severe pain, breathing difficulty, or worsening fatigue.\n\n` +
        `WHEN TO SEE A DOCTOR\n` +
        `• Schedule an appointment with your healthcare provider for clinical diagnosis and customized medical treatment.\n\n` +
        `ACTION\n` +
        `• Use [Book Doctor Appointment] to schedule an in-person consultation whenever needed.`;
    }

    // Check insurance suitability
    if (matchCount >= 1 || textLower.includes('chest pain') || textLower.includes('headache') || textLower.includes('cancer')) {
      suggest_insurance = true;
    }

    // Log the interaction with duration
    await pool.query(
      'INSERT INTO chatbot_logs (patient_id, symptom_text, duration_days, escalation_flag) VALUES (?, ?, ?, ?)',
      [patient_id, symptom_text, mentionedDays, isEscalated ? 1 : 0]
    );

    const patientContext = {
      name: patient.name,
      health_id: patient.health_id || 'SWID-2024-0001',
      age,
      gender: patient.gender || 'Male',
      blood_group: patient.blood_group,
      allergies,
      body_type: bodyType,
      bmi,
      height,
      weight,
      blood_pressure: bp,
      records_count: records.length,
      reports_count: reports.length,
      prescriptions_count: prescriptions.length,
      appointments_count: appointments.length
    };

    res.json({
      reply,
      zone,
      isEscalated,
      appointment_id,
      suggest_appointment: suggest_appointment || isEscalated,
      suggest_insurance,
      patientContext
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Medical Insurance Agent APIs ──
router.get('/insurance-agent', async (req, res) => {
  try {
    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    // Get all chatbot logs for patient
    const [logs] = await pool.query('SELECT symptom_text, created_at FROM chatbot_logs WHERE patient_id = ?', [patient_id]);
    
    // Count occurrences of symptoms
    const counts = {};
    logs.forEach(log => {
      const text = log.symptom_text.trim();
      counts[text] = (counts[text] || 0) + 1;
    });

    const recurringList = [];
    let hasRecurring = false;
    let containsChestPain = false;
    let containsHeadache = false;
    let containsCancerOrTumor = false;

    Object.entries(counts).forEach(([sym, count]) => {
      const lower = sym.toLowerCase();
      if (count >= 2 || lower.includes('chest pain') || lower.includes('headache') || lower.includes('cancer') || lower.includes('tumor')) {
        hasRecurring = true;
        recurringList.push({ symptom: sym, count });
      }
      if (lower.includes('chest pain')) containsChestPain = true;
      if (lower.includes('headache')) containsHeadache = true;
      if (lower.includes('cancer') || lower.includes('tumor') || lower.includes('lump')) containsCancerOrTumor = true;
    });

    // Check existing applications
    let appliedPlans = [];
    try {
      if (pool._db) {
        pool._db.exec(`
          CREATE TABLE IF NOT EXISTS insurance_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            plan_id TEXT,
            plan_name TEXT,
            monthly_premium INTEGER,
            sum_insured TEXT,
            status TEXT DEFAULT 'Active Policy',
            created_at TEXT DEFAULT (datetime('now'))
          );
        `);
      }
      const [apps] = await pool.query('SELECT * FROM insurance_applications WHERE patient_id = ? ORDER BY created_at DESC', [patient_id]);
      appliedPlans = apps;
    } catch (e) {
      console.error('Insurance applications query error:', e);
    }

    const plans = [
      {
        id: 'plan_cancer_critical',
        name: 'Critical Illness & Cancer Shield',
        tag: containsCancerOrTumor || containsHeadache ? 'Recommended for You' : 'Popular',
        sum_insured: '₹2,500,000 (25 Lakhs)',
        monthly_premium: 599,
        yearly_premium: 6499,
        icon: 'ShieldAlert',
        color: 'red',
        description: 'Comprehensive financial protection covering oncology treatments, brain & spine imaging, chemotherapy, and major critical surgical procedures.',
        features: [
          '100% Cashless payout on diagnosis of Critical Illnesses',
          'Covers chemotherapy, radiotherapy & surgical procedures',
          'Free annual full-body diagnostic scan',
          'Zero copay across 10,000+ top hospitals in India'
        ],
        match_reason: containsHeadache || containsCancerOrTumor 
          ? 'Suggested due to recurring severe headache & neurological symptom logs.' 
          : 'High-value protection against unexpected major health conditions.'
      },
      {
        id: 'plan_cardiac_emergency',
        name: 'Cardiac & Emergency Health Guard',
        tag: containsChestPain ? 'Recommended for You' : 'Best Seller',
        sum_insured: '₹1,500,000 (15 Lakhs)',
        monthly_premium: 449,
        yearly_premium: 4899,
        icon: 'HeartPulse',
        color: 'rose',
        description: 'Specialized cardiac protection covering heart care, angioplasty, emergency ICU admission, and instant ambulance dispatch.',
        features: [
          'Immediate coverage for Cardiac ICU & Emergency Admissions',
          'Free unlimited SOS Ambulance dispatch integration',
          'Pre & post hospitalization expenses covered up to 60 days',
          'Tax benefit under Section 80D (save up to ₹75,000)'
        ],
        match_reason: containsChestPain 
          ? 'Suggested due to repeated chest pain / cardiovascular risk symptoms.' 
          : 'Essential protection for cardiovascular and emergency care.'
      },
      {
        id: 'plan_family_comprehensive',
        name: 'Family Super Health Shield',
        tag: 'Comprehensive',
        sum_insured: '₹5,000,000 (50 Lakhs)',
        monthly_premium: 899,
        yearly_premium: 9899,
        icon: 'Users',
        color: 'teal',
        description: 'All-inclusive medical protection for you and your family covering hospitalizations, surgeries, consultations, and day care procedures.',
        features: [
          'Cover for up to 2 Adults + 3 Children under 1 Float Policy',
          'No claim bonus: 20% increase in sum insured every claim-free year',
          'Covers AYUSH (Ayurveda, Yoga, Unani) hospitalizations',
          'Instant digital policy issuance in 2 minutes'
        ],
        match_reason: 'All-in-one financial shield for complete peace of mind.'
      }
    ];

    res.json({
      hasRecurringSymptoms: hasRecurring || logs.length >= 2,
      recurringList: recurringList.length > 0 ? recurringList : logs.map(l => ({ symptom: l.symptom_text, count: 1 })),
      plans,
      appliedPlans
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/insurance-apply', async (req, res) => {
  try {
    const { plan_id, plan_name, monthly_premium, sum_insured } = req.body;
    if (!plan_name) return res.status(400).json({ error: 'plan_name is required' });

    const [patientRows] = await pool.query('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    if (pool._db) {
      pool._db.exec(`
        CREATE TABLE IF NOT EXISTS insurance_applications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          patient_id INTEGER,
          plan_id TEXT,
          plan_name TEXT,
          monthly_premium INTEGER,
          sum_insured TEXT,
          status TEXT DEFAULT 'Active Policy',
          created_at TEXT DEFAULT (datetime('now'))
        );
      `);
    }

    const [result] = await pool.query(
      "INSERT INTO insurance_applications (patient_id, plan_id, plan_name, monthly_premium, sum_insured, status) VALUES (?, ?, ?, ?, ?, 'Active Policy')",
      [patient_id, plan_id || 'plan_custom', plan_name, monthly_premium || 599, sum_insured || '₹2,500,000']
    );

    res.status(201).json({
      message: 'Insurance policy issued successfully! Your policy is now active.',
      id: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

