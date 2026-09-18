import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Upload, CheckCircle2, AlertCircle, RefreshCw, X, Search } from 'lucide-react';

const QRScannerModal = ({ onScanSuccess, onClose }) => {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera', 'file', 'manual'
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [scannedResult, setScannedResult] = useState('');
  
  const html5QrcodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);

  useEffect(() => {
    setScannedResult('');
    setError('');
  }, []);

  useEffect(() => {
    if (activeTab === 'camera' && !scannedResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeTab, scannedResult]);

  const stopCamera = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    setScanning(false);

    // 1. Force stop & release all video media tracks immediately
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
          video.srcObject.getTracks().forEach((track) => {
            try {
              track.stop();
              track.enabled = false;
            } catch (e) {}
          });
          video.srcObject = null;
        }
      });
    } catch (e) {
      console.error('Track cleanup error:', e);
    }

    // 2. Stop and clear Html5Qrcode instance before clearing ref
    if (html5QrcodeRef.current) {
      const instance = html5QrcodeRef.current;
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      try {
        await instance.clear();
      } catch (err) {
        console.error('Error clearing container:', err);
      }
      html5QrcodeRef.current = null;
    }

    // 3. Clear container innerHTML
    const container = document.getElementById('qr-reader-view');
    if (container) {
      container.innerHTML = '';
    }

    isStoppingRef.current = false;
  };

  const startCamera = async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setError('');
    setScanning(true);

    try {
      if (html5QrcodeRef.current || isStoppingRef.current) {
        await stopCamera();
      }

      // Small delay to allow browser camera hardware pipeline to fully release
      await new Promise((resolve) => setTimeout(resolve, 150));

      const container = document.getElementById('qr-reader-view');
      if (!container) {
        isStartingRef.current = false;
        return;
      }
      container.innerHTML = '';

      const html5Qrcode = new Html5Qrcode('qr-reader-view');
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera start error:', err);
      setError('Camera busy or unavailable. Click Restart Camera to retry.');
      setScanning(false);
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleSuccess = async (decodedText) => {
    if (!decodedText) return;
    const cleanText = decodedText.trim();
    setScannedResult(cleanText);
    await stopCamera();
    setTimeout(() => {
      onScanSuccess(cleanText);
    }, 400);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    try {
      const html5Qrcode = new Html5Qrcode('qr-file-dummy');
      const decodedText = await html5Qrcode.scanFile(file, true);
      html5Qrcode.clear();
      handleSuccess(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setError('Could not read a valid QR code from this image. Please try another file.');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    handleSuccess(manualId.trim());
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative border border-gray-100 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#172B4D]">Scan Patient QR Code</h3>
              <p className="text-xs text-[#64748B]">Scan Med ID QR to authenticate & access records</p>
            </div>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-[#F5F9FF] p-1 rounded-xl gap-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'camera' ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" /> Live Camera
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'file' ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Upload Image
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
              activeTab === 'manual' ? 'bg-white text-primary-700 shadow-sm border border-slate-200' : 'text-[#64748B] hover:text-[#172B4D]'
            }`}
          >
            <Search className="w-3.5 h-3.5" /> Enter ID
          </button>
        </div>

        {/* Success Confirmation Toast */}
        {scannedResult && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-center gap-3 animate-pulse">
            <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0" />
            <div>
              <p className="font-bold text-sm">QR Code Scanned Successfully!</p>
              <p className="text-xs font-mono mt-0.5 text-green-900">Med ID: {scannedResult}</p>
            </div>
          </div>
        )}

        {/* Camera View */}
        {activeTab === 'camera' && !scannedResult && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 min-h-[250px] flex flex-col items-center justify-center border-2 border-primary-500/30">
              <div id="qr-reader-view" className="w-full h-full" />
              {scanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-48 h-48 border-2 border-cyan-400 border-dashed rounded-2xl animate-pulse" />
                  <span className="text-[11px] font-medium text-white/80 bg-slate-900/80 px-3 py-1 rounded-full mt-3">
                    Align Patient QR inside box
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={startCamera}
              className="w-full py-2 bg-slate-100 text-[#172B4D] text-xs font-semibold rounded-xl hover:bg-slate-200 transition flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restart Camera
            </button>
          </div>
        )}

        {/* File Upload View */}
        {activeTab === 'file' && !scannedResult && (
          <div className="space-y-4 text-center">
            <div id="qr-file-dummy" className="hidden" />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary-300 bg-primary-50/50 hover:bg-primary-50 p-8 rounded-2xl cursor-pointer transition flex flex-col items-center justify-center gap-3"
            >
              <div className="p-3 bg-primary-100 text-primary-600 rounded-full">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm text-[#172B4D]">Click to upload QR Code image</p>
                <p className="text-xs text-[#64748B] mt-1">Supports PNG, JPG, WEBP formats</p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </div>
          </div>
        )}

        {/* Manual ID Input View */}
        {activeTab === 'manual' && !scannedResult && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#172B4D] mb-1">Enter Medical ID (Med ID)</label>
              <input
                type="text"
                placeholder="e.g. MID-19980512-849201 or SWID-2024-0001"
                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-mono text-[#172B4D]"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <Search className="w-4 h-4" /> Fetch Patient History
            </button>
          </form>
        )}

        {/* Error Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-2 text-right">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default QRScannerModal;
