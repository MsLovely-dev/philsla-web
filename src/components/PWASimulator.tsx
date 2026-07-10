import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Download, Smartphone, Monitor, Share2, Plus, Play, 
  CheckCircle2, Sparkles, Battery, Wifi, Signal, X, 
  ChevronRight, ArrowRight, Loader2, Info, Compass
} from 'lucide-react';

export default function PWASimulator() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [installStatus, setInstallStatus] = useState<'idle' | 'prompting' | 'installing' | 'completed'>('idle');
  const [installProgress, setInstallProgress] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  
  // Custom date-time for phone status bar
  const [currentTime, setCurrentTime] = useState('10:42 AM');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    { threshold: 15, text: '🔍 Scanning client system hardware...' },
    { threshold: 40, text: '⚡ Pre-registering PhilSA Background Service Worker...' },
    { threshold: 65, text: '📁 Caching offline-first registration assets (18.4 MB)...' },
    { threshold: 85, text: '🔑 Linking local secure biometric sandbox credentials...' },
    { threshold: 100, text: '🚀 Generating high-fidelity home screen desktop launcher...' }
  ];

  const triggerInstallation = () => {
    setInstallStatus('installing');
    setInstallProgress(0);
  };

  useEffect(() => {
    if (installStatus !== 'installing') return;

    const interval = setInterval(() => {
      setInstallProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        
        // Find matching step description
        const matchedStep = steps.find(s => next <= s.threshold);
        if (matchedStep) {
          setCurrentStepText(matchedStep.text);
        }

        if (next >= 100) {
          clearInterval(interval);
          setInstallStatus('completed');
          setShowNotification(true);
          return 100;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [installStatus]);

  const handleLaunchApp = () => {
    // Navigate to registration page with pwa=true state
    navigate('/register?pwa=true');
  };

  return (
    <div className="bg-white rounded-[2rem] border border-philsa-border/40 overflow-hidden shadow-[0_24px_48px_-12px_rgba(15,23,42,0.08)]">
      {/* Simulation Header */}
      <div className="bg-philsa-navy text-white px-6 sm:px-8 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="bg-philsa-red text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full inline-block mb-1.5 shadow-sm">
            ✨ Interactive Experience
          </span>
          <h4 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            PhilSA PWA Installer Simulator
          </h4>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setPlatform('android'); setInstallStatus('idle'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              platform === 'android' ? 'bg-philsa-red text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Android
          </button>
          <button
            onClick={() => { setPlatform('ios'); setInstallStatus('idle'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              platform === 'ios' ? 'bg-philsa-red text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> iOS (Safari)
          </button>
          <button
            onClick={() => { setPlatform('desktop'); setInstallStatus('idle'); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              platform === 'desktop' ? 'bg-philsa-red text-white' : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" /> Desktop
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Platform Instructions and Active Simulator Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <h5 className="text-lg font-bold text-philsa-navy">
              Why simulate installing PhilSA as a PWA?
            </h5>
            <p className="text-sm text-philsa-gray leading-relaxed font-medium">
              A Progressive Web App (PWA) gives you an offline-resilient, app-like environment directly on your device. Caching crucial forms and verification templates beforehand prevents unexpected loss of work even with unstable connectivity.
            </p>
          </div>

          {/* Platform Specific Instructions Widget */}
          <div className="bg-philsa-bg border border-philsa-border/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-philsa-navy/5 flex items-center justify-center text-philsa-navy font-bold text-sm">
                i
              </div>
              <p className="text-xs font-black uppercase text-philsa-navy tracking-widest">
                How to install on {platform === 'android' ? 'Android OS' : platform === 'ios' ? 'Apple iOS' : 'PC or Mac'}
              </p>
            </div>

            {platform === 'android' && (
              <div className="space-y-2 text-xs font-medium text-philsa-gray leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>When loading the page in Chrome, wait for the <span className="font-bold text-philsa-navy">"Add PhilSA to Home screen"</span> popup at the bottom.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Alternatively, tap the <span className="font-bold text-philsa-navy">three dots menu (⋮)</span> in Chrome's top right corner.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Tap <span className="font-bold text-philsa-navy">"Install App"</span> and confirm to create a native launching sandbox.</p>
                </div>
              </div>
            )}

            {platform === 'ios' && (
              <div className="space-y-2 text-xs font-medium text-philsa-gray leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Open Safari and click the <span className="font-bold text-philsa-navy flex inline-flex items-center gap-0.5"><Share2 className="w-3 h-3 text-blue-500 inline" /> Share</span> action icon at the bottom browser panel.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Scroll down the share sheet menu options and tap <span className="font-bold text-philsa-navy flex inline-flex items-center gap-0.5"><Plus className="w-3.5 h-3.5 inline bg-gray-200 rounded p-0.5" /> "Add to Home Screen"</span>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Confirm the name "PhilSA" in the top right, and tap <span className="font-bold text-philsa-red">"Add"</span>.</p>
                </div>
              </div>
            )}

            {platform === 'desktop' && (
              <div className="space-y-2 text-xs font-medium text-philsa-gray leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Look at your browser's URL address bar. Click the <span className="font-bold text-philsa-navy inline-flex items-center gap-1"><Download className="w-3 h-3" /> "Install App"</span> shortcut monitor icon.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-philsa-red rounded-full shrink-0 mt-1.5" />
                  <p>Confirm the prompt. This launches the application in its own native standalone window frame (no browser bar, zero clutter).</p>
                </div>
              </div>
            )}
          </div>

          {/* Installer Controls */}
          <div className="space-y-4">
            {installStatus === 'idle' && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={triggerInstallation}
                  className="px-6 py-4 bg-philsa-red hover:bg-philsa-red-hover text-white text-xs uppercase tracking-widest font-black rounded-2xl transition-all shadow-lg shadow-philsa-red/15 flex items-center gap-3 group active:scale-95"
                >
                  <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                  Simulate Installation
                </button>
                <button
                  onClick={handleLaunchApp}
                  className="px-6 py-4 bg-white border border-philsa-border hover:border-philsa-red text-philsa-navy text-xs uppercase tracking-widest font-black rounded-2xl transition-all flex items-center gap-2 hover:bg-philsa-bg"
                >
                  Skip and Register Directly
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {installStatus === 'installing' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-philsa-red animate-spin" />
                    <span className="text-xs font-bold text-philsa-navy animate-pulse">{currentStepText}</span>
                  </div>
                  <span className="text-xs font-black text-philsa-navy">{installProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <motion.div 
                    className="bg-philsa-red h-full rounded-full"
                    style={{ width: `${installProgress}%` }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${installProgress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {installStatus === 'completed' && (
              <div className="space-y-4 bg-[#E6F3EE] border border-[#00563F]/20 p-5 rounded-2xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#00563F] shrink-0 mt-0.5" />
                  <div>
                    <h6 className="text-sm font-black text-[#00563F] uppercase tracking-wide">Simulated Installation Completed!</h6>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      PhilSA is now simulated as installed in standalone PWA mode. Click the button below to launch the standalone registration window, which activates high-integrity client settings.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={handleLaunchApp}
                    className="px-6 py-3 bg-[#00563F] hover:bg-[#004230] text-white text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow-lg flex items-center gap-2 active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" /> Launch Standalone Registration
                  </button>
                  <button
                    onClick={() => setInstallStatus('idle')}
                    className="px-4 py-3 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 text-xs font-bold rounded-xl transition-all"
                  >
                    Reset Simulator
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High Fidelity Simulated Mobile Phone Frame */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="relative w-full max-w-[280px] aspect-[9/18.5] bg-slate-900 rounded-[2.5rem] p-2.5 shadow-[0_24px_48px_-8px_rgba(15,23,42,0.25)] border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
            {/* Phone Speaker & Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center">
              <div className="w-12 h-1 bg-slate-800 rounded-full mb-1" />
              <div className="absolute right-6 w-1.5 h-1.5 bg-blue-900 rounded-full mb-1" />
            </div>

            {/* Simulated Phone Screen Content */}
            <div className="w-full h-full bg-philsa-bg rounded-[2rem] overflow-hidden relative flex flex-col select-none pt-6">
              
              {/* Phone Status Bar */}
              <div className="px-5 py-1 flex items-center justify-between text-[10px] text-philsa-navy font-bold z-30">
                <span>{currentTime}</span>
                <div className="flex items-center gap-1">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Dynamic Screen View State */}
              <div className="flex-1 flex flex-col relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {installStatus !== 'completed' ? (
                    <motion.div 
                      key="browser"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col bg-white"
                    >
                      {/* Browser Mock URL Bar */}
                      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5 mx-2 my-1 rounded-lg">
                        <Compass className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[9px] text-slate-500 truncate select-all font-mono">philsa.gov.ph/register</span>
                      </div>

                      {/* Web View Mock */}
                      <div className="flex-1 flex flex-col p-4 text-center items-center justify-center space-y-4">
                        <div className="w-10 h-10 bg-philsa-red rounded-xl flex items-center justify-center shadow-md shadow-philsa-red/10">
                          <span className="text-white font-extrabold text-xs">P</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-philsa-navy leading-tight uppercase tracking-widest">PhilSA Application</p>
                          <p className="text-[8px] text-philsa-gray font-medium">Secondary Leavers' Assessment Portal</p>
                        </div>

                        {installStatus === 'installing' ? (
                          <div className="w-full bg-philsa-bg p-3 rounded-xl space-y-2 border border-philsa-border/40">
                            <p className="text-[8px] font-black text-philsa-red uppercase tracking-wider animate-pulse">Installing App...</p>
                            <div className="w-full bg-slate-200 rounded-full h-1">
                              <div className="bg-philsa-red h-full rounded-full transition-all duration-150" style={{ width: `${installProgress}%` }} />
                            </div>
                            <p className="text-[7px] text-philsa-gray truncate">{currentStepText}</p>
                          </div>
                        ) : (
                          <div className="w-full space-y-1">
                            <div className="bg-philsa-bg p-2 rounded-xl text-[8px] text-slate-600 font-medium leading-normal border border-philsa-border/40">
                              ⚡ Offline protection disabled. Simulating install enables caching.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Simulated native install banner overlay */}
                      {installStatus === 'idle' && (
                        <motion.div 
                          initial={{ y: 80 }}
                          animate={{ y: 0 }}
                          className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-200 p-3 shadow-2xl flex flex-col gap-2 z-40"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-philsa-red rounded-lg flex items-center justify-center shadow-inner">
                                <span className="text-white font-extrabold text-[10px]">P</span>
                              </div>
                              <div>
                                <p className="text-[9px] font-black text-philsa-navy leading-none">PhilSA Assessment</p>
                                <p className="text-[7px] text-philsa-gray leading-none mt-1">Simulate Home Screen App</p>
                              </div>
                            </div>
                            <X className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setPlatform('desktop')} />
                          </div>
                          
                          {platform === 'ios' ? (
                            <div className="bg-slate-50 p-1.5 rounded text-[8px] text-slate-600 font-medium flex items-center justify-center gap-1 border border-slate-100">
                              <span>Tap share <Share2 className="w-2.5 h-2.5 inline text-blue-500" /> then <span className="font-bold">Add to Home Screen</span></span>
                            </div>
                          ) : (
                            <button
                              onClick={triggerInstallation}
                              className="w-full bg-philsa-navy hover:bg-slate-800 text-white font-bold py-1.5 rounded text-[9px] uppercase tracking-wider shadow"
                            >
                              Add to Home Screen
                            </button>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="launcher"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col bg-slate-900 p-4"
                      style={{
                        backgroundImage: 'radial-gradient(circle at 50% 120%, #1e293b 0%, #0f172a 100%)'
                      }}
                    >
                      {/* Apps Grid Layout */}
                      <div className="flex-1 grid grid-cols-4 gap-x-2 gap-y-4 pt-4 text-center">
                        {/* Custom Launcher App Icon */}
                        <motion.div 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={handleLaunchApp}
                          className="flex flex-col items-center gap-1.5 cursor-pointer relative"
                        >
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-slate-900 shadow">
                            1
                          </div>
                          <div className="w-11 h-11 bg-philsa-red rounded-[1.1rem] flex items-center justify-center shadow-lg shadow-philsa-red/40 border-t border-white/20">
                            <span className="text-white font-black text-sm tracking-tighter">PhilSA</span>
                          </div>
                          <span className="text-[8px] font-black text-white leading-tight truncate w-full shadow-sm">
                            PhilSA Exam
                          </span>
                        </motion.div>

                        {/* Filler Apps to make it realistic */}
                        {['Contacts', 'Browser', 'Settings', 'Files'].map((app, idx) => (
                          <div key={idx} className="flex flex-col items-center gap-1.5 opacity-40">
                            <div className="w-11 h-11 bg-slate-800 rounded-[1.1rem] flex items-center justify-center border border-slate-700">
                              <span className="text-slate-400 font-extrabold text-[10px]">{app[0]}</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-300 leading-tight truncate w-full">
                              {app}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Notification overlay */}
                      <AnimatePresence>
                        {showNotification && (
                          <motion.div
                            initial={{ y: -30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -30, opacity: 0 }}
                            className="absolute top-2 inset-x-2 bg-slate-950/95 border border-white/10 text-white p-2.5 rounded-xl flex gap-2 items-center shadow-2xl backdrop-blur-md z-50 cursor-pointer"
                            onClick={handleLaunchApp}
                          >
                            <div className="w-6 h-6 rounded-lg bg-philsa-red flex items-center justify-center text-[10px] font-black shrink-0">P</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black text-slate-200">PhilSA Installed Successfully</p>
                              <p className="text-[8px] text-slate-400 truncate">Tap to launch standalone registration.</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Hot seat dock at the bottom */}
                      <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl flex items-center justify-around mt-auto border border-white/5 shadow-inner">
                        <div className="w-9 h-9 bg-slate-800 rounded-lg opacity-50" />
                        <div className="w-9 h-9 bg-slate-800 rounded-lg opacity-50" />
                        <div className="w-9 h-9 bg-slate-800 rounded-lg opacity-50" />
                        <motion.div 
                          onClick={handleLaunchApp}
                          className="w-9 h-9 bg-philsa-red rounded-lg flex items-center justify-center cursor-pointer shadow-lg shadow-philsa-red/25 border-t border-white/10"
                        >
                          <span className="text-white font-black text-[9px]">P</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Phone Gestures Bar */}
              <div className="py-2.5 flex items-center justify-center z-30">
                <div className="w-20 h-1 bg-slate-400 rounded-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => { if (installStatus === 'completed') handleLaunchApp(); }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
