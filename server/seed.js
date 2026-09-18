const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function seed() {
  const dbPath = path.join(__dirname, '..', 'medicard.db');
  
  // Delete existing DB file for clean seed
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log('Removed old database file.');
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  console.log('Creating tables...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('patient','doctor','pharmacy','ambulance','admin')) NOT NULL,
      health_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      blood_group TEXT,
      allergies TEXT,
      dob TEXT,
      phone TEXT,
      photo TEXT,
      gender TEXT DEFAULT 'Male',
      height TEXT DEFAULT '178 cm',
      weight TEXT DEFAULT '74 kg',
      bmi TEXT DEFAULT '23.4',
      body_type TEXT DEFAULT 'Mesomorph (Athletic)',
      blood_pressure TEXT DEFAULT '120/80 mmHg',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      doctor_id INTEGER,
      visit_date TEXT,
      symptoms TEXT,
      clinical_notes TEXT,
      diagnosis TEXT,
      doctor_entered_diagnosis TEXT,
      treatment TEXT,
      medication TEXT,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      tests TEXT,
      follow_up_date TEXT,
      recovery_status TEXT CHECK(recovery_status IN ('Recovered','Improving','Ongoing','Referred')) DEFAULT 'Ongoing',
      doctor_notes TEXT,
      category TEXT CHECK(category IN ('surgery','common')) DEFAULT 'common',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS medical_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      report_type TEXT CHECK(report_type IN ('blood','xray','mri','ct_scan','ultrasound','ecg','other')) NOT NULL,
      report_name TEXT NOT NULL,
      file_path TEXT,
      notes TEXT,
      doctor_notes TEXT,
      lab_name TEXT,
      report_date TEXT,
      parameters_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      doctor_id INTEGER,
      hospital_name TEXT,
      department TEXT,
      slot_time TEXT,
      status TEXT DEFAULT 'Scheduled',
      source TEXT CHECK(source IN ('manual','ai_chatbot')) DEFAULT 'manual',
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      doctor_id INTEGER,
      medicine_name TEXT,
      dosage TEXT,
      quantity INTEGER,
      status TEXT CHECK(status IN ('Ordered','Packed','Out for Delivery','Delivered')) DEFAULT 'Ordered',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS sos_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      ambulance_id INTEGER,
      location_text TEXT,
      status TEXT CHECK(status IN ('Alert Sent','Dispatched','Reached Patient','En Route to Hospital','Completed')) DEFAULT 'Alert Sent',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (ambulance_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS chatbot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      symptom_text TEXT,
      duration_days INTEGER DEFAULT 1,
      escalation_flag INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      plan_id TEXT,
      plan_name TEXT,
      monthly_premium INTEGER,
      sum_insured TEXT,
      status TEXT DEFAULT 'Active Policy',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );
  `);

  console.log('Hashing passwords...');
  const passwordHash = await bcrypt.hash('demo123', 10);

  console.log('Inserting user records (classic patient & doctor names)...');
  const insertUser = db.prepare('INSERT INTO users (name, email, password, role, health_id) VALUES (?, ?, ?, ?, ?)');
  const users = [
    ['C. Joseph Vijay', 'patient1@demo.com', passwordHash, 'patient', 'SWID-2024-0001'],
    ['Priya Patel', 'patient2@demo.com', passwordHash, 'patient', 'SWID-2024-0002'],
    ['Amit Kumar', 'patient3@demo.com', passwordHash, 'patient', 'SWID-2024-0003'],
    ['Sneha Gupta', 'patient4@demo.com', passwordHash, 'patient', 'SWID-2024-0004'],
    ['Vikram Singh', 'patient5@demo.com', passwordHash, 'patient', 'SWID-2024-0005'],
    ['Dr. Anjali Gupta', 'doctor1@demo.com', passwordHash, 'doctor', null],
    ['Dr. Rajesh Verma', 'doctor2@demo.com', passwordHash, 'doctor', null],
    ['Dr. Priya Nair', 'doctor3@demo.com', passwordHash, 'doctor', null],
    ['Apollo Pharmacy', 'pharmacy1@demo.com', passwordHash, 'pharmacy', null],
    ['MedPlus Pharmacy', 'pharmacy2@demo.com', passwordHash, 'pharmacy', null],
    ['City Ambulance Service', 'ambulance1@demo.com', passwordHash, 'ambulance', null],
    ['Metro Emergency Response', 'ambulance2@demo.com', passwordHash, 'ambulance', null],
    ['System Admin', 'admin@demo.com', passwordHash, 'admin', null]
  ];
  for (const u of users) {
    insertUser.run(...u);
  }

  console.log('Inserting patient details with body type & vitals...');
  const insertPatient = db.prepare(`
    INSERT INTO patients (user_id, blood_group, allergies, dob, phone, photo, gender, height, weight, bmi, body_type, blood_pressure) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const patients = [
    [1, 'B+', 'None Reported', '1974-06-22', '9840123456', '/uploads/photos/photo-vijay.jpg', 'Male', '180 cm', '75 kg', '23.1', 'Mesomorph (Athletic / Fit Build)', '120/80 mmHg'],
    [2, 'A+', 'Dust & Pollen', '1988-11-14', '9876543211', null, 'Female', '165 cm', '58 kg', '21.3', 'Ectomorph (Lean / Fast Metabolism)', '116/76 mmHg'],
    [3, 'B+', 'Peanuts', '1992-03-08', '9876543212', null, 'Male', '170 cm', '82 kg', '28.4', 'Endomorph (Broad Frame / Slower Metabolism)', '130/85 mmHg'],
    [4, 'AB+', 'Sulfa Drugs', '1996-09-18', '9876543213', null, 'Female', '168 cm', '62 kg', '22.0', 'Mesomorph (Athletic / Balanced)', '118/78 mmHg'],
    [5, 'O-', 'None Reported', '1990-12-05', '9876543214', null, 'Male', '175 cm', '66 kg', '21.5', 'Ectomorph (Lean Build)', '115/75 mmHg']
  ];
  for (const p of patients) {
    insertPatient.run(...p);
  }

  console.log('Inserting medical records & rich recovery timelines...');
  const insertRecord = db.prepare(`
    INSERT INTO medical_records (
      patient_id, doctor_id, visit_date, symptoms, clinical_notes, 
      diagnosis, doctor_entered_diagnosis, treatment, medication, 
      dosage, frequency, duration, tests, follow_up_date, recovery_status, 
      doctor_notes, category, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const records = [
    // Patient 1 (Vijay) - Previous Fever Episode Longitudinal Timeline
    [
      1, 6, '2026-09-12', 'High fever (102°F), chills, fatigue, body ache',
      'Patient presented with acute pyrexia, mild pharyngitis. Throat swab clear, no signs of lower respiratory infection.',
      'Acute Viral Pyrexia', 'Acute Viral Pyrexia',
      'Hydration therapy, antipyretic management, and temperature charting',
      'Paracetamol 650mg (Dolo)', '650mg', '1 tablet every 8 hours SOS', '5 days',
      'Complete Blood Count, Peripheral Smear for Malarial Parasite', '2026-09-14', 'Ongoing',
      'Initial consultation. Patient advised 3.5L fluids daily and complete bed rest.', 'common', '2026-09-12 10:00:00'
    ],
    [
      1, 6, '2026-09-14', 'Low-grade fever (100.4°F), mild persistent cough, throat irritation',
      'Follow-up review. CBC returned normal leukocyte count. Fever responding moderately. Mild post-nasal drip noted.',
      'Viral Upper Respiratory Infection', 'Viral Upper Respiratory Infection',
      'Steam inhalation, warm saline gargling, and throat lozenges',
      'Levocetirizine 5mg + Ambroxol syrup', '5mg / 10ml', 'Once at night / 2 tsp twice daily', '5 days',
      'Follow-up CBC if fever persists beyond Day 5', '2026-09-16', 'Improving',
      'Symptom duration at 3 days. Patient showing steady defervescence.', 'common', '2026-09-14 11:30:00'
    ],
    [
      1, 6, '2026-09-16', 'Occasional dry cough, afebrile for 24 hours (98.6°F)',
      'Clinical assessment indicates complete resolution of fever. Chest clear, vitals normal.',
      'Post-Viral Convalescence', 'Post-Viral Convalescence',
      'Electrolyte repletion, immune support, and gradual return to physical activity',
      'Vitamin C 500mg + Zinc', '500mg', '1 tablet daily after breakfast', '10 days',
      'None needed', '2026-09-20', 'Improving',
      'Treatment updated to restorative phase. Patient energy levels improving.', 'common', '2026-09-16 16:00:00'
    ],
    [
      1, 6, '2026-09-20', 'No symptoms reported. Normal stamina restored.',
      'Final discharge check. Patient fully recovered. No lingering fatigue or respiratory compromise.',
      'Complete Recovery from Viral Episode', 'Complete Recovery from Viral Episode',
      'Discharge from active clinical monitoring',
      'None', 'N/A', 'N/A', 'N/A',
      'None', null, 'Recovered',
      'Recovery confirmed after clinical follow-up. Vital signs optimal (BP 120/80, SpO2 99%).', 'common', '2026-09-20 09:30:00'
    ],

    // Patient 1 - Routine & Diagnostics
    [
      1, 6, '2026-08-15', 'Annual executive wellness screening',
      'Normal cardiopulmonary examination. Peak athletic fitness maintained. Routine diagnostic panel completed.',
      'Annual Executive Health Screening', 'Annual Executive Health Screening',
      'Preventive health maintenance & balanced nutrition',
      'Multivitamin Omega-3', '1 capsule', 'Daily morning', '30 days',
      'Lipid Profile, Fasting Glucose, 12-Lead ECG, Chest X-Ray', '2027-08-15', 'Recovered',
      'All metabolic indicators optimal.', 'common', '2026-08-15 10:30:00'
    ],
    [
      1, 7, '2026-06-10', 'Neck stiffness after prolonged posture',
      'Advised ergonomic posture, neck mobilization exercises, and warm compression. Cervical spine X-ray normal.',
      'Mild Cervical Muscle Strain', 'Mild Cervical Muscle Strain',
      'Physiotherapy & postural ergonomics',
      'Thiocolchicoside 4mg', '4mg', 'Twice daily for 3 days', '3 days',
      'Cervical Spine X-Ray AP/Lat', '2026-06-17', 'Recovered',
      'Patient reports full relief after ergonomics adjustments.', 'common', '2026-06-10 14:00:00'
    ],
    [
      1, 6, '2026-05-18', 'Unilateral throbbing headache with light sensitivity',
      'Prescribed hydration, blue-light filtering, and SOS analgesics. MRA & MRI Brain confirmed normal vascular anatomy.',
      'Seasonal Migraine & Screen Fatigue', 'Seasonal Migraine & Screen Fatigue',
      'Hydration, trigger avoidance, and dark room rest',
      'Paracetamol 650mg + Naproxen', '650mg', 'SOS on onset', 'As needed',
      'Brain MRI & 3D MRA Circle of Willis', '2026-06-01', 'Recovered',
      'MRI normal. Advised at least 3L daily hydration.', 'common', '2026-05-18 09:15:00'
    ],
    [
      1, 7, '2025-10-15', 'Right knee clicking sensation post-athletic sprint',
      'Minimally invasive right knee arthroscopy. Cartilage healthy, full range of motion restored.',
      'Elective Arthroscopic Knee Maintenance', 'Elective Arthroscopic Knee Maintenance',
      'Arthroscopic chondroplasty & guided physical rehabilitation',
      'Collagen Peptide Supplements', '1 sachet', 'Daily in water', '60 days',
      'Post-op Orthopedic Knee X-Ray', '2025-11-15', 'Recovered',
      'Pristine recovery with normal joint mechanics.', 'surgery', '2025-10-15 08:00:00'
    ],

    // Patient 2 (Priya Patel)
    [
      2, 6, '2026-04-10', 'Nasal congestion, sneezing bouts, watery eyes',
      'Triggered by dust & environmental pollen. Prescribed antihistamines and nasal spray.',
      'Allergic Rhinitis', 'Allergic Rhinitis',
      'Antihistamine therapy & allergen avoidance',
      'Montelukast 10mg + Levocetirizine', '10mg', 'Once daily night', '14 days',
      'Total Serum IgE & Inhalant Allergen Panel', '2026-04-24', 'Improving',
      'Advised HEPA air filtration at home.', 'common', '2026-04-10 11:00:00'
    ],
    [
      2, 7, '2025-09-10', 'Knee instability following twisting injury',
      'Right knee arthroscopic ACL reconstruction by Dr. Rajesh Verma. Physical therapy in progress.',
      'ACL Ligament Reconstruction Surgery', 'ACL Ligament Reconstruction Surgery',
      'Arthroscopic reconstruction & structured physiotherapeutic rehabilitation',
      'Analgesics & Calcium-Vitamin D', '500mg', 'Twice daily', '30 days',
      'Digital Knee X-Ray AP/Lat', '2025-10-10', 'Recovered',
      'Graft intact, excellent stability.', 'surgery', '2025-09-10 07:30:00'
    ],

    // Patient 3 (Amit Kumar)
    [
      3, 7, '2026-02-28', 'Routine diabetic follow-up, mild polyuria',
      'Adjusted Metformin 500mg dosage. Dietary counseling on low glycemic index foods.',
      'Type 2 Diabetes Mellitus', 'Type 2 Diabetes Mellitus',
      'Oral hypoglycemic therapy and diabetic nutritional protocol',
      'Metformin 500mg (Glucophage)', '500mg', '1-0-1 with meals', '90 days',
      'HbA1c & Fasting Glucose', '2026-05-28', 'Ongoing',
      'Dietary compliance discussed. Low carb recommended.', 'common', '2026-02-28 10:00:00'
    ]
  ];

  for (const r of records) {
    insertRecord.run(...r);
  }

  console.log('Inserting rich blood tests, X-rays, MRA scans, MRI scans, and diagnostic reports...');
  const insertReport = db.prepare(`
    INSERT INTO medical_reports (patient_id, report_type, report_name, file_path, notes, doctor_notes, lab_name, report_date, parameters_json) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const reports = [
    // Patient 1 (C. Joseph Vijay - Mesomorph Athletic)
    [
      1,
      'mri',
      'Brain & Neck Magnetic Resonance Angiography (MRA) - 3D TOF Vascular Study',
      '/scans/mra-brain-vascular.jpg',
      'High-resolution 3D Time-of-Flight (TOF) MRA of the Circle of Willis and bilateral Carotid/Vertebral arteries. Normal laminar blood flow with no aneurysms or stenosis.',
      'Dr. Anjali Gupta, MD (Neuro-Radiology) — Excellent intracranial and extracranial vascular architecture. Circle of Willis is anatomically complete and patent.',
      'National Advanced Neuro & Vascular Imaging Center, Chennai',
      '2026-07-28',
      JSON.stringify([
        { parameter: 'Circle of Willis Configuration', result: 'Complete & Anatomically Symmetrical', normal_range: 'Complete', status: 'optimal' },
        { parameter: 'Internal Carotid Artery (ICA) Caliber', result: '4.8 mm Bilaterally (Normal)', normal_range: '4.0 - 5.5 mm', status: 'normal' },
        { parameter: 'Middle Cerebral Artery (MCA - M1/M2)', result: 'Normal flow, no narrowing or truncation', normal_range: 'Patent', status: 'normal' },
        { parameter: 'Anterior Cerebral Artery (ACA - A1/A2)', result: 'Patent with good anterior communicating flow', normal_range: 'Patent', status: 'normal' },
        { parameter: 'Basilar & Vertebral Arteries', result: 'Dominant left vertebral, smooth basilar trunk (3.2 mm)', normal_range: 'Patent (2.8 - 3.8 mm)', status: 'normal' },
        { parameter: 'Intracranial Aneurysm / AVM Screen', result: 'Negative (No saccular or fusiform dilatation)', normal_range: 'Negative', status: 'optimal' },
        { parameter: 'Vascular Wall Smoothness', result: 'Grade 0 (No atherosclerotic plaque)', normal_range: 'Grade 0', status: 'optimal' }
      ])
    ],
    [
      1,
      'xray',
      'Digital Chest X-Ray Film Copy (Posteroanterior PA & Lateral Views)',
      '/scans/chest-xray-pa.jpg',
      'High-frequency digital chest radiograph. Clear lung parenchyma bilaterally. Sharp costophrenic angles. Normal mediastinal contour and heart size (CTR 0.44).',
      'Dr. Rajesh Verma, DMRD (Senior Radiologist) — Clear chest radiograph with excellent lung volumes. No consolidation or cardiomegaly.',
      'Apollo Diagnostics Radiology Suite, Chennai',
      '2026-08-10',
      JSON.stringify([
        { parameter: 'Bilateral Lung Fields', result: 'Clear and well aerated, no parenchymal opacities', normal_range: 'Clear', status: 'normal' },
        { parameter: 'Cardiothoracic Ratio (CTR)', result: '0.44 (Normal cardiac silhouette)', normal_range: '< 0.50', status: 'optimal' },
        { parameter: 'Costophrenic & Cardiophrenic Angles', result: 'Sharp, acute and free of effusion', normal_range: 'Sharp', status: 'normal' },
        { parameter: 'Hilar & Bronchovascular Markings', result: 'Normal distribution bilaterally', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Thoracic Rib Cage & Clavicles', result: 'Intact bony cortex without fracture or erosion', normal_range: 'Intact', status: 'normal' },
        { parameter: 'Diaphragmatic Domes', result: 'Smooth, right dome higher than left by 1.5 cm (Normal)', normal_range: 'Normal', status: 'normal' }
      ])
    ],
    [
      1,
      'xray',
      'Cervical Spine Digital X-Ray Film Copy (AP, Lateral & Oblique Views)',
      '/scans/cervical-spine-xray.jpg',
      'Digital radiograph of cervical spine C1 through C7. Normal lordotic curvature. Well-preserved intervertebral disc spaces and intact neural foramina.',
      'Dr. Rajesh Verma, DMRD — Normal cervical spine alignment. No evidence of spondylolisthesis or degenerative disc disease.',
      'City Hospital Radiology & Imaging Center',
      '2026-06-12',
      JSON.stringify([
        { parameter: 'Cervical Lordosis', result: 'Preserved physiological curvature', normal_range: 'Preserved', status: 'normal' },
        { parameter: 'Intervertebral Disc Spaces (C2-C7)', result: 'Uniform height across all segments', normal_range: 'Maintained', status: 'normal' },
        { parameter: 'Posterior Elements & Spinous Processes', result: 'Intact without displacement', normal_range: 'Intact', status: 'normal' },
        { parameter: 'Prevertebral Soft Tissue Shadow', result: 'Normal thickness (< 7mm at C2, < 21mm at C6)', normal_range: 'Normal', status: 'normal' }
      ])
    ],
    [
      1,
      'xray',
      'Digital Orthopedic X-Ray (Right Knee Weight-Bearing & Sunrise Views)',
      '/scans/knee-xray-ortho.jpg',
      'Post-arthroscopy digital orthopedic series. Joint spaces well preserved in medial and lateral compartments. Smooth articular surfaces.',
      'Dr. Rajesh Verma, MS (Ortho) — Normal post-arthroscopic alignment. Pristine patellofemoral joint mechanics.',
      'Apollo Orthopedic & Sports Medicine Center',
      '2026-05-20',
      JSON.stringify([
        { parameter: 'Medial Joint Space Width', result: '4.8 mm (Well preserved)', normal_range: '> 4.0 mm', status: 'normal' },
        { parameter: 'Lateral Joint Space Width', result: '5.2 mm (Well preserved)', normal_range: '> 4.0 mm', status: 'normal' },
        { parameter: 'Patellofemoral Alignment', result: 'Central tracking in trochlear groove', normal_range: 'Central', status: 'optimal' },
        { parameter: 'Periarticular Bone Density', result: 'Normal bone mineralization, no osteophytes', normal_range: 'Normal', status: 'normal' }
      ])
    ],
    [
      1,
      'mri',
      'Brain MRI Scan with T1, T2 & Axial FLAIR Diffusion & 3D Volume',
      '/scans/brain-mri-t2.jpg',
      'High-field 3 Tesla Brain MRI. Normal signal intensity in grey and white matter. No intracranial lesions, mass effect, or diffusion restriction.',
      'Dr. Anjali Gupta, MD (Neuro-Radiology) — Completely normal brain MRI examination. Healthy cerebral parenchyma.',
      'MGM Healthcare Advanced MRI Suite',
      '2026-07-28',
      JSON.stringify([
        { parameter: 'Brain Parenchyma', result: 'Normal signal intensity in grey & white matter', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Diffusion Restriction (DWI / ADC)', result: 'No acute ischemia or cytotoxic edema', normal_range: 'Negative', status: 'optimal' },
        { parameter: 'Ventricular System & Cisterns', result: 'Normal symmetrical configuration', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Cerebellar Hemispheres & Brainstem', result: 'Unremarkable, normal morphology', normal_range: 'Normal', status: 'normal' }
      ])
    ],
    [
      1,
      'blood',
      'Complete Blood Count (CBC) with Differential & Platelets',
      null,
      'Hemoglobin (15.2 g/dL), Red Blood Cells, and Platelet levels are within normal reference limits. Leukocyte count indicates healthy immune status.',
      'Dr. Anjali Gupta, MD — Normal healthy hemogram. Good cellular indices.',
      'Apollo Diagnostics Central Lab',
      '2026-08-15',
      JSON.stringify([
        { parameter: 'Hemoglobin (Hb)', result: '15.2 g/dL', normal_range: '13.0 - 17.0 g/dL', status: 'normal' },
        { parameter: 'Total RBC Count', result: '5.10 mill/cumm', normal_range: '4.5 - 5.5 mill/cumm', status: 'normal' },
        { parameter: 'Total WBC Count', result: '7,800 /cumm', normal_range: '4,000 - 11,000 /cumm', status: 'normal' },
        { parameter: 'Platelet Count', result: '275,000 /cumm', normal_range: '150,000 - 450,000 /cumm', status: 'normal' },
        { parameter: 'Neutrophils', result: '60 %', normal_range: '40 - 70 %', status: 'normal' },
        { parameter: 'Lymphocytes', result: '32 %', normal_range: '20 - 40 %', status: 'normal' },
        { parameter: 'ESR (Erythrocyte Sed. Rate)', result: '8 mm/hr', normal_range: '0 - 15 mm/hr', status: 'normal' }
      ])
    ],
    [
      1,
      'blood',
      'Comprehensive Lipid Profile & Cardiovascular Risk Panel',
      null,
      'Total Cholesterol is optimal (182 mg/dL). HDL (Good cholesterol) is high (54 mg/dL) reflecting active athletic lifestyle. Triglycerides normal (138 mg/dL).',
      'Dr. Rajesh Verma, MD (Cardiology) — Excellent lipid profile. Continue heart-healthy nutrition.',
      'Metropolis Healthcare Labs',
      '2026-07-20',
      JSON.stringify([
        { parameter: 'Total Cholesterol', result: '182 mg/dL', normal_range: '< 200 mg/dL', status: 'normal' },
        { parameter: 'HDL (Good) Cholesterol', result: '54 mg/dL', normal_range: '> 40 mg/dL', status: 'optimal' },
        { parameter: 'LDL (Bad) Cholesterol', result: '102 mg/dL', normal_range: '< 100 mg/dL', status: 'normal' },
        { parameter: 'Triglycerides', result: '138 mg/dL', normal_range: '< 150 mg/dL', status: 'normal' },
        { parameter: 'VLDL Cholesterol', result: '26 mg/dL', normal_range: '5 - 30 mg/dL', status: 'normal' },
        { parameter: 'Cholesterol / HDL Ratio', result: '3.37', normal_range: '< 4.5', status: 'optimal' }
      ])
    ],
    [
      1,
      'blood',
      'Fasting Blood Glucose & Glycated Hemoglobin (HbA1c)',
      null,
      'Fasting plasma glucose is 88 mg/dL. HbA1c is 5.3% (Non-diabetic optimal range). Normal insulin sensitivity.',
      'Dr. Anjali Gupta, MD — Excellent glycemic control. No indication of diabetes or pre-diabetes.',
      'City Diagnostic Center',
      '2026-06-25',
      JSON.stringify([
        { parameter: 'Fasting Blood Sugar (FBS)', result: '88 mg/dL', normal_range: '70 - 99 mg/dL', status: 'normal' },
        { parameter: 'HbA1c (Glycated Hemoglobin)', result: '5.3 %', normal_range: '< 5.7 %', status: 'optimal' },
        { parameter: 'Estimated Average Glucose', result: '105 mg/dL', normal_range: '< 117 mg/dL', status: 'normal' }
      ])
    ],
    [
      1,
      'blood',
      'Thyroid Function Panel (Total T3, Total T4, TSH)',
      null,
      'Serum TSH is 2.15 uIU/mL. Free thyroid hormones within normal physiological range. Euthyroid status.',
      'Dr. Priya Nair, MD — Normal thyroid function.',
      'Dr. Lal PathLabs',
      '2026-05-30',
      JSON.stringify([
        { parameter: 'TSH (Thyroid Stimulating Hormone)', result: '2.15 uIU/mL', normal_range: '0.4 - 4.2 uIU/mL', status: 'normal' },
        { parameter: 'Total Triiodothyronine (T3)', result: '1.28 ng/mL', normal_range: '0.8 - 2.0 ng/mL', status: 'normal' },
        { parameter: 'Total Thyroxine (T4)', result: '8.4 ug/dL', normal_range: '5.1 - 14.1 ug/dL', status: 'normal' }
      ])
    ],
    [
      1,
      'ecg',
      '12-Lead Resting Electrocardiogram (ECG / EKG)',
      null,
      'Normal Sinus Rhythm at 72 bpm. PR interval 156 ms, QRS 88 ms, QTc 410 ms. Normal axis. No ST-T wave abnormalities.',
      'Dr. Rajesh Verma, MD (Cardiologist) — Normal cardiovascular electrical tracing. Normal athletic rhythm.',
      'Apollo Heart Institute',
      '2026-04-10',
      JSON.stringify([
        { parameter: 'Heart Rate', result: '72 bpm', normal_range: '60 - 100 bpm', status: 'normal' },
        { parameter: 'Rhythm', result: 'Normal Sinus Rhythm', normal_range: 'Sinus', status: 'normal' },
        { parameter: 'PR Interval', result: '156 ms', normal_range: '120 - 200 ms', status: 'normal' },
        { parameter: 'QRS Duration', result: '88 ms', normal_range: '80 - 120 ms', status: 'normal' },
        { parameter: 'QTc Interval', result: '410 ms', normal_range: '< 450 ms', status: 'normal' }
      ])
    ],
    [
      1,
      'ultrasound',
      'Ultrasound (USG) Whole Abdomen & Pelvis',
      null,
      'Post-appendectomy status. Liver (14.0 cm), gallbladder, kidneys, spleen, and pancreas are normal. No free fluid in peritoneal cavity.',
      'Dr. Priya Nair, DMRD — Normal abdominal ultrasound. Post-surgical site completely healed.',
      'Medall Diagnostics Center',
      '2026-01-20',
      JSON.stringify([
        { parameter: 'Liver', result: 'Normal size (14.0 cm), smooth margins', normal_range: '< 15.5 cm', status: 'normal' },
        { parameter: 'Gallbladder', result: 'Thin-walled, no calculi or sludge', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Right Kidney', result: '10.6 cm, normal parenchyma', normal_range: '9.0 - 12.0 cm', status: 'normal' },
        { parameter: 'Left Kidney', result: '10.9 cm, normal corticomedullary ratio', normal_range: '9.0 - 12.0 cm', status: 'normal' }
      ])
    ],
    [
      1,
      'ecg',
      '12-Lead Resting Electrocardiogram (ECG / EKG)',
      null,
      'Normal Sinus Rhythm at 72 bpm. PR interval 156 ms, QRS 88 ms, QTc 410 ms. Normal axis. No ST-T wave abnormalities.',
      'Dr. Rajesh Verma, MD (Cardiologist) — Normal cardiovascular electrical tracing. Normal athletic rhythm.',
      'Apollo Heart Institute',
      '2026-04-10',
      JSON.stringify([
        { parameter: 'Heart Rate', result: '72 bpm', normal_range: '60 - 100 bpm', status: 'normal' },
        { parameter: 'Rhythm', result: 'Normal Sinus Rhythm', normal_range: 'Sinus', status: 'normal' },
        { parameter: 'PR Interval', result: '156 ms', normal_range: '120 - 200 ms', status: 'normal' },
        { parameter: 'QRS Duration', result: '88 ms', normal_range: '80 - 120 ms', status: 'normal' },
        { parameter: 'QTc Interval', result: '410 ms', normal_range: '< 450 ms', status: 'normal' }
      ])
    ],
    [
      1,
      'ultrasound',
      'Ultrasound (USG) Whole Abdomen & Pelvis',
      null,
      'Post-appendectomy status. Liver (14.0 cm), gallbladder, kidneys, spleen, and pancreas are normal. No free fluid in peritoneal cavity.',
      'Dr. Priya Nair, DMRD — Normal abdominal ultrasound. Post-surgical site completely healed.',
      'Medall Diagnostics Center',
      '2026-01-20',
      JSON.stringify([
        { parameter: 'Liver', result: 'Normal size (14.0 cm), smooth margins', normal_range: '< 15.5 cm', status: 'normal' },
        { parameter: 'Gallbladder', result: 'Thin-walled, no calculi or sludge', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Right Kidney', result: '10.6 cm, normal parenchyma', normal_range: '9.0 - 12.0 cm', status: 'normal' },
        { parameter: 'Left Kidney', result: '10.9 cm, normal corticomedullary ratio', normal_range: '9.0 - 12.0 cm', status: 'normal' }
      ])
    ],

    // Patient 2 (Priya Patel)
    [
      2,
      'blood',
      'Total Serum IgE & Inhalant Allergen Panel',
      null,
      'Elevated Total IgE (390 IU/mL). High reactivity to House Dust Mites and Pollen allergens.',
      'Dr. Anjali Gupta, MD — Marked atopic allergic response. Advised HEPA filtration.',
      'Dr. Lal PathLabs',
      '2026-04-12',
      JSON.stringify([
        { parameter: 'Total Serum IgE', result: '390 IU/mL', normal_range: '< 100 IU/mL', status: 'high' },
        { parameter: 'Dust Mite Allergen', result: 'Class 4 (Strongly Positive)', normal_range: 'Class 0 (Negative)', status: 'high' }
      ])
    ],
    [
      2,
      'xray',
      'Digital X-Ray Right Knee (AP and Lateral View)',
      null,
      'Status post-ACL reconstruction. Suture anchors in anatomical position. Joint spaces well preserved.',
      'Dr. Rajesh Verma, MS (Ortho) — Normal post-operative alignment.',
      'City Hospital Radiology',
      '2026-05-10',
      JSON.stringify([
        { parameter: 'Knee Joint Alignment', result: 'Anatomical post-op alignment', normal_range: 'Normal', status: 'normal' },
        { parameter: 'Joint Space', result: 'Preserved medial & lateral compartments', normal_range: 'Preserved', status: 'normal' }
      ])
    ],

    // Patient 3 (Amit Kumar)
    [
      3,
      'blood',
      'Glycated Hemoglobin (HbA1c) & Fasting Plasma Glucose Panel',
      null,
      'HbA1c is 6.8% (Target for managed Type 2 Diabetes: < 7.0%). Fasting Blood Sugar 126 mg/dL.',
      'Dr. Anjali Gupta, MD — Fair glycemic control on Metformin. Emphasize low carb diet.',
      'Apollo Diagnostics Central Lab',
      '2026-08-05',
      JSON.stringify([
        { parameter: 'HbA1c', result: '6.8 %', normal_range: '< 5.7 %', status: 'managed_diabetic' },
        { parameter: 'Fasting Blood Glucose', result: '126 mg/dL', normal_range: '70 - 99 mg/dL', status: 'elevated' }
      ])
    ]
  ];

  for (const rep of reports) {
    insertReport.run(...rep);
  }

  console.log('Inserting appointments...');
  const insertAppointment = db.prepare('INSERT INTO appointments (patient_id, doctor_id, hospital_name, department, slot_time, status, source) VALUES (?, ?, ?, ?, ?, ?, ?)');
  
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const appointments = [
    [1, 6, 'City Hospital Main Campus', 'General Medicine', `${todayStr} 10:00:00`, 'Scheduled', 'manual'],
    [2, 7, 'Apollo Hospital Greams Road', 'Cardiology & Orthopedics', `${todayStr} 14:30:00`, 'Scheduled', 'manual'],
    [3, 8, 'MGM Healthcare', 'Endocrinology & Diabetology', `${todayStr} 11:15:00`, 'Scheduled', 'manual'],
    [4, 6, 'City Hospital Main Campus', 'Pulmonology', `${tomorrowStr} 09:00:00`, 'Scheduled', 'ai_chatbot'],
    [5, 7, 'Apollo Hospital Greams Road', 'Preventive Health', `${yesterdayStr} 16:00:00`, 'Completed', 'manual'],
  ];
  for (const a of appointments) {
    insertAppointment.run(...a);
  }

  console.log('Inserting prescriptions...');
  const insertPrescription = db.prepare('INSERT INTO prescriptions (patient_id, doctor_id, medicine_name, dosage, quantity, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const prescriptions = [
    [1, 6, 'Paracetamol 650mg (Dolo)', '1-0-1 after food', 10, 'Delivered', '2026-08-20 10:00:00'],
    [1, 7, 'Amlodipine 5mg', '1-0-0 morning', 30, 'Out for Delivery', '2026-08-25 14:00:00'],
    [2, 6, 'Montelukast 10mg + Levocetirizine', '0-0-1 night', 20, 'Packed', '2026-08-26 11:00:00'],
    [3, 7, 'Metformin 500mg (Glucophage)', '1-0-1 with meals', 60, 'Ordered', '2026-08-27 09:00:00'],
    [4, 6, 'Cetirizine 10mg', '0-0-1 night', 15, 'Delivered', '2026-08-18 16:00:00'],
    [5, 8, 'Vitamin D3 60K (Cholecalciferol)', '1 capsule weekly', 8, 'Packed', '2026-08-26 10:30:00'],
  ];
  for (const p of prescriptions) {
    insertPrescription.run(...p);
  }

  console.log('Inserting SOS requests...');
  const insertSOS = db.prepare('INSERT INTO sos_requests (patient_id, ambulance_id, location_text, status, created_at) VALUES (?, ?, ?, ?, ?)');
  const sos = [
    [1, null, 'Current GPS Location - 28.6139° N, 77.2090° E', 'Alert Sent', '2026-08-27 21:00:00'],
    [2, 11, 'Sector 18, Noida - 28.5700° N, 77.3200° E', 'Dispatched', '2026-08-27 20:30:00'],
    [3, 11, 'Connaught Place, New Delhi - 28.6300° N, 77.2100° E', 'Completed', '2026-08-25 14:00:00'],
  ];
  for (const s of sos) {
    insertSOS.run(...s);
  }

  db.close();
  console.log('✅ Database seeded with classic patient names and rich blood/x-ray reports! Database: medicard.db');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
