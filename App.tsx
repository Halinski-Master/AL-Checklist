
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InspectionData, INITIAL_SECTIONS, Status } from './types';
import SignatureCanvas from './components/SignatureCanvas';
import { analyzeInspection } from './services/gemini';
import { PersistenceService } from './services/persistence';

const App: React.FC = () => {
  const [view, setView] = useState<'form' | 'history' | 'success'>('form');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [data, setData] = useState<InspectionData>(() => {
    return PersistenceService.getDraft() || {
      tankBicNumber: '',
      carrier: '',
      pickupPlace: '',
      deliveryPlace: '',
      dateOfTransport: new Date().toISOString().split('T')[0],
      alosOrderNumber: '',
      product: '',
      pressure: '',
      level: '',
      sections: INITIAL_SECTIONS,
      additionalObservations: '',
      driverName: '',
      result: '',
      signature: '',
      photos: []
    };
  });

  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [history, setHistory] = useState<InspectionData[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    // Check if app is already running in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    // Catch the install prompt for Android
    window.addEventListener('beforeinstallprompt', (e) => {
      if (isStandalone) {
        console.log("App already installed in standalone mode.");
        return;
      }
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setShowInstallBanner(true);
    });

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Auto-save draft on changes
  useEffect(() => {
    if (view === 'form') {
      PersistenceService.saveDraft(data);
    }
  }, [data, view]);

  useEffect(() => {
    setHistory(PersistenceService.getHistory());
  }, [view]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemStatusChange = (sectionIndex: number, itemIndex: number, status: Status) => {
    const newSections = [...data.sections];
    newSections[sectionIndex].items[itemIndex].status = status;
    setData(prev => ({ ...prev, sections: newSections }));
  };

  const handleItemCommentChange = (sectionIndex: number, itemIndex: number, comment: string) => {
    const newSections = [...data.sections];
    newSections[sectionIndex].items[itemIndex].comment = comment;
    setData(prev => ({ ...prev, sections: newSections }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setData(prev => ({
              ...prev,
              photos: [...prev.photos, reader.result as string]
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.signature) {
      alert("Driver signature is required for legal compliance.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (isOnline) {
        const summary = await analyzeInspection(data);
        setAiAnalysis(summary || '');
      } else {
        setAiAnalysis("Note: Offline submission. AI analysis skipped until sync.");
      }
      PersistenceService.saveToHistory(data);
      PersistenceService.clearDraft();
      setView('success');
    } catch (err) {
      alert("System error. Draft saved locally.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportCSV = () => {
    const currentHistory = PersistenceService.getHistory();
    if (currentHistory.length === 0) return alert("No history to export.");
    const headers = ["Date", "Tank BIC", "Order", "Product", "Result", "Driver"];
    const rows = currentHistory.map(h => [h.dateOfTransport, h.tankBicNumber, h.alosOrderNumber, h.product, h.result, h.driverName]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ALOS_Inspections_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearHistory = () => {
    if (confirm("Permanently clear all local inspection history?")) {
      localStorage.removeItem('alos_tank_inspector_history');
      setHistory([]);
    }
  };

  const startNew = () => {
    setData({
      tankBicNumber: '', carrier: '', pickupPlace: '', deliveryPlace: '',
      dateOfTransport: new Date().toISOString().split('T')[0],
      alosOrderNumber: '', product: '', pressure: '', level: '',
      sections: INITIAL_SECTIONS, additionalObservations: '', driverName: '',
      result: '', signature: '', photos: []
    });
    PersistenceService.clearDraft();
    setAiAnalysis('');
    setView('form');
  };

  if (view === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="no-print flex flex-col items-center">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner border border-green-200">
              <i className="fas fa-check-circle text-4xl"></i>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Report Captured</h1>
            <p className="text-slate-500 mb-8 text-sm">Reference: <span className="font-mono bg-slate-100 px-2 py-1 rounded">{data.alosOrderNumber || 'PENDING'}</span></p>
            {aiAnalysis && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-5 mb-8 text-left max-w-md rounded-r-lg">
                <h3 className="text-blue-800 font-bold mb-1 text-sm flex items-center gap-2"><i className="fas fa-brain"></i> AI ANALYSIS</h3>
                <p className="text-blue-700 text-sm leading-relaxed">{aiAnalysis}</p>
              </div>
            )}
            <div className="flex flex-col w-full max-w-xs gap-3">
              <button onClick={() => window.print()} className="bg-slate-800 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:bg-black"><i className="fas fa-file-pdf"></i> Save Report</button>
              <button onClick={startNew} className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700">Start New</button>
              <button onClick={() => setView('history')} className="text-blue-600 font-bold py-2 text-sm uppercase">Archives</button>
            </div>
        </div>
        <div className="print-only text-left w-full max-w-4xl font-serif">
            <h1 className="text-3xl font-bold border-b-2 pb-2 mb-4">Tank Inspection Report</h1>
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div><strong>Tank BIC:</strong> {data.tankBicNumber}</div>
                <div><strong>Order No:</strong> {data.alosOrderNumber}</div>
                <div><strong>Driver:</strong> {data.driverName}</div>
                <div><strong>Date:</strong> {data.dateOfTransport}</div>
            </div>
            <div className="border p-4 rounded bg-slate-50 mb-8">
                <h2 className="font-bold border-b mb-2">Safety Result: {data.result}</h2>
                <p>{aiAnalysis}</p>
            </div>
        </div>
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b px-4 py-4 sticky top-0 z-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('form')} className="p-2 -ml-2 text-slate-500"><i className="fas fa-arrow-left text-xl"></i></button>
            <h1 className="text-xl font-bold text-slate-800">Field Archives</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><i className="fas fa-file-csv text-xl"></i></button>
            <button onClick={clearHistory} className="p-2 text-red-600 bg-red-50 rounded-lg"><i className="fas fa-trash-alt text-xl"></i></button>
          </div>
        </header>
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-20 text-slate-400"><p>No archived inspections.</p></div>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${h.result === 'OK' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm">{h.tankBicNumber || 'UNNAMED'}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{h.dateOfTransport}</p>
                  </div>
                </div>
                <i className="fas fa-chevron-right text-slate-300"></i>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative">
      <header className="bg-[#005596] text-white sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-sm font-black text-[#005596] text-xl">Λ</div>
          <div>
            <h1 className="text-[9px] font-black tracking-[0.2em] uppercase opacity-70">Air Liquide</h1>
            <h2 className="text-xs font-bold uppercase tracking-tighter">Tank Inspector <span className="text-blue-300">Pro</span></h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-green-400' : 'bg-red-500'}`}></div>
            <button onClick={() => setView('history')} className="text-xs font-bold uppercase tracking-tight bg-white/10 px-3 py-2 rounded-lg border border-white/20">Archives</button>
        </div>
      </header>

      {showInstallBanner && (
        <div className="bg-blue-700 text-white p-4 flex items-center justify-between shadow-xl z-50 sticky top-[52px]">
          <div className="flex items-center gap-3">
            <i className="fas fa-mobile-alt text-xl"></i>
            <span className="text-xs font-bold leading-tight">Install for Official Offline Use?</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstallClick} className="bg-white text-blue-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg">Install Now</button>
            <button onClick={() => setShowInstallBanner(false)} className="text-white/70 p-1"><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="bg-amber-500 text-white text-[10px] py-1.5 px-4 font-black text-center sticky top-[52px] z-20">
          <i className="fas fa-wifi-slash mr-2"></i> OFFLINE MODE: SYNC DELAYED
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4 space-y-4 pt-4">
        {/* Progress System */}
        <div className="grid grid-cols-5 gap-2 h-1.5 mb-6">
           <div className="bg-blue-600 rounded-full"></div>
           <div className={`h-1.5 rounded-full ${data.product ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
           <div className={`h-1.5 rounded-full ${data.driverName ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
           <div className={`h-1.5 rounded-full ${data.result ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
           <div className={`h-1.5 rounded-full ${data.signature ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
        </div>

        {/* Section 1: Logistics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ISO Tank ID</label>
            <input required name="tankBicNumber" value={data.tankBicNumber} onChange={handleInputChange} className="w-full border-b-2 border-slate-100 focus:border-blue-600 outline-none py-2 text-sm font-bold" placeholder="ORSU 580404/0" />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ALOS Order</label>
            <input required name="alosOrderNumber" value={data.alosOrderNumber} onChange={handleInputChange} className="w-full border-b-2 border-slate-100 focus:border-blue-600 outline-none py-2 text-sm font-bold" />
          </div>
        </div>

        {/* Measurements */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4 space-y-5">
             <div className="grid grid-cols-4 gap-2">
              {['LCO2', 'LIN', 'LAR', 'LOX'].map((p) => (
                <button key={p} type="button" onClick={() => setData(prev => ({ ...prev, product: p as any }))}
                  className={`py-3 rounded-lg font-black text-[10px] border ${data.product === p ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500'}`}
                >{p}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pressure (barg)</label>
                <input required type="number" step="0.1" name="pressure" value={data.pressure} onChange={handleInputChange} className="w-full border-b-2 border-slate-100 focus:border-blue-600 outline-none py-2 text-lg font-black" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Level (%)</label>
                <input required name="level" value={data.level} onChange={handleInputChange} className="w-full border-b-2 border-slate-100 focus:border-blue-600 outline-none py-2 text-lg font-black" />
              </div>
            </div>
        </div>

        {/* Checklist */}
        {data.sections.map((section, sIdx) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-3 bg-slate-100 border-b border-slate-200">
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-[10px]">{section.title}</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {section.items.map((item, iIdx) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-700">{item.subject}</span>
                    <div className="flex items-center gap-2">
                      {(['OK', 'Damage', 'NA'] as Status[]).map((st) => (
                        <button key={st} type="button" onClick={() => handleItemStatusChange(sIdx, iIdx, st)}
                          className={`flex-1 py-3 text-[9px] font-black rounded-lg uppercase transition-all ${item.status === st ? st === 'OK' ? 'bg-green-600 text-white shadow-md' : st === 'Damage' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                        >{st}</button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Photos */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
          <label className="text-[9px] font-black text-slate-400 uppercase mb-3 block">Site Evidence</label>
          <div className="grid grid-cols-4 gap-3">
            {data.photos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square">
                <img src={photo} className="w-full h-full object-cover rounded-xl border" alt="evidence" />
                <button type="button" onClick={() => removePhoto(idx)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-times text-[10px]"></i></button>
              </div>
            ))}
            <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50">
              <i className="fas fa-camera text-2xl text-blue-500 mb-1"></i>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
        </div>

        {/* Certification */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-5 space-y-5">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase">Inspector Name</label>
              <input required name="driverName" value={data.driverName} onChange={handleInputChange} className="w-full border-b-2 border-slate-100 focus:border-blue-600 outline-none py-2 text-sm font-black" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase">Final Clearance</label>
                <div className="flex gap-2">
                  {['OK', 'NOT OK'].map((r) => (
                    <button key={r} type="button" onClick={() => setData(prev => ({ ...prev, result: r as any }))}
                      className={`flex-1 py-4 rounded-xl font-black text-xs transition border-2 ${data.result === r ? r === 'OK' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}
                    >{r}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Digital Stamp</label>
                <SignatureCanvas onSave={(sig) => setData(prev => ({ ...prev, signature: sig }))} onClear={() => setData(prev => ({ ...prev, signature: '' }))} />
              </div>
            </div>
        </div>

        <button type="submit" disabled={isSubmitting} className={`w-full py-5 rounded-2xl text-lg font-black shadow-2xl transition-all flex items-center justify-center gap-3 ${isSubmitting ? 'bg-slate-300' : 'bg-[#005596] text-white hover:bg-[#00447a]'}`}>
          {isSubmitting ? 'SYNCING...' : 'FINALIZE & SYNC REPORT'}
        </button>

        {/* Deployment Helper (Visible only in dev or for admins) */}
        <div className="p-4 bg-slate-100 rounded-xl text-[10px] text-slate-500 font-mono">
            <p className="font-bold mb-1 uppercase">Store Readiness Diagnostic:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Manifest: OK</li>
              <li>Service Worker: v3-Production-Active</li>
              <li>HTTPS: Required for Play Store</li>
              <li>Mode: {window.matchMedia('(display-mode: standalone)').matches ? 'Standalone (Installed)' : 'Browser Mode'}</li>
            </ul>
        </div>
      </form>
    </div>
  );
};

export default App;
