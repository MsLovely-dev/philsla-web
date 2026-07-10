import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Search, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  ArrowRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function BulkUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'PROGRESS' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [fileName, setFileName] = useState<string | null>(null);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const startUpload = () => {
    setUploadStatus('PROGRESS');
    setTimeout(() => {
      setUploadStatus('SUCCESS');
    }, 2500);
  };

  const handleDownload = (format: 'CSV' | 'EXCEL') => {
    setShowFormatDropdown(false);
    setDownloadingFormat(format);
    
    setTimeout(() => {
      setDownloadingFormat(null);
      // Trigger simulated file download
      const filename = format === 'CSV' ? 'philsa_exam_template.csv' : 'philsa_exam_template.xlsx';
      const content = format === 'CSV' 
        ? "lrn,firstName,lastName,dob,gender,region,province,city,gwa,academicTrack,firstUniversity,firstCourse\n101234567890,Marcus,Valerius,2008-04-12,MALE,NCR,Metro Manila,Quezon City,96.5,STEM,University of the Philippines Diliman,BS Computer Science"
        : "[PK...Binary Excel Content Placeholder]"; 

      const blob = new Blob([content], { type: format === 'CSV' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-philsa-navy mb-2 tracking-tight">Bulk Upload Center</h1>
          <p className="text-philsa-gray text-sm font-medium">Easily upload exam files and records to the system.</p>
        </div>
        <div className="flex gap-3 relative">
           <button 
             onClick={() => setShowFormatDropdown(!showFormatDropdown)}
             className="bg-white border border-philsa-border hover:border-philsa-red hover:text-philsa-red text-philsa-navy py-2.5 px-6 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
           >
              <Download className="w-4 h-4 text-philsa-red" /> Download Template
           </button>

           <AnimatePresence>
             {showFormatDropdown && (
               <motion.div 
                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                 className="absolute right-0 top-full mt-2 w-56 bg-white border border-philsa-border rounded-2xl shadow-xl z-50 p-2 space-y-1 overflow-hidden"
               >
                 <div className="px-3 py-2 border-b border-philsa-border mb-1">
                   <p className="text-[9px] font-black text-philsa-red uppercase tracking-wider">Select Format</p>
                 </div>
                 <button 
                   onClick={() => handleDownload('CSV')}
                   className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-philsa-bg text-philsa-navy text-xs font-bold transition-all"
                 >
                   <FileText className="w-4 h-4 text-slate-500" />
                   <div>
                     <p className="font-extrabold text-philsa-navy">CSV Template</p>
                     <p className="text-[9px] text-slate-400 font-medium font-sans">Standard text CSV (.csv)</p>
                   </div>
                 </button>
                 <button 
                   onClick={() => handleDownload('EXCEL')}
                   className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-philsa-bg text-philsa-navy text-xs font-bold transition-all"
                 >
                   <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                   <div>
                     <p className="font-extrabold text-philsa-navy">Excel Spreadsheet</p>
                     <p className="text-[9px] text-slate-400 font-medium font-sans font-sans">Microsoft Excel (.xlsx)</p>
                   </div>
                 </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      {downloadingFormat && (
        <div className="fixed bottom-6 right-6 z-50 bg-philsa-navy text-white text-xs font-bold px-6 py-4 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-bounce">
          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span>Generating {downloadingFormat} template package...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
           <div className="card-philsa p-12 bg-white flex flex-col items-center justify-center text-center border-4 border-dashed border-philsa-border hover:border-philsa-red/30 transition-all cursor-pointer relative overflow-hidden group">
              <div className="absolute inset-0 bg-philsa-bg/50 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {uploadStatus === 'IDLE' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">
                   <div className="w-24 h-24 bg-philsa-navy/5 text-philsa-navy rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-philsa-border group-hover:bg-philsa-red group-hover:text-white transition-all transform group-hover:rotate-12">
                      <UploadCloud className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-black text-philsa-navy mb-4 tracking-tight">Select Exam Files</h2>
                   <p className="text-philsa-gray text-sm mb-8 font-medium leading-relaxed max-w-sm">Drag and drop your .csv, .xlsx, or .json files here to begin the upload process.</p>
                   <button 
                    onClick={() => { setFileName('EXAM_POOL_2026.xlsx'); startUpload(); }}
                    className="bg-philsa-navy text-white px-10 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-philsa-navy/20 hover:scale-105 transition-all"
                   >
                     Browse Files
                   </button>
                </motion.div>
              )}

              {uploadStatus === 'PROGRESS' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-10 w-full max-w-sm">
                   <div className="w-20 h-20 bg-philsa-navy/5 text-philsa-navy rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce">
                      <FileText className="w-8 h-8" />
                   </div>
                   <h3 className="text-xl font-extrabold text-philsa-navy mb-2">Uploading: {fileName}</h3>
                   <p className="text-philsa-gray text-[10px] font-black uppercase tracking-widest mb-6">Processing records: 74% complete</p>
                   <div className="w-full h-2 bg-philsa-bg rounded-full overflow-hidden border border-philsa-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '74%' }}
                        className="h-full bg-philsa-red rounded-full"
                      />
                   </div>
                </motion.div>
              )}

              {uploadStatus === 'SUCCESS' && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
                   <div className="w-24 h-24 bg-green-50 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border-2 border-green-200">
                      <CheckCircle className="w-12 h-12" />
                   </div>
                   <h2 className="text-2xl font-black text-philsa-navy mb-2 tracking-tight">Upload Complete</h2>
                   <p className="text-green-600 text-sm font-bold uppercase tracking-widest mb-8">1,240 records successfully added</p>
                   <div className="flex gap-3 justify-center">
                     <button onClick={() => setUploadStatus('IDLE')} className="btn-secondary py-3 px-8 text-xs font-black uppercase tracking-widest">Done</button>
                     <button className="bg-philsa-navy text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                        <ArrowRight className="w-4 h-4" /> View Questions
                     </button>
                   </div>
                </motion.div>
              )}
           </div>

           <div className="card-philsa p-8">
              <h3 className="text-sm font-black text-philsa-navy uppercase tracking-widest mb-6 flex items-center gap-2 border-l-4 border-philsa-red pl-4">Recent Upload History</h3>
              <div className="space-y-4">
                 <HistoryRow name="PHILSA_CANDIDATE_BATCH_01.csv" date="2 hours ago" count="5,000" status="SUCCESS" />
                 <HistoryRow name="QUESTION_PUP_ENGINEERING.json" date="5 hours ago" count="450" status="SUCCESS" />
                 <HistoryRow name="RECORDS_NCR_SOUTH.xlsx" date="1 day ago" count="12,400" status="ERROR" errors={12} />
              </div>
           </div>
        </div>

        <div className="space-y-8">
           <div className="card-philsa p-8 bg-amber-50/50 border-amber-100">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-white rounded-lg border border-amber-100">
                    <Info className="w-5 h-5 text-amber-600" />
                 </div>
                 <h4 className="text-amber-900 font-black uppercase text-xs tracking-widest">Upload Guidelines</h4>
              </div>
              <p className="text-amber-800/80 text-xs leading-relaxed mb-6 font-medium">Please make sure your files follow the required format (CSV or Excel). All data should be accurate before uploading to ensure system integrity.</p>
              <div className="space-y-4">
                 <ProtocolStep label="Check file formatting" status={true} />
                 <ProtocolStep label="Match subject columns" status={true} />
                 <ProtocolStep label="Verify student IDs" status={true} />
                 <ProtocolStep label="Remove duplicate entries" status={true} />
              </div>
           </div>

           <div className="card-philsa p-8">
              <h4 className="text-[10px] font-black text-philsa-navy uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <AlertTriangle className="w-3.5 h-3.5 text-philsa-red" /> Active Validation Errors
              </h4>
              <div className="space-y-3">
                 <ErrorCard label="L-4421" msg="Missing unique candidate hash" />
                 <ErrorCard label="Q-0012" msg="Invalid characters in question" />
                 <ErrorCard label="SYS-X" msg="Incorrect regional code" />
              </div>
              <button className="w-full mt-6 py-3 border border-dashed border-philsa-border rounded-xl text-philsa-gray text-[9px] font-black uppercase tracking-widest hover:bg-philsa-bg hover:text-philsa-navy transition-all">
                 Download Error Report
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ name, date, count, status, errors }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-philsa-bg/50 rounded-2xl border border-philsa-border hover:bg-white transition-all group">
       <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${status === 'ERROR' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-600'}`}>
             <FileText className="w-4 h-4" />
          </div>
          <div>
             <h5 className="text-sm font-bold text-philsa-navy group-hover:text-philsa-red transition-all">{name}</h5>
             <p className="text-[10px] text-philsa-gray font-bold uppercase tracking-widest">{date} • {count} Records</p>
          </div>
       </div>
       <div className="text-right">
          <span className={`text-[8px] font-black px-2 py-1 rounded-full tracking-widest ${status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
             {status}
          </span>
          {errors && <p className="text-[9px] text-red-600 font-black mt-1 uppercase">{errors} Errors</p>}
       </div>
    </div>
  );
}

function ProtocolStep({ label, status }: { label: string, status: boolean }) {
  return (
    <div className="flex items-center gap-3">
       <div className={`w-2 h-2 rounded-full ${status ? 'bg-amber-500' : 'bg-philsa-border'}`} />
       <span className="text-[10px] font-bold text-amber-900/70 uppercase tracking-wide">{label}</span>
    </div>
  );
}

function ErrorCard({ label, msg }: any) {
  return (
    <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
       <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
          <p className="text-[9px] font-black text-red-700 uppercase tracking-widest">{label}</p>
       </div>
       <p className="text-[10px] text-red-800/80 font-bold">{msg}</p>
    </div>
  );
}
