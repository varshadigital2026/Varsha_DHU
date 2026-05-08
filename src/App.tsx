import React, { useState, useEffect, useRef } from 'react';
import { UploadModule } from './components/UploadModule';
import { Dashboard } from './components/Dashboard';
import { analyzeGarmentImages, AnalysisResult } from './lib/gemini';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shirt, 
  History, 
  LogOut,
  LogIn,
  FileText,
  Loader2,
  ChevronLeft,
  Download
} from 'lucide-react';
import { Button } from './components/ui/button';
import { db, auth } from './lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [unitsInspected, setUnitsInspected] = useState(100);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'upload' | 'dashboard' | 'history'>('upload');
  const [history, setHistory] = useState<any[]>([]);
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const fetchHistory = async () => {
    try {
      const q = query(collection(db, 'inspections'), orderBy('timestamp', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistory(docs);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  useEffect(() => {
    if (view === 'history') {
      fetchHistory();
    }
  }, [view]);

  const handleUploadComplete = async (images: string[], units: number, category: string) => {
    setIsProcessing(true);
    setUnitsInspected(units);
    setCurrentImages(images);
    try {
      const analysis = await analyzeGarmentImages(images, category);
      setResult(analysis);
      setView('dashboard');
      
      // Save to Firestore (Always save, even if guest)
      await addDoc(collection(db, 'inspections'), {
        userId: auth.currentUser?.uid || 'guest',
        timestamp: serverTimestamp(),
        unitsInspected: units,
        category: category,
        totalDefects: analysis.defects.length,
        dhu: (analysis.defects.length / units) * 100,
        defects: analysis.defects,
        summary: analysis.summary,
        images: images
      });
      
      toast.success('Analysis completed successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to analyze images. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to log in');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      setView('upload');
    } catch (error) {
      console.error(error);
    }
  };

  const handleDownloadPdf = async () => {
    if (!dashboardRef.current) return;
    
    const toastId = toast.loading('Generating high-quality PDF report...');
    
    try {
      // Use html-to-image which is more robust for modern CSS (Tailwind 4)
      const dataUrl = await htmlToImage.toJpeg(dashboardRef.current, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        style: {
          padding: '40px',
          backgroundColor: '#ffffff'
        },
        filter: (node) => {
          // Filter out elements with no-print class
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        }
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const ratio = imgProps.height / imgProps.width;
      const imgWidth = pdfWidth - 20;
      const imgHeight = imgWidth * ratio;
      
      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(dataUrl, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft >= 0) {
        pdf.addPage();
        position = heightLeft - imgHeight;
        pdf.addImage(dataUrl, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const garmentCategory = result?.category || 'Garment';
      pdf.save(`Inspection_Report_${garmentCategory}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
      toast.success('Report downloaded successfully', { id: toastId });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('PDF generation failed. Please try exporting as HTML or checking browser console.', { id: toastId });
    }
  };

  const handleExportHtml = () => {
    if (!dashboardRef.current || !result) return;
    
    const content = dashboardRef.current.innerHTML;
    const garmentCategory = result.category || 'Garment';
    
    const htmlPage = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inspection Report - ${garmentCategory}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Inter', sans-serif; background-color: #f8fafc; color: #1e293b; }
          .bg-card { background: white; border-radius: 1rem; border: 1px solid #e2e8f0; }
          .p-6 { padding: 1.5rem; }
          .p-8 { padding: 2rem; }
          .no-print { display: none !important; }
          .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
          .font-bold { font-weight: 700; }
          .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
          .grid { display: grid; }
          .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
          @media (min-width: 768px) {
            .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          }
          .recharts-responsive-container { 
            min-height: 300px; 
            background: #f1f5f9; 
            border-radius: 0.5rem; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            position: relative;
          }
          .recharts-responsive-container::after { 
            content: 'Visualization requires live dashboard view'; 
            color: #64748b; 
            font-size: 0.75rem; 
          }
        </style>
      </head>
      <body>
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          ${content}
        </div>
        <footer class="text-center py-12 px-4 text-slate-400 text-sm border-t mt-12">
          Report generated by DHU Analyzer AI • ${new Date().toLocaleString()}
        </footer>
      </body>
      </html>
    `;
    
    const blob = new Blob([htmlPage], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DHU_Report_${garmentCategory}_${new Date().getTime()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('HTML Report exported successfully');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Toaster position="top-right" richColors />
      
      {/* Navigation Rail */}
      <nav className="fixed left-0 top-0 bottom-0 w-16 bg-card border-r flex flex-col items-center py-8 gap-8 z-50 no-print">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
          <Shirt className="w-6 h-6" />
        </div>
        
        <div className="flex-1 flex flex-col gap-4">
          <Button 
            variant={view === 'upload' ? 'default' : 'ghost'} 
            size="icon" 
            onClick={() => setView('upload')}
            className="rounded-xl"
            title="New Inspection"
          >
            <Shirt className="w-5 h-5" />
          </Button>
          <Button 
            variant={view === 'history' ? 'default' : 'ghost'} 
            size="icon" 
            onClick={() => setView('history')}
            className="rounded-xl"
            title="History"
          >
            <History className="w-5 h-5" />
          </Button>
        </div>

        <div className="mt-auto flex flex-col gap-4">
          {user ? (
            <div className="flex flex-col gap-4 items-center">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold overflow-hidden border">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                ) : (
                  user.email?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="rounded-xl">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={handleLogin} title="Login" className="rounded-xl">
              <LogIn className="w-5 h-5" />
            </Button>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-16 min-h-screen print:pl-0">
        {/* Top Header */}
        <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            {view !== 'upload' && (
              <Button variant="ghost" size="sm" onClick={() => setView('upload')} className="gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <h1 className="font-bold text-xl tracking-tight flex items-center gap-2">
              DHU Analyzer 
              <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">v2.0</span>
            </h1>
          </div>
          
          {view === 'dashboard' && result && (
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handleExportHtml} className="gap-2">
                <FileText className="w-4 h-4" />
                Export HTML
              </Button>
              <Button variant="default" size="sm" onClick={handleDownloadPdf} className="gap-2 shadow-sm">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          )}
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] space-y-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
                  <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Shirt className="w-6 h-6 text-primary/50" />
                  </div>
                </div>
                <div className="text-center space-y-2 relative z-10">
                  <h2 className="text-2xl font-bold">AI Precision Inspection</h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Analyzing simulation maps with high-fidelity vision models for pattern, fabric, and trim optimization...
                  </p>
                </div>
              </motion.div>
            ) : view === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <UploadModule onUploadComplete={handleUploadComplete} isProcessing={isProcessing} />
              </motion.div>
            ) : view === 'dashboard' && result ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                ref={dashboardRef}
              >
                <Dashboard result={result} unitsInspected={unitsInspected} images={currentImages} />
              </motion.div>
            ) : view === 'history' ? (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-5xl mx-auto space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inspection History</h2>
                    <p className="text-muted-foreground">Review recent batch analyses and DHU trends.</p>
                  </div>
                  <Button variant="outline" onClick={() => setView('upload')}>New Analysis</Button>
                </div>
                
                <div className="grid gap-4">
                  {history.length > 0 ? history.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all cursor-pointer group" onClick={() => {
                      setResult({ defects: item.defects, summary: item.summary });
                      setUnitsInspected(item.unitsInspected);
                      setCurrentImages(item.images || []);
                      setView('dashboard');
                    }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.dhu < 5 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">DHU: {item.dhu.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">
                              {item.category || 'Garment'} • {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'Recent'} • {item.unitsInspected} units
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{item.totalDefects} Defects Found</p>
                          <p className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">View Details →</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-3xl">
                      <History className="w-12 h-12 mx-auto opacity-20 mb-4" />
                      <p className="text-muted-foreground">No inspection history found.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

const printStyles = `
  @media print {
    .no-print { display: none !important; }
    body { background: white !important; }
    main { padding-left: 0 !important; }
    .max-w-7xl { max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
    .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
    .rounded-xl, .rounded-2xl, .rounded-3xl { border-radius: 4px !important; }
    .bg-card { background: white !important; }
    .p-8, .p-6 { padding: 10px !important; }
    .gap-8, .gap-6 { gap: 10px !important; }
    h1, h2, h3, h4 { color: black !important; }
    .text-muted-foreground { color: #64748b !important; }
    .bg-primary { background: #0f172a !important; color: white !important; -webkit-print-color-adjust: exact; }
    .border { border: 1px solid #e2e8f0 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = printStyles;
  document.head.appendChild(style);
}
