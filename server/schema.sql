DROP TABLE IF EXISTS chatbot_logs;
DROP TABLE IF EXISTS sos_requests;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    role ENUM('patient','doctor','pharmacy','ambulance','admin'),
    health_id VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    blood_group VARCHAR(5),
    allergies TEXT,
    dob DATE,
    phone VARCHAR(15),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE medical_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    visit_date VARCHAR(30),
    symptoms TEXT,
    clinical_notes TEXT,
    diagnosis VARCHAR(255),
    doctor_entered_diagnosis VARCHAR(255),
    treatment TEXT,
    medication VARCHAR(255),
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration VARCHAR(100),
    tests TEXT,
    follow_up_date VARCHAR(30),
    recovery_status ENUM('Recovered','Improving','Ongoing','Referred') DEFAULT 'Ongoing',
    doctor_notes TEXT,
    category ENUM('surgery','common') DEFAULT 'common',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    hospital_name VARCHAR(100),
    department VARCHAR(50),
    slot_time DATETIME,
    status VARCHAR(20) DEFAULT 'Scheduled',
    source ENUM('manual','ai_chatbot') DEFAULT 'manual',
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE prescriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    medicine_name VARCHAR(100),
    dosage VARCHAR(50),
    quantity INT,
    status ENUM('Ordered','Packed','Out for Delivery','Delivered') DEFAULT 'Ordered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE sos_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    ambulance_id INT NULL,
    location_text VARCHAR(255),
    status ENUM('Alert Sent','Dispatched','Reached Patient','En Route to Hospital','Completed') DEFAULT 'Alert Sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (ambulance_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE chatbot_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT,
    symptom_text VARCHAR(255),
    duration_days INT DEFAULT 1,
    escalation_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);
