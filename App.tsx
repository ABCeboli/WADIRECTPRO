
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import WhatsAppIcon from './components/WhatsAppIcon';
import CopyIcon from './components/CopyIcon';
import CheckIcon from './components/CheckIcon';
import QRIcon from './components/QRIcon';
import QRCodeModal from './components/QRCodeModal';

type ThemeMode = 'light' | 'dark';

interface RecentContact {
  number: string;
  name?: string;
  note?: string;
  timestamp: number;
  isPinned?: boolean;
}

interface Template {
  id: string;
  label: string;
  text: string;
}

const defaultTemplates: Template[] = [
  { id: '1', label: '👋 Benvenuto', text: 'Ciao! Grazie per averci contattato. Come possiamo aiutarti?' },
  { id: '2', label: '⏳ Follow-up', text: 'Ciao, volevo aggiornarti sulla tua pratica. Ci sono novità.' },
  { id: '3', label: '📍 Posizione', text: 'Ecco la nostra posizione: [Link Google Maps]' },
  { id: '4', label: '💳 Pagamento', text: 'Gentile cliente, le inviamo i dettagli per il saldo dell\'ordine.' },
];

const countryCodes = [
  { name: 'Italia', code: '+39', flag: '🇮🇹', pattern: /^\d{9,10}$/, iso: 'IT' },
  { name: 'USA', code: '+1', flag: '🇺🇸', pattern: /^\d{10}$/, iso: 'US' },
  { name: 'UK', code: '+44', flag: '🇬🇧', pattern: /^\d{10}$/, iso: 'GB' },
  { name: 'Svizzera', code: '+41', flag: '🇨🇭', pattern: /^\d{9}$/, iso: 'CH' },
  { name: 'Spagna', code: '+34', flag: '🇪🇸', pattern: /^\d{9}$/, iso: 'ES' },
  { name: 'Francia', code: '+33', flag: '🇫🇷', pattern: /^\d{9}$/, iso: 'FR' },
  { name: 'Germania', code: '+49', flag: '🇩🇪', pattern: /^\d{10,11}$/, iso: 'DE' },
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => (localStorage.getItem('dp-theme') as ThemeMode) || 'light');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('+39');
  const [message, setMessage] = useState<string>('');
  const [recentNumbers, setRecentNumbers] = useState<RecentContact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [dailyCount, setDailyCount] = useState<number>(0);
  const [isInputTouched, setIsInputTouched] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  
  // States for Editing
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [editingNoteContact, setEditingNoteContact] = useState<RecentContact | null>(null);

  useEffect(() => {
    const savedRecents = localStorage.getItem('dp-recents-v5');
    if (savedRecents) setRecentNumbers(JSON.parse(savedRecents));
    
    const savedTemplates = localStorage.getItem('dp-templates-v1');
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    else setTemplates(defaultTemplates);

    const savedCount = localStorage.getItem('dp-daily-count');
    const lastReset = localStorage.getItem('dp-last-reset');
    const today = new Date().toDateString();
    if (lastReset === today) setDailyCount(parseInt(savedCount || '0'));
    else localStorage.setItem('dp-last-reset', today);

    // Auto-detect location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
          const data = await res.json();
          const country = countryCodes.find(c => c.iso === data.countryCode);
          if (country) setCountryCode(country.code);
        } catch (e) { console.debug("Geo IP detection failed"); }
      });
    }
  }, []);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('dp-theme', theme);
  }, [theme]);

  const saveTemplatesToLocal = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('dp-templates-v1', JSON.stringify(newTemplates));
  };

  const handleSmartInput = useCallback((val: string) => {
    setIsInputTouched(true);
    let sanitized = val.trim().replace(/[\s\-\(\)]/g, '');
    if (sanitized.startsWith('+')) {
      for (const c of countryCodes) {
        if (sanitized.startsWith(c.code)) {
          setCountryCode(c.code);
          setPhoneNumber(sanitized.slice(c.code.length).replace(/\D/g, ''));
          return;
        }
      }
      const genericMatch = sanitized.match(/^\+(\d{1,4})/);
      if (genericMatch) {
        setCountryCode(`+${genericMatch[1]}`);
        setPhoneNumber(sanitized.slice(genericMatch[0].length).replace(/\D/g, ''));
        return;
      }
    }
    setPhoneNumber(sanitized.replace(/\D/g, ''));
  }, []);

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        handleSmartInput(text);
      }
    } catch (err) { alert('Incolla manualmente (Ctrl+V).'); }
  };

  const selectedCountry = useMemo(() => countryCodes.find(c => c.code === countryCode), [countryCode]);

  const validation = useMemo(() => {
    if (!phoneNumber) return { isValid: false, message: 'Inserisci un numero' };
    if (phoneNumber.length < 7) return { isValid: false, message: 'Troppo corto' };
    if (phoneNumber.length > 15) return { isValid: false, message: 'Troppo lungo' };
    if (selectedCountry?.pattern && !selectedCountry.pattern.test(phoneNumber)) {
      return { isValid: false, message: `Formato ${selectedCountry.name} non standard` };
    }
    return { isValid: true, message: 'Numero valido' };
  }, [phoneNumber, selectedCountry]);

  const isValid = validation.isValid;
  
  const fullLink = useMemo(() => {
    const cleanNum = `${countryCode.replace('+', '')}${phoneNumber}`;
    return `https://wa.me/${cleanNum}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  }, [countryCode, phoneNumber, message]);

  const handleAction = useCallback(() => {
    if (!isValid) return;
    const full = `${countryCode}${phoneNumber}`;
    const newCount = dailyCount + 1;
    setDailyCount(newCount);
    localStorage.setItem('dp-daily-count', newCount.toString());

    const existing = recentNumbers.find(n => n.number === full);
    const newContact: RecentContact = { 
      number: full, 
      name: contactName.trim() || existing?.name || undefined, 
      note: existing?.note || undefined,
      timestamp: Date.now(),
      isPinned: existing?.isPinned || false
    };
    
    const newList = [newContact, ...recentNumbers.filter(n => n.number !== full)].slice(0, 30);
    setRecentNumbers(newList);
    localStorage.setItem('dp-recents-v5', JSON.stringify(newList));
    window.open(fullLink, '_blank');
  }, [countryCode, phoneNumber, contactName, recentNumbers, dailyCount, isValid, fullLink]);

  const updateContactNote = (num: string, note: string) => {
    const newList = recentNumbers.map(n => n.number === num ? {...n, note} : n);
    setRecentNumbers(newList);
    localStorage.setItem('dp-recents-v5', JSON.stringify(newList));
    setEditingNoteContact(null);
  };

  const togglePin = (num: string) => {
    const newList = recentNumbers.map(n => n.number === num ? {...n, isPinned: !n.isPinned} : n);
    setRecentNumbers(newList);
    localStorage.setItem('dp-recents-v5', JSON.stringify(newList));
  };

  const refineMessageWithAI = async () => {
    if (!message || isAILoading) return;
    setIsAILoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Migliora questo messaggio per WhatsApp rendendolo professionale ma cordiale in italiano: "${message}"`,
      });
      if (response.text) setMessage(response.text.trim());
    } catch (e) {
      alert("Errore AI: Verifica la tua connessione o riprova più tardi.");
    } finally { setIsAILoading(false); }
  };

  const exportData = () => {
    const data = { recents: recentNumbers, templates };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directpro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.recents) {
          setRecentNumbers(data.recents);
          localStorage.setItem('dp-recents-v5', JSON.stringify(data.recents));
        }
        if (data.templates) {
          setTemplates(data.templates);
          localStorage.setItem('dp-templates-v1', JSON.stringify(data.templates));
        }
        alert("Dati importati con successo!");
      } catch (e) { alert("File non valido."); }
    };
    reader.readAsText(file);
  };

  const filteredRecents = useMemo(() => {
    const base = searchTerm ? recentNumbers.filter(rn => 
      rn.number.includes(searchTerm) || (rn.name && rn.name.toLowerCase().includes(searchTerm.toLowerCase())) || (rn.note && rn.note.toLowerCase().includes(searchTerm.toLowerCase()))
    ) : recentNumbers;
    return [...base.filter(n => n.isPinned), ...base.filter(n => !n.isPinned)];
  }, [recentNumbers, searchTerm]);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-[1600px] mx-auto">
      <header className="w-full flex flex-col md:flex-row justify-between items-center gap-6 mb-12 glass rounded-[2.5rem] p-6 px-10 shadow-2xl relative">
        <div className="flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => window.location.reload()}>
            <div className="absolute -inset-2 rounded-2xl blur-md opacity-30 group-hover:opacity-60 transition duration-500 bg-emerald-500"></div>
            <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl bg-emerald-500">
              <WhatsAppIcon className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight flex items-center gap-3">
              DirectPro <span className="text-[10px] px-3 py-1 rounded-full border font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">AI HUB</span>
            </h1>
            <div className="flex gap-4 mt-1">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-slate-500">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-500"></div> System Ready
              </span>
              <button onClick={exportData} className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:underline">Export Data</button>
              <label className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline cursor-pointer">
                Import <input type="file" className="hidden" accept=".json" onChange={importData} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center p-1.5 rounded-2xl gap-1 bg-slate-200/50 dark:bg-slate-800/80">
          {(['light', 'dark'] as ThemeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setTheme(m)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === m ? 'bg-white dark:bg-slate-700 shadow-lg text-emerald-700 dark:text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              {m === 'light' ? 'Giorno' : 'Notte'}
            </button>
          ))}
        </div>
      </header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-10">
          <section className="glass rounded-[3.5rem] p-8 md:p-14 relative overflow-hidden">
            <div className="relative z-10 space-y-12">
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-[0.6em] text-emerald-700 dark:text-emerald-400">Nuova Conversazione</h2>
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Avvia chat istantanee e perfeziona messaggi con l'AI.</p>
                </div>
                <button onClick={() => {setPhoneNumber(''); setContactName(''); setMessage(''); setIsInputTouched(false);}} className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-800 text-slate-500 hover:bg-rose-500 hover:text-white transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <div className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-4 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-4 text-slate-800 dark:text-slate-400">Prefisso</label>
                    <div className="relative">
                      <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-full glass rounded-3xl pl-12 pr-6 h-18 font-black text-lg outline-none border-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 dark:text-white bg-white dark:bg-slate-800">
                        {countryCodes.map(c => <option key={c.code} value={c.code} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{c.flag} {c.code}</option>)}
                      </select>
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-xl pointer-events-none">{selectedCountry?.flag || '🌐'}</div>
                    </div>
                  </div>
                  <div className="md:col-span-8 space-y-3">
                    <div className="flex justify-between items-center ml-4 pr-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-400">Numero Mobile</label>
                      {isInputTouched && <span className={`text-[10px] font-bold uppercase ${isValid ? 'text-emerald-500' : 'text-rose-500'}`}>{validation.message}</span>}
                    </div>
                    <div className="relative group/input">
                      <input type="tel" placeholder="Numero..." value={phoneNumber} onChange={(e) => handleSmartInput(e.target.value)} className={`w-full glass rounded-3xl px-8 h-18 text-2xl font-black outline-none border-2 transition-all focus:ring-4 focus:ring-emerald-500/10 dark:text-white bg-white dark:bg-slate-800 ${!isInputTouched ? 'border-transparent' : isValid ? 'border-emerald-500/50' : 'border-rose-500/50 animate-shake'}`} />
                      <button onClick={handlePaste} className="absolute right-4 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><CopyIcon className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] ml-4 text-slate-800 dark:text-slate-400">Nome (Opzionale)</label>
                  <input type="text" placeholder="Es: Cliente Rossi" value={contactName} onChange={(e) => setContactName(e.target.value)} className="w-full glass rounded-3xl px-8 h-18 text-lg font-bold outline-none border-none dark:text-white bg-white dark:bg-slate-800" />
                </div>

                <div className="space-y-5">
                  <div className="flex justify-between items-end ml-4 pr-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-400">Messaggi Rapidi</label>
                    <button onClick={() => setIsEditingTemplates(!isEditingTemplates)} className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full transition-all ${isEditingTemplates ? 'bg-rose-500 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>{isEditingTemplates ? 'Chiudi' : 'Gestisci'}</button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
                    <button onClick={() => setEditingTemplate({id: Date.now().toString(), label: '', text: ''})} className="flex-shrink-0 w-14 h-14 rounded-2xl border-2 border-dashed border-emerald-500/30 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/5 transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
                    {templates.map((t) => (
                      <div key={t.id} className="relative flex-shrink-0 group">
                        <button onClick={() => !isEditingTemplates && setMessage(t.text)} className={`whitespace-nowrap px-6 h-14 rounded-2xl text-xs font-black transition-all border ${isEditingTemplates ? 'opacity-50' : 'hover:scale-105'} ${message === t.text ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-emerald-400 border-transparent'}`}>{t.label}</button>
                        {isEditingTemplates && (
                          <div className="absolute -top-2 -right-2 flex gap-1">
                            <button onClick={() => setEditingTemplate(t)} className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button onClick={() => saveTemplatesToLocal(templates.filter(x => x.id !== t.id))} className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="relative">
                    <textarea rows={4} placeholder="Scrivi il tuo messaggio..." value={message} onChange={(e) => setMessage(e.target.value)} className="w-full glass rounded-[2.5rem] p-8 text-lg font-medium outline-none resize-none border-none dark:text-white bg-white dark:bg-slate-800" />
                    <div className="absolute bottom-6 right-6 flex gap-2">
                       <button onClick={refineMessageWithAI} disabled={!message || isAILoading} className={`p-3.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${isAILoading ? 'bg-slate-200 animate-pulse' : 'bg-blue-600 text-white hover:scale-110'}`}>
                        {isAILoading ? 'Analisi...' : '✨ AI Refine'}
                      </button>
                      {message && <button onClick={() => saveTemplatesToLocal([{id: Date.now().toString(), label: 'Salvato', text: message}, ...templates])} className="p-3.5 bg-emerald-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg></button>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 pt-6">
                  <button onClick={handleAction} disabled={!isValid} className={`flex-[3] flex items-center justify-center gap-5 h-22 rounded-[2.5rem] font-black text-xl transition-all shadow-2xl ${isValid ? 'bg-gradient-to-r from-emerald-500 via-emerald-600 to-blue-600 text-white shadow-emerald-500/30 hover:-translate-y-2 active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed'}`}>
                    <WhatsAppIcon className="w-8 h-8" /> APRI WHATSAPP
                  </button>
                  <button disabled={!isValid} onClick={() => setIsQRModalOpen(true)} className="flex-1 h-22 glass rounded-[2.5rem] flex flex-col items-center justify-center transition-all group/qr text-emerald-600 dark:text-emerald-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm">
                    <QRIcon className="w-8 h-8 group-hover/qr:scale-110 transition-transform" /><span className="text-[10px] font-black uppercase tracking-[0.2em] mt-2">QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5 space-y-10">
          <section className="glass rounded-[3.5rem] p-8 md:p-12 shadow-2xl flex flex-col h-[900px] relative">
            <div className="space-y-8 mb-10 z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.5em] text-slate-800 dark:text-slate-400">Contatti Recenti</h3>
              <div className="relative">
                <input type="text" placeholder="Cerca numeri, nomi o note..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-none rounded-2xl pl-14 pr-6 h-16 text-xs font-black outline-none bg-slate-100 dark:bg-white/10 dark:text-white" />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {filteredRecents.map((rn, i) => (
                <div key={i} className={`group flex items-center justify-between p-5 rounded-[2.5rem] transition-all border ${rn.isPinned ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner' : 'hover:bg-slate-50 dark:hover:bg-white/5 border-transparent'}`}>
                  <div className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer" onClick={() => { setCountryCode(rn.number.split(' ')[0]); setPhoneNumber(rn.number.split(' ')[1]); if(rn.name) setContactName(rn.name); }}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-lg flex-shrink-0 ${rn.isPinned ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                      {rn.name ? rn.name.charAt(0).toUpperCase() : '#'}
                    </div>
                    <div className="truncate flex-1">
                      <div className="text-sm font-black truncate dark:text-white">{rn.name || rn.number}</div>
                      {rn.note ? (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">📝 {rn.note}</div>
                      ) : (
                        <div className="text-[10px] text-slate-400 font-black">{rn.number}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingNoteContact(rn)} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => togglePin(rn.number)} className={`p-2 transition-colors ${rn.isPinned ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}`}>
                      <svg className="w-4 h-4" fill={rn.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <QRCodeModal isOpen={isQRModalOpen} onClose={() => setIsQRModalOpen(false)} url={fullLink} phoneNumber={`${countryCode} ${phoneNumber}`} />
      
      {/* Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="glass rounded-[3rem] p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <h4 className="text-xl font-black">Editor Template</h4>
            <div className="space-y-4">
              <input type="text" placeholder="Etichetta" value={editingTemplate.label} onChange={(e) => setEditingTemplate({...editingTemplate, label: e.target.value})} className="w-full h-14 glass rounded-2xl px-6 outline-none bg-white dark:bg-slate-800 font-bold" />
              <textarea rows={4} placeholder="Testo messaggio" value={editingTemplate.text} onChange={(e) => setEditingTemplate({...editingTemplate, text: e.target.value})} className="w-full glass rounded-3xl p-6 outline-none resize-none bg-white dark:bg-slate-800" />
            </div>
            <div className="flex gap-4">
              <button onClick={() => setEditingTemplate(null)} className="flex-1 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-xs uppercase">Chiudi</button>
              <button onClick={() => {
                const newList = templates.find(x => x.id === editingTemplate.id) ? templates.map(x => x.id === editingTemplate.id ? editingTemplate : x) : [editingTemplate, ...templates];
                saveTemplatesToLocal(newList);
                setEditingTemplate(null);
              }} className="flex-1 h-14 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Note Edit Modal */}
      {editingNoteContact && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
          <div className="glass rounded-[3rem] p-8 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
               <h4 className="text-xl font-black">Aggiungi Nota</h4>
               <p className="text-[10px] font-black uppercase text-slate-400">{editingNoteContact.number}</p>
            </div>
            <input 
              autoFocus
              type="text" 
              placeholder="Esempio: Cliente VIP, Prospect..."
              defaultValue={editingNoteContact.note}
              onKeyDown={(e) => e.key === 'Enter' && updateContactNote(editingNoteContact.number, (e.target as HTMLInputElement).value)}
              id="noteInput"
              className="w-full h-14 glass rounded-2xl px-6 outline-none bg-white dark:bg-slate-800 font-bold text-center" 
            />
            <button onClick={() => updateContactNote(editingNoteContact.number, (document.getElementById('noteInput') as HTMLInputElement).value)} className="w-full h-14 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase shadow-xl">Salva Nota</button>
            <button onClick={() => setEditingNoteContact(null)} className="w-full py-2 text-slate-400 text-[10px] font-black uppercase">Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
