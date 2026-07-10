import { useState } from 'react';
import { 
  Wifi, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  RefreshCcw,
  Zap,
  Lock
} from 'lucide-react';
import { usePhilSA } from '../../PhilSAContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function ProctorReadiness() {
  const { addAuditLog } = usePhilSA();
  const [testState, setTestState] = useState<'IDLE' | 'TESTING' | 'COMPLETED'>('IDLE');
  const [results, setResults] = useState({
    download: 0,
    upload: 0,
    ping: 0,
    stability: 0,
    devices: 0,
    encrypted: false
  });

  const runDiagnostics = () => {
    setTestState('TESTING');
    
    // Simulate multi-stage testing
    setTimeout(() => {
      setResults({
        download: Math.floor(Math.random() * 60) + 40,
        upload: Math.floor(Math.random() * 30) + 20,
        ping: Math.floor(Math.random() * 15) + 5,
        stability: 98,
        devices: 48,
        encrypted: true
      });
      setTestState('COMPLETED');
      localStorage.setItem('proctor_network_pass', 'true');
      addAuditLog('NETWORK_DIAGNOSTICS', 'Performed system and network readiness check. Status: EXCELLENT');
    }, 2500);
  };

  const isPass = results.download >= 25 && results.stability >= 95;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-black text-philsa-navy tracking-tight">Device Readiness Protocol</h1>
        <p className="text-philsa-gray max-w-xl mx-auto text-sm font-medium">Mandatory diagnostic verification of network stability and hardware compatibility before secure examination decryption.</p>
      </div>

      {testState === 'IDLE' ? (
        <div className="bg-white rounded-[2.5rem] border border-philsa-border shadow-xl p-16 text-center space-y-8">
           <div className="w-24 h-24 bg-philsa-bg rounded-3xl flex items-center justify-center mx-auto text-philsa-navy/20">
              <ShieldCheck className="w-12 h-12" />
           </div>
           <div className="space-y-2">
              <h3 className="text-xl font-bold text-philsa-navy">Verification Not Initiated</h3>
              <p className="text-sm text-philsa-gray max-w-sm mx-auto font-medium">Please perform a diagnostic check to authorize exam package synchronization.</p>
           </div>
           <button 
             onClick={runDiagnostics} 
             className="btn-primary py-4 px-12 uppercase text-xs font-black tracking-[0.2em] shadow-xl shadow-philsa-red/20 active:scale-95 transition-all"
           >
              Initialize System Audit
           </button>
        </div>
      ) : testState === 'TESTING' ? (
        <div className="bg-white rounded-[2.5rem] border border-philsa-border shadow-xl p-20 text-center space-y-12">
           <div className="relative w-32 h-32 mx-auto">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-philsa-red/10 border-t-philsa-red"
              />
              <div className="absolute inset-4 rounded-full bg-philsa-bg flex items-center justify-center">
                 <RefreshCcw className="w-8 h-8 text-philsa-navy animate-pulse" />
              </div>
           </div>
           <div className="space-y-4">
              <p className="text-xs font-black text-philsa-red uppercase tracking-[0.3em]">Auditing Network Infrastructure...</p>
              <div className="max-w-xs mx-auto space-y-2">
                 <div className="h-1 bg-philsa-bg rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-philsa-red"
                      animate={{ x: [-200, 200] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                 </div>
              </div>
           </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
           <div className={cn(
             "p-12 rounded-[2.5rem] border flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl",
             isPass ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
           )}>
              <div className="flex items-center gap-8">
                 <div className={cn(
                   "w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-lg",
                   isPass ? "bg-emerald-600 shadow-emerald-500/30" : "bg-philsa-red shadow-philsa-red/30"
                 )}>
                    {isPass ? <ShieldCheck className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-philsa-navy">{isPass ? 'READINESS VERIFIED' : 'ACTION REQUIRED'}</h2>
                    <p className="text-philsa-gray text-sm font-bold uppercase tracking-widest mt-1">System Composite Score: <span className={isPass ? "text-emerald-700" : "text-philsa-red"}>{isPass ? '98/100' : '45/100'}</span></p>
                 </div>
              </div>
              <button 
                onClick={runDiagnostics} 
                className="btn-secondary !bg-white py-3 px-8 text-[10px] font-black uppercase tracking-widest border-philsa-border shadow-sm flex items-center gap-2"
              >
                 <RefreshCcw className="w-4 h-4" /> Recalibrate Systems
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatItem 
                icon={Wifi} 
                label="Internet Speed" 
                value={`${results.download} Mbps`} 
                subtext={`▲ ${results.upload} Mbps / ${results.ping}ms Ping`}
                status={results.download > 25 ? 'PASS' : 'WARN'}
              />
              <StatItem 
                icon={Activity} 
                label="Packet Gateway" 
                value={`${results.stability}%`} 
                subtext="Stability Index"
                status={results.stability > 95 ? 'PASS' : 'WARN'}
              />
              <StatItem 
                icon={Lock} 
                label="Encryption Layer" 
                value="AES-256" 
                subtext="PhilSA-VPN Active"
                status="PASS"
              />
              <StatItem 
                icon={Cpu} 
                label="Hardware Audit" 
                value="Certified" 
                subtext="Compatible Firmware"
                status="PASS"
              />
              <StatItem 
                icon={HardDrive} 
                label="Storage Integrity" 
                value="Secure" 
                subtext="WORM Protocol Active"
                status="PASS"
              />
              <StatItem 
                icon={Zap} 
                label="Latency Tolerance" 
                value="Ultra-Low" 
                subtext="Optimized for Deployment"
                status="PASS"
              />
           </div>

           <div className="bg-philsa-navy text-white p-10 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Estimated Deployment Time</p>
                    <h3 className="text-2xl font-bold">~ 4 Minutes & 32 Seconds</h3>
                    <p className="text-xs text-blue-200 opacity-80">Based on current network signature and package weight (1.2GB).</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center min-w-[200px]">
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Queue Priority</p>
                    <p className="text-2xl font-black text-blue-400">IMMEDIATE</p>
                 </div>
              </div>
           </div>
        </motion.div>
      )}
    </div>
  );
}

function StatItem({ icon: Icon, label, value, subtext, status }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-philsa-border shadow-sm flex flex-col justify-between group hover:border-philsa-navy transition-all">
       <div className="flex justify-between items-start">
          <div className="w-10 h-10 bg-philsa-bg rounded-xl flex items-center justify-center text-philsa-navy">
             <Icon className="w-5 h-5" />
          </div>
          <span className={cn(
             "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
             status === 'PASS' ? "bg-emerald-100 text-emerald-700" : "bg-philsa-red/10 text-philsa-red"
          )}>
             {status}
          </span>
       </div>
       <div className="mt-8">
          <p className="text-[10px] text-philsa-gray font-black uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-philsa-navy tracking-tight">{value}</p>
          <p className="text-[10px] text-philsa-gray font-medium mt-1">{subtext}</p>
       </div>
    </div>
  );
}
