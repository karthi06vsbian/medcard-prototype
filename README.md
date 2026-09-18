# MediCard — Universal Digital Health ID Platform

A full-stack prototype for Smart India Hackathon demonstrating a Universal Digital Health ID system connecting patients, doctors, pharmacies, and emergency services.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Tech Stack](https://img.shields.io/badge/Express.js-4-green) ![Tech Stack](https://img.shields.io/badge/MySQL-8-orange) ![Tech Stack](https://img.shields.io/badge/TailwindCSS-3-blue)

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ 
- **MySQL** 8.0+ running locally
- MySQL user `root` with no password (or update `server/config/db.js`)

### Setup & Run

```bash
# 1. Install all dependencies
npm install                    # Install root deps (concurrently)
npm run install:all            # Install server + client deps

# 2. Seed the database (creates database + tables + demo data)
npm run seed

# 3. Start the app (runs both server and client)
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 🔐 Demo Login Credentials

| Role | URL | Email | Password |
|------|-----|-------|----------|
| **Patient** | `/login` | `patient1@demo.com` | `demo123` |
| **Doctor** | `/doctor` | `doctor1@demo.com` | `demo123` |
| **Pharmacy** | `/medicalshop` | `pharmacy1@demo.com` | `demo123` |
| **Ambulance** | `/ambulance` | `ambulance1@demo.com` | `demo123` |
| **Admin** | `/admin` | `admin@demo.com` | `demo123` |

> **Note**: Only the Patient login is accessible from the homepage. Other logins are accessed by navigating directly to their URLs.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   React Frontend                 │
│   (Vite + Tailwind CSS + React Router v6)       │
├─────────────────────────────────────────────────┤
│                  Express.js API                  │
│     (JWT Auth + Role-based Route Protection)     │
├─────────────────────────────────────────────────┤
│                    MySQL Database                │
│         (7 tables, seeded demo data)            │
└─────────────────────────────────────────────────┘
```

## 📋 Features by Role

### 👤 Patient
- Digital Health ID Card with QR code
- Medical history timeline
- Book appointments (manual + AI chatbot auto-booking)
- AI Symptom Chatbot with escalation
- Medicine order tracking
- **SOS Emergency Button** → alerts nearest ambulance

### 🩺 Doctor
- Search patients by Health ID
- View complete patient profiles & history
- Add checkup records
- Prescribe medicines → creates pharmacy order

### 💊 Pharmacy (Medical Shop)
- View incoming prescription orders
- Update order status (Ordered → Packed → Out for Delivery → Delivered)
- Status updates reflect in patient's view

### 🚑 Ambulance
- Receive SOS alerts from patients
- Update response status through workflow
- View completed call history

### 🛡️ Admin
- Overview dashboard with statistics
- Appointments chart (last 7 days)
- Manage patients, doctors, pharmacies, ambulance drivers

## 🔄 Connected Workflows

1. **Doctor → Pharmacy → Patient**: Doctor prescribes medicine → appears in pharmacy orders → status updates visible to patient
2. **Patient → Ambulance**: Patient presses SOS → alert appears in ambulance dashboard → status updates tracked
3. **AI Chatbot → Appointments**: Recurring symptoms auto-book appointment with doctor
4. **Doctor → Patient History**: Doctor adds checkup → appears in patient's medical history

## 📁 Project Structure

```
sih-prototype/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── context/        # Auth context
│   │   ├── lib/            # API client
│   │   └── pages/          # Route-based pages by role
│   └── ...
├── server/                 # Express.js backend
│   ├── config/             # Database config
│   ├── middleware/          # JWT auth middleware
│   ├── routes/             # API routes by role
│   ├── schema.sql          # Database schema
│   ├── seed.js             # Database seeder
│   └── server.js           # Entry point
└── package.json            # Root scripts
```

## Built for Smart India Hackathon 🇮🇳
