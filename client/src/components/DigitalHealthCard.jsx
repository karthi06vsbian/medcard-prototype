import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Heart, ShieldCheck, QrCode } from 'lucide-react';
import { getPhotoUrl } from '../lib/api';

const DEFAULT_PATIENT_PHOTO = '/uploads/photos/photo-vijay.jpg';

const DigitalHealthCard = ({ patient, onClose }) => {
  const svgRef = useRef(null);
  const qrCanvasRef = useRef(null);
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  if (!patient) return null;

  const calculateAge = (dobString) => {
    if (!dobString) return '52 yrs';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '52 yrs';
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms);
    const calculatedAge = Math.abs(age_dt.getUTCFullYear() - 1970);
    return `${calculatedAge} yrs`;
  };

  const medId = patient.healthId || patient.health_id || 'SWID-2024-0001';
  const age = calculateAge(patient.dob);
  const patientName = patient.name || 'C. Joseph Vijay';
  const dobText = patient.dob || '1974-06-22';
  const phoneText = patient.phone || '9840123456';
  const bloodGroup = patient.bloodGroup || patient.blood_group || 'B+';
  const systemId = patient.user_id || patient.id || 1;
  const issuedDate = '06/09/2026';

  // Load photo into base64 data URL to ensure clean canvas export and SVG rendering
  useEffect(() => {
    const rawPhoto = patient?.photo || DEFAULT_PATIENT_PHOTO;
    const imgUrl = getPhotoUrl(rawPhoto);
    
    if (imgUrl) {
      if (imgUrl.startsWith('data:image')) {
        setPhotoDataUrl(imgUrl);
        return;
      }

      fetch(imgUrl)
        .then((res) => {
          if (!res.ok) throw new Error('Photo fetch failed');
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPhotoDataUrl(reader.result);
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            try {
              const c = document.createElement('canvas');
              c.width = img.naturalWidth || 200;
              c.height = img.naturalHeight || 200;
              const ctx = c.getContext('2d');
              ctx.drawImage(img, 0, 0);
              setPhotoDataUrl(c.toDataURL('image/png'));
            } catch (e) {
              setPhotoDataUrl(imgUrl);
            }
          };
          img.onerror = () => setPhotoDataUrl(imgUrl);
          img.src = imgUrl;
        });
    } else {
      setPhotoDataUrl(null);
    }
  }, [patient?.photo]);

  // Generate QR code Data URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (qrCanvasRef.current) {
        try {
          setQrDataUrl(qrCanvasRef.current.toDataURL('image/png'));
        } catch (e) {
          console.error('QR data URL error:', e);
        }
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [medId]);

  const handleDownload = () => {
    if (!svgRef.current) return;
    try {
      const svgElement = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1500; // 3x scale for crisp HD export (1500x900)
        canvas.height = 900;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#071322';
        ctx.fillRect(0, 0, 1500, 900);
        ctx.drawImage(img, 0, 0, 1500, 900);
        URL.revokeObjectURL(url);

        const png = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = png;
        link.download = `HealthCard_${patientName.replace(/\s+/g, '_')}_${medId}.png`;
        link.click();
      };
      img.onerror = (err) => {
        console.error('Image load error during download:', err);
        alert('Failed to process image export. Please try again.');
      };
      img.src = url;
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download card. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#071322] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative border border-cyan-500/30 animate-in fade-in zoom-in duration-200 text-white">
        
        {/* Hidden QR Code Canvas Generator */}
        <div style={{ display: 'none' }}>
          <QRCodeCanvas
            ref={qrCanvasRef}
            value={medId}
            size={240}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950 border border-cyan-500/40 text-cyan-400 rounded-2xl shadow-lg">
              <Heart className="w-5 h-5 fill-cyan-400/20" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                BUILD IQ • MEDICARD
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">PRIMARY PASS</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono">Government Health Identity Platform</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition border border-slate-700"
          >
            ✕
          </button>
        </div>

        {/* Pure Vector SVG Exact Card Recreation */}
        <div className="flex justify-center py-2 overflow-x-auto">
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 0 500 300"
            className="w-[500px] h-[300px] rounded-[24px] shadow-2xl border border-cyan-500/40 flex-shrink-0"
            style={{ width: '500px', height: '300px' }}
          >
            <defs>
              {/* Card Dark Gradient */}
              <linearGradient id="medicardBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#071322" />
                <stop offset="50%" stopColor="#0a1a2f" />
                <stop offset="100%" stopColor="#060f1b" />
              </linearGradient>

              {/* Radial subtle cyan glow */}
              <radialGradient id="cyanGlow" cx="20%" cy="20%" r="60%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#071322" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="blueGlow" cx="80%" cy="80%" r="60%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#071322" stopOpacity="0" />
              </radialGradient>

              {/* Photo clip path */}
              <clipPath id="photoClipBox">
                <rect x="20" y="70" width="90" height="110" rx="16" ry="16" />
              </clipPath>
            </defs>

            {/* Base Background Card */}
            <rect x="0" y="0" width="500" height="300" rx="24" ry="24" fill="url(#medicardBg)" stroke="#0e364e" strokeWidth="1.5" />
            <rect x="0" y="0" width="500" height="300" rx="24" ry="24" fill="url(#cyanGlow)" />
            <rect x="0" y="0" width="500" height="300" rx="24" ry="24" fill="url(#blueGlow)" />

            {/* Header Heart Icon Container */}
            <rect x="20" y="14" width="32" height="32" rx="10" ry="10" fill="#082535" stroke="#14b8a6" strokeWidth="1.2" />
            <path
              d="M36 34.5l-1.16-1.06C30.72 29.69 28 27.22 28 24.2c0-2.46 1.94-4.4 4.4-4.4 1.39 0 2.73.65 3.6 1.67.87-1.02 2.21-1.67 3.6-1.67 2.46 0 4.4 1.94 4.4 4.4 0 3.02-2.72 5.49-6.84 9.24L36 34.5z"
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.6"
            />

            {/* Header Title & Subtitle */}
            <text x="60" y="27" fill="#22d3ee" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="13.5" letterSpacing="1.2">
              BUILD IQ • MEDICARD
            </text>
            <text x="60" y="40" fill="#94a3b8" fontFamily="Courier, monospace" fontSize="8.5" letterSpacing="0.4">
              Government Health Identity Platform
            </text>

            {/* Verified ID Green Pill Badge */}
            <rect x="380" y="16" width="100" height="26" rx="13" ry="13" fill="#09303d" stroke="#0d9488" strokeWidth="1" />
            <circle cx="394" cy="29" r="3.5" fill="#10b981" />
            <text x="404" y="32.5" fill="#2dd4bf" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="9.5" letterSpacing="0.8">
              VERIFIED ID
            </text>

            {/* Horizontal Divider 1 */}
            <line x1="20" y1="56" x2="480" y2="56" stroke="#0e364e" strokeWidth="1" />

            {/* Photo on Left */}
            <rect x="20" y="70" width="90" height="110" rx="16" ry="16" fill="#091829" />
            {photoDataUrl ? (
              <image
                href={photoDataUrl}
                xlinkHref={photoDataUrl}
                x="20"
                y="70"
                width="90"
                height="110"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#photoClipBox)"
              />
            ) : (
              <g>
                <circle cx="65" cy="115" r="18" fill="none" stroke="#22d3ee" strokeWidth="2" />
                <path d="M47 142c0-10 8-18 18-18s18 8 18 18" fill="none" stroke="#22d3ee" strokeWidth="2" />
                <text x="65" y="160" textAnchor="middle" fill="#64748b" fontFamily="Courier, monospace" fontSize="8">PHOTO</text>
              </g>
            )}
            <rect x="20" y="70" width="90" height="110" rx="16" ry="16" fill="none" stroke="#22d3ee" strokeWidth="2" />

            {/* Blood Group Dark Ruby Pill */}
            <rect x="20" y="188" width="90" height="25" rx="12.5" ry="12.5" fill="#2a1523" stroke="#f43f5e" strokeWidth="0.8" strokeOpacity="0.4" />
            <path d="M50 203.5c0 1.9-1.5 3.5-3.5 3.5s-3.5-1.6-3.5-3.5c0-2.2 3.5-5.5 3.5-5.5s3.5 3.3 3.5 5.5z" fill="#f43f5e" />
            <text x="56" y="204.5" fill="#fda4af" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="10.5">
              {bloodGroup}
            </text>

            {/* Middle Section: Patient Details */}
            {/* Full Name Monospace Label */}
            <text x="125" y="78" fill="#94a3b8" fontFamily="Courier, monospace" fontSize="9" letterSpacing="0.6">
              PATIENT FULL NAME
            </text>
            {/* Full Name */}
            <text x="125" y="101" fill="#ffffff" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="17">
              {patientName}
            </text>

            {/* Unique Med ID Monospace Label */}
            <text x="125" y="125" fill="#2dd4bf" fontFamily="Courier, monospace" fontSize="8.5" letterSpacing="0.8">
              UNIQUE MED ID
            </text>
            {/* Unique Med ID Glow Box */}
            <rect x="125" y="132" width="220" height="25" rx="7" ry="7" fill="#072630" stroke="#0d9488" strokeWidth="1" />
            <text x="135" y="148.5" fill="#5eead4" fontFamily="Courier, monospace" fontWeight="800" fontSize="12" letterSpacing="1">
              {medId}
            </text>

            {/* Two Side-by-Side Boxes for DOB and Phone */}
            {/* Box 1: DOB / Age */}
            <rect x="125" y="165" width="106" height="42" rx="8" ry="8" fill="#0f2238" stroke="#1e3a5f" strokeWidth="1" />
            <text x="133" y="179" fill="#94a3b8" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="8">
              DOB / Age
            </text>
            <text x="133" y="196" fill="#f8fafc" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="10">
              {dobText} ({age})
            </text>

            {/* Box 2: Phone */}
            <rect x="239" y="165" width="106" height="42" rx="8" ry="8" fill="#0f2238" stroke="#1e3a5f" strokeWidth="1" />
            <text x="247" y="179" fill="#94a3b8" fontFamily="Arial, Helvetica, sans-serif" fontWeight="600" fontSize="8">
              Phone
            </text>
            <text x="247" y="196" fill="#f8fafc" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="10">
              {phoneText}
            </text>

            {/* Right Section: QR Code */}
            <rect x="382" y="70" width="98" height="98" rx="16" ry="16" fill="#ffffff" stroke="#22d3ee" strokeWidth="1.5" />
            {qrDataUrl && (
              <image href={qrDataUrl} xlinkHref={qrDataUrl} x="390" y="78" width="82" height="82" />
            )}

            <text x="431" y="184" textAnchor="middle" fill="#2dd4bf" fontFamily="Courier, monospace" fontWeight="800" fontSize="8" letterSpacing="1">
              SCAN TO VIEW
            </text>

            {/* Demo Purpose Monospace Text */}
            <text x="250" y="244" textAnchor="middle" fill="#64748b" fontFamily="Courier, monospace" fontSize="8.5" letterSpacing="1">
              THIS CARD IS ONLY FOR DEMO PURPOSE
            </text>

            {/* Horizontal Divider 2 */}
            <line x1="20" y1="262" x2="480" y2="262" stroke="#0e364e" strokeWidth="1" />

            {/* Footer Left & Right */}
            <text x="20" y="278" fill="#94a3b8" fontFamily="Courier, monospace" fontSize="9">
              System ID: #{systemId}
            </text>
            <text x="480" y="278" textAnchor="end" fill="#94a3b8" fontFamily="Courier, monospace" fontSize="9">
              Issued: {issuedDate}
            </text>
          </svg>
        </div>

        {/* Modal Controls */}
        <div className="flex items-center justify-between border-t border-cyan-900/40 pt-4">
          <p className="text-xs text-slate-400 font-mono">
            Scannable Med ID QR integrates with Doctor & Emergency Dashboards.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:scale-105"
            >
              <Download className="w-4 h-4" /> Download Digital Card
            </button>
            <button
              onClick={onClose}
              className="bg-slate-800 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl hover:bg-slate-700 text-sm font-semibold transition border border-slate-700"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DigitalHealthCard;
