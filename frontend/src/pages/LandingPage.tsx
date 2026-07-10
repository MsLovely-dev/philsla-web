import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ChevronRight, ShieldCheck, Cpu, Users, GraduationCap, ArrowRight, Radio, UserCheck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { PHILSA_COLORS } from '../lib/utils';
import heroStudentsImg from '../assets/images/landing_hero_students_1778137452547.png';
import PWASimulator from '../components/PWASimulator';

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative bg-philsa-bg overflow-hidden flex items-center min-h-[calc(100vh-5rem)] py-6 sm:py-8 lg:py-12">
        {/* Background Designs */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-5%] right-[-5%] w-[50%] h-[70%] bg-philsa-red/[0.03] rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-philsa-navy/[0.02] rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(139,13,17,0.02)_0%,transparent_70%)]" />
        </div>
        
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl py-2 flex flex-col items-center text-center lg:items-start lg:text-left mx-auto lg:mx-0 lg:pr-8"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-philsa-navy leading-[1.05] mb-6 tracking-tighter">
              Shape the <br />
              <span className="text-philsa-red relative inline-block">
                Future of PH
                <svg className="absolute -bottom-1 left-0 w-full h-2 text-philsa-red/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
              </span> <br />
              Education.
            </h1>
            
            <p className="text-base sm:text-lg lg:text-xl text-philsa-gray/80 mb-8 max-w-xl leading-relaxed font-medium">
              Start your next school journey with PhilSLA. A simple, safe, and official way to take your examinations. The unified platform streamlines your test registration and diagnostic journey with absolute integrity.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-10 w-full sm:w-auto justify-center lg:justify-start">
              <Link to="/register" className="btn-primary !py-3.5 !px-7 flex items-center justify-center gap-3 !rounded-2xl text-sm shadow-xl hover:translate-y-[-2px] transition-all">
                Start My Application
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#guidelines" className="btn-secondary !bg-white !py-3.5 !px-7 !rounded-2xl text-sm border-philsa-border hover:border-philsa-red transition-all flex items-center justify-center">
                View Guidelines
              </a>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-4 border-white bg-philsa-bg flex items-center justify-center overflow-hidden shadow-md">
                    <img src={`https://i.pravatar.cc/120?u=${i + 20}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-philsa-navy font-black text-sm">120k+ Registered</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative w-full max-w-lg lg:max-w-none mx-auto"
          >
            <div className="relative bg-white border border-philsa-border/40 rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.15)] ring-1 ring-inset ring-white overflow-hidden group">
              <div className="relative aspect-[4/3] rounded-[1.5rem] sm:rounded-[1.8rem] overflow-hidden bg-philsa-bg">
                <img 
                  src={heroStudentsImg} 
                  alt="Students taking PhilSA exam" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/95 via-transparent to-transparent opacity-80" />
                <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2 bg-white/95 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md border border-gray-200/50 shadow-sm animate-fade-in">
                   <div className="w-2 h-2 bg-[#00563F] rounded-full animate-pulse" />
                   <span className="text-[9px] sm:text-[10px] font-bold text-[#111111] uppercase tracking-widest">Active Batch: #2026-A</span>
                </div>
                <div className="absolute bottom-4 left-6 right-6 sm:bottom-6 sm:left-8 sm:right-8 flex justify-between items-end text-white">
                   <div>
                      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Test Place</p>
                      <p className="text-lg sm:text-xl font-bold tracking-tight font-display">Manila Assessment Center</p>
                   </div>
                   <div className="w-10 h-10 sm:w-12 sm:h-12 bg-philsa-red rounded-lg flex items-center justify-center shadow-lg shadow-philsa-red/30 border border-white/10">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                   </div>
                </div>
              </div>
              <div className="mt-4 sm:mt-6 grid grid-cols-3 gap-3">
                 {[
                   { label: 'Honest', val: 'Checked', color: '#00563F' },
                   { label: 'Safe', val: 'Secure', color: '#8A1538' },
                   { label: 'Fair', val: 'Official', color: '#FFB81C' }
                 ].map((stat) => (
                   <div key={stat.label} className="bg-philsa-bg rounded-lg p-3 border border-philsa-border text-center balance-stat-box">
                      <p className="text-[8px] font-black text-philsa-gray uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-[10px] font-black" style={{ color: stat.color }}>{stat.val}</p>
                   </div>
                 ))}
              </div>
            </div>
            
            {/* Annotation Badge */}
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute -right-4 sm:-right-8 lg:-right-12 bottom-1/4 bg-[#00563F] shadow-2xl text-white rounded-lg px-4 py-3 sm:px-6 sm:py-4 border-2 border-white z-20"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                 <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" />
                 <div>
                    <p className="text-[9px] sm:text-[10px] font-bold leading-none mb-1 uppercase tracking-widest text-[#FFB81C]/90">Quick Check</p>
                    <p className="text-[11px] sm:text-[12px] font-bold text-white">ID Matched: 100%</p>
                 </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 bg-white relative overflow-hidden border-y border-philsa-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(139,13,17,0.03)_0%,transparent_50%)]" />
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 relative z-10">
          {[
            { val: '560+', label: 'Test Centers' },
            { val: '100%', label: 'Secure' },
            { val: '24/7', label: 'Support' },
            { val: '85+', label: 'Partners' }
          ].map((stat, i) => (
            <div key={i} className="w-full text-center md:text-left border-l-2 border-philsa-red/10 pl-4 sm:pl-6 transition-all hover:border-philsa-red group">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-philsa-navy mb-1 tracking-tighter group-hover:scale-105 transition-transform origin-left">{stat.val}</h2>
              <p className="text-philsa-gray font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PWA App Simulation Section */}
      <section className="py-12 sm:py-16 bg-philsa-bg relative overflow-hidden border-b border-philsa-border/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,13,17,0.015)_0%,transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-philsa-red font-black uppercase tracking-[0.3em] text-[10px] mb-3">PWA Experience</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-philsa-navy tracking-tighter leading-tight">
              Offline-First Mobile Experience
            </h3>
            <p className="text-philsa-gray text-xs sm:text-sm font-medium mt-3 opacity-85 leading-relaxed">
              Experience the fast, local, offline-resilient sandbox. Simulate adding PhilSLA to your home screen or desktop to protect your exam application state from transient connectivity drops.
            </p>
          </div>

          <PWASimulator />
        </div>
      </section>

      {/* Features Section (About) */}
      <section id="about" className="py-12 sm:py-16 bg-philsa-bg scroll-mt-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="flex flex-col items-center justify-center mb-8 sm:mb-12 gap-8 text-center">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
              <h2 className="text-philsa-red font-black uppercase tracking-[0.3em] text-[10px] mb-4">About PhilSLA</h2>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-philsa-navy mb-6 tracking-tighter leading-tight">Philippine Secondary Leavers' Assessment</h3>
              <p className="text-philsa-gray text-base sm:text-lg lg:text-xl leading-relaxed font-medium opacity-80 mb-6">
                PhilSLA (Philippine Secondary Leavers' Assessment) is the country's standardized portal for high-quality, trusted academic diagnostic testing, unified leavers assessment support, and educational metrics.
              </p>
              <div className="text-philsa-red font-black text-xs uppercase tracking-[0.15em] bg-philsa-red/5 px-4 py-2 rounded-xl w-fit border border-philsa-red/15 inline-flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 bg-philsa-red rounded-full animate-ping" />
                <span>Officially Powered by UPCAT</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { 
                icon: <ShieldCheck className="w-8 h-8 text-philsa-red" />, 
                title: 'Follows Rules', 
                desc: 'We follow all government rules to keep your information safe.',
                bg: 'bg-red-50'
              },
              { 
                icon: <Cpu className="w-8 h-8 text-blue-600" />, 
                title: 'Smart and Fair', 
                desc: 'We use smart tools to help keep the exam fair for everyone.',
                bg: 'bg-blue-50'
              },
              { 
                icon: <Users className="w-8 h-8 text-emerald-600" />, 
                title: 'Easy to Reach', 
                desc: 'Made to work anywhere in the country, even in far places.',
                bg: 'bg-emerald-50'
              }
            ].map((feature, i) => (
              <div key={i} className="bg-white rounded-[2rem] border border-philsa-border/40 p-8 sm:p-10 transition-all hover:shadow-[0_20px_40px_-10px_rgba(15,23,42,0.08)] hover:-translate-y-2 duration-500 relative overflow-hidden group">
                <div className={`w-16 h-16 ${feature.bg} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h4 className="text-xl sm:text-2xl font-extrabold mb-4 text-philsa-navy tracking-tight">{feature.title}</h4>
                <p className="text-philsa-gray text-sm sm:text-base leading-relaxed opacity-70">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guidelines Section */}
      <section id="guidelines" className="py-12 sm:py-16 bg-white scroll-mt-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="w-full max-w-xl mx-auto lg:max-w-none">
            <h2 className="text-philsa-red font-black uppercase tracking-[0.3em] text-[10px] mb-4">How to Register</h2>
            <h3 className="text-3xl lg:text-4xl font-extrabold text-philsa-navy mb-8 tracking-tighter leading-tight text-center lg:text-left">Easy steps for everyone.</h3>
            
            <div className="space-y-8">
              {[
                { step: '01', title: 'Click Register', detail: 'Fill out all the necessary information in the registration system.' },
                { step: '02', title: 'Choose Exam Schedule', detail: 'Select an exam date and testing center that fit your availability.' },
                { step: '03', title: 'Check Exam Permit', detail: 'Once reviewers approve your registration, your exam permit will be ready.' },
                { step: '04', title: 'Prepare & Start Exam', detail: 'Present your permit to the proctor, log in to the desktop app, and begin answering.' },
                { step: '05', title: 'Finish Exam', detail: 'Make sure to complete and submit your assessment within the given time limit.' },
                { step: '06', title: 'Wait for Results', detail: 'Your scores will be displayed in the portal as soon as they are released.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-6 group">
                  <span className="text-3xl lg:text-4xl font-black text-philsa-red/10 group-hover:text-philsa-red/30 transition-colors group-hover:scale-105">{item.step}</span>
                  <div>
                    <h5 className="text-lg font-bold text-philsa-navy mb-1">{item.title}</h5>
                    <p className="text-philsa-gray text-sm leading-relaxed font-medium opacity-70">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full max-w-xl mx-auto lg:max-w-none relative mt-8 lg:mt-0">
            <div className="relative aspect-video rounded-[2rem] sm:rounded-[2.5rem] bg-philsa-navy p-8 sm:p-12 flex items-center justify-center overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,#8B0D11_0%,transparent_70%)] opacity-30" />
              
              <div className="z-10 text-center">
                <motion.div 
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-16 h-16 sm:w-20 h-20 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-6 sm:mb-8 backdrop-blur-xl border border-white/20 shadow-xl"
                >
                  <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </motion.div>
                <h4 className="text-xl sm:text-2xl font-bold text-white mb-4 italic tracking-tight">"Unified standards for a digital PH"</h4>
                <div className="w-12 h-1 bg-philsa-red mx-auto mt-6 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 sm:py-16 bg-philsa-bg scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-philsa-red font-black uppercase tracking-[0.3em] text-[10px] mb-4">Help Center</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-philsa-navy mb-6 tracking-tighter">Frequently Asked Questions</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {[
              { q: 'Can I use PhilSLA for all schools?', a: 'Yes, it is used by most big schools in the country.' },
              { q: 'What if I have computer problems?', a: 'Our system will help you if your internet drops or if there are errors.' },
              { q: 'When can I see my scores?', a: 'While the score is on a percentile, the percentile ranking can only be determined once all examinees have taken the examination.' },
              { q: 'How do I choose where to take the test?', a: 'You can choose it on your profile page once you are approved.' }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl sm:rounded-3xl border border-philsa-border/40 p-6 sm:p-8 shadow-sm transition-all hover:shadow-md hover:border-philsa-red/20 group">
                <h5 className="text-base sm:text-lg font-black text-philsa-navy mb-3 group-hover:text-philsa-red transition-colors leading-tight">{faq.q}</h5>
                <p className="text-philsa-gray leading-relaxed text-xs sm:text-sm font-medium opacity-70">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 lg:px-12 scroll-mt-20">
        <div className="max-w-7xl mx-auto bg-philsa-navy rounded-[2rem] sm:rounded-[3rem] px-8 sm:px-12 lg:px-20 py-10 sm:py-12 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,#8B0D1160_0%,transparent_50%)]" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            <div className="max-w-2xl text-center lg:text-left">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-6 tracking-tighter leading-none">Ready to start your <span className="text-philsa-red">future?</span></h2>
              <p className="text-gray-400 text-sm sm:text-base lg:text-lg font-medium leading-relaxed">
                Join 120,000 students moving forward in their studies safely.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link to="/register" className="btn-primary !py-3.5 !px-10 text-base !rounded-xl hover:scale-105 transition-transform shadow-xl active:scale-95 group w-full sm:w-auto">
                Apply Now <ArrowRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
