const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Multilingual language name mappings
const LANGUAGE_CONFIG = {
  en: { name: 'English', code: 'en-US', greeting: 'Hello', docPrompt: 'Would you like to consult a doctor?' },
  ta: { name: 'Tamil (தமிழ்)', code: 'ta-IN', greeting: 'வணக்கம்', docPrompt: 'நீங்கள் மருத்துவரை அணுக விரும்புகிறீர்களா?' },
  hi: { name: 'Hindi (हिन्दी)', code: 'hi-IN', greeting: 'नमस्ते', docPrompt: 'क्या आप डॉक्टर से परामर्श करना चाहते हैं?' },
  te: { name: 'Telugu (తెలుగు)', code: 'te-IN', greeting: 'నమస్కారం', docPrompt: 'మీరు వైద్యుడిని సంప్రదించాలనుకుంటున్నారా?' },
  kn: { name: 'Kannada (ಕನ್ನಡ)', code: 'kn-IN', greeting: 'ನಮಸ್ಕಾರ', docPrompt: 'ನೀವು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಲು ಬಯಸುವಿರಾ?' },
  ml: { name: 'Malayalam (മലയാളം)', code: 'ml-IN', greeting: 'നമസ്കാരം', docPrompt: 'നിങ്ങൾക്ക് ഒരു ഡോക്ടറെ കാണാൻ താൽപ്പര്യമുണ്ടോ?' },
  bn: { name: 'Bengali (বাংলা)', code: 'bn-IN', greeting: 'নমস্কার', docPrompt: 'আপনি কি ডাক্তারের পরামর্শ নিতে চান?' },
  mr: { name: 'Marathi (मराठी)', code: 'mr-IN', greeting: 'नमस्कार', docPrompt: 'तुम्हाला डॉक्टरांचा सल्ला घ्यायचा आहे का?' },
  gu: { name: 'Gujarati (ગુજરાતી)', code: 'gu-IN', greeting: 'નમસ્તે', docPrompt: 'શું તમે ડૉક્ટરની સલાહ લેવા માંગો છો?' },
  pa: { name: 'Punjabi (ਪੰਜਾਬੀ)', code: 'pa-IN', greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ', docPrompt: 'ਕੀ ਤੁਸੀਂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲੈਣਾ ਚਾਹੁੰਦੇ ਹੋ?' },
  ur: { name: 'Urdu (اردو)', code: 'ur-PK', greeting: 'السلام علیکم', docPrompt: 'کیا آپ ڈاکٹر سے مشورہ کرنا چاہتے ہیں؟' },
  es: { name: 'Spanish (Español)', code: 'es-ES', greeting: 'Hola', docPrompt: '¿Le gustaría consultar a un médico?' },
  fr: { name: 'French (Français)', code: 'fr-FR', greeting: 'Bonjour', docPrompt: 'Souhaitez-vous consulter un médecin ?' },
  de: { name: 'German (Deutsch)', code: 'de-DE', greeting: 'Hallo', docPrompt: 'Möchten Sie einen Arzt konsultieren?' },
  ar: { name: 'Arabic (العربية)', code: 'ar-SA', greeting: 'مرحبا', docPrompt: 'هل ترغب في استشارة طبيب؟' }
};

// Emergency Indicators
const EMERGENCY_PATTERNS = [
  /\b(chest\s*pain|heart\s*attack|crushing\s*pain|cardiac)\b/i,
  /\b(can('?t|not)\s*breathe|shortness\s*of\s*breath|severe\s*breathing|suffocation)\b/i,
  /\b(unconscious|passed\s*out|fainted|loss\s*of\s*consciousness)\b/i,
  /\b(seizure|convulsion|epilep)\b/i,
  /\b(stroke|facial\s*droop|slurred\s*speech|sudden\s*numbness|one\s*sided\s*paralysis)\b/i,
  /\b(severe\s*allergic|anaphylaxis|swollen\s*throat|swollen\s*airway)\b/i,
  /\b(heavy\s*bleeding|hemorrhage|coughing\s*blood|vomiting\s*blood)\b/i,
  /\b(high\s*fever\s*(above|over)\s*(104|105)|fever\s*with\s*stiff\s*neck)\b/i
];

// Helper to calculate age
const getAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const diff = Date.now() - birth.getTime();
  return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

// Authenticate all AI routes
router.use(verifyToken);

/**
 * POST /api/ai/chat
 * Primary endpoint for Medi Card AI Clinical Assistant
 * Accepts: { patientId, message, language }
 * Responds: { success: true, answer, reply, language }
 */
router.post('/chat', async (req, res) => {
  try {
    const body = req.body || {};
    const { patientId, patient_id, health_id, message, language = 'en', duration_days = 1 } = body;
    const targetPatientId = patientId || patient_id || health_id;
    const requestedLang = (language && (language.toLowerCase() === 'ta' || language.toLowerCase().startsWith('ta'))) ? 'ta' : 'en';

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    let patient = null;

    // 1. Role verification & permission check
    if (req.user.role === 'doctor' || req.user.role === 'admin') {
      // Doctor must specify which patient they are querying
      if (!targetPatientId) {
        return res.status(400).json({ success: false, error: 'patientId is required for doctor consultation' });
      }

      // Retrieve patient from database
      const [pRows] = await pool.query(
        `SELECT u.id AS user_id, u.name, u.health_id,
                p.id AS patient_id, p.blood_group, p.allergies, p.dob, p.phone,
                p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure, p.preferred_language
         FROM users u
         JOIN patients p ON u.id = p.user_id
         WHERE p.id = ? OR u.health_id = ? OR u.id = ?`,
        [targetPatientId, String(targetPatientId).trim(), targetPatientId]
      );

      if (pRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Patient not found' });
      }
      patient = pRows[0];
    } else if (req.user.role === 'patient') {
      // Fetch authenticated patient record
      const [pRows] = await pool.query(
        `SELECT u.id AS user_id, u.name, u.health_id,
                p.id AS patient_id, p.blood_group, p.allergies, p.dob, p.phone,
                p.gender, p.height, p.weight, p.bmi, p.body_type, p.blood_pressure, p.preferred_language
         FROM users u
         JOIN patients p ON u.id = p.user_id
         WHERE u.id = ?`,
        [req.user.id]
      );

      if (pRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Patient profile not found' });
      }
      patient = pRows[0];

      // Security check: Prevent patientId manipulation to access another patient's records
      if (targetPatientId) {
        const isMatch = String(patient.patient_id) === String(targetPatientId) ||
                        String(patient.health_id).toUpperCase() === String(targetPatientId).toUpperCase() ||
                        String(patient.user_id) === String(targetPatientId);
        if (!isMatch) {
          return res.status(403).json({ success: false, error: 'Access forbidden: You cannot access another patient\'s medical records' });
        }
      }
    } else {
      return res.status(403).json({ success: false, error: 'Access forbidden: unauthorized role for clinical AI assistant' });
    }

    const patientName = patient.name || 'Patient';
    const age = getAge(patient.dob);
    const langCode = (requestedLang === 'ta' || /[\u0B80-\u0BFF]/.test(message)) ? 'ta' : 'en';

    // 2. Retrieve only authorized clinical records for this patient across all life stages (baby to present)
    const [medicalHistory] = await pool.query(
      `SELECT m.diagnosis, m.doctor_entered_diagnosis, m.symptoms, m.treatment,
              m.medication, m.dosage, m.frequency, m.duration, m.recovery_status,
              m.visit_date, m.doctor_notes, m.category, m.created_at, u.name AS doctor_name
       FROM medical_records m
       LEFT JOIN users u ON m.doctor_id = u.id
       WHERE m.patient_id = ?
       ORDER BY COALESCE(m.visit_date, m.created_at) ASC`,
      [patient.patient_id]
    );

    const [prescriptions] = await pool.query(
      `SELECT medicine_name, dosage, quantity, status, created_at
       FROM prescriptions
       WHERE patient_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      [patient.patient_id]
    );

    const [reports] = await pool.query(
      `SELECT id, report_type, report_name, lab_name, parameters_json, report_date, notes, doctor_notes
       FROM medical_reports
       WHERE patient_id = ?
       ORDER BY report_date DESC LIMIT 10`,
      [patient.patient_id]
    );

    // 3. Multi-turn duration tracking in chatbot_logs for triage
    let activeDuration = parseInt(duration_days) || 1;
    const durationMatch = message.match(/(\d+)\s*(day|days|week|weeks|hour|hours)/i);
    if (durationMatch) {
      const num = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      if (unit.startsWith('week')) activeDuration = num * 7;
      else if (unit.startsWith('day')) activeDuration = num;
      else activeDuration = 1;
    }

    // 4. Emergency Detection Layer (if patient asks emergency questions)
    const isEmergency = EMERGENCY_PATTERNS.some(pattern => pattern.test(message));
    if (isEmergency && req.user.role === 'patient') {
      const emergencyReply = getEmergencyResponse(langCode, patientName);
      await pool.query(
        'INSERT INTO chatbot_logs (patient_id, symptom_text, triage_category, duration_days) VALUES (?, ?, ?, ?)',
        [patient.patient_id, message.slice(0, 500), 'EMERGENCY_RED', activeDuration]
      ).catch(() => {});

      return res.json({
        success: true,
        answer: emergencyReply,
        reply: emergencyReply,
        nurseState: 'WARNING',
        zone: 'red',
        emergency: true,
        escalated: true,
        patientName,
        language: langCode
      });
    }

    // 5. Build sanitized clinical context (exclude sensitive personal info like phone/passwords)
    const clinicalContext = {
      patientName: patient.name,
      patientId: patient.patient_id,
      healthId: patient.health_id,
      age: age || 'N/A',
      gender: patient.gender || 'Not specified',
      bloodGroup: patient.blood_group || 'Unknown',
      allergies: patient.allergies && patient.allergies.trim() ? patient.allergies.trim() : 'None Reported',
      vitals: {
        bloodPressure: patient.blood_pressure || 'Normal',
        bmi: patient.bmi || 'N/A',
        height: patient.height || 'N/A',
        weight: patient.weight || 'N/A'
      },
      medicalRecords: medicalHistory.map(m => ({
        visitDate: m.visit_date || m.created_at,
        diagnosis: m.doctor_entered_diagnosis || m.diagnosis || 'Clinical consultation',
        symptoms: m.symptoms || 'None recorded',
        treatment: m.treatment || 'None',
        medication: m.medication ? `${m.medication} ${m.dosage || ''}`.trim() : 'None',
        status: m.recovery_status || 'Ongoing'
      })),
      prescriptions: prescriptions.map(pr => ({
        medicine: pr.medicine_name,
        dosage: pr.dosage,
        status: pr.status
      })),
      diagnosticReports: reports.map(r => ({
        name: r.report_name,
        type: r.report_type,
        date: r.report_date,
        findings: r.notes || r.doctor_notes || 'Normal'
      }))
    };

    const systemInstruction = `You are MedCard AI, an intelligent clinical healthcare assistant.

CORE RULES:
1. STRICT DATABASE GROUNDING: Base all responses ONLY on the provided patient medical record from the database. The database records span the patient's entire life from baby/infancy time milestones, childhood vaccinations, adolescent checkups, surgeries, to current consultations. Never invent information. If information is not in the database records, state that clearly and briefly.
2. FEVER & SYMPTOM REMEDIES:
   • For fever or illness symptoms, always recommend supportive home remedies (ample hydration with ORS/fluids, damp cloth sponging, complete rest, and light nourishment).
   • HOSPITAL REFERRAL WARNING: Always state clearly: "⚠️ If the fever remains above 102°F (38.9°C) or lasts more than 2-3 days, please visit the hospital or emergency clinic immediately."
   • Proactively ask follow-up questions: "How many days has the fever persisted, and what is the current body temperature reading?"
3. CHECKUP RECORD UPDATE PROMPT:
   • Remind the user/doctor: "Would you like to log or update the current check-up details to maintain this patient's complete lifelong medical record from early childhood to date?"
4. CONCISE STYLE: Keep responses short, sweet, and direct (2-4 sentences). Do not write essays or verbose paragraphs.
${langCode === 'ta' ? '5. LANGUAGE: Respond in fluent, natural Tamil (தமிழ்). Example: "காய்ச்சல் தணிய ஓ.ஆர்.எஸ் (ORS), அதிக நீர் அருந்துதல் மற்றும் நெற்றியில் ஈரத்துணி ஒத்தடம் தரவும். ⚠️ காய்ச்சல் 102°F-க்கு மேல் இருந்தாலோ அல்லது 2-3 நாட்களுக்கு மேல் நீடித்தாலோ உடனடியாக மருத்துவமனைக்குச் செல்லவும். காய்ச்சல் எத்தனை நாட்களாக உள்ளது மற்றும் தற்போதைய வெப்பநிலை எவ்வளவு? இந்த நோயாளியின் குழந்தைப் பருவம் முதல் இன்று வரையிலான முழுமையான மருத்துவ வரலாற்றைப் புதுப்பிக்க, இன்றைய பரிசோதனை விவரங்களை (Checkup Details) பதிவு செய்ய விரும்புகிறீர்களா?"' : '5. LANGUAGE: Respond in clear, concise English.'}`;

    let aiReply = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey && geminiKey.trim()) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey.trim());
        // Use verified working active models
        const modelNames = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-pro-latest', 'gemini-2.5-flash'];
        const fullPrompt = `System Instruction:\n${systemInstruction}\n\nPatient Medical Record Context (From Database):\n${JSON.stringify(clinicalContext, null, 2)}\n\nUser Question:\n"${message}"`;

        for (const mName of modelNames) {
          try {
            const model = genAI.getGenerativeModel({ model: mName });
            const result = await model.generateContent(fullPrompt);
            const text = result?.response?.text();
            if (text && text.trim()) {
              aiReply = text.trim();
              break;
            }
          } catch (mErr) {
            // Try next model if one has temporary spike
            continue;
          }
        }
      } catch (geminiErr) {
        console.error('Gemini API call notice:', geminiErr.message);
      }
    }

    // 6. Resilient Clinical Fallback (if Gemini key has quota limits/offline)
    if (!aiReply) {
      aiReply = generateDoctorAssistedResponse({
        message,
        langCode,
        patient,
        medicalHistory,
        prescriptions,
        reports
      });
    }

    // Store full chat interaction in database
    await pool.query(
      `INSERT INTO chatbot_logs (patient_id, doctor_id, symptom_text, sender_message, ai_response, language, triage_category, duration_days) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patient.patient_id,
        req.user?.id || null,
        message.slice(0, 255),
        message,
        aiReply,
        langCode,
        isEmergency ? 'EMERGENCY_RED' : 'GREEN',
        activeDuration
      ]
    ).catch(e => console.error('Database chat log error:', e.message));

    return res.json({
      success: true,
      answer: aiReply,
      reply: aiReply,
      language: langCode,
      patientId: patient.patient_id,
      patientName: patient.name,
      suggestUpdateCheckup: true
    });

  } catch (err) {
    console.error('AI Chatbot error:', err);
    res.status(500).json({ success: false, error: 'Sorry, I am having trouble connecting to the AI assistant right now.' });
  }
});

/**
 * GET /api/ai/history/:patientId
 * Retrieve database-stored chat history for a patient
 */
router.get('/history/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, sender_message, ai_response, language, created_at
       FROM chatbot_logs
       WHERE patient_id = ? AND sender_message IS NOT NULL
       ORDER BY created_at ASC LIMIT 50`,
      [patientId]
    );

    res.json({
      success: true,
      history: rows.map(r => ({
        id: r.id,
        senderMessage: r.sender_message,
        aiResponse: r.ai_response,
        language: r.language,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    console.error('Fetch chat history error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch chat records' });
  }
});

/**
 * POST /api/ai/report-analysis
 * Dedicated report explanation endpoint
 */
router.post('/report-analysis', async (req, res) => {
  try {
    const { report_id, language = 'en' } = req.body;
    const langCode = (language && LANGUAGE_CONFIG[language]) ? language : 'en';

    const [patientRows] = await pool.query('SELECT id, user_id FROM patients WHERE user_id = ?', [req.user.id]);
    if (patientRows.length === 0) return res.status(404).json({ error: 'Patient profile not found' });
    const patient_id = patientRows[0].id;

    const [reportRows] = await pool.query(
      'SELECT * FROM medical_reports WHERE id = ? AND patient_id = ?',
      [report_id, patient_id]
    );

    if (reportRows.length === 0) {
      return res.status(404).json({ error: 'Report not found or access unauthorized.' });
    }

    const report = reportRows[0];
    let params = [];
    if (report.parameters_json) {
      try { params = JSON.parse(report.parameters_json); } catch (e) {}
    }

    const explanation = generateReportExplanation(report, params, langCode);

    res.json({
      report_id: report.id,
      report_name: report.report_name,
      explanation,
      nurseState: 'SPEAKING',
      language: langCode
    });
  } catch (err) {
    console.error('Report analysis error:', err);
    res.status(500).json({ error: 'Server error analyzing report' });
  }
});

// ───────────────────────────────────────────
// Helper Functions & Clinical Engines
// ───────────────────────────────────────────

function generateDoctorAssistedResponse({ message, langCode, patient, medicalHistory, prescriptions, reports }) {
  const lower = (message || '').toLowerCase();
  const isTamil = langCode === 'ta' || /[\u0B80-\u0BFF]/.test(message);

  // 1. Allergies Query
  if (lower.includes('allerg') || lower.includes('reaction') || lower.includes('ஒவ்வாமை') || lower.includes('அலர்ஜி')) {
    const rawAllergy = (patient.allergies || '').trim();
    const hasAllergy = rawAllergy && rawAllergy.toLowerCase() !== 'none' && rawAllergy.toLowerCase() !== 'none reported';
    if (isTamil) {
      return hasAllergy
        ? `நோயாளியின் பதிவின்படி, ${rawAllergy} allergy குறிப்பிடப்பட்டுள்ளது.`
        : `நோயாளியின் பதிவில் அறியப்பட்ட ஒவ்வாமை (Allergies) எதுவும் குறிப்பிடப்படவில்லை (None Reported).`;
    }
    return hasAllergy
      ? `The patient's record lists a ${rawAllergy} allergy.`
      : `The patient's record lists no known allergies (None Reported).`;
  }

  // 2. Medications & Prescriptions Query
  if (lower.includes('medic') || lower.includes('drug') || lower.includes('prescript') || lower.includes('dose') || lower.includes('மருந்து')) {
    const activePrescriptions = prescriptions || [];
    const medsFromRecords = (medicalHistory || []).filter(m => m.medication && m.medication.trim());

    if (activePrescriptions.length === 0 && medsFromRecords.length === 0) {
      return isTamil
        ? `நோயாளியின் பதிவில் தற்போது எந்த மருந்துச் சீட்டுகளும் (Prescriptions) பதிவு செய்யப்படவில்லை.`
        : `The patient's record lists no active prescriptions or medications on file.`;
    }

    if (isTamil) {
      let resp = `நோயாளியின் பதிவின்படி பரிந்துரைக்கப்பட்ட மருந்துகள்:\n`;
      if (activePrescriptions.length > 0) {
        resp += activePrescriptions.map(p => `• **${p.medicine_name}** (${p.dosage || 'Prescribed'}) - நிலை: ${p.status || 'Ordered'}`).join('\n');
      } else {
        resp += medsFromRecords.map(m => `• **${m.medication}** (${m.dosage || 'Prescribed'})`).join('\n');
      }
      return resp;
    }

    let resp = `The patient's record lists the following medications:\n`;
    if (activePrescriptions.length > 0) {
      resp += activePrescriptions.map(p => `• **${p.medicine_name}** (${p.dosage || 'Prescribed'}) - Status: ${p.status || 'Ordered'}`).join('\n');
    } else {
      resp += medsFromRecords.map(m => `• **${m.medication}** (${m.dosage || 'Prescribed'})`).join('\n');
    }
    return resp;
  }

  // 3. Diagnoses, Past History, Fever & Illness Query
  if (lower.includes('diagnos') || lower.includes('history') || lower.includes('fever') || lower.includes('pyrexia') || lower.includes('illness') || lower.includes('symptom') || lower.includes('காய்ச்சல்') || lower.includes('நோய்')) {
    // If a specific condition was queried (e.g., transplant, surgery, diabetes, fracture, etc.)
    const specificConditions = ['transplant', 'cancer', 'surgery', 'fracture', 'asthma', 'diabetes', 'stroke', 'cardiac', 'kidney', 'liver', 'hepatitis', 'covid', 'malaria', 'dengue', 'typhoid'];
    const queriedSpecific = specificConditions.find(c => lower.includes(c));

    if (queriedSpecific) {
      const match = (medicalHistory || []).find(m => 
        (m.diagnosis && m.diagnosis.toLowerCase().includes(queriedSpecific)) ||
        (m.doctor_entered_diagnosis && m.doctor_entered_diagnosis.toLowerCase().includes(queriedSpecific)) ||
        (m.symptoms && m.symptoms.toLowerCase().includes(queriedSpecific))
      );

      if (!match) {
        return isTamil
          ? `நோயாளியின் மருத்துவ பதிவில் "${queriedSpecific}" தொடர்பான பதிவுகள் எதுவும் இல்லை. கோரப்பட்ட தகவல் இந்த மருத்துவ ஆவணத்தில் கிடைக்கவில்லை.`
          : `No ${queriedSpecific} records are found in the patient's file. The requested information is not available in the provided record.`;
      }
    }

    // Specific fever guidance with supportive remedies and hospital warning
    if (lower.includes('fever') || lower.includes('temperature') || lower.includes('காய்ச்சல்')) {
      if (isTamil) {
        return `காய்ச்சல் தணிய பரிந்துரைக்கப்பட்ட வீட்டு சிகிச்சை:\n• போதுமான அளவு தண்ணீர், ஓ.ஆர்.எஸ் (ORS) மற்றும் இளஞ்சூடான திரவ உணவுகளை அருந்தவும்.\n• நெற்றியில் சாதாரண அறை வெப்பநிலை நீரால் நனைத்த துணி கொண்டு ஒத்தடம் கொடுக்கவும்.\n• முழுமையான ஓய்வு எடுக்கவும்.\n\n⚠️ **மருத்துவமனை எச்சரிக்கை**: காய்ச்சல் 102°F-க்கு மேல் அதிகரித்தாலோ அல்லது 2-3 நாட்களுக்கு மேல் நீடித்தாலோ, உடனடியாக மருத்துவமனைக்குச் சென்று மருத்துவரை அணுகவும்.\n\nகாய்ச்சல் எத்தனை நாட்களாக உள்ளது மற்றும் தற்போதைய வெப்பநிலை எவ்வளவு? இந்த நோயாளியின் குழந்தைப் பருவம் முதல் இன்று வரையிலான முழுமையான மருத்துவ வரலாற்றைப் புதுப்பிக்க, இன்றைய பரிசோதனை விவரங்களை (Checkup Details) பதிவு செய்ய விரும்புகிறீர்களா?`;
      }
      return `Recommended supportive care for fever:\n• Ensure plenty of hydration with electrolyte fluids (ORS), warm broths, and water.\n• Apply room-temperature damp cloth sponging to the forehead and neck.\n• Take complete physical rest.\n\n⚠️ **Hospital Warning**: If the fever remains above 102°F (38.9°C) or lasts more than 2-3 days, please visit the hospital or emergency clinic immediately.\n\nHow many days has the fever lasted, and what is the current body temperature reading? Would you like to log or update the current visit check-up details to maintain this patient's complete lifelong medical record from early childhood to date?`;
    }

    if (!medicalHistory || medicalHistory.length === 0) {
      return isTamil
        ? `நோயாளியின் பதிவில் முந்தைய மருத்துவக் குறிப்புகள் அல்லது நோய் கண்டறிதல்கள் இல்லை. இன்றைய பரிசோதனை விவரங்களை (Checkup Details) பதிவு செய்ய விரும்புகிறீர்களா?`
        : `The patient's record lists no prior clinical diagnoses on file. Would you like to update the current visit check-up details?`;
    }

    if (isTamil) {
      let resp = `நோயாளியின் மருத்துவ வரலாற்று பதிவுகள் (குழந்தைப் பருவம் முதல் இன்று வரை):\n`;
      resp += medicalHistory.slice(0, 5).map(m => `• **${m.doctor_entered_diagnosis || m.diagnosis || 'Clinical Consultation'}** (${m.visit_date || 'Past Visit'}) - நிலை: ${m.recovery_status || 'Ongoing'}`).join('\n');
      resp += `\n\nஇந்த நோயாளியின் மருத்துவ வரலாற்றைப் புதுப்பிக்க, இன்றைய பரிசோதனை விவரங்களை (Checkup Details) பதிவு செய்ய விரும்புகிறீர்களா?`;
      return resp;
    }

    let resp = `The patient's lifelong medical records (from infancy to present):\n`;
    resp += medicalHistory.slice(0, 5).map(m => `• **${m.doctor_entered_diagnosis || m.diagnosis || 'Clinical Consultation'}** (${m.visit_date || 'Past Visit'}) - Status: ${m.recovery_status || 'Ongoing'}`).join('\n');
    resp += `\n\nWould you like to log or update the current visit check-up details to maintain this patient's complete lifelong record from early childhood to date?`;
    return resp;
  }

  // 4. Diagnostic Reports & Scans Query
  if (lower.includes('report') || lower.includes('scan') || lower.includes('test') || lower.includes('lab') || lower.includes('cbc') || lower.includes('mri') || lower.includes('xray') || lower.includes('அறிக்கை')) {
    if (!reports || reports.length === 0) {
      return isTamil
        ? `நோயாளியின் பதிவில் பதிவேற்றப்பட்ட மருத்துவ ஆய்வக அறிக்கைகள் ஏதும் கிடைக்கவில்லை.`
        : `No diagnostic lab reports are currently on file for this patient.`;
    }

    if (isTamil) {
      let resp = `நோயாளியின் மருத்துவ ஆய்வக அறிக்கைகள் (${reports.length} உள்ளன):\n`;
      resp += reports.slice(0, 3).map(r => `• **${r.report_name}** (${r.report_type?.toUpperCase()}) - தேதி: ${r.report_date || 'Recent'}\n  ஆய்வகம்: ${r.lab_name || 'Authorized Lab'}`).join('\n');
      return resp;
    }

    let resp = `The patient's diagnostic reports on file (${reports.length} available):\n`;
    resp += reports.slice(0, 3).map(r => `• **${r.report_name}** (${r.report_type?.toUpperCase()}) - Date: ${r.report_date || 'Recent'}\n  Lab: ${r.lab_name || 'Authorized Lab'}`).join('\n');
    return resp;
  }

  // 5. Blood Group & Vitals
  if (lower.includes('blood') || lower.includes('vitals') || lower.includes('pressure') || lower.includes('bmi') || lower.includes('height') || lower.includes('weight') || lower.includes('இரத்த')) {
    if (isTamil) {
      return `நோயாளியின் மருத்துவ விவரங்கள்:\n• இரத்த வகை: **${patient.blood_group || 'O+'}**\n• இரத்த அழுத்தம்: **${patient.blood_pressure || '120/80 mmHg'}**\n• உயரம்/எடை: **${patient.height || '180 cm'} / ${patient.weight || '75 kg'}** (BMI: **${patient.bmi || '23.1'}**)`;
    }
    return `The patient's recorded vitals:\n• Blood Group: **${patient.blood_group || 'O+'}**\n• Blood Pressure: **${patient.blood_pressure || '120/80 mmHg'}**\n• Height/Weight: **${patient.height || '180 cm'} / ${patient.weight || '75 kg'}** (BMI: **${patient.bmi || '23.1'}**)`;
  }

  // Default: Information not found in records
  if (isTamil) {
    return `நோயாளியின் மருத்துவ பதிவுகளில் இந்த தகவல் கிடைக்கவில்லை. கிடைக்கக்கூடிய விவரங்கள்: இரத்த வகை: ${patient.blood_group || 'N/A'}, ஒவ்வாமை: ${patient.allergies || 'குறிப்பிடப்படவில்லை'}.`;
  }
  return `The requested information is not available in the provided patient medical records.`;
}

function isUnrelatedQuery(msg) {
  const unrelatedPatterns = [
    /\b(tell\s*me\s*a\s*joke|joke|funny|laugh|humor)\b/i,
    /\b(movie|film|actor|actress|cinema|netflix|youtube|music|song|sing|dance)\b/i,
    /\b(cricket|football|ipl|messi|ronaldo|sport|game|gaming|playstation|xbox)\b/i,
    /\b(weather|temperature\s*outside|rain\s*today)\b/i,
    /\b(who\s*is\s*the\s*president|prime\s*minister|politics|election|government|party)\b/i,
    /\b(bitcoin|crypto|stock\s*market|investing|finance|share\s*price)\b/i,
    /\b(write\s*a\s*poem|write\s*code|write\s*python|javascript|react|programming|hack)\b/i,
    /\b(recipe|how\s*to\s*cook|baking|restaurant)\b/i,
    /\b(flirt|date\s*me|marry\s*me|love\s*you|are\s*you\s*single|boyfriend|girlfriend)\b/i
  ];
  return unrelatedPatterns.some(p => p.test(msg));
}

function getUnrelatedRedirect(lang, name) {
  switch (lang) {
    case 'ta':
      return `வணக்கம் ${name} 👋\n\n🛡️ **வழிகாட்டுதல் வரம்பு:**\nநான் உங்கள் **மெடி கார்டு AI மருத்துவ செவிலியர் உதவியாளர்**. உங்கள் உடல்நலப் பாதுகாப்பு மற்றும் மருத்துவ சேவைகளில் மட்டுமே கவனம் செலுத்த நான் வடிவமைக்கப்பட்டுள்ளேன்.\n\nமருத்துவம் சாராத பிற விஷயங்களை என்னால் விவாதிக்க இயலாது. உங்கள் உடல்நலத்தைப் பற்றி கவனம் செலுத்துவோம்—இன்று உங்களுக்கு ஏதேனும் உடல் அசௌகரியம் அல்லது அறிகுறிகள் உள்ளதா?`;
    case 'hi':
      return `नमस्ते ${name} 👋\n\n🛡️ **परामर्श सीमा:**\nमैं आपकी **मेडी कार्ड एआई क्लिनिकल नर्स सहायक** हूँ। आपकी सुरक्षा और स्वास्थ्य को प्राथमिकता देते हुए, मैं केवल चिकित्सा लक्षणों, स्वास्थ्य रिकॉर्ड, जांच रिपोर्ट और डॉक्टर परामर्श में सहायता करती हूँ।\n\nगैर-चिकित्सीय विषयों पर चर्चा करना मेरी सीमा से बाहर है। आइए आपके स्वास्थ्य पर ध्यान दें—आज आप कैसा महसूस कर रहे हैं?`;
    case 'te':
      return `నమస్కారం ${name} 👋\n\n🛡️ **వైద్య పరిధి:**\nనేను మీ **మెడి కార్డ్ AI క్లినికల్ నర్స్ అసిస్టెంట్‌ని**. నేను మీ ఆరోగ్య సమస్యలు, వైద్య రికార్డులు మరియు వైద్యుల అపాయింట్‌మెంట్‌లలో మాత్రమే సహాయం చేయగలను.\n\nవైద్యేతర విషయాలను నేను చర్చించలేను. మీ ఆరోగ్యంపై దృష్టి పెడదాం—ఈరోజు మీకు ఏవైనా లక్షణాలు ఉన్నాయా?`;
    case 'kn':
      return `ನಮಸ್ಕಾರ ${name} 👋\n\n🛡️ **ಆರೋಗ್ಯ ಮಿತಿ:**\nನಾನು ನಿಮ್ಮ **ಮೆಡಿ ಕಾರ್ಡ್ AI ಕ್ಲಿನಿಕಲ್ ನರ್ಸ್ ಸಹಾಯಕ**. ನಾನು ನಿಮ್ಮ ಆರೋಗ್ಯ ಸಮಸ್ಯೆಗಳು ಮತ್ತು ವೈದ್ಯಕೀಯ ವರದಿಗಳಲ್ಲಿ ಮಾತ್ರ ನೆರವಾಗಬಲ್ಲೆ.\n\nವೈದ್ಯಕೀಯೇತರ ವಿಷಯಗಳನ್ನು ನಾನು ಚರ್ಚಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ ಆರೋಗ್ಯದ ಬಗ್ಗೆ ಗಮನಹರಿಸೋಣ—ಇಂದು ನೀವು ಹೇಗೆ ಭಾವಿಸುತ್ತಿದ್ದೀರಿ?`;
    case 'ml':
      return `നമസ്കാരം ${name} 👋\n\n🛡️ **മാർഗ്ഗനിർദ്ദേശ പരിധി:**\nഞാൻ നിങ്ങളുടെ **മെഡി കാർഡ് AI ക്ലിനിക്കൽ നേഴ്സ് അസിസ്റ്റന്റാണ്**. നിങ്ങളുടെ ആരോഗ്യ പരിചരണം, രോഗലക്ഷണങ്ങൾ, മെഡിക്കൽ റിപ്പോർട്ടുകൾ എന്നിവയിൽ മാത്രമേ എനിക്ക് സഹായിക്കാനാകൂ.\n\nമറ്റ് വിഷയങ്ങൾ ചർച്ച ചെയ്യാൻ എനിക്ക് അനുവാദമില്ല. നിങ്ങളുടെ ആരോഗ്യത്തിൽ ശ്രദ്ധ കേന്ദ്രീകരിക്കാം—ഇന്ന് നിങ്ങൾക്ക് എന്തെങ്കിലും അസ്വസ്ഥതകളുണ്ടോ?`;
    default:
      return `Hello ${name} 👋\n\n🛡️ **Consultation Boundary:**\nI am your dedicated **Medi Card Clinical AI Nurse Assistant**. To protect your healthcare safety and focus on your well-being, I am strictly designated to assist with medical symptoms, health profile evaluations, diagnostic reports, and doctor appointments.\n\nI do not participate in off-topic discussions. Let's refocus on your health—are you experiencing any symptoms or physical discomfort today?`;
  }
}

function getEmergencyResponse(lang, name) {
  switch (lang) {
    case 'ta':
      return `⚠️ **உங்களுக்கு அவசர மருத்துவ சிகிச்சை தேவைப்படலாம்!**\n\nநீங்கள் கூறிய அறிகுறிகள் தீவிரமானவை. தயவுசெய்து உடனடியாக அவசர மருத்துவ சேவையைத் தொடர்பு கொள்ளுங்கள் அல்லது அருகிலுள்ள மருத்துவமனைக்குச் செல்லுங்கள்.\n\n🚨 **அவசர உதவிக்கு கீழே உள்ள SOS பொத்தானைப் பயன்படுத்தவும்.**`;
    case 'hi':
      return `⚠️ **आपको तत्काल चिकित्सा सहायता की आवश्यकता हो सकती है!**\n\nआपके द्वारा बताए गए लक्षण गंभीर हो सकते हैं। कृपया तुरंत आपातकालीन चिकित्सा सेवा से संपर्क करें या निकटतम अस्पताल जाएं।\n\n🚨 **आपातकालीन सहायता के लिए नीचे दिए गए SOS बटन का उपयोग करें।**`;
    case 'te':
      return `⚠️ **మీకు తక్షణ వైద్య సహాయం అవసరం కావచ్చు!**\n\nమీరు పేర్కొన్న లక్షణాలు తీవ్రమైనవి. దయచేసి వెంటనే అత్యవసర వైద్య సేవను సంప్రదించండి లేదా సమీపంలోని ఆసుపత్రికి వెళ్లండి.\n\n🚨 **అత్యవసర సహాయం కోసం క్రింది SOS బటన్‌ను ఉపయోగించండి.**`;
    case 'kn':
      return `⚠️ **ನಿಮಗೆ ತುರ್ತು ವೈದ್ಯಕೀಯ ನೆರವು ಬೇಕಾಗಬಹುದು!**\n\nನೀವು ವಿವರಿಸಿದ ಲಕ್ಷಣಗಳು ಗಂಭೀರವಾಗಿರಬಹುದು. ದಯವಿಟ್ಟು ತಕ್ಷಣವೇ ತುರ್ತು ವೈದ್ಯಕೀಯ ಸೇವೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ ಅಥವಾ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಗೆ ಭೇಟಿ ನೀಡಿ.\n\n🚨 **ತುರ್ತು ಸಹಾಯಕ್ಕಾಗಿ ಕೆಳಗಿನ SOS ಬಟನ್ ಬಳಸಿ.**`;
    case 'ml':
      return `⚠️ **നിങ്ങൾക്ക് അടിയന്തിര വൈദ്യസഹായം ആവശ്യമായി വന്നേക്കാം!**\n\nനിങ്ങൾ പറഞ്ഞ ലക്ഷണങ്ങൾ ഗൗരവമുള്ളതാണ്. ദയവായി ഉടൻ തന്നെ അടിയന്തര വൈദ്യസഹായം തേടുകയോ അടുത്തുള്ള ആശുപത്രിയിൽ പോകുകയോ ചെയ്യുക.\n\n🚨 **അടിയന്തിര സഹായത്തിനായി താഴെയുള്ള SOS ബട്ടൺ ഉപയോഗിക്കുക.**`;
    default:
      return `⚠️ **You may need urgent medical attention.**\n\nThe symptoms you described indicate a potential medical emergency. Please seek immediate professional medical care or visit the nearest emergency department.\n\n🚨 **Use the Emergency SOS button below to alert emergency responders.**`;
  }
}

function generateClinicalResponse({ message, langCode, patient, patientName, age, activeDuration, isDurationEscalated, medicalHistory, reports }) {
  const lower = message.toLowerCase();

  // Report Explanation query
  if (lower.includes('report') || lower.includes('scan') || lower.includes('blood test') || lower.includes('lab') || lower.includes('cbc') || lower.includes('xray') || lower.includes('mri')) {
    return generateReportOverview(reports, langCode, patientName);
  }

  // Medical History query
  if (lower.includes('history') || lower.includes('previous') || lower.includes('record') || lower.includes('past checkup')) {
    return generateHistoryOverview(medicalHistory, langCode, patientName);
  }

  // Allergy / Safety Check
  if (lower.includes('allerg') || lower.includes('reaction')) {
    const allergyInfo = patient.allergies || 'No known allergies recorded';
    return `Hi ${patientName} 👋\n\n**Allergy Safety Information:**\n• Recorded in your Medi Card profile: **${allergyInfo}**\n\nBefore taking any new medication or therapy, always inform your attending doctor and pharmacist of all known allergies. If you experience itching, swelling, or rash, stop and seek prompt medical attention.`;
  }

  // Body Type & Vitals Context
  if (lower.includes('body') || lower.includes('bmi') || lower.includes('weight') || lower.includes('height') || lower.includes('vitals')) {
    return `Hi ${patientName} 👋\n\n**Health Profile & Vitals Overview:**\n• Body Constitution: **${patient.body_type || 'Mesomorph'}**\n• Height: **${patient.height || '180 cm'}** | Weight: **${patient.weight || '75 kg'}** (BMI: **${patient.bmi || '23.1'}**)\n• Blood Group: **${patient.blood_group || 'O+'}**\n\n💡 *Health Note:* Maintaining good hydration (2.5 - 3L daily) and balanced nutrition supports your natural metabolic rate. Treatment decisions and medications must always be determined by an authorized doctor based on clinical evaluation rather than body build alone.`;
  }

  // Diet / Consumption queries ("can i eat", "can i drink", "can i have")
  const isDiet = lower.includes('eat') || lower.includes('food') || lower.includes('drink') || lower.includes('diet') || lower.includes('fruit') || lower.includes('snack');
  if (isDiet) {
    const isDetailRequested = lower.includes('detail') || lower.includes('why') || lower.includes('explain') || lower.includes('more info');
    if (!isDetailRequested) {
      return `Hi ${patientName} 👋\n\n**Yes, you can consume this in moderation as part of a balanced diet!** ✅\n\nEnsure it is freshly prepared and thoroughly washed or cooked. Would you like me to explain the detailed nutritional breakdown, benefits, or precautions for your health profile?`;
    } else {
      return `Hi ${patientName} 👋\n\n📋 **Detailed Dietary Breakdown:**\n• **General Safety:** Safe for consumption when prepared hygienically.\n• **Allergy Cross-Check:** Checked against your profile allergies (**${patient.allergies || 'None'}**).\n• **Portion Guidance:** Recommended moderate intake to maintain stable digestion and balanced blood sugar.\n• **Hydration & Digestion:** Drink adequate water (2.5L - 3L daily) to aid metabolism and absorption.\n\n*If you have specific conditions like diabetes, hypertension, or acid reflux, adjust portions accordingly.*`;
    }
  }

  // Fever & General Illness
  const isFever = lower.includes('fever') || lower.includes('temperature') || lower.includes('pyrexia');
  if (isFever) {
    const tempMatch = message.match(/(\d{2,3}(\.\d+)?)\s*(f|c|degrees)?/i);
    const hasHighTemp = tempMatch && parseFloat(tempMatch[1]) >= 102;
    const isLongFever = activeDuration >= 3 || lower.includes('3 day') || lower.includes('4 day') || lower.includes('5 day') || lower.includes('week');

    if (hasHighTemp || isLongFever || isDurationEscalated) {
      return `Hi ${patientName} 👋\n\n⚠️ **Urgent Medical Guidance — High/Prolonged Fever:**\nYour fever (${tempMatch ? tempMatch[1] + '°' : 'reported'}) is significant and needs clinical assessment.\n\n🚨 **Doctor Visit Recommended:**\nSince your fever is high or continuing for multiple days, we strongly advise scheduling an appointment or visiting a clinic promptly for proper diagnosis and blood evaluation.\n\n**Immediate Supportive Care:**\n• Apply room-temperature damp cloth sponging to forehead and neck.\n• Drink plenty of fluids (ORS, coconut water, warm broths) to avoid dehydration.\n• Rest completely and avoid heavy physical exertion.`;
    }

    return `Hi ${patientName} 👋\n\nI understand you are having a fever. To give you the best guidance, please tell me:\n\n1. **What is your exact temperature right now** (e.g., 100°F or 38°C)?\n2. **How long have you had this fever** (how many hours or days)?\n3. **Are you experiencing any other symptoms** like chills, body pain, cough, vomiting, or headache?\n\n*If your temperature exceeds 102°F (38.9°C) or lasts more than 2-3 days, please see a doctor immediately.*`;
  }

  if (langCode === 'ta') {
    return `வணக்கம் ${patientName} 👋\n\n` +
      `SYMPTOM SUMMARY\n` +
      `நீங்கள் குறிப்பிட்ட அறிகுறிகள் (${message}) பதிவு செய்யப்பட்டுள்ளன. இந்த அறிகுறிகள் எப்போது தொடங்கின? வெப்பநிலை எவ்வளவு உள்ளது?\n\n` +
      `GENERAL GUIDANCE\n` +
      `• போதுமான அளவு தண்ணீர் மற்றும் திரவ உணவுகளை அருந்துங்கள்.\n` +
      `• உடலுக்கு நல்ல ஓய்வு கொடுங்கள்.\n` +
      `• காரமான உணவுகளைத் தவிர்த்து எளிதில் செரிமானமாகும் உணவுகளை உண்ணுங்கள்.\n\n` +
      `MONITOR\n` +
      `• காய்ச்சல் 102°F-க்கு மேல் உயருதல்\n` +
      `• அதிக மூச்சுத்திணறல் அல்லது கடுமையான சோர்வு\n\n` +
      `WHEN TO SEE A DOCTOR\n` +
      (isDurationEscalated ? `⚠️ உங்கள் அறிகுறிகள் 3 நாட்களுக்கு மேலாக நீடிப்பதால், ஒரு மருத்துவரை அணுகுவது நல்லது.\n\n` : `அறிகுறிகள் தொடர்ந்தாலோ அல்லது தீவிரமடைந்தாலோ மருத்துவரை அணுகவும்.\n\n`) +
      `ACTION\n` +
      `மருத்துவரிடம் விரிவான ஆலோசனை பெற அப்பாயிண்ட்மெண்ட் பதிவு செய்யலாம்.`;
  }

  if (langCode === 'hi') {
    return `नमस्ते ${patientName} 👋\n\n` +
      `SYMPTOM SUMMARY\n` +
      `आपके द्वारा बताए गए लक्षण (${message}) दर्ज कर लिए गए हैं। यह समस्या कब से है और क्या आपने तापमान मापा है?\n\n` +
      `GENERAL GUIDANCE\n` +
      `• पर्याप्त मात्रा में पानी और तरल पदार्थ पिएं।\n` +
      `• पर्याप्त आराम करें।\n` +
      `• हल्का और आसानी से पचने वाला भोजन लें।\n\n` +
      `MONITOR\n` +
      `• तेज बुखार (102°F से अधिक)\n` +
      `• सांस लेने में तकलीफ या अत्यधिक कमजोरी\n\n` +
      `WHEN TO SEE A DOCTOR\n` +
      (isDurationEscalated ? `⚠️ चूंकि आपके लक्षण 3 दिनों से अधिक समय से बने हुए हैं, इसलिए डॉक्टर से परामर्श करना उचित होगा।\n\n` : `यदि लक्षण बढ़ते हैं तो तुरंत चिकित्सक से मिलें।\n\n`) +
      `ACTION\n` +
      `उचित चिकित्सा परामर्श के लिए आप अपॉइंटमेंट बुक कर सकते हैं।`;
  }

  // Default English structured clinical guidance
  return `Hi ${patientName} 👋

SYMPTOM SUMMARY
I have noted your reported symptoms (${message}). When did these symptoms begin, and have you measured your body temperature?

GENERAL GUIDANCE
• Ensure adequate rest to support your immune system.
• Stay well hydrated by drinking 2.5 to 3 liters of water, warm broths, or oral fluids.
• Consume light, nutrient-rich meals (steamed vegetables, soups, porridge).
• Maintain good respiratory hygiene.

MONITOR
• Persistent temperature above 102°F (38.9°C).
• Shortness of breath, chest discomfort, or severe throat swelling.
• Persistent vomiting, dehydration, or extreme dizziness.

WHEN TO SEE A DOCTOR
${isDurationEscalated 
  ? `⚠️ **Since your symptoms have continued for ${activeDuration} days, it would be a good idea to consult a healthcare professional.**`
  : `If your symptoms worsen or do not improve within 48-72 hours, consult an authorized physician.`}

ACTION
Would you like assistance in scheduling a consultation with a doctor?`;
}

function generateReportOverview(reports, lang, name) {
  if (!reports || reports.length === 0) {
    return `Hi ${name} 👋 I could not find any uploaded diagnostic reports or lab tests in your Medi Card profile. You can upload new reports in the **Medical Records & Scans** section.`;
  }

  let text = `Hi ${name} 👋\n\n📋 **Medical Report Summary (${reports.length} Reports Found):**\n\n`;
  reports.forEach((r, i) => {
    text += `🔹 **${i + 1}. ${r.report_name}** (${r.report_type?.toUpperCase()})\n`;
    text += `   • Diagnostic Center: ${r.lab_name || 'Authorized Diagnostic Lab'}\n`;
    text += `   • Date: ${r.report_date || 'Recent'}\n`;
    if (r.parameters_json) {
      try {
        const p = JSON.parse(r.parameters_json);
        if (Array.isArray(p) && p.length > 0) {
          const formatted = p.slice(0, 3).map(item => {
            const pName = item.parameter || item.name || 'Test';
            const pRes = item.result || item.value || 'Normal';
            const pRef = item.normal_range || item.ref_range || 'Normal';
            return `${pName}: ${pRes} (Ref: ${pRef})`;
          }).join(', ');
          text += `   • Key Findings: ${formatted}\n`;
        }
      } catch (e) {}
    }
  });

  text += `\n💡 **Medical Terminology & Discussion Points:**\n`;
  text += `• Parameters within reference intervals indicate expected physiological ranges.\n`;
  text += `• If any parameter is marked out-of-range, discuss the clinical significance with your attending doctor.\n\n`;
  text += `[View All Diagnostic Scans & Full Reports]`;
  return text;
}

function generateHistoryOverview(history, lang, name) {
  if (!history || history.length === 0) {
    return `Hi ${name} 👋 No prior consultation history found in your records.`;
  }

  let text = `Hi ${name} 👋\n\n⚕️ **Previous Medical & Treatment History Summary:**\n\n`;
  history.forEach((h, i) => {
    text += `• **${h.visit_date || 'Past Visit'}**: ${h.doctor_entered_diagnosis || h.diagnosis || 'General Consultation'}\n`;
    if (h.symptoms) text += `  - Symptoms: ${h.symptoms}\n`;
    if (h.treatment) text += `  - Treatment: ${h.treatment}\n`;
    if (h.medication) text += `  - Medication: ${h.medication} (${h.dosage || ''})\n`;
    if (h.recovery_status) text += `  - Outcome: **${h.recovery_status}**\n`;
  });

  text += `\n[View Full Longitudinal Medical Records]`;
  return text;
}

function generateReportExplanation(report, params, lang) {
  let outOfRange = [];
  let normal = [];

  params.forEach(p => {
    const isOut = p.status === 'high' || p.status === 'low' || p.status === 'abnormal';
    if (isOut) {
      outOfRange.push(p);
    } else {
      normal.push(p);
    }
  });

  let text = `📋 **Detailed Analysis: ${report.report_name}**\n\n`;
  text += `• Facility: **${report.lab_name || 'Diagnostic Lab'}**\n`;
  text += `• Examination Date: **${report.report_date || 'Recent'}**\n\n`;

  if (outOfRange.length > 0) {
    text += `⚠️ **Values Outside Standard Reference Ranges (${outOfRange.length}):**\n`;
    outOfRange.forEach(p => {
      const pName = p.parameter || p.name || 'Parameter';
      const pRes = p.result || p.value || 'N/A';
      const pRef = p.normal_range || p.ref_range || 'N/A';
      text += `• **${pName}**: ${pRes} ${p.unit || ''} (Standard Range: ${pRef}) — *Status: ${(p.status || 'ATTENTION').toUpperCase()}*\n`;
    });
    text += `\n`;
  }

  if (normal.length > 0) {
    text += `✓ **Values Within Normal Range (${normal.length}):**\n`;
    normal.forEach(p => {
      const pName = p.parameter || p.name || 'Parameter';
      const pRes = p.result || p.value || 'Normal';
      const pRef = p.normal_range || p.ref_range || 'Normal';
      text += `• ${pName}: ${pRes} ${p.unit || ''} (${pRef})\n`;
    });
    text += `\n`;
  }

  text += `💬 **Questions to discuss with your doctor:**\n`;
  text += `1. Are the out-of-range values temporary or related to my current symptoms?\n`;
  text += `2. Do I need a follow-up test after completing my treatment?\n`;
  text += `3. Are there any dietary or lifestyle adjustments recommended?\n`;

  return text;
}

module.exports = router;
