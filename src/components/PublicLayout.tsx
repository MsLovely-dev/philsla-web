import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePhilSA } from '../PhilSAContext';
import { NAVIGATION_PUBLIC, PHILSA_COLORS } from '../lib/utils';
import { Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import upLogoImg from '../assets/images/up_logo.png';

import { Logo } from './Logo';

export function PublicLayout({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = usePhilSA();

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-philsa-border h-20 flex items-center">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-12 flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <Logo showText size="sm" layout="horizontal" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAVIGATION_PUBLIC.map((item) => (
              <a 
                key={item.href} 
                href={item.href} 
                className="text-sm font-semibold text-philsa-navy hover:text-philsa-red transition-colors"
                onClick={(e) => {
                  if (item.href.startsWith('#') || (item.href.startsWith('/#') && window.location.pathname === '/')) {
                    const id = item.href.includes('#') ? item.href.split('#')[1] : null;
                    if (id) {
                      e.preventDefault();
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
              >
                {item.label}
              </a>
            ))}
            <div className="h-4 w-[1px] bg-philsa-border mx-2" />
            
            {user ? (
              <Link to="/dashboard" className="btn-primary py-2 px-5 text-sm">
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-semibold text-philsa-navy hover:text-philsa-red transition-colors flex items-center gap-2 group">
                  <div className="w-8 h-8 rounded-lg bg-philsa-bg flex items-center justify-center group-hover:bg-philsa-red/10 transition-colors">
                    <LogIn className="w-4 h-4" />
                  </div>
                  Portal Login
                </Link>
                <Link to="/register" className="btn-primary py-2.5 px-6 text-sm flex items-center gap-2 shadow-lg shadow-philsa-red/20 active:scale-95 transition-all">
                  <UserPlus className="w-4 h-4" />
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            {!user && (
              <Link 
                to="/register" 
                className="w-10 h-10 rounded-xl bg-philsa-red hover:bg-philsa-red-hover text-white flex items-center justify-center shadow-md shadow-philsa-red/10 active:scale-95 transition-all"
                title="Register as Student"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserPlus className="w-5 h-5" />
              </Link>
            )}
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-philsa-navy hover:bg-philsa-bg rounded-lg transition-colors">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-white md:hidden pt-24 px-6"
          >
            <div className="flex flex-col gap-6">
              {NAVIGATION_PUBLIC.map((item) => (
                <a 
                  key={item.href} 
                  href={item.href} 
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (item.href.startsWith('#') || (item.href.startsWith('/#') && window.location.pathname === '/')) {
                      const id = item.href.includes('#') ? item.href.split('#')[1] : null;
                      if (id) {
                        e.preventDefault();
                        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }
                  }}
                  className="text-xl font-bold text-philsa-navy"
                >
                  {item.label}
                </a>
              ))}
              <div className="h-[1px] bg-philsa-border w-full" />
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-4 text-xl font-bold text-philsa-navy">
                <LogIn className="w-6 h-6 text-philsa-red" />
                Portal Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 pt-20">
        {children}
      </main>

      <footer className="bg-white border-t border-philsa-border py-4 md:py-6 px-4 sm:px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4 md:gap-8 items-start">
          <div className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-2">
              <Link to="/">
                <Logo showText size="sm" layout="horizontal" />
              </Link>
              <div className="hidden sm:block h-6 w-px bg-philsa-border" />
              <div className="flex items-center gap-2">
                <img 
                  src={upLogoImg} 
                  alt="UP Logo" 
                  className="w-7 h-7 md:w-8 md:h-8 object-contain hover:scale-105 transition-transform"
                />
                <div className="flex flex-col">
                  <span className="font-serif text-xs font-semibold text-[#7B1113] leading-tight">University of the Philippines</span>
                  <span className="text-[8px] font-extrabold text-philsa-gray uppercase tracking-widest mt-0.5">Academic Partner</span>
                </div>
              </div>
            </div>
            <p className="hidden md:block text-philsa-gray max-w-xl text-xs leading-relaxed">
              The official Philippine Secondary Leavers' Assessment platform. Ensuring fair, secure, and accessible national examinations for every Filipino student.
            </p>
          </div>
          <div className="border-t border-philsa-border/40 pt-3 md:border-t-0 md:pt-0">
            <h4 className="font-extrabold mb-1.5 text-[10px] uppercase tracking-widest text-philsa-navy">Support</h4>
            <ul className="space-y-1 text-xs text-philsa-gray font-medium">
              <li>Help Desk: <span className="text-philsa-navy font-bold">(02) 8123-4567</span></li>
              <li>Email: <span className="text-philsa-navy font-bold">support@philsa.gov.ph</span></li>
              <li className="hidden md:block text-slate-400">Monday - Friday, 8AM - 5PM</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-philsa-border mt-4 md:mt-6 pt-3 text-[10px] text-philsa-gray font-normal opacity-70">
          <p>&copy; 2026 PhilSLA – Philippine Secondary Leavers' Assessment Platform.</p>
        </div>
      </footer>
    </div>
  );
}
