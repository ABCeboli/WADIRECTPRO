
import React from 'react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  phoneNumber: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, phoneNumber }) => {
  if (!isOpen) return null;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=059669&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="relative glass dark:bg-slate-900/90 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] max-w-sm w-full p-10 transform animate-in zoom-in-95 duration-500 border-white/20">
        
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 p-3 rounded-2xl hover:bg-rose-500 hover:text-white text-slate-400 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center space-y-8">
          <div className="space-y-2 pt-4">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">QR Rapido</h3>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em]">{phoneNumber}</p>
          </div>

          <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl inline-block border-4 border-emerald-500/10 scale-105 transition-transform hover:scale-110 duration-500">
            <img 
              src={qrImageUrl} 
              alt="QR Code" 
              className="w-48 h-48 rounded-2xl"
            />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed px-2 font-bold uppercase tracking-tighter">
            Fai scansionare questo codice per avviare istantaneamente la chat con il messaggio preimpostato.
          </p>

          <div className="pt-4">
            <a 
              href={qrImageUrl} 
              download="whatsapp-qr.png"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 h-16 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2rem] font-black text-sm hover:scale-[1.05] transition-all active:scale-95 shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              SALVA QR
            </a>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
};

export default QRCodeModal;
